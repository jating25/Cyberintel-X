import React from 'react';
import { Box, Typography, Link, Container } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
        textAlign: 'center',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary">
          {'Copyright © '}
          <Link color="inherit" href="https://cyberintel-x.com/">
            CyberIntel-X
          </Link>{' '}
          {currentYear}
          {'.'}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          SOC/SIEM Threat Intelligence Platform
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;