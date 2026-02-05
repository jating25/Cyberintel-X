import React from 'react';
import { Box, CircularProgress, Typography, Container } from '@mui/material';

const LoadingScreen = () => {
  return (
    <Container 
      component="main" 
      maxWidth={false}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: (theme) => theme.palette.background.default,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 4,
        }}
      >
        <CircularProgress 
          size={60} 
          thickness={4}
          sx={{
            mb: 3,
            color: 'primary.main',
          }}
        />
        <Typography 
          variant="h6" 
          component="div"
          sx={{
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          Loading CyberIntel-X Dashboard
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            mt: 1,
          }}
        >
          Please wait while we prepare your security dashboard...
        </Typography>
      </Box>
    </Container>
  );
};

export default LoadingScreen;