import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const HelpDocs = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>Help - Documentation</Typography>
    <Paper sx={{ p: 2 }}>
      <Typography variant="body1">This is a placeholder documentation page.</Typography>
    </Paper>
  </Box>
);

export default HelpDocs;
