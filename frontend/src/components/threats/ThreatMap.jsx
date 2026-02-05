import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Paper, useTheme } from '@mui/material';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { threatAPI } from '../../services/api';
import { useSnackbar } from 'notistack';

// Initialize mapbox token (support Vite and legacy env names without using process.env at runtime)
mapboxgl.accessToken = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.REACT_APP_MAPBOX_TOKEN))
  || ''
);

const ThreatMap = ({ filters = {} }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loading, setLoading] = useState(true);
  const [threats, setThreats] = useState([]);
  const [error, setError] = useState(null);

  // Load threat data
  useEffect(() => {
    const fetchThreats = async () => {
      try {
        setLoading(true);
        const response = await threatAPI.getThreatsGeoJSON({
          severity: filters.severity,
          status: filters.status,
          type: filters.type,
        });
        setThreats(response.features || []);
      } catch (err) {
        console.error('Error loading threat data:', err);
        setError('Failed to load threat data');
        enqueueSnackbar('Error loading threat data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchThreats();
  }, [filters, enqueueSnackbar]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !threats.length) return;

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

    // Add data source and layer when map loads
    map.current.on('load', () => {
      if (!map.current) return;

      // Add source for threats
      map.current.addSource('threats', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: threats,
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Add cluster circles
      map.current.addLayer({
        id: 'clusters',
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
        id: 'cluster-count',
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
        id: 'threat-points',
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
      map.current.on('click', 'threat-points', (e) => {
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
             <p><strong>Severity:</strong> ${properties.severity || 'N/A'}</p>
             <p><strong>Type:</strong> ${properties.type || 'N/A'}</p>
             <p>${properties.description || ''}</p>
             <p><small>${properties.city || ''}${properties.city && properties.country ? ', ' : ''}${properties.country || ''}</small></p>`
          )
          .addTo(map.current);
      });

      // Change the cursor to a pointer when hovering over points
      map.current.on('mouseenter', 'threat-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      // Change it back to a pointer when it leaves
      map.current.on('mouseleave', 'threat-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [threats, theme]);

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
        height: '600px',
        width: '100%',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {loading && (
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

export default ThreatMap;
