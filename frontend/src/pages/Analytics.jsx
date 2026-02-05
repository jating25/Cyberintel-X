import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Chip, CircularProgress, Alert as MuiAlert } from '@mui/material';
import { useQuery } from 'react-query';
import { useSnackbar } from 'notistack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import api from '../services/api';

// Mock chart components (in a real app, you'd use Chart.js or Recharts)
const ChartPlaceholder = ({ title, data, type = 'bar' }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography color="text.secondary">{type === 'bar' ? <BarChartIcon fontSize="large" /> : <PieChartIcon fontSize="large" />}</Typography>
        <Typography ml={2} color="text.secondary">Chart Visualization</Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        {data.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2">{item.label}</Typography>
            <Typography variant="body2" fontWeight="medium">{item.value}</Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const Analytics = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Fetch analytics data
  const { data: analyticsData, isLoading, isError } = useQuery(
    'analytics',
    () => api.get('/analytics/dashboard'),
    {
      onError: (error) => {
        enqueueSnackbar('Failed to fetch analytics data', { variant: 'error' });
      }
    }
  );

  const data = analyticsData?.data || {};

  // Mock data for charts
  const threatTrendsData = [
    { label: 'Malware', value: '42%' },
    { label: 'Phishing', value: '28%' },
    { label: 'Ransomware', value: '18%' },
    { label: 'DDoS', value: '12%' }
  ];

  const severityDistributionData = [
    { label: 'Critical', value: '15%' },
    { label: 'High', value: '35%' },
    { label: 'Medium', value: '30%' },
    { label: 'Low', value: '20%' }
  ];

  const timelineData = [
    { label: 'Last 24 hours', value: '127' },
    { label: 'Last 7 days', value: '842' },
    { label: 'Last 30 days', value: '3,241' },
    { label: 'Last 90 days', value: '9,567' }
  ];

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
        <MuiAlert severity="error">Failed to load analytics data. Please try again later.</MuiAlert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Security Analytics
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Threats
                  </Typography>
                  <Typography variant="h4">{data.totalThreats || 1247}</Typography>
                </Box>
                <TrendingUpIcon color="success" />
              </Box>
              <Chip 
                label="+12% from last month" 
                color="success" 
                size="small" 
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h4">{data.activeAlerts || 23}</Typography>
                </Box>
                <TrendingDownIcon color="error" />
              </Box>
              <Chip 
                label="-5% from last week" 
                color="success" 
                size="small" 
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Resolved Cases
                  </Typography>
                  <Typography variant="h4">{data.resolvedCases || 842}</Typography>
                </Box>
                <TrendingUpIcon color="success" />
              </Box>
              <Chip 
                label="+8% from last month" 
                color="success" 
                size="small" 
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Detection Rate
                  </Typography>
                  <Typography variant="h4">{data.detectionRate || '94%'}</Typography>
                </Box>
                <TimelineIcon color="primary" />
              </Box>
              <Chip 
                label="Excellent" 
                color="success" 
                size="small" 
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartPlaceholder 
            title="Threat Type Distribution" 
            data={threatTrendsData}
            type="pie"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <ChartPlaceholder 
            title="Severity Level Distribution" 
            data={severityDistributionData}
            type="bar"
          />
        </Grid>
        
        <Grid item xs={12}>
          <ChartPlaceholder 
            title="Incidents Over Time" 
            data={timelineData}
            type="bar"
          />
        </Grid>
      </Grid>

      {/* Recent Activity Summary */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>Recent Activity Summary</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">New Threats Today</Typography>
              <Typography variant="h5">{data.newThreatsToday || 12}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">False Positives</Typography>
              <Typography variant="h5">{data.falsePositives || 3}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Avg Response Time</Typography>
              <Typography variant="h5">{data.avgResponseTime || '2.3h'}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">System Uptime</Typography>
              <Typography variant="h5">{data.systemUptime || '99.8%'}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Analytics;
