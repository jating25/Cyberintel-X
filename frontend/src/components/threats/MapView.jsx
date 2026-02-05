import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, useTheme } from '@mui/material';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSnackbar } from 'notistack';

// Initialize mapbox token (support Vite and legacy env names without using process.env at runtime)
mapboxgl.accessToken = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.REACT_APP_MAPBOX_TOKEN))
  || ''
);

const MapView = ({ threats, loading, filters = {} }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxgl.accessToken) {
      if (!mapboxgl.accessToken) {
        setError('Mapbox token is not configured. Please set REACT_APP_MAPBOX_TOKEN in your .env file.');
        enqueueSnackbar('Mapbox token is not configured', { variant: 'warning' });
      }
      return;
    }

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v10', // Dark theme for better visibility
        center: [0, 20],
        zoom: 1.5,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl());
      
      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
        })
      );

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      // Cleanup on unmount
      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map. Please check your Mapbox token and internet connection.');
      enqueueSnackbar('Failed to initialize map', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  // Update map with threat data
  useEffect(() => {
    if (!map.current || !mapLoaded || !threats || !Array.isArray(threats)) return;

    try {
      // Filter threats with valid geolocation data
      const features = threats
        .filter(threat => threat.geo?.latitude && threat.geo?.longitude)
        .map(threat => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(threat.geo.longitude), parseFloat(threat.geo.latitude)],
          },
          properties: {
            id: threat.id,
            title: threat.title,
            severity: threat.severity,
            type: threat.type,
            status: threat.status,
            description: threat.description,
            country: threat.geo.country,
            city: threat.geo.city,
          },
        }));

      // Remove existing layers and sources if they exist
      if (map.current.getSource('threats')) {
        if (map.current.getLayer('threats-cluster')) map.current.removeLayer('threats-cluster');
        if (map.current.getLayer('threats-cluster-count')) map.current.removeLayer('threats-cluster-count');
        if (map.current.getLayer('threats-point')) map.current.removeLayer('threats-point');
        map.current.removeSource('threats');
      }

      if (features.length === 0) return;

      // Add source and layers for threats
      map.current.addSource('threats', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Add cluster circles
      map.current.addLayer({
        id: 'threats-cluster',
        type: 'circle',
        source: 'threats',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            theme.palette.warning.light,
            10,
            theme.palette.warning.main,
            30,
            theme.palette.error.main,
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            25,
            30,
            30,
          ],
          'circle-opacity': 0.8,
        },
      });

      // Add cluster count labels
      map.current.addLayer({
        id: 'threats-cluster-count',
        type: 'symbol',
        source: 'threats',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': theme.palette.common.white,
        },
      });

      // Add individual threat markers
      map.current.addLayer({
        id: 'threats-point',
        type: 'circle',
        source: 'threats',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'severity'],
            'critical', theme.palette.error.dark,
            'high', theme.palette.error.main,
            'medium', theme.palette.warning.main,
            'low', theme.palette.info.main,
            theme.palette.grey[500],
          ],
          'circle-radius': 8,
          'circle-stroke-width': 1,
          'circle-stroke-color': theme.palette.common.white,
        },
      });

      // Add popup on click
      map.current.on('click', 'threats-point', (e) => {
        if (!e.features?.length) return;
        
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const properties = feature.properties;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `<h3>${properties.title || 'Threat'}</h3>
             <p><strong>Severity:</strong> <span style="text-transform: capitalize;">${properties.severity || 'N/A'}</span></p>
             <p><strong>Type:</strong> <span style="text-transform: capitalize;">${properties.type || 'N/A'}</span></p>
             <p>${properties.description?.substring(0, 100) || ''}${properties.description?.length > 100 ? '...' : ''}</p>
             <p><small>${properties.city || ''}${properties.city && properties.country ? ', ' : ''}${properties.country || ''}</small></p>`
          )
          .addTo(map.current);
      });

      // Change the cursor to a pointer when hovering over points
      map.current.on('mouseenter', 'threats-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      // Change it back to a pointer when it leaves
      map.current.on('mouseleave', 'threats-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    } catch (err) {
      console.error('Error updating map with threats:', err);
      enqueueSnackbar('Error displaying threats on map', { variant: 'error' });
    }
  }, [threats, mapLoaded, theme, enqueueSnackbar]);

  // Fit map to bounds when filters change
  useEffect(() => {
    if (!map.current || !mapLoaded || !threats?.length) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();
      
      // Extend bounds to include all threat locations
      threats.forEach(threat => {
        if (threat.geo?.latitude && threat.geo?.longitude) {
          bounds.extend([parseFloat(threat.geo.longitude), parseFloat(threat.geo.latitude)]);
        }
      });

      // If we have valid bounds, fit the map to them
      if (!bounds.isEmpty()) {
        // Add some padding around the bounds
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 10,
          duration: 1000,
        });
      }
    } catch (err) {
      console.error('Error fitting map to bounds:', err);
    }
  }, [threats, mapLoaded, filters]);

  if (error) {
    return (
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Box
      ref={mapContainer}
      sx={{
        height: 'calc(100vh - 250px)',
        minHeight: '500px',
        width: '100%',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {(loading || !mapLoaded) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {/* Map legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: theme.palette.common.white,
          padding: theme.spacing(1, 2),
          borderRadius: 1,
          zIndex: 10,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Threat Severity</Typography>
        {[
          { label: 'Critical', color: theme.palette.error.dark },
          { label: 'High', color: theme.palette.error.main },
          { label: 'Medium', color: theme.palette.warning.main },
          { label: 'Low', color: theme.palette.info.main },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: item.color,
                marginRight: 1,
                border: `1px solid ${theme.palette.common.white}`,
              }}
            />
            <Typography variant="caption">{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MapView;
