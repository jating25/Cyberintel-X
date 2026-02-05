import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import { threatAPI } from '../services/api';

const ThreatDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const stateThreat = location.state?.threat || null;

  const {
    data: apiThreat,
    isLoading,
    isError,
  } = useQuery(['threat', id], () => threatAPI.getThreatById(id), {
    // If we already have a threat object from navigation state, skip the API call
    enabled: !!id && !stateThreat,
  });

  const threat = stateThreat || apiThreat;

  if (isLoading && !stateThreat) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !threat) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Threat Details
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography color="error">
            Unable to load details for threat ID: {id}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Threat Details
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6">{threat.value}</Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {threat.id || threat._id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={threat.severity}
              color="error"
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
            <Chip
              label={threat.type}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
            <Chip
              label={threat.source}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Core Information
            </Typography>
            <Typography variant="body2">
              <strong>First seen:</strong> {threat.first_seen}
            </Typography>
            <Typography variant="body2">
              <strong>Last seen:</strong> {threat.last_seen}
            </Typography>
            <Typography variant="body2">
              <strong>Confidence:</strong> {Math.round((threat.confidence || 0) * 100)}%
            </Typography>
            <Typography variant="body2">
              <strong>Tags:</strong>{' '}
              {threat.tags && threat.tags.length
                ? threat.tags.join(', ')
                : 'None'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Geo & Context
            </Typography>
            <Typography variant="body2">
              <strong>Country:</strong>{' '}
              {threat.geo?.country || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>City:</strong> {threat.geo?.city || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>IP Address:</strong>{' '}
              {threat.geo?.ip_address || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ThreatDetails;
