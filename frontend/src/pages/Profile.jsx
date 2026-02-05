import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Profile = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h5" gutterBottom>Profile</Typography>
    <Paper sx={{ p: 2 }}>
      <Typography variant="body1">This is a placeholder Profile page.</Typography>
    </Paper>
  </Box>
);

export default Profile;
