import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import ErrorNotification from './ui/ErrorNotification';
import PasswordStrengthIndicator from './ui/PasswordStrengthIndicator';
import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';
import { validateProfessionalEmail, getEmailValidationMessage, formatEmail } from '../utils/emailValidation';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordOk, setPasswordOk] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, error, clearError, isAuthenticated } = useAuth();

  // Effect to redirect after successful authentication
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Use the AuthContext state instead of checking authService directly
      if (isAuthenticated) {
        console.log('[SignUp] User is authenticated via AuthContext, redirecting to overview...');
        navigate('/overview', { replace: true });
        return;
      }
      
      // Fallback: also check authService directly
      if (authService.isAuthenticated()) {
        console.log('[SignUp] User is authenticated via authService, redirecting to overview...');
        navigate('/overview', { replace: true });
        return;
      }
    };

    // Check immediately
    checkAuthAndRedirect();

    // Set up an interval to check authentication status
    const interval = setInterval(checkAuthAndRedirect, 500);

    return () => clearInterval(interval);
  }, [navigate, isAuthenticated]);

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
    
    // Clear validation error when user starts typing
    if (validationError) setValidationError('');
    
    // Real-time validation for email
    if (name === 'email') {
      if (!value.trim()) {
        // Don't show error while typing, only when field is empty
      } else {
        // Use comprehensive Gmail email validation for real-time feedback
        const emailValidation = validateProfessionalEmail(value);
        if (!emailValidation.isValid) {
          // Show real-time validation error
          setValidationError(getEmailValidationMessage(value, emailValidation));
        } else {
          // Clear validation error if email is valid
          setValidationError('');
        }
      }
    }
    
    // Enhanced real-time validation for password
    if (name === 'password') {
      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      const isLongEnough = value.length >= 8;
      
      const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough;
      setPasswordOk(allRequirementsMet);
      
      // Clear validation error when password is valid
      if (allRequirementsMet) {
        setValidationError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setAuthError(null);
    
    // Validate all required fields
    if (!formData.firstName.trim()) {
      setValidationError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setValidationError('Last name is required');
      return;
    }
    if (!formData.email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!formData.password.trim()) {
      setValidationError('Password is required');
      return;
    }
    if (!formData.confirmPassword.trim()) {
      setValidationError('Please confirm your password');
      return;
    }
    
    // Validate first and last name: letters only (A–Z, a–z)
    const nameRegex = /^[A-Za-z]+$/;
    if (!nameRegex.test(formData.firstName)) {
      setValidationError('First name can contain only letters (A–Z, a–z)');
      return;
    }
    if (!nameRegex.test(formData.lastName)) {
      setValidationError('Last name can contain only letters (A–Z, a–z)');
      return;
    }
    
    // Use comprehensive email validation for professional domains
    const emailValidation = validateProfessionalEmail(formData.email);
    if (!emailValidation.isValid) {
      setValidationError(getEmailValidationMessage(formData.email, emailValidation));
      return;
    }
    
    // Clear any email validation errors before proceeding
    setValidationError('');
    
    // Validate password strength with enhanced requirements
    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setValidationError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      setValidationError('Password must contain at least one lowercase letter');
      return;
    }
    if (!/\d/.test(formData.password)) {
      setValidationError('Password must contain at least one number');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      setValidationError('Password must contain at least one special character');
      return;
    }
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    clearError();
    
    try {
      const response = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });

      if (response.success) {
        console.log('[SignUp] Sign up successful, attempting login...');
        // Automatically log in the user after successful signup
        await login('register', {
          email: formData.email, 
          password: formData.password,
          name: `${formData.firstName} ${formData.lastName}`,
          displayName: `${formData.firstName} ${formData.lastName}`
        });
      } else {
        setValidationError(response.error || 'Sign up failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[SignUp] Sign up error:', err);
      
      // Handle specific error cases for better user experience
      let errorMessage = 'Sign up failed. Please try again.';
      
      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            errorMessage = 'Account already exists on this email';
          } else if (err.message.includes('Network') || err.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = err.message;
          }
        } else if (err.error && typeof err.error === 'string') {
          // Handle backend error responses
          if (err.error.includes('already exists') || err.error.includes('duplicate')) {
            errorMessage = 'Account already exists on this email';
          } else if (err.error.includes('Network') || err.error.includes('connection')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = err.error;
          }
        }
      }
      
      // Set authentication error for the toggle notification
      console.log('[SignUp] Setting authentication error message:', errorMessage);
      setAuthError(errorMessage);
      
      // Clear any inline validation errors since we're showing authentication error as toggle
      setValidationError('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 px-4 relative overflow-hidden">
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-300/30 via-indigo-300/30 to-purple-300/30"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-200/20 via-blue-200/20 to-indigo-200/20"></div>
      
      {/* Animation Style 1: Floating Orbs with Pulse */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/40 to-cyan-400/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-purple-400/40 to-pink-400/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-indigo-400/35 to-blue-400/35 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Animation Style 2: Bouncing Elements */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-cyan-300/30 to-blue-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '1.5s'}}></div>
      
      <div className="w-full max-w-md mx-auto p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 relative z-10 bg-gradient-to-br from-white/95 via-white/90 to-white/95">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <User className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">Create your account</h1>
          <p className="text-gray-600 text-lg">Sign up to get started with kabini.ai</p>
        </div>



        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">First Name <span className="text-red-600">*</span></label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  // Allow only letters for first name
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, firstName: filteredValue }));
                  // Clear any previous validation popup once user starts correcting
                  if (validationError) setValidationError('');
                  // Don't clear authError - let it remain as toggle notification
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, firstName: filteredValue }));
                })}
                onKeyDown={handleKeyDown}
                required
                placeholder="Enter your first name *"
                pattern="[A-Za-z]+"
                autoComplete="given-name"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Last Name <span className="text-red-600">*</span></label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  // Allow only letters for last name
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, lastName: filteredValue }));
                  // Clear any previous validation popup once user starts correcting
                  if (validationError) setValidationError('');
                  // Don't clear authError - let it remain as toggle notification
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, lastName: filteredValue }));
                })}
                onKeyDown={handleKeyDown}
                required
                placeholder="Enter your last name *"
                pattern="[A-Za-z]+"
                autoComplete="family-name"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Email <span className="text-red-600">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                const formattedEmail = formatEmail(value);
                setFormData(prev => ({ ...prev, email: formattedEmail }));
                // Clear any previous validation popup once user starts correcting
                if (validationError) setValidationError('');
                // Don't clear authError here - let it remain as toggle notification
                
                // Real-time email validation - show inline validation for email format
                if (!formattedEmail.trim()) {
                  setValidationError('');
                } else {
                  const emailValidation = validateProfessionalEmail(formattedEmail);
                  if (!emailValidation.isValid) {
                    setValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
                  } else {
                    setValidationError('');
                  }
                }
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                const formattedEmail = formatEmail(value);
                setFormData(prev => ({ ...prev, email: formattedEmail }));
                // Trigger validation after paste
                const emailValidation = validateProfessionalEmail(formattedEmail);
                if (!emailValidation.isValid) {
                  setValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
                } else {
                  setValidationError('');
                }
              })}
              onKeyDown={handleKeyDown}
              required
              placeholder="Enter your email address *"
              className={`w-full px-4 py-4 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                validationError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
            />
            
            {/* Inline email validation message below email field */}
            {validationError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Password <span className="text-red-600">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  setFormData(prev => ({ ...prev, password: value }));
                  // Clear any previous validation popup once user starts correcting
                  if (validationError) setValidationError('');
                  // Don't clear authError - let it remain as toggle notification
                  // Check password strength
                  const hasUppercase = /[A-Z]/.test(value);
                  const hasLowercase = /[a-z]/.test(value);
                  const hasNumber = /\d/.test(value);
                  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
                  const isLongEnough = value.length >= 8;
                  
                  const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough;
                  setPasswordOk(allRequirementsMet);
                  
                  // Clear validation error when password is valid
                  if (allRequirementsMet) {
                    setValidationError('');
                  }
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  setFormData(prev => ({ ...prev, password: value }));
                  // Check password strength
                  const hasUppercase = /[A-Z]/.test(value);
                  const hasLowercase = /[a-z]/.test(value);
                  const hasNumber = /\d/.test(value);
                  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
                  const isLongEnough = value.length >= 8;
                  
                  const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough;
                  setPasswordOk(allRequirementsMet);
                  
                  // Clear validation error when password is valid
                  if (allRequirementsMet) {
                    setValidationError('');
                  }
                })}
                onKeyDown={handleKeyDown}
                required
                placeholder="Create a password *"
                className="w-full px-4 pr-12 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Enhanced Password Strength Indicator */}
            <PasswordStrengthIndicator 
              password={formData.password} 
              className="mt-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Confirm Password <span className="text-red-600">*</span></label>
            <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                setFormData(prev => ({ ...prev, confirmPassword: value }));
                // Clear any previous validation popup once user starts correcting
                if (validationError) setValidationError('');
                // Don't clear authError - let it remain as toggle notification
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                setFormData(prev => ({ ...prev, confirmPassword: value }));
              })}
              onKeyDown={handleKeyDown}
              required
              placeholder="Re-enter your password *"
              className="w-full px-4 pr-12 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

          <button
            type="button"
            onClick={() => navigate('/login')}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02] mt-6"
          >
          <ArrowLeft className="w-5 h-5" />
            Already have an account? Sign in
          </button>
      </div>
      
      {/* Error Notification - Only for authentication errors, not email validation */}
      <ErrorNotification
        error={authError || error}
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

export default SignUp; 