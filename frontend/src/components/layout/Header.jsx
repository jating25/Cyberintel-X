import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Badge, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider, 
  ListItemIcon, 
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const Header = React.forwardRef(({ onMenuClick, sidebarOpen }, ref) => {
  const theme = useTheme();
  const { darkMode, toggleDarkMode } = useAppTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for dropdown menus
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  
  // Menu open states
  const isMenuOpen = Boolean(anchorEl);
  const isNotificationsOpen = Boolean(notificationsAnchorEl);
  
  // Handle profile menu open
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle notifications menu open
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle notifications close
  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };
  
  // Handle settings navigation
  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };
  
  // Handle profile navigation
  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };
  
  // Mock notifications data
  const notifications = [
    { id: 1, title: 'New threat detected', message: 'Critical vulnerability found in system', severity: 'high', read: false, timestamp: '2 minutes ago' },
    { id: 2, title: 'System update', message: 'New security patch available', severity: 'medium', read: true, timestamp: '1 hour ago' },
    { id: 3, title: 'New login', message: 'Login from new device detected', severity: 'info', read: true, timestamp: '3 hours ago' },
  ];
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <AppBar 
      position="fixed" 
      ref={ref} 
      elevation={0} 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        ...(sidebarOpen && !isMobile && {
          marginLeft: '240px',
          width: 'calc(100% - 240px)',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }),
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{
            marginRight: 2,
            ...(sidebarOpen && !isMobile && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography 
          variant="h6" 
          noWrap 
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          <SecurityIcon sx={{ mr: 1 }} />
          CyberIntel-X
        </Typography>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton 
            color="inherit"
            onClick={handleNotificationsOpen}
            aria-label={`show ${unreadCount} new notifications`}
          >
            <StyledBadge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </StyledBadge>
          </IconButton>
        </Tooltip>
        
        {/* Theme Toggle */}
        <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
          <IconButton onClick={toggleDarkMode} color="inherit">
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        
        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <Box sx={{ textAlign: 'right', mr: 1, display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="subtitle2" noWrap>
              {user?.fullName || user?.username || 'User'}
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap>
              {user?.role || 'User'}
            </Typography>
          </Box>
          
          <IconButton
            onClick={handleProfileMenuOpen}
            size="small"
            sx={{ p: 0 }}
            aria-controls={isMenuOpen ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
          >
            <Avatar 
              alt={user?.fullName || user?.username || 'User'}
              src={user?.avatar}
              sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
            >
              {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchorEl}
        open={isNotificationsOpen}
        onClose={handleNotificationsClose}
        onClick={handleNotificationsClose}
        PaperProps={{
          elevation: 0,
          sx: {
            width: 360,
            maxWidth: '100%',
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
          </Typography>
        </Box>
        
        <Box sx={{ maxHeight: 400, overflow: 'auto', width: '100%' }}>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <MenuItem 
                key={notification.id} 
                sx={{ 
                  borderLeft: `3px solid ${theme.palette[notification.severity]?.main || theme.palette.primary.main}`,
                  bgcolor: notification.read ? 'transparent' : 'action.selected',
                }}
              >
                <Box sx={{ width: '100%', py: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" fontWeight={notification.read ? 'normal' : 'bold'}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.timestamp}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {notification.message}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          )}
        </Box>
        
        {notifications.length > 0 && (
          <Box sx={{ p: 1, textAlign: 'center', borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography 
              variant="button" 
              color="primary" 
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              View All Notifications
            </Typography>
          </Box>
        )}
      </Menu>
      
      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.fullName || user?.username || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email || 'user@example.com'}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
});

Header.displayName = 'Header';

export default Header;
