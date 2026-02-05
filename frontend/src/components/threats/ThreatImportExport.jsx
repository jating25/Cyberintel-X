import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Publish as ImportIcon,
  GetApp as ExportIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  FileCopy as FileCopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useThreats } from '../../hooks/useThreats';
import { format } from 'date-fns';

// Available export formats
const exportFormats = [
  { value: 'csv', label: 'CSV (Comma Separated Values)' },
  { value: 'json', label: 'JSON (JavaScript Object Notation)' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'stix', label: 'STIX 2.0' },
  { value: 'misp', label: 'MISP' },
];

// Available import formats
const importFormats = [
  { value: 'csv', label: 'CSV (Comma Separated Values)', extensions: ['.csv'] },
  { value: 'json', label: 'JSON (JavaScript Object Notation)', extensions: ['.json'] },
  { value: 'xlsx', label: 'Excel (XLSX)', extensions: ['.xlsx', '.xls'] },
  { value: 'stix', label: 'STIX 2.0', extensions: ['.json'] },
  { value: 'misp', label: 'MISP', extensions: ['.json'] },
];

// Default export fields
const defaultExportFields = [
  { id: 'title', label: 'Title', selected: true },
  { id: 'description', label: 'Description', selected: true },
  { id: 'severity', label: 'Severity', selected: true },
  { id: 'status', label: 'Status', selected: true },
  { id: 'type', label: 'Type', selected: true },
  { id: 'source', label: 'Source', selected: true },
  { id: 'detectedAt', label: 'Detected At', selected: true },
  { id: 'cveId', label: 'CVE ID', selected: true },
  { id: 'cvssScore', label: 'CVSS Score', selected: true },
  { id: 'affectedAssets', label: 'Affected Assets', selected: true },
  { id: 'remediation', label: 'Remediation', selected: false },
  { id: 'mitreTactics', label: 'MITRE Tactics', selected: true },
  { id: 'mitreTechniques', label: 'MITRE Techniques', selected: true },
  { id: 'tags', label: 'Tags', selected: true },
  { id: 'isFalsePositive', label: 'False Positive', selected: true },
  { id: 'isCritical', label: 'Critical', selected: true },
  { id: 'requiresImmediateAction', label: 'Requires Action', selected: true },
  { id: 'assignedTo', label: 'Assigned To', selected: true },
  { id: 'createdAt', label: 'Created At', selected: true },
  { id: 'updatedAt', label: 'Updated At', selected: true },
];

// Default import mappings for CSV
const defaultCsvMappings = [
  { csvHeader: 'Title', field: 'title', required: true },
  { csvHeader: 'Description', field: 'description', required: true },
  { csvHeader: 'Severity', field: 'severity', required: true },
  { csvHeader: 'Status', field: 'status', required: true },
  { csvHeader: 'Type', field: 'type', required: true },
  { csvHeader: 'Source', field: 'source', required: false },
  { csvHeader: 'Detected Date', field: 'detectedAt', required: false },
  { csvHeader: 'CVE ID', field: 'cveId', required: false },
  { csvHeader: 'CVSS Score', field: 'cvssScore', required: false },
  { csvHeader: 'Affected Assets', field: 'affectedAssets', required: false },
  { csvHeader: 'Tags', field: 'tags', required: false },
];

