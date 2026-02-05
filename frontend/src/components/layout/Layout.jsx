import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery, Box, CssBaseline, useScrollTrigger, Slide } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

// Components
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import LoadingScreen from '../common/LoadingScreen';
import ScrollToTop from '../common/ScrollToTop';

// Styled components
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open, drawerWidth }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: drawerWidth,
    }),
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(2),
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  })
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Hide elements when scrolling down
const HideOnScroll = React.forwardRef(function HideOnScroll(props, ref) {
  const { children, ...other } = props;
  const trigger = useScrollTrigger({
    target: window,
    disableHysteresis: true,
    threshold: 100,
  });

  return (
    <Slide appear={false} direction="down" in={!trigger} ref={ref} {...other}>
      {children}
    </Slide>
  );
});

const Layout = () => {
  const theme = useTheme();
  const { darkMode } = useAppTheme();
  const { isAuthenticated, loading } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location, isMobile]);

  // Handle sidebar open/close
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading screen while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  // Don't render layout for auth pages
  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Header */}
      <HideOnScroll>
        <Header 
          onMenuClick={handleDrawerToggle} 
          sidebarOpen={sidebarOpen}
        />
      </HideOnScroll>
      
      {/* Sidebar */}
      <Sidebar 
        open={isMobile ? mobileOpen : sidebarOpen}
        onClose={handleDrawerToggle}
        isMobile={isMobile}
      />
      
      {/* Main content */}
      <Main 
        component="main" 
        open={sidebarOpen}
        sx={{
          backgroundColor: darkMode ? 'background.default' : 'grey.50',
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          pt: { xs: 8, sm: 10 },
          pb: { xs: 6, sm: 8 },
          minHeight: '100vh',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(sidebarOpen && {
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
            [theme.breakpoints.up('md')]: {
              marginLeft: '240px',
            },
          }),
        }}
      >
        <DrawerHeader />
        
        {/* Page content */}
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          <Outlet />
        </Box>
        
        {/* Scroll to top button */}
        <ScrollToTop />
        
        {/* Footer */}
        <Footer />
      </Main>
    </Box>
  );
};

export default Layout;
