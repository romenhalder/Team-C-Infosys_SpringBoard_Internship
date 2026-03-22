import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, clearError } from './authSlice';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'ADMIN' ? '/dashboard' : '/employee-dashboard');
    }
    return () => { dispatch(clearError()); };
  }, [isAuthenticated, user, navigate, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(formData));
  };

  const isFieldValid = (field) => {
    if (!touched[field]) return null;
    if (field === 'identifier') return formData.identifier.length >= 3;
    if (field === 'password') return formData.password.length >= 4;
    return true;
  };

  const getInputStyle = (field) => {
    const valid = isFieldValid(field);
    if (valid === null) return {};
    if (valid) return { borderColor: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.1)' };
    return { borderColor: '#f43f5e', boxShadow: '0 0 0 3px rgba(244,63,94,0.1)' };
  };

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-slide-up">

        {/* Branding */}
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
              boxShadow: '0 8px 32px rgba(34,211,238,0.3)',
            }}
          >
            <span className="text-3xl font-black" style={{ color: '#0f172a' }}>℞</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gradient-cyan">
            PharmaTrack Pro
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#64748b' }}>
            Sign in to manage your pharmaceutical inventory
          </p>
        </div>

        {/* Login Card */}
        <div className="card-glass">
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm font-medium animate-fade-slide-up"
              style={{ background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)' }}
            >
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium" style={{ color: '#94a3b8' }}>
                Email or Phone
              </label>
              <div className="relative mt-1">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={formData.identifier}
                  onChange={handleChange}
                  onBlur={() => handleBlur('identifier')}
                  className="input-field"
                  style={getInputStyle('identifier')}
                  placeholder="Enter email or phone"
                />
                {isFieldValid('identifier') === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">✓</span>
                )}
              </div>
              {isFieldValid('identifier') === false && (
                <p className="validation-error">Please enter a valid identifier</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#94a3b8' }}>
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium" style={{ color: '#22d3ee' }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                  className="input-field"
                  style={getInputStyle('password')}
                  placeholder="Enter password"
                />
                {isFieldValid('password') === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">✓</span>
                )}
              </div>
              {isFieldValid('password') === false && (
                <p className="validation-error">Password must be at least 4 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex justify-center items-center text-sm font-semibold"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-slate-900" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div
            className="mt-6 p-3 rounded-lg text-center"
            style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.1)' }}
          >
            <p className="text-sm" style={{ color: '#64748b' }}>
              <strong style={{ color: '#94a3b8' }}>Need an account?</strong><br />
              Contact your administrator to create employee accounts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center text-xs" style={{ color: '#475569' }}>
          <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" style={{ color: '#10b981' }} />
          Drug License Compliant System
        </div>
      </div>
    </div>
  );
};

export default Login;
