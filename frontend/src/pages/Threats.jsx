import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Chip, 
  Grid, 
  Paper, 
  Stack, 
  Menu, 
  MenuItem, 
  IconButton, 
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  LinearProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Badge,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon,
  ArrowRight as ArrowRightIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  MoreHoriz as MoreHorizIcon,
  DateRange as DateRangeIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Flag as FlagIcon,
  Public as PublicIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  NotificationsPaused as NotificationsPausedIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsOutlined as NotificationsOutlinedIcon,
  NotificationsRounded as NotificationsRoundedIcon,
  NotificationsSharp as NotificationsSharpIcon,
  NotificationsTwoTone as NotificationsTwoToneIcon,
  NotificationsActiveOutlined as NotificationsActiveOutlinedIcon,
  NotificationsActiveRounded as NotificationsActiveRoundedIcon,
  NotificationsActiveSharp as NotificationsActiveSharpIcon,
  NotificationsActiveTwoTone as NotificationsActiveTwoToneIcon,
  NotificationsOffOutlined as NotificationsOffOutlinedIcon,
  NotificationsOffRounded as NotificationsOffRoundedIcon,
  NotificationsOffSharp as NotificationsOffSharpIcon,
  NotificationsOffTwoTone as NotificationsOffTwoToneIcon,
  NotificationsPausedOutlined as NotificationsPausedOutlinedIcon,
  NotificationsPausedRounded as NotificationsPausedRoundedIcon,
  NotificationsPausedSharp as NotificationsPausedSharpIcon,
  NotificationsPausedTwoTone as NotificationsPausedTwoToneIcon,
  NotificationsNoneOutlined as NotificationsNoneOutlinedIcon,
  NotificationsNoneRounded as NotificationsNoneRoundedIcon,
  NotificationsNoneSharp as NotificationsNoneSharpIcon,
  NotificationsNoneTwoTone as NotificationsNoneTwoToneIcon,
} from '@mui/icons-material';
import DataTable from '../components/common/DataTable';
import MapView from '../components/threats/MapView';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { format, subDays, parseISO } from 'date-fns';

// Helper function to generate random coordinates within a country
const getRandomCoordinatesInCountry = (country) => {
  // Approximate bounding boxes for some countries
  const countryBounds = {
    'US': { minLon: -125, maxLon: -66, minLat: 24, maxLat: 50 }, // United States
    'GB': { minLon: -8, maxLon: 2, minLat: 50, maxLat: 60 },     // United Kingdom
    'DE': { minLon: 5, maxLon: 15, minLat: 47, maxLat: 55 },     // Germany
    'FR': { minLon: -5, maxLon: 10, minLat: 41, maxLat: 52 },    // France
    'JP': { minLon: 128, maxLon: 148, minLat: 30, maxLat: 46 },  // Japan
    'AU': { minLon: 112, maxLon: 154, minLat: -44, maxLat: -10 }, // Australia
    'CA': { minLon: -141, maxLon: -52, minLat: 41, maxLat: 84 }, // Canada
    'BR': { minLon: -74, maxLon: -34, minLat: -34, maxLat: 6 },  // Brazil
    'IN': { minLon: 68, maxLon: 98, minLat: 8, maxLat: 38 },     // India
    'CN': { minLon: 73, maxLon: 135, minLat: 18, maxLat: 54 }    // China
  };

  const countries = Object.keys(countryBounds);
  const countryCode = country || countries[Math.floor(Math.random() * countries.length)];
  const bounds = countryBounds[countryCode] || { minLon: -180, maxLon: 180, minLat: -90, maxLat: 90 };
  
  return {
    longitude: (Math.random() * (bounds.maxLon - bounds.minLon) + bounds.minLon).toFixed(6),
    latitude: (Math.random() * (bounds.maxLat - bounds.minLat) + bounds.minLat).toFixed(6),
    country: countryCode,
    city: `City ${Math.floor(Math.random() * 100) + 1}`
  };
};

