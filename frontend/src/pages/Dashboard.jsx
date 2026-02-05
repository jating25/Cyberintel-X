import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper, 
  LinearProgress, 
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Collapse,
  Menu,
  MenuItem,
  Skeleton,
  Tabs,
  Tab,
  Stack,
  alpha
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon,
  Assessment as ReportIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterAlt as FilterAltIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  GridView as GridViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Favorite as FavoriteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpOutlineIcon,
  NotificationsActive as AlertsActiveIcon,
  NotificationsOff as AlertsMutedIcon,
  NotificationsNone as AlertsNoneIcon,
  NotificationsPaused as AlertsPausedIcon,
  Security as ThreatsIcon,
  BugReport as VulnerabilitiesIcon,
  Lock as ComplianceIcon,
  Public as NetworkIcon,
  Storage as EndpointsIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Dns as DnsIcon,
  Router as RouterIcon,
  Devices as DevicesIcon,
  Person as UserIcon,
  Group as GroupIcon,
  VpnKey as KeyIcon,
  AdminPanelSettings as AdminIcon,
  SettingsApplications as SettingsAppIcon,
  Tune as TuneIcon,
  Timeline as TimelineChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  DonutLarge as DonutChartIcon,
  TableChart as TableChartIcon,
  Map as MapIcon,
  Public as GlobalIcon,
  Language as LanguageIcon,
  Lock as PrivateIcon,
  Public as PublicIcon,
  LockOpen as UnlockedIcon,
  Lock as LockedIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  MoreHoriz as MoreHorizIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  Clear as ClearIcon,
  Remove as RemoveIcon,
  Create as CreateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Help as HelpIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsOff as NotificationsOffIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  Dashboard as DashboardIcon,
  Home as HomeIcon,
  Assessment as AssessmentIcon,
  MultilineChart as MultilineChartIcon,
  ScatterPlot as ScatterPlotIcon,
  BubbleChart as BubbleChartIcon,
  DonutSmall as DonutSmallIcon,
  DonutLarge as DonutLargeIcon,
  PieChartOutlined as PieChartOutlinedIcon,
  BarChartOutlined as BarChartOutlinedIcon,
  ShowChartOutlined as ShowChartOutlinedIcon,
  TimelineOutlined as TimelineOutlinedIcon,
  TableChartOutlined as TableChartOutlinedIcon,
  TableRows as TableRowsIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  ViewModule as ViewModuleIcon,
  ViewQuilt as ViewQuiltIcon,
  ViewStream as ViewStreamIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewAgenda as ViewAgendaIcon,
  ViewCarousel as ViewCarouselIcon,
  ViewColumn as ViewColumnIcon,
  ViewComfy as ViewComfyIcon,
  ViewCompact as ViewCompactIcon,
  ViewHeadline as ViewHeadlineIcon,
  ViewInAr as ViewInArIcon,
  ViewSidebar as ViewSidebarIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  VpnKey as VpnKeyIcon,
  VpnLock as VpnLockIcon,
  Wallpaper as WallpaperIcon,
  Watch as WatchIcon,
  WatchLater as WatchLaterIcon,
  Web as WebIcon,
  WebAsset as WebAssetIcon,
  Weekend as WeekendIcon,
  Whatshot as WhatshotIcon,
  Widgets as WidgetsIcon,
  Wifi as WifiIcon,
  WifiLock as WifiLockIcon,
  WifiOff as WifiOffIcon,
  Work as WorkIcon,
  WorkOff as WorkOffIcon,
  WorkOutline as WorkOutlineIcon,
  WrapText as WrapTextIcon,
  YoutubeSearchedFor as YoutubeSearchedForIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as ZoomOutMapIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import api from '../services/api';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  ComposedChart,
  LabelList
} from 'recharts';

// Styled components
const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    boxShadow: theme.shadows[8],
    transform: 'translateY(-4px)',
  },
}));

const StatCardTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  '& svg': {
    marginRight: theme.spacing(1),
    fontSize: '1.2rem',
  },
}));

const StatCardValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  lineHeight: 1.2,
  margin: `${theme.spacing(1)} 0`,
  background: theme.palette.mode === 'dark' 
    ? `linear-gradient(45deg, ${theme.palette.primary.light} 30%, ${theme.palette.primary.dark} 90%)`
    : `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}));

const StatCardChange = styled(Box)(({ trend, theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: trend === 'up' ? theme.palette.success.main : theme.palette.error.main,
  fontWeight: 500,
  '& svg': {
    marginRight: theme.spacing(0.5),
    fontSize: '1rem',
  },
}));

const Dashboard = () => {
  const theme = useTheme();
  const { darkMode } = useAppTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // Load real analytics from backend instead of mock data
  const { data: analytics } = useQuery(
    'analytics-dashboard',
    async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
    {
      // Keep stale data while refetching to avoid flicker
      staleTime: 30_000,
    }
  );

  const stats = [
    {
      title: 'Total Threats',
      value: analytics?.totalThreats ?? 0,
      change: null,
      trend: 'up',
      icon: <ThreatsIcon />,
      color: theme.palette.error.main,
    },
    {
      title: 'Active Alerts',
      value: analytics?.activeAlerts ?? 0,
      change: null,
      trend: 'up',
      icon: <WarningIcon />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Resolved Cases',
      value: analytics?.resolvedCases ?? 0,
      change: null,
      trend: 'up',
      icon: <CheckCircleIcon />,
      color: theme.palette.success.main,
    },
    {
      title: 'Detection Rate',
      value: analytics?.detectionRate ?? '—',
      change: null,
      trend: 'up',
      icon: <ComplianceIcon />,
      color: theme.palette.success.main,
    },
  ];
  
  // Build chart data from severity distribution if available
  const threatData = Object.entries(analytics?.severityDistribution || {}).map(
    ([severity, count]) => ({
      name: severity.toUpperCase(),
      threats: count,
      alerts: 0,
      incidents: 0,
    })
  );
  
  const threatTypes = threatData.map(d => ({
    name: d.name,
    value: d.threats,
  }));
  
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.success.main,
  ];
  
  // Recent threats & security events: tie to analytics where possible,
  // without hard-coded mock rows.
  const recentThreats = [];
  
  const securityEvents = threatTypes;
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Format numbers with commas
  const formatNumber = (num) => {
    if (num == null) return '—';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return theme.palette.error.dark;
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="body2" color="textSecondary">{label}</Typography>
          {payload.map((entry, index) => (
            <Box key={`tooltip-${index}`} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Box 
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: entry.color,
                  borderRadius: '2px',
                  mr: 1,
                }}
              />
              <Typography variant="body2">
                {entry.name}: <strong>{entry.value}</strong>
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };
  
  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // Render a status indicator dot
  const StatusDot = ({ color, size = 8 }) => (
    <Box 
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
        display: 'inline-block',
        mr: 1,
      }}
    />
  );
  
  // Render a severity chip
  const SeverityChip = ({ severity }) => {
    const color = getSeverityColor(severity);
    return (
      <Chip 
        label={severity}
        size="small"
        sx={{
          bgcolor: alpha(color, 0.1),
          color: color,
          fontWeight: 500,
          '& .MuiChip-label': {
            px: 1,
          },
        }}
      />
    );
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header with title and actions */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Security Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Welcome back, {user?.fullName || 'User'}. Here's what's happening with your security posture.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/reports')}
          >
            Generate Report
          </Button>
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard elevation={3}>
              <StatCardTitle variant="subtitle2">
                {stat.icon}
                {stat.title}
              </StatCardTitle>
              <StatCardValue variant="h4">
                {stat.value}
              </StatCardValue>
              <Box sx={{ mt: 'auto', pt: 1 }}>
                <StatCardChange trend={stat.trend}>
                  {stat.trend === 'up' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  {Math.abs(stat.change)}% {stat.trend === 'up' ? 'increase' : 'decrease'} from last month
                </StatCardChange>
              </Box>
            </StatCard>
          </Grid>
        ))}
      </Grid>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Threat Overview Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2">
                Threat Overview
              </Typography>
              <Box>
                <IconButton size="small">
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={threatData}
                  margin={{
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="name" 
                    stroke={theme.palette.text.secondary}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke={theme.palette.text.secondary}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="alerts" 
                    name="Alerts" 
                    fill={theme.palette.warning.main}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="threats" 
                    name="Threats" 
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="incidents" 
                    name="Incidents" 
                    stroke={theme.palette.error.main}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Threat Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2">
                Threat Distribution
              </Typography>
              <IconButton size="small">
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={threatTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {threatTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              {threatTypes.map((type, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: COLORS[index % COLORS.length],
                        borderRadius: '2px',
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">
                      {type.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {type.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Threats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2">
                Recent Threats
              </Typography>
              <Button 
                size="small" 
                color="primary"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/threats')}
              >
                View All
              </Button>
            </Box>
            
            <List disablePadding>
              {recentThreats.map((threat, index) => (
                <React.Fragment key={threat.id}>
                  <ListItem 
                    button 
                    sx={{ 
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => navigate(`/threats/${threat.id}`)}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <StatusDot color={getSeverityColor(threat.severity)} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle2" noWrap>
                          {threat.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Chip 
                            label={threat.type}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              mr: 1,
                            }}
                          />
                          <Typography variant="caption" color="textSecondary">
                            {threat.source} • {threat.time}
                          </Typography>
                        </Box>
                      }
                    />
                    <SeverityChip severity={threat.severity} />
                  </ListItem>
                  {index < recentThreats.length - 1 && <Divider component="li" sx={{ my: 0.5 }} />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
        
        {/* Security Posture */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2">
                Security Posture
              </Typography>
              <IconButton size="small">
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ height: 200, mb: 3 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'Prevention', A: 90, B: 80, fullMark: 100 },
                  { subject: 'Detection', A: 75, B: 70, fullMark: 100 },
                  { subject: 'Response', A: 65, B: 60, fullMark: 100 },
                  { subject: 'Recovery', A: 85, B: 75, fullMark: 100 },
                  { subject: 'Compliance', A: 92, B: 88, fullMark: 100 },
                  { subject: 'Awareness', A: 70, B: 65, fullMark: 100 },
                ]}>
                  <PolarGrid stroke={theme.palette.divider} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{
                      fill: theme.palette.text.primary,
                      fontSize: 12,
                    }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]}
                    tick={{
                      fill: theme.palette.text.secondary,
                      fontSize: 10,
                    }}
                  />
                  <Radar 
                    name="Your Score" 
                    dataKey="A" 
                    stroke={theme.palette.primary.main} 
                    fill={alpha(theme.palette.primary.main, 0.2)} 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Industry Avg" 
                    dataKey="B" 
                    stroke={theme.palette.text.secondary} 
                    fill={alpha(theme.palette.text.secondary, 0.2)} 
                    fillOpacity={0.2} 
                  />
                  <Legend />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight={700}>
                    92%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Overall Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <StatusDot color={theme.palette.success.main} />
                    <Typography variant="caption" color="textSecondary">
                      Excellent
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="textPrimary" fontWeight={700}>
                    7
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Critical Issues
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <StatusDot color={theme.palette.error.main} />
                    <Typography variant="caption" color="error">
                      Needs Attention
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
            
            <Button 
              fullWidth 
              variant="outlined" 
              color="primary" 
              sx={{ mt: 2 }}
              startIcon={<AssessmentIcon />}
              onClick={() => navigate('/reports/security-posture')}
            >
              View Detailed Report
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
