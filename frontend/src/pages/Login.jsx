import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Link, 
  InputAdornment, 
  IconButton, 
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Fade
} from '@mui/material';
import { 
  Lock as LockIcon, 
  Person as PersonIcon, 
  Visibility, 
  VisibilityOff,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  ArrowBack as ArrowBackIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { styled } from '@mui/material/styles';

// Styled components
const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' 
    : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
}));

const LoginCard = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: 460,
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
  position: 'relative',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #3f51b5 0%, #2196f3 100%)',
  },
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  '& svg': {
    fontSize: 48,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
}));

const SocialButton = styled(Button)(({ theme, provider }) => ({
  flex: 1,
  textTransform: 'none',
  padding: theme.spacing(1.5),
  margin: theme.spacing(0.5),
  borderColor: theme.palette.divider,
  '&:hover': {
    borderColor: theme.palette.text.primary,
  },
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1),
  },
  ...(provider === 'google' && {
    '&:hover': {
      backgroundColor: '#f1f1f1',
      borderColor: '#4285F4',
    },
  }),
  ...(provider === 'microsoft' && {
    '&:hover': {
      backgroundColor: '#f5f5f5',
      borderColor: '#00A4EF',
    },
  }),
  ...(provider === 'github' && {
    '&:hover': {
      backgroundColor: '#24292e',
      color: '#fff',
      borderColor: '#24292e',
    },
  }),
}));

const Login = () => {
  const theme = useTheme();
  const { darkMode } = useAppTheme();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for form inputs
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  
  // State for UI
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (error) setError('');
  };
  
  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username.trim() || !formData.password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Call the login function from AuthContext
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        // The AuthContext will handle the redirect
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle social login
  const handleSocialLogin = (provider) => {
    // In a real app, this would redirect to the OAuth provider
    console.log(`Login with ${provider}`);
    setError('Social login integration not implemented yet');
  };
  
  // Handle password reset
  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };
  
  return (
    <LoginContainer>
      <Container component="main" maxWidth="xs">
        <Fade in={true} timeout={500}>
          <LoginCard elevation={3}>
            {/* Logo and Title */}
            <LogoContainer>
              <SecurityIcon />
              <Typography component="h1" variant="h5" align="center" gutterBottom>
                CyberIntel-X
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                Security Operations Center
              </Typography>
            </LogoContainer>
            
            {/* Success Message */}
            {success && (
              <Alert 
                severity="success" 
                sx={{ mb: 3 }}
                onClose={() => setSuccess('')}
              >
                {success}
              </Alert>
            )}
            
            {/* Error Message */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}
            
            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username or Email"
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="large"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={handleForgotPassword}
                  sx={{ textDecoration: 'none' }}
                >
                  Forgot password?
                </Link>
              </Box>
              
              <Button
                // Use an explicit click handler instead of native form submit
                type="button"
                onClick={handleSubmit}
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={isLoading}
                sx={{
                  mt: 1,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>
              
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="textSecondary">
                  OR CONTINUE WITH
                </Typography>
              </Divider>
              
              {/* Social Login Buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
                <SocialButton
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => handleSocialLogin('google')}
                  provider="google"
                  fullWidth={isMobile}
                  sx={{ mb: isMobile ? 1 : 0 }}
                >
                  Google
                </SocialButton>
                
                <SocialButton
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  onClick={() => handleSocialLogin('microsoft')}
                  provider="microsoft"
                  fullWidth={isMobile}
                  sx={{ mb: isMobile ? 1 : 0, mx: isMobile ? 0 : 1 }}
                >
                  Microsoft
                </SocialButton>
                
                <SocialButton
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  onClick={() => handleSocialLogin('github')}
                  provider="github"
                  fullWidth={isMobile}
                >
                  GitHub
                </SocialButton>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="textSecondary">
                  Don't have an account?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/register" 
                    variant="body2"
                    sx={{ fontWeight: 600, textDecoration: 'none' }}
                  >
                    Sign up
                  </Link>
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link 
                  component={RouterLink} 
                  to="/" 
                  variant="body2"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Back to home
                </Link>
              </Box>
            </Box>
          </LoginCard>
        </Fade>
        
        {/* Demo credentials hint */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Demo credentials: admin / admin
          </Typography>
        </Box>
      </Container>
    </LoginContainer>
  );
};

export default Login;