// Mock data - in a real app, this would come from an API
const mockThreats = Array.from({ length: 50 }, (_, i) => {
  const hasGeo = Math.random() > 0.2; // 80% chance to have geolocation
  const geo = hasGeo ? getRandomCoordinatesInCountry() : null;
  
  return {
    id: `threat-${i + 1}`,
    title: `Security Threat ${i + 1}`,
    severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    status: ['new', 'in_progress', 'resolved', 'false_positive'][Math.floor(Math.random() * 4)],
    type: ['malware', 'phishing', 'vulnerability', 'intrusion', 'data_leak', 'ddos'][Math.floor(Math.random() * 6)],
    source: ['internal', 'external', 'partner', 'automated'][Math.floor(Math.random() * 4)],
    detectedAt: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
    updatedAt: subDays(new Date(), Math.floor(Math.random() * 5)).toISOString(),
    description: `This is a detailed description of security threat ${i + 1}. It contains important information about the threat and how to mitigate it.`,
    affectedAssets: Math.floor(Math.random() * 10) + 1,
    assignedTo: i % 5 === 0 ? 'security-team' : null,
    tags: ['critical', 'needs_review', 'escalated', 'false_positive', 'needs_triage'].filter(() => Math.random() > 0.5),
    cveId: Math.random() > 0.3 ? `CVE-2023-${Math.floor(1000 + Math.random() * 9000)}` : null,
    cvssScore: Math.random() > 0.3 ? (Math.random() * 10).toFixed(1) : null,
    mitreTactics: ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control', 'Exfiltration', 'Impact'].filter(() => Math.random() > 0.7),
    mitreTechniques: ['Spearphishing Attachment', 'PowerShell', 'Scheduled Task', 'Registry Run Keys / Startup Folder', 'Process Injection', 'Obfuscated Files or Information', 'Credential Dumping', 'Network Service Scanning', 'Remote Desktop Protocol', 'Data Compressed', 'Standard Application Layer Protocol', 'Data Encrypted', 'Data Destruction'].filter(() => Math.random() > 0.7),
    iocs: {
      ipAddresses: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
        `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      ),
      domains: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => 
        `malicious${i + 1}.example${Math.floor(Math.random() * 10)}.com`
      ),
      hashes: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
        Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      ),
      urls: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => 
        `https://malicious${i + 1}.example${Math.floor(Math.random() * 10)}.com/path?param=${Math.random().toString(36).substring(2)}`
      ),
    },
    geo: geo,
    remediation: Math.random() > 0.5 ? `To remediate this threat, follow these steps:
1. Update all affected systems
2. Reset compromised credentials
3. Review and update firewall rules
4. Monitor for suspicious activity` : null,
    references: [
      'https://nvd.nist.gov/vuln/detail/CVE-2023-1234',
      'https://attack.mitre.org/techniques/T1059/001/',
      'https://www.us-cert.gov/ncas/alerts/TA18-201A'
    ].slice(0, Math.floor(Math.random() * 3) + 1),
  };
});

