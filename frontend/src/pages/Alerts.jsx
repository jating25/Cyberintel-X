import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TextField, MenuItem, FormControl, InputLabel, Select, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert as MuiAlert, CircularProgress } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import api, { alertAPI } from '../services/api';

const Alerts = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch alerts using the typed alertAPI helper
  const {
    data: alertsData,
    isLoading,
    isError,
    refetch,
  } = useQuery(
    ['alerts', page, rowsPerPage, searchTerm, severityFilter, statusFilter],
    () =>
      alertAPI.getAlerts({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      }),
    {
      keepPreviousData: true,
      onError: () => {
        enqueueSnackbar('Failed to fetch alerts', { variant: 'error' });
      },
    }
  );

  // Update alert mutation
  const updateAlertMutation = useMutation(
    ({ id, status }) => alertAPI.updateAlertStatus(id, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts');
        enqueueSnackbar('Alert updated successfully', { variant: 'success' });
        handleCloseDialog();
      },
      onError: () => {
        enqueueSnackbar('Failed to update alert', { variant: 'error' });
      },
    }
  );

  const alerts = alertsData?.alerts || [];
  const totalCount = alertsData?.totalCount || 0;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleSeverityFilterChange = (event) => {
    setSeverityFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleOpenDialog = (alert) => {
    setSelectedAlert(alert);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAlert(null);
  };

  const handleUpdateAlert = (status) => {
    if (selectedAlert) {
      updateAlertMutation.mutate({
        id: selectedAlert._id || selectedAlert.id,
        status,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'open': return 'error';
      case 'in progress': return 'warning';
      case 'resolved': return 'success';
      case 'dismissed': return 'default';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningIcon color="warning" />;
      case 'medium': return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'low': return <InfoIcon color="info" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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
        <MuiAlert severity="error">Failed to load alerts. Please try again later.</MuiAlert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>Security Alerts</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Alerts"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                label="Severity"
                onChange={handleSeverityFilterChange}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="dismissed">Dismissed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Alerts Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Severity</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getSeverityIcon(alert.severity)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {alert.severity}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {alert.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.description.substring(0, 100)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{alert.source}</TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.status} 
                      color={getStatusColor(alert.status)} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(alert.createdAt)}</TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      onClick={() => handleOpenDialog(alert)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography>No alerts found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Alert Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Alert Details
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedAlert.title}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getSeverityIcon(selectedAlert.severity)}
                    <Chip 
                      label={selectedAlert.severity} 
                      color={getStatusColor(selectedAlert.severity)} 
                      size="small" 
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedAlert.status} 
                    color={getStatusColor(selectedAlert.status)} 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Source</Typography>
                  <Typography>{selectedAlert.source}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                  <Typography>{formatDate(selectedAlert.createdAt)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography paragraph>{selectedAlert.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Recommendation</Typography>
                  <Typography>{selectedAlert.recommendation || 'No recommendation available'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedAlert && selectedAlert.status !== 'resolved' && (
            <>
              <Button 
                onClick={() => handleUpdateAlert('in progress')}
                disabled={updateAlertMutation.isLoading}
              >
                Mark as In Progress
              </Button>
              <Button 
                onClick={() => handleUpdateAlert('resolved')}
                variant="contained"
                disabled={updateAlertMutation.isLoading}
                startIcon={<CheckCircleIcon />}
              >
                Resolve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Alerts;
