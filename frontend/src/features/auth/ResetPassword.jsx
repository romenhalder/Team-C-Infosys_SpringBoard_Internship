import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await axios.get(`${API_URL}/password-reset/validate-token`, {
          params: { token }
        });

        if (response.data.valid) {
          setIsValidToken(true);
        } else {
          setError('This reset link has expired or is invalid');
        }
      } catch (err) {
        setError('Failed to validate reset token');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/password-reset/reset`, {
        token: token,
        newPassword: password
      });

      setMessage(response.data.message || 'Password reset successful');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500 mx-auto"></div>
          <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Validating Security Token...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-fade-slide-up">
          <div className="card-glass p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Vault Link Invalid</h2>
            <p className="text-slate-400 mb-8 font-medium">{error}</p>
            <Link to="/forgot-password" className="btn-primary w-full py-4 shadow-glow-cyan font-bold uppercase tracking-widest text-xs h-12 flex items-center justify-center">
              Request New Token
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-slide-up">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl mb-4 group hover:scale-110 transition-transform duration-500">
            <span className="text-4xl font-black text-gradient-cyan group-hover:rotate-12 transition-transform">℞</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">
            RESET <span className="text-cyan-400">VAULT</span>
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
            Finalizing Credential Transformation
          </p>
        </div>

        <div className="card-glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          {message && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-center gap-3 animate-slide-in">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm">{message}</p>
                <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Redirecting to Terminal...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-bold flex items-center gap-3 animate-slide-in">
              <span className="text-xl">❌</span>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" class="label-clinical">NEW ACCESS KEY</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1"
                placeholder="Enter secure password"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" class="label-clinical">VERIFY ACCESS KEY</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field mt-1"
                placeholder="Re-enter password"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 shadow-glow-cyan font-bold uppercase tracking-widest text-xs h-12 flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              ) : (
                'Finalize Transformation'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link to="/login" className="text-sm text-cyan-400 font-bold hover:text-cyan-300 transition-colors uppercase tracking-widest">
              ← ABORT TO TERMINAL
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;