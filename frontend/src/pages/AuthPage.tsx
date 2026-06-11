import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleLogin } from '@react-oauth/google';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useGoogleAuthMutation, useLoginMutation, useRegisterMutation } from '../api/ecommerceApi';
import { Button } from '../components/Button';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import type { Navigate, PublicUser } from '../types';

type AuthMode = 'login' | 'register';

type AuthPageProps = {
  mode: AuthMode;
  onAuthChanged: (user: PublicUser) => void;
  navigate: Navigate;
};

const authSchema = z.object({
  firstName: z.string().trim().optional().default(''),
  lastName: z.string().trim().optional().default(''),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  confirmPassword: z.string().optional().default(''),
  address: z.string().trim().optional().default(''),
});

type AuthFormInput = z.input<typeof authSchema>;
type AuthForm = z.output<typeof authSchema>;

const signupSideImage = 'https://www.figma.com/api/mcp/asset/d608e25b-65c2-421f-96da-b54acb84e61f';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9.02 9.02 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.17 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AuthPage({ mode, onAuthChanged, navigate }: AuthPageProps) {
  const [authStatus, setAuthStatus] = useState('');
  const [authStatusIsError, setAuthStatusIsError] = useState(false);
  const [register, registerState] = useRegisterMutation();
  const [login, loginState] = useLoginMutation();
  const [googleAuth] = useGoogleAuthMutation();
  const authForm = useForm<AuthFormInput, unknown, AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      address: '',
    },
  });
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        setAuthStatus('');
        setAuthStatusIsError(false);
        const result = await googleAuth({ code: codeResponse.code }).unwrap();
        onAuthChanged(result.user);
        navigate('/');
      } catch (error) {
        setAuthStatusIsError(true);
        setAuthStatus(getRtkErrorMessage(error));
        console.error('Google login failed');
      }
    },
    onError: () => {
      setAuthStatusIsError(true);
      setAuthStatus('Google sign-in was cancelled or failed.');
      console.error('Google login failed');
    },
  });

  const isLogin = mode === 'login';
  const submitAuth = authForm.handleSubmit(async (payload) => {
    try {
      setAuthStatus('');
      setAuthStatusIsError(false);
      const mutationFn = isLogin ? login : register;
      const result = await mutationFn({
        ...payload,
        confirmPassword: isLogin ? payload.confirmPassword : payload.password,
      }).unwrap();
      onAuthChanged(result.user);
      navigate('/');
    } catch (error) {
      setAuthStatusIsError(true);
      setAuthStatus(getRtkErrorMessage(error));
    }
  });

  return (
    <main className="signup-page" aria-labelledby="signup-title">
      <section className="signup-visual" aria-hidden="true">
        <img src={signupSideImage} alt="" />
      </section>
      <section className="signup-panel">
        <div className="signup-panel__intro">
          <h1 id="signup-title">{isLogin ? 'Log in to Exclusive' : 'Create an account'}</h1>
          <p>Enter your details below</p>
        </div>
        <form className="signup-form" onSubmit={submitAuth}>
          {!isLogin && (
            <label className="signup-field">
              <span className="sr-only">Name</span>
              <input
                placeholder="First name"
                autoComplete="name"
                {...authForm.register('firstName')}
                aria-invalid={Boolean(authForm.formState.errors.firstName)}
              />
              {authForm.formState.errors.firstName?.message && (
                <small>{authForm.formState.errors.firstName.message}</small>
              )}
            </label>
          )}
          <label className="signup-field">
            <span className="sr-only">Email or Phone Number</span>
            <input
              placeholder="Email or phone number"
              type="email"
              autoComplete="email"
              {...authForm.register('email')}
              aria-invalid={Boolean(authForm.formState.errors.email)}
            />
            {authForm.formState.errors.email?.message && (
              <small>{authForm.formState.errors.email.message}</small>
            )}
          </label>
          <label className="signup-field">
            <span className="sr-only">Password</span>
            <input
              placeholder="Password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              {...authForm.register('password')}
              aria-invalid={Boolean(authForm.formState.errors.password)}
            />
            {authForm.formState.errors.password?.message && (
              <small>{authForm.formState.errors.password.message}</small>
            )}
          </label>
          <Button
            className="signup-submit"
            type="submit"
            disabled={registerState.isLoading || loginState.isLoading}
          >
            {registerState.isLoading || loginState.isLoading
              ? 'Please wait...'
              : isLogin
                ? 'Log In'
                : 'Create Account'}
          </Button>
          {googleClientId && (
            <button type="button" className="google-btn" onClick={() => googleLogin()}>
              <GoogleIcon />
              <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </button>
          )}
          {!googleClientId && (
            <p className="signup-help">Google sign-in needs VITE_GOOGLE_CLIENT_ID.</p>
          )}
          <div className="signup-switch">
            <span>{isLogin ? 'Need an account?' : 'Already have account?'}</span>
            <button type="button" onClick={() => navigate(isLogin ? '/signup' : '/login')}>
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
          {authStatus && (
            <p className={`form-status ${authStatusIsError ? 'form-status--error' : ''}`}>
              {authStatus}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
