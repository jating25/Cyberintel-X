import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Paper, 
  Typography, 
  Divider, 
  Chip, 
  FormControlLabel, 
  Switch, 
  Collapse,
  IconButton,
  Tooltip,
  ClickAwayListener,
  Popper,
  Fade,
  Checkbox,
  ListItemText,
  FormGroup,
  Slider,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DateRange as DateRangeIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays } from 'date-fns';

// Available filter options
const filterOptions = {
  severity: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ],
  status: [
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'false_positive', label: 'False Positive' },
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
  mitreTactics: [
    'Reconnaissance',
    'Resource Development',
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Command and Control',
    'Exfiltration',
    'Impact',
  ],
  tags: [
    'critical',
    'needs_review',
    'escalated',
    'false_positive',
    'needs_triage',
    'exploited',
    'ransomware',
    'zero_day',
    'credential_stuffing',
    'insider_threat',
  ],
};

// Date range presets
const dateRanges = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom range', value: 'custom' },
];

const ThreatFilter = ({ onFilterChange, initialFilters = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for filter values
  const [filters, setFilters] = useState({
    search: '',
    severity: [],
    status: [],
    type: [],
    source: [],
    tags: [],
    mitreTactics: [],
    cvssScore: [0, 10],
    dateRange: '7d',
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
    hasIoc: null,
    isFalsePositive: null,
    isCritical: null,
    requiresImmediateAction: null,
    assignedTo: [],
    ...initialFilters,
  });
  
  // State for UI
  const [expanded, setExpanded] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  
  // Handle filter change
  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Handle date range change
  const handleDateRangeChange = (range) => {
    const today = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '24h':
        startDate.setDate(today.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'custom':
      default:
        // Keep existing dates for custom range
        startDate = filters.startDate || today;
        break;
    }
    
    const newFilters = {
      ...filters,
      dateRange: range,
      startDate,
      endDate: range === 'custom' ? filters.endDate : today,
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Handle custom date change
  const handleCustomDateChange = (name, date) => {
    const newFilters = {
      ...filters,
      [name]: date,
      dateRange: 'custom',
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Handle CVSS score change
  const handleCvssScoreChange = (event, newValue) => {
    handleFilterChange('cvssScore', newValue);
  };
  
  // Toggle filter value in array
  const toggleArrayValue = (name, value) => {
    const currentValues = filters[name] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    handleFilterChange(name, newValues);
  };
  
  // Toggle boolean filter
  const toggleBooleanFilter = (name) => {
    handleFilterChange(name, filters[name] === null ? true : filters[name] === true ? false : null);
  };
  
  // Reset all filters
  const resetFilters = () => {
    const newFilters = {
      search: '',
      severity: [],
      status: [],
      type: [],
      source: [],
      tags: [],
      mitreTactics: [],
      cvssScore: [0, 10],
      dateRange: '7d',
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
      hasIoc: null,
      isFalsePositive: null,
      isCritical: null,
      requiresImmediateAction: null,
      assignedTo: [],
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Open filter popover
  const openFilter = (event, filterName) => {
    setAnchorEl(event.currentTarget);
    setActiveFilter(filterName);
  };
  
  // Close filter popover
  const closeFilter = () => {
    setAnchorEl(null);
    setActiveFilter(null);
  };
  
  // Check if any filters are active
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'dateRange' || key === 'startDate' || key === 'endDate') {
      return false; // Skip date range fields
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (typeof value === 'boolean') {
      return value !== null;
    }
    
    return !!value;
  });
  
  // Render filter chips
  const renderFilterChips = () => {
    const chips = [];
    
    // Search
    if (filters.search) {
      chips.push({
        label: `Search: ${filters.search}`,
        onDelete: () => handleFilterChange('search', ''),
      });
    }
    
    // Severity
    if (filters.severity?.length > 0) {
      chips.push({
        label: `Severity: ${filters.severity.length} selected`,
        onDelete: () => handleFilterChange('severity', []),
      });
    }
    
    // Status
    if (filters.status?.length > 0) {
      chips.push({
        label: `Status: ${filters.status.length} selected`,
        onDelete: () => handleFilterChange('status', []),
      });
    }
    
    // Type
    if (filters.type?.length > 0) {
      chips.push({
        label: `Type: ${filters.type.length} selected`,
        onDelete: () => handleFilterChange('type', []),
      });
    }
    
    // Source
    if (filters.source?.length > 0) {
      chips.push({
        label: `Source: ${filters.source.length} selected`,
        onDelete: () => handleFilterChange('source', []),
      });
    }
    
    // Tags
    if (filters.tags?.length > 0) {
      chips.push({
        label: `Tags: ${filters.tags.length} selected`,
        onDelete: () => handleFilterChange('tags', []),
      });
    }
    
    // MITRE Tactics
    if (filters.mitreTactics?.length > 0) {
      chips.push({
        label: `MITRE: ${filters.mitreTactics.length} selected`,
        onDelete: () => handleFilterChange('mitreTactics', []),
      });
    }
    
    // CVSS Score
    if (filters.cvssScore && (filters.cvssScore[0] > 0 || filters.cvssScore[1] < 10)) {
      chips.push({
        label: `CVSS: ${filters.cvssScore[0]} - ${filters.cvssScore[1]}`,
        onDelete: () => handleFilterChange('cvssScore', [0, 10]),
      });
    }
    
    // Date Range
    if (filters.dateRange !== '7d') {
      const formatDate = (date) => format(date, 'MMM d, yyyy');
      chips.push({
        label: `Date: ${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`,
        onDelete: () => handleDateRangeChange('7d'),
      });
    }
    
    // Boolean filters
    const booleanFilters = [
      { key: 'hasIoc', label: 'Has IOCs' },
      { key: 'isFalsePositive', label: 'False Positive' },
      { key: 'isCritical', label: 'Critical' },
      { key: 'requiresImmediateAction', label: 'Requires Action' },
    ];
    
    booleanFilters.forEach(({ key, label }) => {
      if (filters[key] !== null) {
        chips.push({
          label: `${label}: ${filters[key] ? 'Yes' : 'No'}`,
          onDelete: () => handleFilterChange(key, null),
        });
      }
    });
    
    // Assigned To
    if (filters.assignedTo?.length > 0) {
      chips.push({
        label: `Assigned: ${filters.assignedTo.length} selected`,
        onDelete: () => handleFilterChange('assignedTo', []),
      });
    }
    
    return chips;
  };
  
  // Render filter popover content
  const renderFilterContent = () => {
    if (!activeFilter) return null;
    
    const commonProps = {
      sx: { minWidth: 250, p: 2 },
    };
    
    switch (activeFilter) {
      case 'severity':
        return (
          <Box {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Severity
            </Typography>
            <FormGroup>
              {filterOptions.severity.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={filters.severity?.includes(option.value)}
                      onChange={() => toggleArrayValue('severity', option.value)}
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: {
                            critical: theme.palette.error.main,
                            high: theme.palette.warning.main,
                            medium: theme.palette.info.main,
                            low: theme.palette.success.main,
                          }[option.value] || 'grey.500',
                          mr: 1,
                        }}
                      />
                      {option.label}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        );
        
      case 'status':
        return (
          <Box {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Status
            </Typography>
            <FormGroup>
              {filterOptions.status.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={filters.status?.includes(option.value)}
                      onChange={() => toggleArrayValue('status', option.value)}
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </Box>
        );
        
      case 'type':
        return (
          <Box {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Type
            </Typography>
            <FormGroup>
              {filterOptions.type.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={filters.type?.includes(option.value)}
                      onChange={() => toggleArrayValue('type', option.value)}
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </Box>
        );
        
      case 'source':
        return (
          <Box {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Source
            </Typography>
            <FormGroup>
              {filterOptions.source.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={filters.source?.includes(option.value)}
                      onChange={() => toggleArrayValue('source', option.value)}
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </Box>
        );
        
      case 'date':
        return (
          <Box {...commonProps} sx={{ minWidth: 300, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Date Range
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              {dateRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={filters.dateRange === range.value ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleDateRangeChange(range.value)}
                  sx={{ mr: 1, mb: 1 }}
                  fullWidth={range.value === 'custom'}
                >
                  {range.label}
                </Button>
              ))}
            </Box>
            
            {filters.dateRange === 'custom' && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleCustomDateChange('startDate', date)}
                    maxDate={filters.endDate || new Date()}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        fullWidth
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <DateRangeIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleCustomDateChange('endDate', date)}
                    minDate={filters.startDate}
                    maxDate={new Date()}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        fullWidth
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <DateRangeIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>
              </LocalizationProvider>
            )}
          </Box>
        );
        
      case 'cvss':
        return (
          <Box {...commonProps} sx={{ minWidth: 250, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by CVSS Score
            </Typography>
            
            <Box sx={{ px: 2, py: 3 }}>
              <Slider
                value={filters.cvssScore}
                onChange={handleCvssScoreChange}
                valueLabelDisplay="on"
                valueLabelFormat={(value) => value.toFixed(1)}
                min={0}
                max={10}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 10, label: '10' },
                ]}
                sx={{
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(90deg, #4caf50, #ffc107, #f44336)',
                    height: 6,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    height: 6,
                    opacity: 0.3,
                  },
                  '& .MuiSlider-thumb': {
                    width: 18,
                    height: 18,
                    marginTop: -6,
                  },
                }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  {filters.cvssScore[0].toFixed(1)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {filters.cvssScore[1].toFixed(1)}
                </Typography>
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => handleFilterChange('cvssScore', [0, 10])}
            >
              Reset
            </Button>
          </Box>
        );
        
      case 'tags':
        return (
          <Box {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflowY: 'auto', p: 1 }}>
              {filterOptions.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag.replace(/_/g, ' ')}
                  size="small"
                  onClick={() => toggleArrayValue('tags', tag)}
                  color={filters.tags?.includes(tag) ? 'primary' : 'default'}
                  variant={filters.tags?.includes(tag) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        );
        
      case 'mitre':
        return (
          <Box {...commonProps} sx={{ maxHeight: 300, overflowY: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by MITRE ATT&CK Tactics
            </Typography>
            <FormGroup>
              {filterOptions.mitreTactics.map((tactic) => (
                <FormControlLabel
                  key={tactic}
                  control={
                    <Checkbox
                      checked={filters.mitreTactics?.includes(tactic)}
                      onChange={() => toggleArrayValue('mitreTactics', tactic)}
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                    />
                  }
                  label={tactic}
                />
              ))}
            </FormGroup>
          </Box>
        );
        
      case 'boolean':
        return (
          <Box {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              Filter by Status
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.hasIoc === true}
                    indeterminate={filters.hasIoc === null}
                    onChange={() => toggleBooleanFilter('hasIoc')}
                    color="primary"
                    size="small"
                  />
                }
                label="Has IOCs"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.isFalsePositive === true}
                    indeterminate={filters.isFalsePositive === null}
                    onChange={() => toggleBooleanFilter('isFalsePositive')}
                    color="primary"
                    size="small"
                  />
                }
                label="False Positive"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.isCritical === true}
                    indeterminate={filters.isCritical === null}
                    onChange={() => toggleBooleanFilter('isCritical')}
                    color="primary"
                    size="small"
                  />
                }
                label="Critical"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.requiresImmediateAction === true}
                    indeterminate={filters.requiresImmediateAction === null}
                    onChange={() => toggleBooleanFilter('requiresImmediateAction')}
                    color="primary"
                    size="small"
                  />
                }
                label="Requires Immediate Action"
              />
            </FormGroup>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {/* Search field */}
        <TextField
          placeholder="Search threats..."
          variant="outlined"
          size="small"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          sx={{ flex: 1, minWidth: 200, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: filters.search && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => handleFilterChange('search', '')}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        {/* Filter buttons */}
        <Button
          variant={hasActiveFilters ? 'contained' : 'outlined'}
          color={hasActiveFilters ? 'primary' : 'inherit'}
          startIcon={<FilterListIcon />}
          onClick={() => setExpanded(!expanded)}
          sx={{ ml: 'auto' }}
        >
          Filters {hasActiveFilters ? `(${Object.keys(filters).filter(k => {
            const v = filters[k];
            if (k === 'dateRange' || k === 'startDate' || k === 'endDate') return false;
            if (Array.isArray(v)) return v.length > 0;
            if (typeof v === 'boolean') return v !== null;
            return !!v;
          }).length})` : ''}
        </Button>
        
        {/* Reset filters button */}
        {hasActiveFilters && (
          <Button
            variant="text"
            color="inherit"
            onClick={resetFilters}
            startIcon={<ClearIcon />}
          >
            Clear All
          </Button>
        )}
      </Box>
      
      {/* Active filters chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, minHeight: 32 }}>
        {renderFilterChips().map((chip, index) => (
          <Chip
            key={index}
            label={chip.label}
            onDelete={chip.onDelete}
            size="small"
            variant="outlined"
            sx={{ '& .MuiChip-deleteIcon': { ml: 0.5 } }}
          />
        ))}
      </Box>
      
      {/* Expanded filter panel */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.severity?.length > 0 ? 'contained' : 'outlined'}
                color={filters.severity?.length > 0 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'severity')}
                endIcon={activeFilter === 'severity' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Severity {filters.severity?.length > 0 ? `(${filters.severity.length})` : ''}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.status?.length > 0 ? 'contained' : 'outlined'}
                color={filters.status?.length > 0 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'status')}
                endIcon={activeFilter === 'status' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Status {filters.status?.length > 0 ? `(${filters.status.length})` : ''}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.type?.length > 0 ? 'contained' : 'outlined'}
                color={filters.type?.length > 0 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'type')}
                endIcon={activeFilter === 'type' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Type {filters.type?.length > 0 ? `(${filters.type.length})` : ''}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.source?.length > 0 ? 'contained' : 'outlined'}
                color={filters.source?.length > 0 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'source')}
                endIcon={activeFilter === 'source' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Source {filters.source?.length > 0 ? `(${filters.source.length})` : ''}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.dateRange !== '7d' ? 'contained' : 'outlined'}
                color={filters.dateRange !== '7d' ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'date')}
                endIcon={activeFilter === 'date' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Date
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.cvssScore[0] > 0 || filters.cvssScore[1] < 10 ? 'contained' : 'outlined'}
                color={filters.cvssScore[0] > 0 || filters.cvssScore[1] < 10 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'cvss')}
                endIcon={activeFilter === 'cvss' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                CVSS Score
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.tags?.length > 0 ? 'contained' : 'outlined'}
                color={filters.tags?.length > 0 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'tags')}
                endIcon={activeFilter === 'tags' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Tags {filters.tags?.length > 0 ? `(${filters.tags.length})` : ''}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={filters.mitreTactics?.length > 0 ? 'contained' : 'outlined'}
                color={filters.mitreTactics?.length > 0 ? 'primary' : 'inherit'}
                onClick={(e) => openFilter(e, 'mitre')}
                endIcon={activeFilter === 'mitre' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                MITRE {filters.mitreTactics?.length > 0 ? `(${filters.mitreTactics.length})` : ''}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={
                  filters.hasIoc !== null || 
                  filters.isFalsePositive !== null || 
                  filters.isCritical !== null || 
                  filters.requiresImmediateAction !== null 
                    ? 'contained' 
                    : 'outlined'
                }
                color={
                  filters.hasIoc !== null || 
                  filters.isFalsePositive !== null || 
                  filters.isCritical !== null || 
                  filters.requiresImmediateAction !== null 
                    ? 'primary' 
                    : 'inherit'
                }
                onClick={(e) => openFilter(e, 'boolean')}
                endIcon={activeFilter === 'boolean' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between' }}
              >
                Status
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>
      
      {/* Filter popover */}
      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="bottom-start"
        transition
        disablePortal
        sx={{ zIndex: theme.zIndex.modal }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <Paper 
              elevation={3} 
              sx={{ 
                mt: 1, 
                borderRadius: 1,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <ClickAwayListener onClickAway={closeFilter}>
                <Box>
                  {renderFilterContent()}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default ThreatFilter;
