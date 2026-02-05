import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { 
  Drawer, 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Collapse, 
  Divider, 
  Typography,
  Tooltip,
  IconButton,
  Avatar,
  Badge,
  alpha,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as ThreatsIcon,
  Warning as AlertsIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  StarBorder,
  Timeline as TimelineIcon,
  Dns as EndpointsIcon,
  Public as NetworkIcon,
  Lock as VulnerabilitiesIcon,
  Code as IocIcon,
  People as UsersIcon,
  VpnKey as IamIcon,
  NotificationsActive as MonitoringIcon,
  IntegrationInstructions as IntegrationsIcon,
  HelpOutline as HelpIcon,
  Feedback as FeedbackIcon,
  Description as DescriptionIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';

// Styled components
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const StyledDrawer = styled(Drawer)(({ theme, open, drawerwidth }) => ({
  width: drawerwidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: drawerwidth,
    borderRight: 'none',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[3],
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    ...(!open && {
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      width: theme.spacing(7) + 1,
      [theme.breakpoints.up('sm')]: {
        width: theme.spacing(9) + 1,
      },
    }),
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme, active }) => ({
  borderRadius: theme.shape.borderRadius,
  margin: theme.spacing(0.5, 1.5),
  padding: theme.spacing(1, 1.5),
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
    },
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledListItemIcon = styled(ListItemIcon)({
  minWidth: 40,
});

// Menu items configuration
const menuItems = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/',
    role: 'user',
  },
  {
    text: 'Threats',
    icon: <ThreatsIcon />,
    path: '/threats',
    role: 'analyst',
  },
  {
    text: 'Alerts',
    icon: <AlertsIcon />,
    path: '/alerts',
    badge: 5,
    role: 'analyst',
  },
  {
    text: 'Analytics',
    icon: <AnalyticsIcon />,
    path: '/analytics',
    role: 'analyst',
  },
  {
    text: 'Reports',
    icon: <ReportsIcon />,
    path: '/reports',
    role: 'analyst',
  },
];

const securityMenu = {
  text: 'Security',
  icon: <ThreatsIcon />,
  items: [
    { text: 'Endpoints', icon: <EndpointsIcon />, path: '/security/endpoints', role: 'analyst' },
    { text: 'Network', icon: <NetworkIcon />, path: '/security/network', role: 'analyst' },
    { text: 'Vulnerabilities', icon: <VulnerabilitiesIcon />, path: '/security/vulnerabilities', role: 'analyst' },
    { text: 'IOC Management', icon: <IocIcon />, path: '/security/ioc', role: 'analyst' },
  ],
  role: 'analyst',
};

const adminMenu = {
  text: 'Administration',
  icon: <SettingsIcon />,
  items: [
    { text: 'Users', icon: <UsersIcon />, path: '/admin/users', role: 'admin' },
    { text: 'IAM', icon: <IamIcon />, path: '/admin/iam', role: 'admin' },
    { text: 'Monitoring', icon: <MonitoringIcon />, path: '/admin/monitoring', role: 'admin' },
    { text: 'Integrations', icon: <IntegrationsIcon />, path: '/admin/integrations', role: 'admin' },
  ],
  role: 'admin',
};

const helpMenu = {
  text: 'Help & Support',
  icon: <HelpIcon />,
  items: [
    { text: 'Documentation', icon: <DescriptionIcon />, path: '/help/docs', role: 'user' },
    { text: 'Feedback', icon: <FeedbackIcon />, path: '/help/feedback', role: 'user' },
  ],
  role: 'user',
};

const Sidebar = ({ open, onClose, isMobile }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState({
    security: false,
    admin: false,
    help: false,
  });
  
  // Toggle collapsible menu
  const handleMenuToggle = (menu) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };
  
  // Navigate to a route
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };
  
  // Check if user has required role for a menu item
  const hasPermission = (requiredRole) => {
    if (!user) return false;
    if (requiredRole === 'user') return true;
    if (requiredRole === 'analyst' && (user.role === 'analyst' || user.role === 'admin')) return true;
    if (requiredRole === 'admin' && user.role === 'admin') return true;
    return false;
  };
  
  // Set initial open state for menus based on current route
  useEffect(() => {
    const path = location.pathname;
    const newOpenMenus = { ...openMenus };
    
    if (path.startsWith('/security/')) {
      newOpenMenus.security = true;
    }
    if (path.startsWith('/admin/')) {
      newOpenMenus.admin = true;
    }
    if (path.startsWith('/help/')) {
      newOpenMenus.help = true;
    }
    
    setOpenMenus(newOpenMenus);
  }, [location.pathname]);
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      onClose();
    }
  }, [location, isMobile, onClose]);
  
  // Render a single menu item
  const renderMenuItem = (item) => (
    <ListItem 
      key={item.text} 
      disablePadding 
      sx={{ 
        display: 'block',
        mb: 0.5,
        opacity: hasPermission(item.role) ? 1 : 0.5,
        pointerEvents: hasPermission(item.role) ? 'auto' : 'none',
      }}
      title={open ? undefined : item.text}
    >
      <Tooltip title={!open ? item.text : ''} placement="right">
        <StyledListItemButton
          selected={location.pathname === item.path}
          onClick={() => handleNavigation(item.path)}
          sx={{
            minHeight: 48,
            justifyContent: open ? 'initial' : 'center',
            px: 2.5,
          }}
        >
          <StyledListItemIcon
            sx={{
              minWidth: 0,
              mr: open ? 3 : 'auto',
              justifyContent: 'center',
            }}
          >
            {item.badge ? (
              <Badge badgeContent={item.badge} color="error">
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </StyledListItemIcon>
          <ListItemText 
            primary={item.text} 
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: location.pathname === item.path ? '600' : '400',
            }}
            sx={{ opacity: open ? 1 : 0 }}
          />
        </StyledListItemButton>
      </Tooltip>
    </ListItem>
  );
  
  // Render a collapsible menu section
  const renderCollapsibleMenu = (menu) => {
    if (!hasPermission(menu.role)) return null;
    
    return (
      <React.Fragment key={menu.text}>
        <ListItemButton 
          onClick={() => handleMenuToggle(menu.text.toLowerCase())}
          sx={{
            minHeight: 48,
            justifyContent: open ? 'initial' : 'center',
            px: 2.5,
            borderRadius: 1,
            mx: 1,
            my: 0.5,
          }}
        >
          <StyledListItemIcon
            sx={{
              minWidth: 0,
              mr: open ? 3 : 'auto',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            {menu.icon}
          </StyledListItemIcon>
          <ListItemText 
            primary={menu.text} 
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: '500',
              color: 'text.secondary',
            }}
            sx={{ opacity: open ? 1 : 0 }}
          />
          {openMenus[menu.text.toLowerCase()] ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        <Collapse in={openMenus[menu.text.toLowerCase()]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {menu.items.map((item) => (
              <ListItem 
                key={item.text} 
                disablePadding 
                sx={{ 
                  display: 'block',
                  pl: open ? 4 : 3,
                  opacity: hasPermission(item.role) ? 1 : 0.5,
                  pointerEvents: hasPermission(item.role) ? 'auto' : 'none',
                }}
              >
                <Tooltip title={!open ? item.text : ''} placement="right">
                  <StyledListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      minHeight: 36,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2.5,
                    }}
                  >
                    <StyledListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </StyledListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: location.pathname === item.path ? '600' : '400',
                      }}
                      sx={{ opacity: open ? 1 : 0 }}
                    />
                  </StyledListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </React.Fragment>
    );
  };
  
  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      drawerwidth={240}
      sx={{
        display: { xs: isMobile ? 'block' : 'none', sm: 'block' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 240,
          borderRight: 'none',
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[3],
          [theme.breakpoints.down('sm')]: {
            width: 240,
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header with logo and collapse button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            minHeight: 64,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ThreatsIcon 
              color="primary" 
              sx={{ 
                width: 32, 
                height: 32, 
                mr: 1.5,
                display: { xs: 'none', sm: 'block' } 
              }} 
            />
            <Typography 
              variant="h6" 
              noWrap 
              component="div"
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                display: open ? 'block' : 'none',
              }}
            >
              CyberIntel-X
            </Typography>
          </Box>
          
          {!isMobile && (
            <IconButton onClick={onClose} size="small">
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          )}
        </Box>
        
        {/* Main menu items */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            py: 1,
            '&::-webkit-scrollbar': {
              width: 6,
              height: 6,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.divider,
              borderRadius: 3,
              '&:hover': {
                backgroundColor: theme.palette.text.disabled,
              },
            },
          }}
        >
          <List>
            {menuItems.map((item) => (
              hasPermission(item.role) && renderMenuItem(item)
            ))}
            
            <Divider sx={{ my: 1, mx: 2 }} />
            
            {renderCollapsibleMenu(securityMenu)}
            {renderCollapsibleMenu(adminMenu)}
            
            <Divider sx={{ my: 1, mx: 2 }} />
            
            {renderCollapsibleMenu(helpMenu)}
          </List>
        </Box>
        
        {/* Footer with user info */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: open ? 'block' : 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar 
              alt={user?.fullName || 'User'} 
              src={user?.avatar}
              sx={{ 
                width: 36, 
                height: 36, 
                mr: 1.5,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.875rem',
              }}
            >
              {(user?.fullName || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography 
                variant="subtitle2" 
                noWrap 
                sx={{ fontWeight: 600 }}
              >
                {user?.fullName || 'User'}
              </Typography>
              <Typography 
                variant="caption" 
                color="textSecondary" 
                noWrap 
                sx={{ display: 'block' }}
              >
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => handleNavigation('/settings')}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Help">
              <IconButton size="small" onClick={() => handleNavigation('/help')}>
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Logout">
              <IconButton size="small" onClick={() => handleNavigation('/logout')}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar;
