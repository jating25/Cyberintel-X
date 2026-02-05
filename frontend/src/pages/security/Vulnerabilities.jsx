import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';

const SecurityVulnerabilities = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>Vulnerability Management</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
      Track and prioritize vulnerabilities discovered across your environment.
    </Typography>

    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <BugReportIcon color="error" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">CVE Intake</Typography>
            <Typography variant="h6">Powered by NVD ingest</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Risk Scoring</Typography>
            <Typography variant="h6">Combine severity & asset context</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon color="warning" />
          <Box>
            <Typography variant="subtitle2" color="textSecondary">SLA Breaches</Typography>
            <Typography variant="h6">Highlight overdue remediation</Typography>
            <Chip label="In development" size="small" sx={{ mt: 1 }} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

export default SecurityVulnerabilities;