// Severity badge component
const SeverityBadge = ({ severity }) => {
  const theme = useTheme();
  
  const severityMap = {
    critical: {
      label: 'Critical',
      color: 'error',
      icon: <ErrorIcon fontSize="small" />,
    },
    high: {
      label: 'High',
      color: 'warning',
      icon: <WarningIcon fontSize="small" />,
    },
    medium: {
      label: 'Medium',
      color: 'info',
      icon: <InfoIcon fontSize="small" />,
    },
    low: {
      label: 'Low',
      color: 'success',
      icon: <CheckCircleIcon fontSize="small" />,
    },
    default: {
      label: 'Unknown',
      color: 'default',
      icon: <InfoIcon fontSize="small" />,
    },
  };
  
  const { label, color, icon } = severityMap[severity?.toLowerCase()] || severityMap.default;
  
  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      size="small"
      sx={{ 
        fontWeight: 600,
        minWidth: 90,
        '& .MuiChip-icon': {
          color: 'inherit',
          opacity: 0.8,
        },
      }}
    />
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const theme = useTheme();
  
  const statusMap = {
    new: {
      label: 'New',
      color: 'primary',
      icon: <NotificationsNoneIcon fontSize="small" />,
    },
    in_progress: {
      label: 'In Progress',
      color: 'info',
      icon: <AccessTimeIcon fontSize="small" />,
    },
    resolved: {
      label: 'Resolved',
      color: 'success',
      icon: <CheckCircleIcon fontSize="small" />,
    },
    false_positive: {
      label: 'False Positive',
      color: 'default',
      icon: <CloseIcon fontSize="small" />,
    },
    default: {
      label: 'Unknown',
      color: 'default',
      icon: <InfoIcon fontSize="small" />,
    },
  };
  
  const { label, color, icon } = statusMap[status?.toLowerCase()] || statusMap.default;
  
  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      variant="outlined"
      size="small"
      sx={{ 
        fontWeight: 500,
        minWidth: 120,
        '& .MuiChip-icon': {
          color: 'inherit',
          opacity: 0.8,
        },
      }}
    />
  );
};

// Threat type chip
const ThreatTypeChip = ({ type }) => {
  const theme = useTheme();
  
  const typeMap = {
    malware: {
      label: 'Malware',
      color: 'error',
      icon: <SecurityIcon fontSize="small" />,
    },
    phishing: {
      label: 'Phishing',
      color: 'warning',
      icon: <PublicIcon fontSize="small" />,
    },
    vulnerability: {
      label: 'Vulnerability',
      color: 'info',
      icon: <WarningIcon fontSize="small" />,
    },
    intrusion: {
      label: 'Intrusion',
      color: 'error',
      icon: <LockIcon fontSize="small" />,
    },
    data_leak: {
      label: 'Data Leak',
      color: 'error',
      icon: <StorageIcon fontSize="small" />,
    },
    ddos: {
      label: 'DDoS',
      color: 'error',
      icon: <ComputerIcon fontSize="small" />,
    },
    default: {
      label: 'Other',
      color: 'default',
      icon: <InfoIcon fontSize="small" />,
    },
  };
  
  const { label, color, icon } = typeMap[type?.toLowerCase()] || typeMap.default;
  
  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      variant="outlined"
      size="small"
      sx={{ 
        fontWeight: 500,
        '& .MuiChip-icon': {
          color: 'inherit',
          opacity: 0.8,
        },
      }}
    />
  );
};

