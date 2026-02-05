import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';

const AlertDetails = () => {
  const { id } = useParams();
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Alert Details</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">Details for alert ID: {id}</Typography>
      </Paper>
    </Box>
  );
};

export default AlertDetails;
