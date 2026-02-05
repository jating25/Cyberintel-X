import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Settings = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Settings</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">This is a placeholder Settings page.</Typography>
      </Paper>
    </Box>
  );
};

export default Settings;
