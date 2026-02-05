import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  alpha,
  TableFooter,
  Button,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import PropTypes from 'prop-types';

// Custom Table Pagination Actions
function TablePaginationActions(props) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

// Enhanced Table Head
const EnhancedTableHead = (props) => {
  const {
    onSelectAllClick,
    order,
    orderBy,
    numSelected,
    rowCount,
    onRequestSort,
    columns,
    selectable,
    actions,
  } = props;
  
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{ 'aria-label': 'select all items' }}
            />
          </TableCell>
        )}
        
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.numeric ? 'right' : 'left'}
            padding={column.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === column.id ? order : false}
            sx={column.sx || {}}
          >
            {column.sortable ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : 'asc'}
                onClick={createSortHandler(column.id)}
              >
                {column.label}
                {orderBy === column.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        
        {actions && actions.length > 0 && (
          <TableCell align="right" padding="normal">
            Actions
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );
};

EnhancedTableHead.propTypes = {
  numSelected: PropTypes.number.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired,
  columns: PropTypes.array.isRequired,
  selectable: PropTypes.bool,
  actions: PropTypes.array,
};

const DataTable = ({
  columns,
  data = [],
  loading = false,
  selectable = true,
  pagination = true,
  searchable = true,
  filterable = false,
  defaultSort = 'id',
  defaultOrder = 'asc',
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  title = '',
  onRowClick,
  onSelectionChange,
  onRefresh,
  onAdd,
  onDeleteSelected,
  onEdit,
  onView,
  actions = [],
  emptyMessage = 'No records found',
  searchPlaceholder = 'Search...',
  showToolbar = true,
  showTotal = true,
  dense = false,
  stickyHeader = true,
  elevation = 1,
  sx = {},
}) => {
  const theme = useTheme();
  const [order, setOrder] = useState(defaultOrder);
  const [orderBy, setOrderBy] = useState(defaultSort);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({});

  // Handle sort request
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle select all click
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = data.map((n) => n.id);
      setSelected(newSelecteds);
      if (onSelectionChange) {
        onSelectionChange(newSelecteds);
      }
      return;
    }
    setSelected([]);
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  // Handle row click
  const handleRowClick = (event, row) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Handle select one
  const handleSelect = (event, id) => {
    event.stopPropagation();
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    }
  };

  // Handle change page
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle change rows per page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchText(event.target.value);
    setPage(0);
  };

  // Handle filter change
  const handleFilterChange = (columnId, value) => {
    setFilters({
      ...filters,
      [columnId]: value,
    });
    setPage(0);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchText('');
    setPage(0);
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Apply search
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const match = columns.some((column) => {
          const value = row[column.id];
          return (
            value &&
            String(value).toLowerCase().includes(searchLower)
          );
        });
        if (!match) return false;
      }

      // Apply filters
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
        if (rowValue === undefined || rowValue === null) return false;
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [data, searchText, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue === bValue) {
        return 0;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue < bValue ? -1 : 1;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }, [filteredData, order, orderBy]);

  // Get current page data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [sortedData, page, rowsPerPage, pagination]);

  // Reset page when data changes
  useEffect(() => {
    if (data.length > 0 && page > 0 && page * rowsPerPage >= data.length) {
      setPage(Math.max(0, Math.ceil(data.length / rowsPerPage) - 1));
    }
  }, [data.length, page, rowsPerPage]);

  // Check if a row is selected
  const isSelected = (id) => selected.indexOf(id) !== -1;

  // Get the total count
  const totalCount = filteredData.length;
  const selectedCount = selected.length;

  // Render cell content
  const renderCellContent = (row, column) => {
    const value = row[column.id];
    
    // Custom render function
    if (column.render) {
      return column.render(row);
    }
    
    // Format date
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    
    // Format datetime
    if (column.type === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }
    
    // Format boolean
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Format array
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // Default render
    return value !== null && value !== undefined ? String(value) : '-';
  };

  return (
    <Paper 
      elevation={elevation} 
      sx={{
        width: '100%',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Toolbar */}
      {showToolbar && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {title && (
              <Typography variant="h6" component="div">
                {title}
              </Typography>
            )}
            
            {showTotal && (
              <Chip
                label={`${totalCount} ${totalCount === 1 ? 'item' : 'items'}`}
                size="small"
                variant="outlined"
              />
            )}
            
            {selectedCount > 0 && (
              <Chip
                label={`${selectedCount} selected`}
                color="primary"
                size="small"
                onDelete={() => setSelected([])}
                deleteIcon={<ClearIcon />}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {searchable && (
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={searchText}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchText && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchText('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
            )}
            
            {onRefresh && (
              <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {onAdd && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={onAdd}
                startIcon={<AddIcon />}
              >
                Add New
              </Button>
            )}
            
            {onDeleteSelected && selectedCount > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  onDeleteSelected(selected);
                  setSelected([]);
                }}
                startIcon={<DeleteIcon />}
              >
                Delete Selected
              </Button>
            )}
          </Box>
        </Box>
      )}
      
      {/* Filter Row */}
      {filterable && (
        <Box
          sx={{
            p: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.action.hover,
          }}
        >
          {columns.map((column) => (
            <Box key={column.id} sx={{ minWidth: 150, flex: 1 }}>
              {column.filterable && (
                <TextField
                  select={column.filterOptions ? true : false}
                  size="small"
                  label={column.label}
                  value={filters[column.id] || ''}
                  onChange={(e) => handleFilterChange(column.id, e.target.value)}
                  fullWidth
                  variant="outlined"
                  SelectProps={{
                    native: false,
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterListIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: filters[column.id] && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => handleFilterChange(column.id, '')}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                >
                  {column.filterOptions ? (
                    column.filterOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))
                  ) : null}
                </TextField>
              )}
            </Box>
          ))}
          
          {(Object.values(filters).some(Boolean) || searchText) && (
            <Button
              size="small"
              onClick={clearFilters}
              startIcon={<ClearIcon />}
              sx={{ ml: 'auto' }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      )}
      
      {/* Table */}
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', minHeight: 200 }}>
        <Table 
          stickyHeader={stickyHeader} 
          size={dense ? 'small' : 'medium'}
          aria-label="data table"
        >
          <EnhancedTableHead
            numSelected={selected.length}
            order={order}
            orderBy={orderBy}
            onSelectAllClick={handleSelectAllClick}
            onRequestSort={handleRequestSort}
            rowCount={filteredData.length}
            columns={columns}
            selectable={selectable}
            actions={actions}
          />
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions?.length > 0 ? 1 : 0)} align="center">
                  <Box sx={{ p: 4 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ mt: 1 }}>Loading data...</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions?.length > 0 ? 1 : 0)} align="center">
                  <Box sx={{ p: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      {emptyMessage}
                    </Typography>
                    {searchText && (
                      <Button 
                        variant="text" 
                        onClick={clearFilters}
                        startIcon={<ClearIcon />}
                        sx={{ mt: 1 }}
                      >
                        Clear search and filters
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const isItemSelected = isSelected(row.id);
                const labelId = `enhanced-table-checkbox-${row.id}`;

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={row.id}
                    selected={isItemSelected}
                    onClick={(event) => handleRowClick(event, row)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': {
                        backgroundColor: onRowClick ? alpha(theme.palette.primary.main, 0.04) : 'inherit',
                      },
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        },
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleSelect(event, row.id)}
                          inputProps={{ 'aria-labelledby': labelId }}
                        />
                      </TableCell>
                    )}
                    
                    {columns.map((column) => (
                      <TableCell
                        key={`${row.id}-${column.id}`}
                        align={column.numeric ? 'right' : 'left'}
                        padding={column.disablePadding ? 'none' : 'normal'}
                        sx={column.sx || {}}
                      >
                        {renderCellContent(row, column)}
                      </TableCell>
                    ))}
                    
                    {actions && actions.length > 0 && (
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          {actions.map((action, index) => {
                            if (action.type === 'view' && onView) {
                              return (
                                <Tooltip key={`view-${index}`} title="View">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onView(row);
                                    }}
                                    color="primary"
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              );
                            }
                            
                            if (action.type === 'edit' && onEdit) {
                              return (
                                <Tooltip key={`edit-${index}`} title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(row);
                                    }}
                                    color="primary"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              );
                            }
                            
                            if (action.type === 'delete' && onDeleteSelected) {
                              return (
                                <Tooltip key={`delete-${index}`} title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Are you sure you want to delete this item?')) {
                                        onDeleteSelected([row.id]);
                                      }
                                    }}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              );
                            }
                            
                            // Custom action
                            if (action.render) {
                              return (
                                <Box key={`custom-${index}`} onClick={(e) => e.stopPropagation()}>
                                  {action.render(row)}
                                </Box>
                              );
                            }
                            
                            return null;
                          })}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      {pagination && (
        <TablePagination
          rowsPerPageOptions={pageSizeOptions}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          ActionsComponent={TablePaginationActions}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            '& .MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'flex-end',
            },
          }}
        />
      )}
    </Paper>
  );
};

