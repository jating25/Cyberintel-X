import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
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
  FormHelperText,
  FormControlLabel,
  Switch,
  Autocomplete,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  HelpOutline as HelpOutlineIcon,
  Security as SecurityIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../context/AuthContext';
import { threatAPI } from '../../services/api';

// Form validation schema
const threatSchema = yup.object().shape({
  geo: yup.object({
    country: yup.string().max(100, 'Country name too long').nullable(),
    city: yup.string().max(100, 'City name too long').nullable(),
    latitude: yup.number().nullable(),
    longitude: yup.number().nullable(),
  }),
  title: yup.string().required('Title is required').max(200, 'Title is too long'),
  description: yup.string().required('Description is required'),
  severity: yup.string().required('Severity is required').oneOf(
    ['low', 'medium', 'high', 'critical'],
    'Invalid severity level'
  ),
  status: yup.string().required('Status is required').oneOf(
    ['new', 'in_progress', 'resolved', 'false_positive'],
    'Invalid status'
  ),
  type: yup.string().required('Type is required').oneOf(
    ['malware', 'phishing', 'vulnerability', 'intrusion', 'data_leak', 'ddos'],
    'Invalid threat type'
  ),
  source: yup.string().required('Source is required').oneOf(
    ['internal', 'external', 'partner', 'automated'],
    'Invalid source'
  ),
  detectedAt: yup.date().required('Detection date is required'),
  affectedAssets: yup.number().min(0, 'Must be 0 or more').required('Required'),
  cveId: yup.string().matches(
    /^CVE-\d{4}-\d{4,}$/,
    'Must be a valid CVE ID (e.g., CVE-2023-12345)'
  ).nullable(),
  cvssScore: yup.number().min(0, 'Must be 0 or higher').max(10, 'Must be 10 or lower').nullable(),
  remediation: yup.string(),
  references: yup.array().of(
    yup.string().url('Must be a valid URL')
  ),
  tags: yup.array().of(yup.string()),
  iocs: yup.object({
    ipAddresses: yup.array().of(
      yup.string().matches(
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        'Must be a valid IP address'
      )
    ),
    domains: yup.array().of(
      yup.string().matches(
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
        'Must be a valid domain'
      )
    ),
    hashes: yup.array().of(
      yup.string().matches(
        /^[a-f0-9]{32,}$/i,
        'Must be a valid hash (MD5, SHA-1, SHA-256, etc.)'
      )
    ),
    urls: yup.array().of(
      yup.string().url('Must be a valid URL')
    ),
  }),
  mitreTactics: yup.array().of(yup.string()),
  mitreTechniques: yup.array().of(yup.string()),
  isFalsePositive: yup.boolean(),
  isCritical: yup.boolean(),
  requiresImmediateAction: yup.boolean(),
  assignedTo: yup.string().nullable(),
  notes: yup.string(),
});

// Default form values
const defaultValues = {
  geo: {
    country: '',
    city: '',
    latitude: null,
    longitude: null,
  },
  title: '',
  description: '',
  severity: 'medium',
  status: 'new',
  type: 'vulnerability',
  source: 'internal',
  detectedAt: new Date(),
  affectedAssets: 1,
  cveId: null,
  cvssScore: null,
  remediation: '',
  references: [],
  tags: [],
  iocs: {
    ipAddresses: [],
    domains: [],
    hashes: [],
    urls: [],
  },
  mitreTactics: [],
  mitreTechniques: [],
  isFalsePositive: false,
  isCritical: false,
  requiresImmediateAction: false,
  assignedTo: null,
  notes: '',
};

