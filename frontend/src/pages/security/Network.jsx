import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import DnsIcon from '@mui/icons-material/Dns';
import TimelineIcon from '@mui/icons-material/Timeline';

const SecurityNetwork = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>Network Security Overview</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
      Visualize external attack surface and key network security metrics.
    </Typography>

    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <PublicIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Internet-facing IPs</Typography>
            <Typography variant="h6">Derived from threat intelligence</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <DnsIcon color="secondary" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Critical Services</Typography>
            <Typography variant="h6">Monitored via alerts & correlations</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimelineIcon color="success" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Traffic Anomalies</Typography>
            <Typography variant="h6">Highlight spikes and suspicious flows</Typography>
            <Chip label="Roadmap" size="small" sx={{ mt: 1 }} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

export default SecurityNetwork;
