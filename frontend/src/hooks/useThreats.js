import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { threatAPI } from '../services/api';
import { enqueueSnackbar } from 'notistack';

const useThreats = (initialFilters = {}) => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [sort, setSort] = useState({ field: 'detectedAt', order: 'desc' });
  
  const { subscribe, isConnected } = useWebSocket();
  
  // Fetch threats from API
  const fetchThreats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page + 1, // API uses 1-based pagination
        pageSize: pagination.pageSize,
        sortBy: sort.field,
        sortOrder: sort.order,
        ...filters,
      };
      
      const response = await threatAPI.getAll(params);

      setThreats(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total ?? (response.data || []).length,
        totalPages: response.pagination?.pages ?? 1,
      }));
      
      return response.data;
    } catch (err) {
      console.error('Error fetching threats:', err);
      setError(err.response?.data?.message || 'Failed to fetch threats');
      enqueueSnackbar('Failed to load threats', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sort, filters]);
  
  // Handle WebSocket updates
  useEffect(() => {
    if (!isConnected()) return;
    
    // Subscribe to threat events
    const unsubscribeThreat = subscribe('threat', (data) => {
      if (data.operation === 'create') {
        setThreats(prev => [data.record, ...prev]);
        enqueueSnackbar(`New threat detected: ${data.record.title}`, {
          variant: 'info',
          action: (key) => (
            <Button 
              color="inherit" 
              size="small"
              onClick={() => {
                // Navigate to threat details
                window.location.href = `/threats/${data.record.id}`;
              }}
            >
              View
            </Button>
          ),
        });
      } else if (data.operation === 'update') {
        setThreats(prev => 
          prev.map(threat => 
            threat.id === data.record.id ? { ...threat, ...data.record } : threat
          )
        );
      } else if (data.operation === 'delete') {
        setThreats(prev => prev.filter(threat => threat.id !== data.id));
      }
    });
    
    // Subscribe to sync events
    const unsubscribeSync = subscribe('sync:threats', (data) => {
      // Refresh data when a sync event is received
      if (['create', 'update', 'delete'].includes(data.operation)) {
        fetchThreats();
      }
    });
    
    return () => {
      unsubscribeThreat();
      unsubscribeSync();
    };
  }, [subscribe, isConnected, fetchThreats]);
  
  // Initial fetch
  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);
  
  // Handle pagination change
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setPagination({
      page: 0, // Reset to first page
      pageSize: parseInt(event.target.value, 10),
      total: 0,
      totalPages: 0,
    });
  };
  
  // Handle sort
  const handleSort = (field) => {
    const isAsc = sort.field === field && sort.order === 'asc';
    setSort({
      field,
      order: isAsc ? 'desc' : 'asc',
    });
  };
  
  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
    setPagination(prev => ({
      ...prev,
      page: 0, // Reset to first page when filters change
    }));
  };
  
  // Create a new threat
  const createThreat = async (threatData) => {
    try {
      setLoading(true);
      const response = await threatAPI.create(threatData);
      enqueueSnackbar('Threat created successfully', { variant: 'success' });
      await fetchThreats(); // Refresh the list
      return response.data;
    } catch (err) {
      console.error('Error creating threat:', err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to create threat', { 
        variant: 'error' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing threat
  const updateThreat = async (id, updates) => {
    try {
      setLoading(true);
      const response = await threatAPI.update(id, updates);
      enqueueSnackbar('Threat updated successfully', { variant: 'success' });
      await fetchThreats(); // Refresh the list
      return response.data;
    } catch (err) {
      console.error('Error updating threat:', err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to update threat', { 
        variant: 'error' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a threat
  const deleteThreat = async (id) => {
    try {
      setLoading(true);
      await threatAPI.delete(id);
      enqueueSnackbar('Threat deleted successfully', { variant: 'success' });
      await fetchThreats(); // Refresh the list
    } catch (err) {
      console.error('Error deleting threat:', err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete threat', { 
        variant: 'error' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Bulk update threats
  const bulkUpdateThreats = async (ids, updates) => {
    try {
      setLoading(true);
      await threatAPI.bulkUpdate(ids, updates);
      enqueueSnackbar(`${ids.length} threats updated successfully`, { variant: 'success' });
      await fetchThreats(); // Refresh the list
    } catch (err) {
      console.error('Error bulk updating threats:', err);
      enqueueSnackbar('Failed to update threats', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Bulk delete threats
  const bulkDeleteThreats = async (ids) => {
    try {
      setLoading(true);
      await threatAPI.bulkDelete(ids);
      enqueueSnackbar(`${ids.length} threats deleted successfully`, { variant: 'success' });
      await fetchThreats(); // Refresh the list
    } catch (err) {
      console.error('Error bulk deleting threats:', err);
      enqueueSnackbar('Failed to delete threats', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Export threats
  const exportThreats = async (format = 'csv', selectedIds = []) => {
    try {
      setLoading(true);
      const response = await threatAPI.export(format, selectedIds);

      const blobData =
        format === 'csv'
          ? new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
          : new Blob([response.data], { type: 'application/json;charset=utf-8;' });

      const url = window.URL.createObjectURL(blobData);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `threats-${new Date().toISOString()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      enqueueSnackbar('Threats exported successfully', { variant: 'success' });
      return true;
    } catch (err) {
      console.error('Error exporting threats:', err);
      enqueueSnackbar('Failed to export threats', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Import threats
  const importThreats = async (file, options = {}) => {
    try {
      setLoading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));
      
      // Send import request
      const response = await threatAPI.import(formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Refresh the list
      await fetchThreats();
      
      enqueueSnackbar(
        `Successfully imported ${response.data.imported} of ${response.data.total} threats`,
        { variant: 'success' }
      );
      
      return response.data;
    } catch (err) {
      console.error('Error importing threats:', err);
      enqueueSnackbar(
        err.response?.data?.message || 'Failed to import threats',
        { variant: 'error' }
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    // State
    threats,
    loading,
    error,
    pagination,
    sort,
    filters,
    
    // Actions
    fetchThreats,
    createThreat,
    updateThreat,
    deleteThreat,
    bulkUpdateThreats,
    bulkDeleteThreats,
    exportThreats,
    importThreats,
    
    // Handlers
    handlePageChange,
    handleRowsPerPageChange,
    handleSort,
    handleFilterChange,
    
    // Helpers
    isConnected,
  };
};

export default useThreats;