// Validation rules for import
export const validateImportData = (data, format) => {
  const errors = [];
  const warnings = [];
  
  // Check if data is empty
  if (!data || (Array.isArray(data) && data.length === 0)) {
    errors.push('No data found in the import file');
    return { isValid: false, errors, warnings };
  }
  
  // Check each record
  data.forEach((record, index) => {
    // Check required fields
    if (!record.title) {
      errors.push(`Record ${index + 1}: Title is required`);
    }
    
    if (!record.severity) {
      errors.push(`Record ${index + 1}: Severity is required`);
    } else if (!['low', 'medium', 'high', 'critical'].includes(record.severity.toLowerCase())) {
      errors.push(`Record ${index + 1}: Invalid severity value '${record.severity}'. Must be one of: low, medium, high, critical`);
    }
    
    if (!record.status) {
      errors.push(`Record ${index + 1}: Status is required`);
    } else if (!['new', 'in_progress', 'resolved', 'false_positive'].includes(record.status.toLowerCase())) {
      errors.push(`Record ${index + 1}: Invalid status value '${record.status}'. Must be one of: new, in_progress, resolved, false_positive`);
    }
    
    if (!record.type) {
      errors.push(`Record ${index + 1}: Type is required`);
    }
    
    // Check dates
    if (record.detectedAt) {
      const date = new Date(record.detectedAt);
      if (isNaN(date.getTime())) {
        warnings.push(`Record ${index + 1}: Invalid date format for 'detectedAt'. Using current date.`);
        record.detectedAt = new Date().toISOString();
      } else {
        record.detectedAt = date.toISOString();
      }
    } else {
      record.detectedAt = new Date().toISOString();
    }
    
    // Convert numeric fields
    if (record.cvssScore) {
      const score = parseFloat(record.cvssScore);
      if (isNaN(score) || score < 0 || score > 10) {
        warnings.push(`Record ${index + 1}: Invalid CVSS score '${record.cvssScore}'. Must be a number between 0 and 10.`);
        record.cvssScore = null;
      } else {
        record.cvssScore = score;
      }
    }
    
    if (record.affectedAssets) {
      const count = parseInt(record.affectedAssets, 10);
      if (isNaN(count) || count < 0) {
        warnings.push(`Record ${index + 1}: Invalid affected assets count '${record.affectedAssets}'. Must be a positive integer.`);
        record.affectedAssets = 1;
      } else {
        record.affectedAssets = count;
      }
    } else {
      record.affectedAssets = 1;
    }
    
    // Convert string arrays
    if (typeof record.tags === 'string') {
      record.tags = record.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    } else if (!Array.isArray(record.tags)) {
      record.tags = [];
    }
    
    if (typeof record.mitreTactics === 'string') {
      record.mitreTactics = record.mitreTactics.split(',').map(t => t.trim()).filter(Boolean);
    } else if (!Array.isArray(record.mitreTactics)) {
      record.mitreTactics = [];
    }
    
    if (typeof record.mitreTechniques === 'string') {
      record.mitreTechniques = record.mitreTechniques.split(',').map(t => t.trim()).filter(Boolean);
    } else if (!Array.isArray(record.mitreTechniques)) {
      record.mitreTechniques = [];
    }
    
    // Set default values for optional fields
    if (!record.source) record.source = 'imported';
    if (record.isFalsePositive === undefined) record.isFalsePositive = false;
    if (record.isCritical === undefined) record.isCritical = false;
    if (record.requiresImmediateAction === undefined) record.requiresImmediateAction = false;
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? data : null,
  };
};

const ThreatImportExport = ({ open, onClose, selectedThreats = [] }) => {
  const theme = useTheme();
  const { exportThreats, importThreats } = useThreats();
  
  // State for export
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFields, setExportFields] = useState([...defaultExportFields]);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // State for import
  const [importFormat, setImportFormat] = useState('csv');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importMappings, setImportMappings] = useState([...defaultCsvMappings]);
  const [importOptions, setImportOptions] = useState({
    updateExisting: false,
    skipErrors: true,
    dryRun: true,
  });
  const [importProgress, setImportProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0,
    warnings: 0,
  });
  const [importResults, setImportResults] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // Refs
  const fileInputRef = useRef(null);
  
  // Dropzone configuration for file upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
  });
  
  // Handle file upload for import
  const handleFileUpload = (file) => {
    if (!file) return;
    
    setImportFile(file);
    
    // Read the file
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let data = [];
        
        // Parse based on file type
        if (file.name.endsWith('.csv')) {
          // For CSV, we'll just show the first few rows as preview
          const csvText = e.target.result;
          const lines = csvText.split('\n').slice(0, 6); // First 5 rows + header
          data = lines.map(line => {
            const values = line.split(',');
            return values.reduce((obj, val, idx) => {
              obj[`Column ${idx + 1}`] = val;
              return obj;
            }, {});
          });
          
          // Update mappings based on CSV headers
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim());
            const newMappings = headers.map((header, index) => {
              const existingMapping = importMappings.find(m => m.csvHeader === header);
              return existingMapping || {
                csvHeader: header,
                field: '',
                required: false,
              };
            });
            setImportMappings(newMappings);
          }
        } else if (file.name.endsWith('.json')) {
          // For JSON, parse and show first few records
          const jsonData = JSON.parse(e.target.result);
          data = Array.isArray(jsonData) ? jsonData.slice(0, 5) : [jsonData];
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // For Excel, we'll just show a message to use CSV for now
          data = [{ 'Note': 'Excel file selected. For better results, save as CSV and import that file.' }];
        }
        
        setImportPreview(data);
        setImportResults(null);
        setActiveStep(1); // Move to mapping step
      } catch (error) {
        console.error('Error parsing import file:', error);
        setImportResults({
          isValid: false,
          errors: [`Failed to parse file: ${error.message}`],
          warnings: [],
        });
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    }
  };
  
  // Handle import mapping change
  const handleMappingChange = (index, field, value) => {
    const newMappings = [...importMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setImportMappings(newMappings);
  };
  
  // Toggle export field selection
  const toggleExportField = (fieldId) => {
    setExportFields(prevFields =>
      prevFields.map(field =>
        field.id === fieldId ? { ...field, selected: !field.selected } : field
      )
    );
  };
  
  // Select all/none export fields
  const toggleAllExportFields = (selected) => {
    setExportFields(prevFields =>
      prevFields.map(field => ({ ...field, selected }))
    );
  };
  
  // Handle export
  const handleExport = async () => {
    try {
      setExportInProgress(true);
      setExportSuccess(false);
      
      const selectedFieldIds = exportFields
        .filter(field => field.selected)
        .map(field => field.id);
      
      await exportThreats(exportFormat, selectedThreats.length > 0 ? selectedThreats : undefined, selectedFieldIds);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportInProgress(false);
    }
  };
  
  // Handle import
  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      setImportProgress({
        total: 0,
        processed: 0,
        success: 0,
        errors: 0,
        warnings: 0,
      });
      
      setActiveStep(2); // Move to progress step
      
      // In a real app, this would be an API call
      // For now, we'll simulate the import with a timeout
      const result = await new Promise((resolve) => {
        setTimeout(() => {
          const mockResults = {
            total: 10,
            imported: 8,
            updated: 2,
            errors: 0,
            warnings: 2,
            details: [
              { id: 1, status: 'success', message: 'Threat imported successfully' },
              { id: 2, status: 'success', message: 'Threat imported successfully' },
              { id: 3, status: 'success', message: 'Threat imported successfully' },
              { id: 4, status: 'success', message: 'Threat imported successfully' },
              { id: 5, status: 'success', message: 'Threat imported successfully' },
              { id: 6, status: 'success', message: 'Threat imported successfully' },
              { id: 7, status: 'success', message: 'Threat imported successfully' },
              { id: 8, status: 'success', message: 'Threat imported successfully' },
              { id: 9, status: 'warning', message: 'Missing required field: severity' },
              { id: 10, status: 'warning', message: 'Invalid date format, using current date' },
            ],
          };
          
          // Simulate progress updates
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            
            setImportProgress({
              total: 10,
              processed: Math.min(progress, 10),
              success: Math.min(progress, 8),
              errors: 0,
              warnings: progress >= 9 ? 2 : 0,
            });
            
            if (progress >= 10) {
              clearInterval(interval);
              resolve(mockResults);
            }
          }, 300);
        }, 1000);
      });
      
      setImportResults(result);
      setActiveStep(3); // Move to results step
    } catch (error) {
      console.error('Import failed:', error);
      setImportResults({
        total: 0,
        imported: 0,
        updated: 0,
        errors: 1,
        warnings: 0,
        details: [
          { status: 'error', message: `Import failed: ${error.message}` },
        ],
      });
      setActiveStep(3); // Move to results step
    }
  };
  
  // Reset import
  const resetImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportMappings([...defaultCsvMappings]);
    setImportResults(null);
    setActiveStep(0);
  };
  
  // Handle close dialog
  const handleClose = () => {
    resetImport();
    onClose();
  };
  
  // Render export tab
  const renderExportTab = () => (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Export {selectedThreats.length > 0 ? `${selectedThreats.length} selected` : 'all'} threats
      </Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel>Export Format</InputLabel>
        <Select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          label="Export Format"
        >
          {exportFormats.map(format => (
            <MenuItem key={format.value} value={format.value}>
              {format.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Box sx={{ mt: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">Select Fields to Export</Typography>
          <Box>
            <Button 
              size="small" 
              onClick={() => toggleAllExportFields(true)}
              sx={{ mr: 1 }}
            >
              Select All
            </Button>
            <Button 
              size="small" 
              onClick={() => toggleAllExportFields(false)}
            >
              Deselect All
            </Button>
          </Box>
        </Box>
        
        <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
          <Grid container spacing={1}>
            {exportFields.map((field) => (
              <Grid item xs={12} sm={6} key={field.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.selected}
                      onChange={() => toggleExportField(field.id)}
                      size="small"
                    />
                  }
                  label={field.label}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={exportInProgress ? <CircularProgress size={20} /> : <CloudDownloadIcon />}
          onClick={handleExport}
          disabled={exportInProgress || exportFields.every(f => !f.selected)}
        >
          {exportInProgress ? 'Exporting...' : 'Export'}
        </Button>
      </Box>
      
      {exportSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Export completed successfully!
        </Alert>
      )}
    </Box>
  );
  
  // Render import tab
  const renderImportTab = () => (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 2 }}>
        {/* Step 1: Upload File */}
        <Step key="upload" expanded={activeStep >= 0}>
          <StepLabel>Upload File</StepLabel>
          <StepContent>
            <Box
              {...getRootProps()}
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 1,
                p: 4,
                textAlign: 'center',
                backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon fontSize="large" color="action" sx={{ mb: 1 }} />
              <Typography variant="body1" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag and drop a file here, or click to select'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: .csv, .json, .xlsx
              </Typography>
              {importFile && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={importFile.name}
                    onDelete={() => setImportFile(null)}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => activeStep > 0 ? setActiveStep(1) : null}
                disabled={!importFile}
                startIcon={activeStep === 0 ? <ArrowForwardIcon /> : null}
              >
                {activeStep === 0 ? 'Continue' : 'Next'}
              </Button>
            </Box>
          </StepContent>
        </Step>
        
        {/* Step 2: Map Fields */}
        <Step key="map" expanded={activeStep >= 1}>
          <StepLabel>Map Fields</StepLabel>
          <StepContent>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Map the columns from your file to the threat fields.
            </Typography>
            
            {importPreview.length > 0 && (
              <Box sx={{ mt: 2, mb: 3, maxHeight: 300, overflow: 'auto' }}>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {Object.keys(importPreview[0] || {}).map((header, idx) => (
                          <th 
                            key={idx} 
                            style={{ 
                              textAlign: 'left', 
                              padding: '8px', 
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              backgroundColor: theme.palette.grey[100],
                            }}
                          >
                            <FormControl fullWidth size="small" margin="dense">
                              <InputLabel>Field</InputLabel>
                              <Select
                                value={importMappings.find(m => m.csvHeader === header)?.field || ''}
                                onChange={(e) => {
                                  const newMappings = [...importMappings];
                                  const existingIdx = newMappings.findIndex(m => m.csvHeader === header);
                                  
                                  if (existingIdx >= 0) {
                                    newMappings[existingIdx] = {
                                      ...newMappings[existingIdx],
                                      field: e.target.value,
                                    };
                                  } else {
                                    newMappings.push({
                                      csvHeader: header,
                                      field: e.target.value,
                                      required: false,
                                    });
                                  }
                                  
                                  setImportMappings(newMappings);
                                }}
                                label="Field"
                                size="small"
                              >
                                <MenuItem value="">
                                  <em>Ignore</em>
                                </MenuItem>
                                {defaultExportFields.map((field) => (
                                  <MenuItem key={field.id} value={field.id}>
                                    {field.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {Object.values(row).map((cell, cellIdx) => (
                            <td 
                              key={cellIdx} 
                              style={{ 
                                padding: '8px', 
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                fontSize: '0.875rem',
                              }}
                            >
                              {String(cell).length > 50 ? `${String(cell).substring(0, 50)}...` : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {importPreview.length > 5 && (
                        <tr>
                          <td 
                            colSpan={Object.keys(importPreview[0] || {}).length}
                            style={{ textAlign: 'center', padding: '8px', color: theme.palette.text.secondary }}
                          >
                            ... and {importPreview.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Paper>
              </Box>
            )}
            
            <FormGroup row sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={importOptions.updateExisting}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, updateExisting: e.target.checked }))}
                    color="primary"
                    size="small"
                  />
                }
                label="Update existing threats"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={importOptions.skipErrors}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, skipErrors: e.target.checked }))}
                    color="primary"
                    size="small"
                  />
                }
                label="Skip rows with errors"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={importOptions.dryRun}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, dryRun: e.target.checked }))}
                    color="primary"
                    size="small"
                  />
                }
                label="Dry run (no changes)"
              />
            </FormGroup>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                onClick={() => setActiveStep(0)}
                startIcon={<ArrowBackIcon />}
              >
                Back
              </Button>
              
              <Box>
                <Button
                  variant="outlined"
                  onClick={resetImport}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleImport}
                  startIcon={<CloudUploadIcon />}
                  disabled={importMappings.every(m => !m.field)}
                >
                  {importOptions.dryRun ? 'Validate' : 'Import'}
                </Button>
              </Box>
            </Box>
          </StepContent>
        </Step>
        
        {/* Step 3: Import Progress */}
        <Step key="progress" expanded={activeStep >= 2}>
          <StepLabel>Importing...</StepLabel>
          <StepContent>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  {importProgress.processed} of {importProgress.total} processed
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {Math.round((importProgress.processed / (importProgress.total || 1)) * 100)}%
                </Typography>
              </Box>
              
              <Box sx={{ position: 'relative', height: 10, backgroundColor: theme.palette.grey[200], borderRadius: 5, overflow: 'hidden' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${(importProgress.processed / (importProgress.total || 1)) * 100}%`,
                    backgroundColor: theme.palette.primary.main,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    {importProgress.success}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Success
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="error.main">
                    {importProgress.errors}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Errors
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="warning.main">
                    {importProgress.warnings}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Warnings
                  </Typography>
                </Box>
              </Box>
              
              {importProgress.processed > 0 && importProgress.processed === importProgress.total && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setActiveStep(3)}
                    startIcon={<ArrowForwardIcon />}
                  >
                    View Results
                  </Button>
                </Box>
              )}
            </Box>
          </StepContent>
        </Step>
        
        {/* Step 4: Import Results */}
        <Step key="results" expanded={activeStep >= 3}>
          <StepLabel>Import Results</StepLabel>
          <StepContent>
            {importResults ? (
              <Box>
                {importResults.errors > 0 ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Import completed with {importResults.errors} error(s) and {importResults.warnings} warning(s).
                  </Alert>
                ) : importResults.warnings > 0 ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Import completed with {importResults.warnings} warning(s).
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Successfully imported {importResults.imported} threat(s).
                  </Alert>
                )}
                
                {importResults.details && importResults.details.length > 0 && (
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
                    <List dense>
                      {importResults.details.map((detail, idx) => (
                        <ListItem key={idx} disableGutters>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {detail.status === 'success' && <CheckCircleIcon color="success" fontSize="small" />}
                            {detail.status === 'warning' && <WarningIcon color="warning" fontSize="small" />}
                            {detail.status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                            {!detail.status && <InfoIcon color="info" fontSize="small" />}
                          </ListItemIcon>
                          <ListItemText 
                            primary={detail.message}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleClose}
                    sx={{ mr: 1 }}
                  >
                    Done
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={resetImport}
                  >
                    Import Another File
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <CircularProgress size={24} sx={{ mb: 2 }} />
                <Typography>Processing import results...</Typography>
              </Box>
            )}
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
  
  // Tab state
  const [activeTab, setActiveTab] = useState('export');
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {activeTab === 'export' ? <ExportIcon sx={{ mr: 1 }} /> : <ImportIcon sx={{ mr: 1 }} />}
            <span>{activeTab === 'export' ? 'Export Threats' : 'Import Threats'}</span>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}>
          <Box sx={{ display: 'flex' }}>
            <Button
              variant={activeTab === 'export' ? 'contained' : 'text'}
              onClick={() => setActiveTab('export')}
              startIcon={<CloudDownloadIcon />}
              sx={{
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                mr: 1,
                textTransform: 'none',
                ...(activeTab !== 'export' && { color: 'text.secondary' }),
              }}
            >
              Export
            </Button>
            
            <Button
              variant={activeTab === 'import' ? 'contained' : 'text'}
              onClick={() => setActiveTab('import')}
              startIcon={<CloudUploadIcon />}
              sx={{
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                textTransform: 'none',
                ...(activeTab !== 'import' && { color: 'text.secondary' }),
              }}
            >
              Import
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {activeTab === 'export' ? renderExportTab() : renderImportTab()}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThreatImportExport;
