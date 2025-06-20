// src/pages/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store';
import { useDemoMode } from '../contexts/DemoModeContext';
import { ArrowLeft, Sun, Moon, UserCheck, User } from 'lucide-react'; 
import BoltBadge from '../components/BoltBadge';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn, signUp, forgotPassword } = useAuth();
  const { theme, toggleTheme } = useStore();
  const [activeDemoUser, setActiveDemoUser] = useState<'power' | 'standard' | 'readonly' | null>(null);
  const { isReadOnlyDemo, isDemoMode } = useDemoMode();

  useEffect(() => {
    if (user) {
      console.log("LoginPage: User detected, navigating to /");
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isForgotPassword) {
        await forgotPassword(email);
        setSuccess('Password reset instructions have been sent to your email.');
      } else if (isSignUp) {
        await signUp(email, password);
        setSuccess('Please check your email to verify your account.');
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (userType: 'power' | 'standard' | 'readonly') => {
    setActiveDemoUser(userType); 
    if (userType === 'power') {
      setEmail('demo@studymindai.me');
      setPassword('password123');
    } else if (userType === 'readonly') {
      setEmail('readonly@studymindai.me');
      setPassword('readonly123');
    }
  };

  const renderForm = () => {
    const inputClasses = "appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm";
    
    if (isForgotPassword) {
      return (
        <div>
          <label htmlFor="email-address" className="sr-only">Email address</label>
          <input
            id="email-address"
            name="email" type="email" autoComplete="email" required
            className={`${inputClasses} rounded-md`} // Apply classes and make it rounded
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      );
    }

    return (
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email-address" className="sr-only">Email address</label>
          <input
            id="email-address"
            name="email" type="email" autoComplete="email" required
            className={`${inputClasses} rounded-t-md`}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            id="password"
            name="password" type="password" autoComplete="current-password" required
            className={`${inputClasses} rounded-b-md`}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
    );
  };

  const primaryButtonClasses = "flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-all";
  const secondaryButtonClasses = "flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Branding header is correct */}
        <div>
          <div className="flex flex-col items-center">
            <BoltBadge className="w-24 h-24" /> 
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-800 dark:text-gray-200">
              StudyMind
            </h1>
          </div>
        </div>
        
        {/* Demo Mode Information Box */}
        {(isDemoMode || isReadOnlyDemo) && (
          <div className="bg-primary/5 dark:bg-primary/10 border-l-4 border-primary dark:border-primary-light p-4 rounded-r-lg">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Demo Environment</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {isReadOnlyDemo 
                ? "This is a read-only demo. You can explore the app but changes won't be saved."
                : "Sign up is disabled. Please use the account below to explore the app."}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {isReadOnlyDemo ? (
                <button
                  type="button"
                  onClick={() => handleDemoLogin('readonly')}
                  className={activeDemoUser === 'readonly' ? primaryButtonClasses : secondaryButtonClasses}
                >
                  <User className="h-4 w-4 mr-2" />
                  Login as Read-Only User
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDemoLogin('power')}
                  className={activeDemoUser === 'power' ? primaryButtonClasses : secondaryButtonClasses}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Login as Demo User
                </button>
              )}
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {renderForm()}

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div className="h-5 w-5 border-t-2 border-white rounded-full animate-spin"></div>
                </span>
              ) : null}
              {isForgotPassword 
                ? 'Send reset instructions'
                : isSignUp 
                ? 'Sign up' 
                : 'Sign in'}
            </button>
          </div>

          <div className="flex flex-col space-y-2 text-sm text-center">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="flex items-center justify-center font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to sign in
              </button>
            ) : (
              <>
                {!isDemoMode && !isReadOnlyDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"}
                  </button>
                )}

                {!isSignUp && !isDemoMode && !isReadOnlyDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Forgot your password?
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;