// Threats Page Component
const Threats = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  // State
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreats, setSelectedThreats] = useState([]);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'open', 'in_progress', 'resolved', 'false_positive'
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    severity: [],
    type: [],
    source: [],
    assigned: [],
    tag: [],
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [threatsToDelete, setThreatsToDelete] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    new: 0,
    in_progress: 0,
    resolved: 0,
    false_positive: 0,
  });

  // Tabs state
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Tab panel component
  const TabPanel = ({ children, value, index, ...other }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`threat-tabpanel-${index}`}
        aria-labelledby={`threat-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  // Fetch threats from API
  const fetchThreats = useCallback(async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // const response = await threatAPI.getThreats({ viewMode, searchText, ...filters });
      // setThreats(response.data);
      // setStats(response.stats);

      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Filter mock data based on view mode
      let filteredThreats = [...mockThreats];

      if (viewMode === 'open') {
        filteredThreats = filteredThreats.filter(t => t.status === 'new');
      } else if (viewMode === 'in_progress') {
        filteredThreats = filteredThreats.filter(t => t.status === 'in_progress');
      } else if (viewMode === 'resolved') {
        filteredThreats = filteredThreats.filter(t => t.status === 'resolved');
      } else if (viewMode === 'false_positive') {
        filteredThreats = filteredThreats.filter(t => t.status === 'false_positive');
      }

      // Apply search text filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredThreats = filteredThreats.filter(threat => 
          threat.title.toLowerCase().includes(searchLower) || 
          threat.description.toLowerCase().includes(searchLower) ||
          (threat.cveId && threat.cveId.toLowerCase().includes(searchLower)) ||
          threat.iocs.ipAddresses.some(ip => ip.includes(searchLower)) ||
          threat.iocs.domains.some(domain => domain.includes(searchLower)) ||
          threat.iocs.hashes.some(hash => hash.includes(searchLower))
        );
      }

      // Apply severity filter
      if (filters.severity.length > 0) {
        filteredThreats = filteredThreats.filter(threat => 
          filters.severity.includes(threat.severity)
        );
      }

      // Apply type filter
      if (filters.type.length > 0) {
        filteredThreats = filteredThreats.filter(threat => 
          filters.type.includes(threat.type)
        );
      }

      // Apply source filter
      if (filters.source.length > 0) {
        filteredThreats = filteredThreats.filter(threat => 
          filters.source.includes(threat.source)
        );
      }

      // Apply assigned filter
      if (filters.assigned.length > 0) {
        filteredThreats = filteredThreats.filter(threat => 
          (filters.assigned.includes('assigned') && threat.assignedTo) ||
          (filters.assigned.includes('unassigned') && !threat.assignedTo)
        );
      }

      // Apply tag filter
      if (filters.tag.length > 0) {
        filteredThreats = filteredThreats.filter(threat => 
          filters.tag.some(tag => threat.tags.includes(tag))
        );
      }

      // Calculate stats
      const newStats = {
        total: filteredThreats.length,
        critical: filteredThreats.filter(t => t.severity === 'critical').length,
        high: filteredThreats.filter(t => t.severity === 'high').length,
        medium: filteredThreats.filter(t => t.severity === 'medium').length,
        low: filteredThreats.filter(t => t.severity === 'low').length,
        new: filteredThreats.filter(t => t.status === 'new').length,
        in_progress: filteredThreats.filter(t => t.status === 'in_progress').length,
        resolved: filteredThreats.filter(t => t.status === 'resolved').length,
        false_positive: filteredThreats.filter(t => t.status === 'false_positive').length,
      };

      setThreats(filteredThreats);
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching threats:', error);
      enqueueSnackbar('Failed to load threats', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [viewMode, searchText, filters, enqueueSnackbar]);

  // Fetch threats on component mount and when filters change
  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  // Handle view mode change
  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      setSelectedThreats([]);
    }
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchText(event.target.value);
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
  };

  // Handle filter menu open
  const handleFilterMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle filter menu close
  const handleFilterMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle select all
  const handleSelectAll = (selected, selectedRows) => {
    if (selected) {
      const selectedIds = selectedRows.map(row => row.id);
      setSelectedThreats(selectedIds);
    } else {
      setSelectedThreats([]);
    }
  };

  // Handle select one
  const handleSelectOne = (id) => {
    const selectedIndex = selectedThreats.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedThreats, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedThreats.slice(1));
    } else if (selectedIndex === selectedThreats.length - 1) {
      newSelected = newSelected.concat(selectedThreats.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedThreats.slice(0, selectedIndex),
        selectedThreats.slice(selectedIndex + 1)
      );
    }

    setSelectedThreats(newSelected);
  };

  // Handle bulk action
  const handleBulkAction = (action) => {
    if (selectedThreats.length === 0) {
      enqueueSnackbar('Please select at least one threat', { variant: 'warning' });
      return;
    }

    if (action === 'delete') {
      setThreatsToDelete(selectedThreats);
      setDeleteDialogOpen(true);
    } else {
      // Handle other bulk actions (assign, change status, etc.)
      setBulkAction(action);
      // In a real app, this would be an API call
      enqueueSnackbar(`Bulk action "${action}" will be applied to ${selectedThreats.length} threats`, { 
        variant: 'info',
        action: (
          <Button 
            color="inherit" 
            size="small"
            onClick={() => {
              // Apply action
              enqueueSnackbar(`Action "${action}" applied to ${selectedThreats.length} threats`, { variant: 'success' });
              setSelectedThreats([]);
              setBulkAction(null);
            }}
          >
            Confirm
          </Button>
        ),
      });
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    // In a real app, this would be an API call
    setThreats(prev => prev.filter(t => !threatsToDelete.includes(t.id)));
    enqueueSnackbar(`Deleted ${threatsToDelete.length} threats`, { variant: 'success' });
    setSelectedThreats(prev => prev.filter(id => !threatsToDelete.includes(id)));
    setDeleteDialogOpen(false);
    setThreatsToDelete([]);
  };

  // Handle row click
  const handleRowClick = (threat) => {
    navigate(`/threats/${threat.id}`, { state: { threat } });
  };

  // Handle edit
  const handleEdit = (threat) => {
    navigate(`/threats/${threat.id}/edit`);
  };

  // Handle view
  const handleView = (threat) => {
    navigate(`/threats/${threat.id}`, { state: { threat } });
  };

  // Handle add new threat
  const handleAddNew = () => {
    navigate('/threats/new');
  };

  // Handle delete
  const handleDelete = (threat) => {
    setThreatsToDelete([threat.id]);
    setDeleteDialogOpen(true);
  };

  // Table columns
  const columns = [
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={500} noWrap>
            {row.title}
          </Typography>
          <Typography variant="caption" color="textSecondary" noWrap>
            {row.cveId || 'No CVE ID'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'severity',
      label: 'Severity',
      sortable: true,
      align: 'center',
      width: 120,
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      width: 140,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'type',
      label: 'Type',
      sortable: true,
      width: 140,
      render: (row) => <ThreatTypeChip type={row.type} />,
    },
    {
      id: 'detectedAt',
      label: 'Detected',
      sortable: true,
      type: 'datetime',
      width: 150,
      render: (row) => (
        <Typography variant="body2">
          {format(parseISO(row.detectedAt), 'MMM d, yyyy')}
          <Typography variant="caption" display="block" color="textSecondary">
            {format(parseISO(row.detectedAt), 'h:mm a')}
          </Typography>
        </Typography>
      ),
    },
    {
      id: 'source',
      label: 'Source',
      sortable: true,
      render: (row) => (
        <Chip
          label={row.source.charAt(0).toUpperCase() + row.source.slice(1)}
          size="small"
          variant="outlined"
          color={row.source === 'internal' ? 'primary' : 'default'}
        />
      ),
    },
    {
      id: 'assignedTo',
      label: 'Assigned To',
      sortable: true,
      render: (row) => (
        row.assignedTo ? (
          <Chip
            avatar={
              <Avatar sx={{ width: 24, height: 24 }}>
                {row.assignedTo.charAt(0).toUpperCase()}
              </Avatar>
            }
            label={row.assignedTo.replace('-', ' ')}
            size="small"
            variant="outlined"
          />
        ) : (
          <Chip
            label="Unassigned"
            size="small"
            variant="outlined"
            color="default"
          />
        )
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      sortable: false,
      width: 120,
    },
  ];

  // Bulk actions
  const bulkActions = [
    { id: 'assign', label: 'Assign', icon: <PersonIcon /> },
    { id: 'change_status', label: 'Change Status', icon: <EditIcon /> },
    { id: 'add_tag', label: 'Add Tag', icon: <CategoryIcon /> },
    { id: 'export', label: 'Export', icon: <FileDownloadIcon /> },
    { id: 'delete', label: 'Delete', icon: <DeleteIcon />, color: 'error' },
  ];

  // Filter options
  const filterOptions = {
    severity: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
    type: [
      { value: 'malware', label: 'Malware' },
      { value: 'phishing', label: 'Phishing' },
      { value: 'vulnerability', label: 'Vulnerability' },
      { value: 'intrusion', label: 'Intrusion' },
      { value: 'data_leak', label: 'Data Leak' },
      { value: 'ddos', label: 'DDoS' },
    ],
    source: [
      { value: 'internal', label: 'Internal' },
      { value: 'external', label: 'External' },
      { value: 'partner', label: 'Partner' },
      { value: 'automated', label: 'Automated' },
    ],
    assigned: [
      { value: 'assigned', label: 'Assigned' },
      { value: 'unassigned', label: 'Unassigned' },
    ],
    tag: [
      { value: 'critical', label: 'Critical' },
      { value: 'needs_review', label: 'Needs Review' },
      { value: 'escalated', label: 'Escalated' },
      { value: 'false_positive', label: 'False Positive' },
      { value: 'needs_triage', label: 'Needs Triage' },
    ],
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Security Threats
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/threats/new')}
            >
              New Threat
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => {}}
            >
              Import
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => {}}
            >
              Export
            </Button>
          </Box>
        </Box>
        
        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">Total Threats</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Last 30 days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">Critical</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h4" fontWeight="bold" color="error">
                    {stats.critical}
                  </Typography>
                  {stats.critical > 0 && (
                    <Chip 
                      label="+5 new" 
                      size="small" 
                      color="error" 
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">High</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.high}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InfoIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">Medium</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {stats.medium}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">Low</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.low}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="threat views"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="List View" />
            <Tab label="Map View" />
            <Tab label="Card View" disabled />
            <Tab label="Timeline" disabled />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">Threat Intelligence Dashboard</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleAddNew()}
            >
              Add Threat
            </Button>
          </Box>
          <DataTable
            columns={columns}
            data={threats}
            loading={loading}
            selectable={true}
            pagination={true}
            searchable={true}
            filterable={true}
            defaultSort="detectedAt"
            defaultOrder="desc"
            pageSize={10}
            title=""
            onRowClick={handleRowClick}
            onSelectionChange={setSelectedThreats}
            onRefresh={fetchThreats}
            onAdd={() => navigate('/threats/new')}
            onDeleteSelected={(ids) => {
              setThreatsToDelete(ids);
              setDeleteDialogOpen(true);
            }}
            onEdit={handleEdit}
            onView={handleView}
            actions={[
              { type: 'view' },
              { type: 'edit' },
              { type: 'delete' },
            ]}
            emptyMessage="No threats found. Try adjusting your filters or create a new threat."
            searchPlaceholder="Search threats by title, CVE ID, or IOC..."
            showToolbar={true}
            showTotal={true}
            dense={false}
            stickyHeader={true}
            elevation={1}
            sx={{
              '& .MuiDataGrid-root': {
                border: 'none',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.background.paper,
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `1px solid ${theme.palette.divider}`,
              },
            }}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              Threat Map View
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Visualize threat locations on an interactive map. Click on any marker to see threat details.
            </Typography>
          </Box>
          <MapView 
            threats={threats} 
            loading={loading} 
            filters={filters}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Typography variant="h5" component="h1" gutterBottom>
            Card View
          </Typography>
          <Typography variant="body1">Card View - Coming Soon</Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Typography variant="h5" component="h1" gutterBottom>
            Timeline View
          </Typography>
          <Typography variant="body1">Timeline View - Coming Soon</Typography>
        </TabPanel>

        {/* Bulk Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleFilterMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {bulkActions.map((action) => (
            <MenuItem 
              key={action.id}
              onClick={() => {
                handleBulkAction(action.id);
                handleFilterMenuClose();
              }}
              sx={{ color: action.color || 'inherit' }}
            >
              <ListItemIcon sx={{ color: action.color || 'inherit' }}>
                {action.icon}
              </ListItemIcon>
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {threatsToDelete.length > 1 ? 'Delete Selected Threats?' : 'Delete Threat?'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {threatsToDelete.length > 1
                ? `Are you sure you want to delete ${threatsToDelete.length} selected threats? This action cannot be undone.`
                : 'Are you sure you want to delete this threat? This action cannot be undone.'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              autoFocus
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Threats;
