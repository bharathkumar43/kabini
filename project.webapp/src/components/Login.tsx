import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import ErrorNotification from './ui/ErrorNotification';
import { useEmojiBlocking } from '../utils/useEmojiBlocking';
import { validateProfessionalEmail, getEmailValidationMessage, formatEmail } from '../utils/emailValidation';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, error, clearError, isAuthenticated, user } = useAuth();
  
  // Enhanced emoji blocking hook
  const { handleInputChangeAggressive: handleEmojiFilteredInput, handlePaste, handleKeyDown } = useEmojiBlocking();

  // Debug effect to monitor error state
  useEffect(() => {
    if (error) {
      console.log('🔍 [Login] Error state changed:', error);
    }
  }, [error]);

  // Effect to redirect after successful authentication
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Use the AuthContext state instead of checking authService directly
      if (isAuthenticated && user) {
        console.log('[Login] User is authenticated via AuthContext, redirecting to overview...');
        navigate('/overview', { replace: true });
        return;
      }
      
      // Fallback: also check authService directly
      if (authService.isAuthenticated()) {
        console.log('[Login] User is authenticated via authService, redirecting to overview...');
        navigate('/overview', { replace: true });
        return;
      }
    };

    // Check immediately
    checkAuthAndRedirect();

    // Set up an interval to check authentication status (more frequent for better responsiveness)
    const interval = setInterval(checkAuthAndRedirect, 100);

    return () => {
      clearInterval(interval);
      // Clear any pending authentication errors when component unmounts
      setAuthError(null);
      setIsLoading(false);
    };
  }, [navigate, isAuthenticated, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear authentication error when user starts typing
    if (authError) {
      setAuthError(null);
    }
    
    // Update form data
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Real-time validation for email
    if (name === 'email') {
      if (!value.trim()) {
        setValidationErrors(prev => ({ ...prev, email: 'Please enter your email address' }));
      } else {
        // Use comprehensive Gmail email validation for real-time feedback
        const emailValidation = validateProfessionalEmail(value);
        if (!emailValidation.isValid) {
          setValidationErrors(prev => ({ ...prev, email: getEmailValidationMessage(value, emailValidation) }));
        } else {
          setValidationErrors(prev => ({ ...prev, email: undefined }));
        }
      }
    }
    
    // Real-time validation for password
    if (name === 'password') {
      if (!value.trim()) {
        setValidationErrors(prev => ({ ...prev, password: 'Please enter your password' }));
      } else {
        setValidationErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

  const validateField = (name: string, value: string) => {
    const newErrors = { ...validationErrors };
    
    if (name === 'email') {
      if (!value.trim()) {
        newErrors.email = 'Please enter your email address';
      } else {
        // Use comprehensive Gmail email validation
        const emailValidation = validateProfessionalEmail(value);
        if (!emailValidation.isValid) {
          newErrors.email = getEmailValidationMessage(value, emailValidation);
        } else {
          delete newErrors.email;
        }
      }
    } else if (name === 'password') {
      if (!value.trim()) {
        newErrors.password = 'Please enter your password';
      } else {
        delete newErrors.password;
      }
    }
    
    setValidationErrors(newErrors);
    return !newErrors[name as keyof typeof newErrors];
  };

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address';
    } else {
      // Use comprehensive Gmail email validation
      const emailValidation = validateProfessionalEmail(formData.email);
      if (!emailValidation.isValid) {
        errors.email = getEmailValidationMessage(formData.email, emailValidation);
      }
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Please enter your password';
    } else {
      // Validate password strength with enhanced requirements
      if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(formData.password)) {
        errors.password = 'Password must contain at least one lowercase letter';
      } else if (!/\d/.test(formData.password)) {
        errors.password = 'Password must contain at least one number';
      } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        errors.password = 'Password must contain at least one special character';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Clear previous errors
      setValidationErrors({});
      setAuthError(null);
      
      // Validate all fields
      const newErrors: { email?: string; password?: string } = {};
      
      if (!formData.email.trim()) {
        newErrors.email = 'Please enter your email address';
      } else {
        // Use comprehensive email validation for professional domains
        try {
          const emailValidation = validateProfessionalEmail(formData.email);
          if (!emailValidation || !emailValidation.isValid) {
            newErrors.email = getEmailValidationMessage(formData.email, emailValidation);
          }
        } catch (validationError) {
          console.error('[Login] Email validation error:', validationError);
          newErrors.email = 'Please enter a valid email address';
        }
      }
      
      if (!formData.password.trim()) {
        newErrors.password = 'Please enter your password';
      } else if (formData.password && formData.password.length > 0) {
        // Validate password strength with enhanced requirements
        if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters long';
        } else if (!/[A-Z]/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one lowercase letter';
        } else if (!/\d/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one number';
        } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one special character';
        }
      }
      
      // If there are validation errors, don't proceed
      if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        return;
      }
      
      setIsLoading(true);
      clearError();
      
      try {
        console.log('[Login] Attempting local login with:', { 
          email: formData.email, 
          passwordLength: formData.password ? formData.password.length : 0 
        });
        
        await login('local', { email: formData.email, password: formData.password });
        console.log('[Login] Local login successful');
      } catch (err: any) {
        console.error('[Login] Local login error:', err);
        
        // Always show the proper authentication error message for wrong credentials
        let errorMessage = 'Invalid credentials entered please verify and try logging in';
        
        // Only show different messages for network/connection issues
        if (err && typeof err === 'object') {
          if (err.message && typeof err.message === 'string') {
            if (err.message.includes('Network') || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
              errorMessage = 'Network error. Please check your connection and try again.';
            }
          } else if (err.error && typeof err.error === 'string') {
            // Handle backend error responses - but still show the main authentication message
            if (err.error.includes('Network') || err.error.includes('connection')) {
              errorMessage = 'Network error. Please check your connection and try again.';
            }
            // For all other backend errors (including invalid credentials), show the main message
          }
        }
        
        // Set authentication error for the toggle notification
        console.log('[Login] Setting authentication error message:', errorMessage);
        console.log('[Login] Error object details:', {
          hasError: !!err,
          errorType: typeof err,
          errorMessage: err?.message,
          errorError: err?.error,
          stack: err?.stack
        });
        
        // Ensure the error message is always a string
        const finalErrorMessage = typeof errorMessage === 'string' ? errorMessage : 'Invalid credentials entered please verify and try logging in';
        setAuthError(finalErrorMessage);
      } finally {
        setIsLoading(false);
      }
    } catch (unexpectedError: any) {
      // Catch any unexpected errors that might occur during form submission
      console.error('[Login] Unexpected error during form submission:', unexpectedError);
      setAuthError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setAuthError(null); // Clear any previous auth errors
    setIsLoading(true);

    try {
      // Start Google authentication
      await login('google');
      console.log('[Login] Google sign-in successful');
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[Login] Authentication state after Google login:', {
        isAuthenticated: authService.isAuthenticated(),
        hasToken: !!authService.getAccessToken(),
        user: await authService.getCurrentUser()
      });
      
      // The useEffect will handle the redirect automatically
      console.log('[Login] Google authentication completed, waiting for redirect...');
    } catch (err: any) {
      console.error('[Login] Google sign-in error:', err);
      
      // Handle specific Google authentication error cases
      let errorMessage = 'Google sign-in failed. Please try again.';
      
      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          if (err.message.includes('cancelled') || err.message.includes('Cancelled')) {
            // Don't show error message for cancellation, just return to login state
            setIsLoading(false);
            return;
          } else if (err.message.includes('timed out') || err.message.includes('Timed out')) {
            errorMessage = 'Google sign-in timed out. Please try again.';
          } else if (err.message.includes('Network') || err.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = err.message;
          }
        }
      }
      
      // Show the error as a toggle notification (only for non-cancellation errors)
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    clearError();
    setIsLoading(true);

    try {
      console.log('[Login] Starting Microsoft sign-in...');
      console.log('[Login] Environment variables:', {
        clientId: import.meta.env.VITE_REACT_APP_AZURE_CLIENT_ID,
        tenantId: import.meta.env.VITE_REACT_APP_AZURE_TENANT_ID,
        redirectUri: import.meta.env.VITE_REACT_APP_REDIRECT_URI
      });
      
      await login('microsoft');
      console.log('[Login] Microsoft sign-in successful');
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[Login] Authentication state after login:', {
        isAuthenticated: authService.isAuthenticated(),
        hasToken: !!authService.getAccessToken(),
        user: await authService.getCurrentUser()
      });
      
      // The useEffect will handle the redirect automatically
      console.log('[Login] Microsoft authentication completed, waiting for redirect...');
    } catch (err: any) {
      console.error('[Login] Microsoft sign-in error:', err);
      // Error is now handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative overflow-hidden">
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gray-200/30"></div>
      <div className="absolute inset-0 bg-gray-300/20"></div>
      
      {/* Animation Style 1: Floating Orbs with Pulse */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gray-400/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gray-500/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gray-600/35 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Animation Style 2: Bouncing Elements */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-cyan-300/30 to-blue-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '1.5s'}}></div>
      <div className="absolute top-3/4 left-1/3 w-20 h-20 bg-gradient-to-br from-indigo-300/30 to-purple-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '2.5s'}}></div>
      
      {/* Animation Style 3: Rotating Geometric Shapes */}
      <div className="absolute top-1/3 left-1/6 w-16 h-16 bg-gradient-to-br from-indigo-400/25 to-purple-400/25 rotate-45 blur-xl animate-spin" style={{animationDuration: '8s'}}></div>
      <div className="absolute bottom-1/3 right-1/6 w-20 h-20 bg-gradient-to-br from-blue-400/25 to-cyan-400/25 rotate-12 blur-xl animate-spin" style={{animationDuration: '12s', animationDirection: 'reverse'}}></div>
      <div className="absolute top-1/6 right-1/3 w-12 h-12 bg-gradient-to-br from-pink-400/25 to-purple-400/25 rotate-30 blur-lg animate-spin" style={{animationDuration: '6s'}}></div>
      
      {/* Animation Style 4: Floating Particles */}
      <div className="absolute top-1/5 left-1/5 w-8 h-8 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-md animate-ping" style={{animationDelay: '0s'}}></div>
      <div className="absolute top-2/5 right-1/5 w-6 h-6 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-md animate-ping" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-1/5 left-2/5 w-10 h-10 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-md animate-ping" style={{animationDelay: '2s'}}></div>
      <div className="absolute bottom-2/5 right-2/5 w-7 h-7 bg-gradient-to-br from-cyan-400/20 to-indigo-400/20 rounded-full blur-md animate-ping" style={{animationDelay: '3s'}}></div>
      
      {/* Animation Style 5: Wave-like Elements */}
      <div className="absolute top-0 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/15 to-indigo-300/15 rounded-full blur-2xl animate-pulse" style={{animationDuration: '4s'}}></div>
      <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-gradient-to-br from-purple-300/15 to-pink-300/15 rounded-full blur-2xl animate-pulse" style={{animationDuration: '6s', animationDelay: '1s'}}></div>
      
      <div className="w-full max-w-lg mx-auto p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 relative z-10 bg-gradient-to-br from-white/95 via-white/90 to-white/95">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <User className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-3">Welcome to kabini.ai</h1>
          <p className="text-gray-600 text-lg">Sign in to your account to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Email <span className="text-red-600">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                const formattedEmail = formatEmail(value);
                setFormData(prev => ({ ...prev, email: formattedEmail }));
                // Trigger validation after paste
                const emailValidation = validateProfessionalEmail(formattedEmail);
                if (!emailValidation.isValid) {
                  setValidationErrors(prev => ({ ...prev, email: getEmailValidationMessage(formattedEmail, emailValidation) }));
                } else {
                  setValidationErrors(prev => ({ ...prev, email: undefined }));
                }
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                const formattedEmail = formatEmail(value);
                setFormData(prev => ({ ...prev, email: formattedEmail }));
                // Trigger validation after paste
                const emailValidation = validateProfessionalEmail(formattedEmail);
                if (!emailValidation.isValid) {
                  setValidationErrors(prev => ({ ...prev, email: getEmailValidationMessage(formattedEmail, emailValidation) }));
                } else {
                  setValidationErrors(prev => ({ ...prev, email: undefined }));
                }
              })}
              onKeyDown={handleKeyDown}
              onCompositionStart={(e) => e.preventDefault()}
              onCompositionUpdate={(e) => e.preventDefault()}
              onCompositionEnd={(e) => e.preventDefault()}
              onBlur={handleBlur}
              required
              inputMode="email"
              autoComplete="email"
              className={`w-full px-4 py-4 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all ${
                validationErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email address *"
            />
            
            {/* Inline error message below email field */}
            {validationErrors.email && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-900 mb-3">Password <span className="text-red-600">*</span></label>
            <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                setFormData(prev => ({ ...prev, password: value }));
                // Trigger validation after paste
                if (!value.trim()) {
                  setValidationErrors(prev => ({ ...prev, password: 'Please enter your password' }));
                } else {
                  setValidationErrors(prev => ({ ...prev, password: undefined }));
                }
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                setFormData(prev => ({ ...prev, password: value }));
                // Trigger validation after paste
                if (!value.trim()) {
                  setValidationErrors(prev => ({ ...prev, password: 'Please enter your password' }));
                } else {
                  setValidationErrors(prev => ({ ...prev, password: undefined }));
                }
              })}
              onKeyDown={handleKeyDown}
              onCompositionStart={(e) => e.preventDefault()}
              onCompositionUpdate={(e) => e.preventDefault()}
              onCompositionEnd={(e) => e.preventDefault()}
              required
              placeholder="Enter your password *"
              className={`w-full px-4 py-4 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all ${
                validationErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              tabIndex={-1}
            >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            </div>
            {validationErrors.password && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.password}
              </p>
            )}
          </div>



          {/* Primary Sign In Button */}
          <button
            type="submit"
            className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02]"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* Links as Text */}
        <div className="mt-6 text-center space-y-2">
          <div>
            <span
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-black hover:text-gray-700 underline hover:no-underline transition-colors cursor-pointer"
            >
              Forgot your password?
            </span>
          </div>
          <div>
            <span
              onClick={() => navigate('/signup')}
              className="text-sm text-black hover:text-gray-700 underline hover:no-underline transition-colors cursor-pointer"
            >
              Don&apos;t have an account? Sign up
            </span>
          </div>
        </div>

        {/* Social Login Options */}
        <div className="mt-10 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-300 text-black font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:text-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Signing in with Google...</span>
              </>
            ) : (
              <>
                <img src="/google.svg" alt="Google" className="w-6 h-6" />
                Sign in with Google
              </>
            )}
          </button>
          
          <button 
            onClick={handleMicrosoftSignIn}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-300 text-black font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:text-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/microsoft.svg" alt="Microsoft" className="w-6 h-6" />
            Sign in with Microsoft
          </button>
        </div>
      </div>
      
      {/* Error Notification */}
      <ErrorNotification
        error={authError || (error && typeof error === 'string' ? error : null)}
        onClose={() => {
          setAuthError(null);
          clearError();
        }}
        autoClose={true}
        autoCloseDelay={5000}
      />
    </div>
  );
};

export default Login; 