import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, CardActions, Button, Chip, Divider, List, ListItem, ListItemText, ListItemIcon, Collapse, Alert as MuiAlert, CircularProgress } from '@mui/material';
import { useQuery, useMutation } from 'react-query';
import { useSnackbar } from 'notistack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import TimelineIcon from '@mui/icons-material/Timeline';
import InsightsIcon from '@mui/icons-material/Insights';
import api from '../services/api';

const Reports = () => {
  const [expandedReport, setExpandedReport] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch available reports from backend
  const { data: reportsData, isLoading, isError } = useQuery(
    'reports',
    () => api.get('/reports/templates'),
    {
      onError: () => {
        enqueueSnackbar('Failed to fetch reports', { variant: 'error' });
      },
    }
  );

  // Generate report mutation (and immediately download as PDF)
  const generateReportMutation = useMutation(
    async ({ templateId, params }) => {
      const response = await api.post(`/reports/generate/${templateId}`, params);
      const { downloadUrl } = response.data || {};
      if (downloadUrl) {
        // Open the backend download URL directly; the browser will handle the PDF
        const url = downloadUrl.startsWith('http')
          ? downloadUrl
          : `${window.location.origin}${downloadUrl}`;
        window.open(url, '_blank');
      }
      return response;
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Report generated. Download starting...', { variant: 'success' });
      },
      onError: () => {
        enqueueSnackbar('Failed to generate or download report', { variant: 'error' });
      },
    }
  );

  // Use templates returned by backend (no local dummy templates)
  const reports = reportsData?.data?.templates || [];

  const handleGenerateReport = (reportId, params = {}) => {
    generateReportMutation.mutate({ templateId: reportId, params });
  };

  const handleExpandClick = (reportId) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <MuiAlert severity="error">Failed to load reports. Please try again later.</MuiAlert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>Security Reports</Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />}>
          Export All Reports
        </Button>
      </Box>

      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid item xs={12} md={6} key={report.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: 'primary.main' }}>{report.icon}</Box>
                    <Box>
                      <Typography variant="h6" component="div">
                        {report.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip label={report.category} size="small" color="primary" variant="outlined" />
                        <Chip label={`Frequency: ${report.frequency}`} size="small" />
                      </Box>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => handleExpandClick(report.id)}
                    endIcon={expandedReport === report.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {expandedReport === report.id ? 'Hide' : 'Configure'}
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {report.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Last generated: {formatDate(report.lastGenerated)}
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={generateReportMutation.isLoading}
                  >
                    Generate Report
                  </Button>
                </Box>
              </CardContent>
              
              <Collapse in={expandedReport === report.id} timeout="auto" unmountOnExit>
                <CardContent sx={{ pt: 0 }}>
                  <Typography variant="subtitle2" gutterBottom>Configuration Options:</Typography>
                  <List dense>
                    {report.parameters.map((param, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <AssessmentIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={param.label}
                          secondary={`${param.type} input`} 
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleGenerateReport(report.id, { custom: true })}
                    >
                      Generate with Custom Settings
                    </Button>
                    <Button 
                      variant="text" 
                      size="small"
                      onClick={() => handleGenerateReport(report.id)}
                    >
                      Use Default Settings
                    </Button>
                  </Box>
                </CardContent>
              </Collapse>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Report history could be wired to a real backend endpoint in the future.
          For now we omit local dummy history data for a cleaner production UI. */}
    </Box>
  );
};

export default Reports;