// Prop Types
DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      numeric: PropTypes.bool,
      disablePadding: PropTypes.bool,
      sortable: PropTypes.bool,
      filterable: PropTypes.bool,
      filterOptions: PropTypes.array,
      type: PropTypes.oneOf(['string', 'number', 'date', 'datetime', 'boolean']),
      render: PropTypes.func,
      sx: PropTypes.object,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  selectable: PropTypes.bool,
  pagination: PropTypes.bool,
  searchable: PropTypes.bool,
  filterable: PropTypes.bool,
  defaultSort: PropTypes.string,
  defaultOrder: PropTypes.oneOf(['asc', 'desc']),
  pageSize: PropTypes.number,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  title: PropTypes.string,
  onRowClick: PropTypes.func,
  onSelectionChange: PropTypes.func,
  onRefresh: PropTypes.func,
  onAdd: PropTypes.func,
  onDeleteSelected: PropTypes.func,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  actions: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.oneOf(['view', 'edit', 'delete']),
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        icon: PropTypes.element,
        tooltip: PropTypes.string,
        onClick: PropTypes.func,
        render: PropTypes.func,
      }),
    ])
  ),
  emptyMessage: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  showToolbar: PropTypes.bool,
  showTotal: PropTypes.bool,
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  elevation: PropTypes.number,
  sx: PropTypes.object,
};


export default DataTable;
