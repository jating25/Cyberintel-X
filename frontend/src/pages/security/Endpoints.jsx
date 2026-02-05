import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';

const SecurityEndpoints = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>Endpoint Security Overview</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
      Monitor the health and security posture of your servers, workstations, and critical assets.
    </Typography>

    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <DevicesIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Managed Endpoints</Typography>
            <Typography variant="h6">Coming from CMDB / EDR</Typography>
            <Chip label="Integration-ready" size="small" sx={{ mt: 1 }} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon color="success" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Hardening Status</Typography>
            <Typography variant="h6">Powered by vulnerability data</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon color="warning" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Open Endpoint Alerts</Typography>
            <Typography variant="h6">Visible in Alerts & Dashboard</Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

export default SecurityEndpoints;
