/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';

type AuthView = 'signIn' | 'signUp' | 'resetPassword';

export default function LoginScreen() {
  const { signInWithPassword, signUp, sendPasswordResetEmail } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (authView === 'signIn') {
        await signInWithPassword(email, password);
        // Successful sign-in will be handled by onAuthStateChange
      } else if (authView === 'signUp') {
        await signUp(email, password);
        setMessage('Success! Please check your email to verify your account.');
      } else if (authView === 'resetPassword') {
        await sendPasswordResetEmail(email);
        setMessage('Check your email for a password reset link.');
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (view: AuthView) => {
    setAuthView(view);
    setEmail('');
    setPassword('');
    setError('');
    setMessage('');
  };

  const renderFormContent = () => {
    switch (authView) {
      case 'signUp':
        return {
          title: 'Create an Account',
          buttonText: 'Sign Up',
          content: (
            <>
              <p className="auth-instruction">Enter your email and a password to create an account.</p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </>
          ),
          footer: (
            <p className="auth-view-switch">
              Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); switchView('signIn'); }}>
                Sign In
              </a>
            </p>
          ),
        };
      case 'resetPassword':
        return {
          title: 'Reset Password',
          buttonText: 'Send Reset Link',
          content: (
             <>
              <p className="auth-instruction">Enter your email and we'll send you a link to reset your password.</p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !!message}
              />
            </>
          ),
          footer: (
             <p className="auth-view-switch">
              Remembered your password?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); switchView('signIn'); }}>
                Back to Sign In
              </a>
            </p>
          ),
        };
      case 'signIn':
      default:
        return {
          title: 'Welcome Back',
          buttonText: 'Sign In',
          content: (
            <>
              <p className="auth-instruction">Please sign in to continue.</p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </>
          ),
          footer: (
             <>
              <p className="auth-view-switch">
                <a href="#" onClick={(e) => { e.preventDefault(); switchView('resetPassword'); }}>
                  Forgot your password?
                </a>
              </p>
              <p className="auth-view-switch">
                Don't have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); switchView('signUp'); }}>
                  Sign Up
                </a>
              </p>
            </>
          ),
        };
    }
  };

  const { title, buttonText, content, footer } = renderFormContent();

  return (
    <div className="login-screen-overlay">
      <div className="login-form-container">
        <h3>{title}</h3>
        <form onSubmit={handleAuthAction} noValidate>
          {content}
          <button type="submit" disabled={loading || !!message}>
            {loading ? 'Processing...' : buttonText}
          </button>
        </form>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        <div className="auth-footer">
          {footer}
        </div>
      </div>
    </div>
  );
}