import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import ListIcon from '@mui/icons-material/List';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

const SecurityIoc = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>IOC Management</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
      Centrally manage indicators of compromise collected from internal and external feeds.
    </Typography>

    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <ListIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Unified IOC Store</Typography>
            <Typography variant="h6">Backed by the threats collection</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <SyncIcon color="success" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Feed Synchronization</Typography>
            <Typography variant="h6">OTX, VirusTotal, AbuseIPDB, MalShare</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudDownloadIcon color="secondary" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Export & Sharing</Typography>
            <Typography variant="h6">Download curated IOC sets</Typography>
            <Chip label="Planned" size="small" sx={{ mt: 1 }} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

export default SecurityIoc;
