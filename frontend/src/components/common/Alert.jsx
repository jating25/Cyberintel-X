import React from 'react';
import { 
  Alert as MuiAlert, 
  Snackbar, 
  IconButton, 
  Slide, 
  AlertTitle,
  useTheme,
  alpha
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

// Slide transition for the alert
const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

// Custom Alert component
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

/**
 * AlertNotification Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.severity - Severity of the alert (error, warning, info, success)
 * @param {string} props.message - Alert message
 * @param {string} [props.title] - Optional title for the alert
 * @param {boolean} props.open - Whether the alert is open
 * @param {function} props.onClose - Function to call when alert is closed
 * @param {number} [props.autoHideDuration=6000] - Duration in ms before alert auto-hides
 * @param {boolean} [props.closable=true] - Whether the alert can be closed
 * @param {string} [props.variant='filled'] - Variant of the alert (filled, outlined, standard)
 * @param {string} [props.anchorOrigin] - Position of the alert (default: { vertical: 'top', horizontal: 'right' })
 * @param {boolean} [props.elevation] - Elevation level of the alert
 * @param {string} [props.icon] - Custom icon to display
 * @param {boolean} [props.action] - Action to display
 * @returns {JSX.Element} The AlertNotification component
 */
const AlertNotification = ({
  severity = 'info',
  message = '',
  title = '',
  open = false,
  onClose,
  autoHideDuration = 6000,
  closable = true,
  variant = 'filled',
  anchorOrigin = { vertical: 'top', horizontal: 'right' },
  elevation,
  icon,
  action,
  ...rest
}) => {
  const theme = useTheme();
  
  // Handle close event
  const handleClose = (event, reason) => {
    if (reason === 'clickaway' && !autoHideDuration) {
      return;
    }
    if (onClose) {
      onClose(event, reason);
    }
  };
  
  // Custom action for the alert
  const alertAction = (
    <>
      {action}
      {closable && (
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={handleClose}
          sx={{
            color: 'inherit',
            '&:hover': {
              backgroundColor: alpha(theme.palette.common.white, 0.16),
            },
          }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      )}
    </>
  );
  
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
      TransitionComponent={SlideTransition}
      sx={{
        '& .MuiPaper-root': {
          minWidth: 300,
        },
      }}
      {...rest}
    >
      <Alert
        severity={severity}
        onClose={closable ? handleClose : null}
        variant={variant}
        elevation={elevation}
        icon={icon}
        action={alertAction}
        sx={{
          width: '100%',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AlertNotification;