// Available options for dropdowns
const formOptions = {
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
  mitreTechniques: [
    'Spearphishing Attachment',
    'PowerShell',
    'Scheduled Task',
    'Registry Run Keys',
    'Process Injection',
    'Obfuscated Files',
    'Credential Dumping',
    'Network Service Scanning',
    'Remote Desktop Protocol',
    'Data Compressed',
    'Standard Application Layer Protocol',
    'Data Encrypted',
    'Data Destruction',
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

const ThreatForm = ({ 
  initialValues = null, 
  onSuccess, 
  onCancel,
  mode = 'create', // 'create' or 'edit'
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    details: false,
    iocs: false,
    mitre: false,
    notes: false,
  });

  // Initialize form with react-hook-form
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(threatSchema),
    defaultValues: initialValues || defaultValues,
  });

  // Watch values for conditional rendering
  const severity = watch('severity');
  const status = watch('status');
  const type = watch('type');
  const isFalsePositive = watch('isFalsePositive');
  const requiresImmediateAction = watch('requiresImmediateAction');

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // In a real app, this would be an API call
      // const response = mode === 'create' 
      //   ? await threatAPI.createThreat(data)
      //   : await threatAPI.updateThreat(initialValues.id, data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      enqueueSnackbar(
        `Threat ${mode === 'create' ? 'created' : 'updated'} successfully`,
        { variant: 'success' }
      );
      
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error submitting threat:', error);
      enqueueSnackbar(
        error.response?.data?.message || `Failed to ${mode} threat`,
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle section toggle
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle next step in the form
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  // Handle previous step in the form
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Handle array field updates (tags, IOCs, etc.)
  const handleArrayFieldChange = (fieldName, value) => {
    const currentValues = watch(fieldName) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    setValue(fieldName, newValues, { shouldDirty: true });
  };

  // Handle IOC array updates
  const handleIocArrayChange = (iocType, value, index) => {
    const currentIocs = watch('iocs') || {};
    const currentValues = [...(currentIocs[iocType] || [])];
    
    if (index !== undefined) {
      // Update existing value
      currentValues[index] = value;
    } else if (value) {
      // Add new value if not empty
      currentValues.push(value);
    }
    
    setValue('iocs', {
      ...currentIocs,
      [iocType]: currentValues.filter(Boolean), // Remove empty strings
    }, { shouldDirty: true });
  };

  // Handle IOC removal
  const handleIocRemove = (iocType, index) => {
    const currentIocs = watch('iocs') || {};
    const currentValues = [...(currentIocs[iocType] || [])];
    currentValues.splice(index, 1);
    
    setValue('iocs', {
      ...currentIocs,
      [iocType]: currentValues,
    }, { shouldDirty: true });
  };

  // Render form steps
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Title"
                      fullWidth
                      margin="normal"
                      error={!!errors.title}
                      helperText={errors.title?.message}
                      required
                    />
                  )}
                />
                
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={4}
                      margin="normal"
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      required
                    />
                  )}
                />
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Controller
                      name="severity"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth margin="normal" error={!!errors.severity}>
                          <InputLabel>Severity *</InputLabel>
                          <Select {...field} label="Severity *">
                            {formOptions.severity.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: {
                                        critical: 'error.main',
                                        high: 'warning.main',
                                        medium: 'info.main',
                                        low: 'success.main',
                                      }[option.value] || 'grey.500',
                                      mr: 1,
                                    }}
                                  />
                                  {option.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.severity && (
                            <FormHelperText>{errors.severity.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth margin="normal" error={!!errors.status}>
                          <InputLabel>Status *</InputLabel>
                          <Select {...field} label="Status *">
                            {formOptions.status.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.status && (
                            <FormHelperText>{errors.status.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth margin="normal" error={!!errors.type}>
                          <InputLabel>Type *</InputLabel>
                          <Select {...field} label="Type *">
                            {formOptions.type.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.type && (
                            <FormHelperText>{errors.type.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Controller
                      name="source"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth margin="normal" error={!!errors.source}>
                          <InputLabel>Source *</InputLabel>
                          <Select {...field} label="Source *">
                            {formOptions.source.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.source && (
                            <FormHelperText>{errors.source.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Controller
                      name="detectedAt"
                      control={control}
                      render={({ field }) => (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Detection Date *"
                            value={field.value}
                            onChange={(newValue) => {
                              field.onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                margin="normal"
                                error={!!errors.detectedAt}
                                helperText={errors.detectedAt?.message}
                              />
                            )}
                          />
                        </LocalizationProvider>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Controller
                      name="affectedAssets"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Affected Assets"
                          type="number"
                          fullWidth
                          margin="normal"
                          error={!!errors.affectedAssets}
                          helperText={errors.affectedAssets?.message}
                          InputProps={{
                            inputProps: { min: 0 },
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader 
                    title="Threat Details" 
                    avatar={<SecurityIcon color="primary" />}
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Severity
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: {
                              critical: 'error.main',
                              high: 'warning.main',
                              medium: 'info.main',
                              low: 'success.main',
                            }[severity] || 'grey.500',
                            mr: 1,
                          }}
                        />
                        <Typography variant="body1" fontWeight="medium">
                          {severity?.charAt(0).toUpperCase() + severity?.slice(1) || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Status
                      </Typography>
                      <Chip 
                        label={status?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A'}
                        size="small"
                        color={
                          status === 'new' ? 'primary' :
                          status === 'in_progress' ? 'info' :
                          status === 'resolved' ? 'success' :
                          'default'
                        }
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Type
                      </Typography>
                      <Chip 
                        label={type?.charAt(0).toUpperCase() + type?.slice(1) || 'N/A'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Controller
                      name="isFalsePositive"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              color="secondary"
                            />
                          }
                          label="Mark as False Positive"
                          sx={{ mb: 1 }}
                        />
                      )}
                    />
                    
                    <Controller
                      name="requiresImmediateAction"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              color="error"
                            />
                          }
                          label="Requires Immediate Action"
                        />
                      )}
                    />
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardHeader 
                    title="MITRE ATT&CK" 
                    avatar={<SecurityIcon color="secondary" />}
                    titleTypographyProps={{ variant: 'subtitle1' }}
                    action={
                      <IconButton size="small" onClick={() => toggleSection('mitre')}>
                        {expandedSections.mitre ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    }
                    sx={{ py: 1, bgcolor: 'action.hover' }}
                  />
                  <Collapse in={expandedSections.mitre}>
                    <CardContent>
                      <Controller
                        name="mitreTactics"
                        control={control}
                        render={({ field }) => (
                          <Autocomplete
                            multiple
                            options={formOptions.mitreTactics}
                            value={field.value || []}
                            onChange={(_, newValue) => {
                              field.onChange(newValue);
                            }}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  label={option}
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                />
                              ))
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="MITRE ATT&CK Tactics"
                                placeholder="Select tactics..."
                                margin="normal"
                                fullWidth
                              />
                            )}
                          />
                        )}
                      />
                      
                      <Controller
                        name="mitreTechniques"
                        control={control}
                        render={({ field }) => (
                          <Autocomplete
                            multiple
                            options={formOptions.mitreTechniques}
                            value={field.value || []}
                            onChange={(_, newValue) => {
                              field.onChange(newValue);
                            }}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  label={option}
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                />
                              ))
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="MITRE ATT&CK Techniques"
                                placeholder="Select techniques..."
                                margin="normal"
                                fullWidth
                              />
                            )}
                          />
                        )}
                      />
                    </CardContent>
                  </Collapse>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                onClick={onCancel}
                startIcon={<CancelIcon />}
                sx={{ mr: 2 }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<ArrowRightIcon />}
                disabled={loading}
              >
                Next
              </Button>
            </Box>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Indicators of Compromise (IOCs)
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader 
                    title="IP Addresses" 
                    subheader="Add IP addresses associated with the threat"
                    action={
                      <Button 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => handleIocArrayChange('ipAddresses', '')}
                      >
                        Add IP
                      </Button>
                    }
                  />
                  <CardContent>
                    {watch('iocs.ipAddresses')?.map((ip, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={ip}
                          onChange={(e) => handleIocArrayChange('ipAddresses', e.target.value, index)}
                          placeholder="e.g., 192.168.1.1"
                          error={!!errors.iocs?.ipAddresses?.[index]}
                          helperText={errors.iocs?.ipAddresses?.[index]?.message}
                        />
                        <IconButton 
                          onClick={() => handleIocRemove('ipAddresses', index)}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {(!watch('iocs.ipAddresses') || watch('iocs.ipAddresses').length === 0) && (
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                        No IP addresses added yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader 
                    title="Domains" 
                    subheader="Add domains associated with the threat"
                    action={
                      <Button 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => handleIocArrayChange('domains', '')}
                      >
                        Add Domain
                      </Button>
                    }
                  />
                  <CardContent>
                    {watch('iocs.domains')?.map((domain, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={domain}
                          onChange={(e) => handleIocArrayChange('domains', e.target.value, index)}
                          placeholder="e.g., example.com"
                          error={!!errors.iocs?.domains?.[index]}
                          helperText={errors.iocs?.domains?.[index]?.message}
                        />
                        <IconButton 
                          onClick={() => handleIocRemove('domains', index)}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {(!watch('iocs.domains') || watch('iocs.domains').length === 0) && (
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                        No domains added yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader 
                    title="Hashes" 
                    subheader="Add file hashes associated with the threat"
                    action={
                      <Button 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => handleIocArrayChange('hashes', '')}
                      >
                        Add Hash
                      </Button>
                    }
                  />
                  <CardContent>
                    {watch('iocs.hashes')?.map((hash, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={hash}
                          onChange={(e) => handleIocArrayChange('hashes', e.target.value, index)}
                          placeholder="e.g., 44d88612fea8a8f36de82e1278abb02f"
                          error={!!errors.iocs?.hashes?.[index]}
                          helperText={errors.iocs?.hashes?.[index]?.message}
                        />
                        <IconButton 
                          onClick={() => handleIocRemove('hashes', index)}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {(!watch('iocs.hashes') || watch('iocs.hashes').length === 0) && (
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                        No hashes added yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardHeader 
                    title="URLs" 
                    subheader="Add URLs associated with the threat"
                    action={
                      <Button 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => handleIocArrayChange('urls', '')}
                      >
                        Add URL
                      </Button>
                    }
                  />
                  <CardContent>
                    {watch('iocs.urls')?.map((url, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={url}
                          onChange={(e) => handleIocArrayChange('urls', e.target.value, index)}
                          placeholder="e.g., https://example.com/malware"
                          error={!!errors.iocs?.urls?.[index]}
                          helperText={errors.iocs?.urls?.[index]?.message}
                        />
                        <IconButton 
                          onClick={() => handleIocRemove('urls', index)}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {(!watch('iocs.urls') || watch('iocs.urls').length === 0) && (
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                        No URLs added yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                onClick={handleBack}
                startIcon={<ArrowLeftIcon />}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<ArrowRightIcon />}
                disabled={loading}
              >
                Next
              </Button>
            </Box>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="cveId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="CVE ID"
                      fullWidth
                      margin="normal"
                      placeholder="e.g., CVE-2023-12345"
                      error={!!errors.cveId}
                      helperText={errors.cveId?.message || 'Optional: Associate with a CVE'}
                    />
                  )}
                />
                
                <Controller
                  name="cvssScore"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="CVSS Score"
                      type="number"
                      fullWidth
                      margin="normal"
                      placeholder="e.g., 7.5"
                      error={!!errors.cvssScore}
                      helperText={errors.cvssScore?.message || 'Optional: CVSS v3.1 Base Score (0-10)'}
                      InputProps={{
                        inputProps: { 
                          min: 0, 
                          max: 10,
                          step: 0.1,
                        },
                      }}
                    />
                  )}
                />
                
                <Controller
                  name="remediation"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Remediation Steps"
                      fullWidth
                      multiline
                      rows={4}
                      margin="normal"
                      placeholder="Describe the steps to remediate this threat..."
                      error={!!errors.remediation}
                      helperText={errors.remediation?.message}
                    />
                  )}
                />
                
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formOptions.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag.replace(/_/g, ' ')}
                        size="small"
                        onClick={() => handleArrayFieldChange('tags', tag)}
                        color={watch('tags')?.includes(tag) ? 'primary' : 'default'}
                        variant={watch('tags')?.includes(tag) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="references"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        References
                      </Typography>
                      {field.value?.map((ref, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            value={ref}
                            onChange={(e) => {
                              const newRefs = [...field.value];
                              newRefs[index] = e.target.value;
                              field.onChange(newRefs);
                            }}
                            placeholder="https://example.com/reference"
                            error={!!errors.references?.[index]}
                            helperText={errors.references?.[index]?.message}
                          />
                          <IconButton 
                            onClick={() => {
                              const newRefs = field.value.filter((_, i) => i !== index);
                              field.onChange(newRefs);
                            }}
                            color="error"
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={() => {
                          field.onChange([...(field.value || []), '']);
                        }}
                        sx={{ mt: 1 }}
                      >
                        Add Reference
                      </Button>
                    </Box>
                  )}
                />
                
                <Box sx={{ mt: 3 }}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Internal Notes"
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                        placeholder="Add any internal notes or comments..."
                        error={!!errors.notes}
                        helperText={errors.notes?.message}
                      />
                    )}
                  />
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Controller
                    name="assignedTo"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Assigned To</InputLabel>
                        <Select
                          {...field}
                          label="Assigned To"
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Unassigned</em>
                          </MenuItem>
                          <MenuItem value="security-team">Security Team</MenuItem>
                          <MenuItem value="incident-response">Incident Response</MenuItem>
                          <MenuItem value="it-support">IT Support</MenuItem>
                          <MenuItem value="network-team">Network Team</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                onClick={handleBack}
                startIcon={<ArrowLeftIcon />}
                disabled={loading}
              >
                Back
              </Button>
              <Box>
                <Button
                  onClick={onCancel}
                  startIcon={<CancelIcon />}
                  sx={{ mr: 2 }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {mode === 'create' ? 'Create Threat' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </Box>
        );
        
      default:
        return 'Unknown step';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Basic Information</StepLabel>
          </Step>
          <Step>
            <StepLabel>IOCs</StepLabel>
          </Step>
          <Step>
            <StepLabel>Additional Details</StepLabel>
          </Step>
        </Stepper>
        
        {renderStepContent(activeStep)}
      </Paper>
    </form>
  );
};

export default ThreatForm;
