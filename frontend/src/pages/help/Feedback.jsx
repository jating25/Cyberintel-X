import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const HelpFeedback = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>Help - Feedback</Typography>
    <Paper sx={{ p: 2 }}>
      <Typography variant="body1">This is a placeholder feedback page.</Typography>
    </Paper>
  </Box>
);

export default HelpFeedback;
