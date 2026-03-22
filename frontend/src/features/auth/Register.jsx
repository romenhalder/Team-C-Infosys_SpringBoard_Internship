import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, clearError, clearMessages } from './authSlice';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, registrationSuccess } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (registrationSuccess) {
      // Registration successful, redirect to login
      navigate('/login');
    }
    return () => {
      dispatch(clearError());
      dispatch(clearMessages());
    };
  }, [registrationSuccess, navigate, dispatch]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10,15}$/.test(formData.phone)) {
      errors.phone = 'Phone must be 10-15 digits';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear validation error when user types
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const registerData = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      address: formData.address,
      role: 'EMPLOYEE', // Default role for new registrations
    };

    dispatch(register(registerData));
  };

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full animate-fade-slide-up">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl mb-4 group hover:scale-110 transition-transform duration-500">
            <span className="text-4xl font-black text-gradient-cyan group-hover:rotate-12 transition-transform">℞</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white mb-2">
            JOIN THE <span className="text-cyan-400">NETWORK</span>
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
            GXP Compliant Pharmaceutical Registration
          </p>
        </div>

        <div className="card-glass p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          {error && (
            <div className="mb-4 p-3 bg-rose-500/15 text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-300">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  validationErrors.fullName ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Enter your full name"
              />
              {validationErrors.fullName && (
                <p className="mt-1 text-sm text-rose-400">{validationErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  validationErrors.email ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Enter your email"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-rose-400">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  validationErrors.phone ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Enter 10-15 digit phone number"
              />
              {validationErrors.phone && (
                <p className="mt-1 text-sm text-rose-400">{validationErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-300">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter your address (optional)"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  validationErrors.password ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Min 6 characters"
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-rose-400">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  validationErrors.confirmPassword ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Confirm your password"
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-rose-400">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 shadow-glow-cyan font-bold uppercase tracking-widest text-xs h-12 flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              ) : (
                'Initialize Account'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-slate-400">
              Already part of the network?{' '}
              <Link to="/login" className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors underline-offset-4 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          Secured by PharmaTrack Protocol v4.0
        </p>
      </div>
    </div>
  );
};

export default Register;
