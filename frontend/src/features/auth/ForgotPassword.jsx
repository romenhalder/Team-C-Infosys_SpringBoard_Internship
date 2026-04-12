import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/password-reset/forgot`, {
        email: email
      });

      setMessage(response.data.message || 'Password reset request submitted successfully. If you are an employee/manager, the admin has been notified. If you are an admin, check your email for the reset link.');
      setEmail('');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Email service is temporarily unavailable. Please contact your administrator directly.');
      } else {
        setError(err.response?.data?.message || 'Failed to process password reset request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-slide-up">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl mb-4 group hover:scale-110 transition-transform duration-500">
            <span className="text-4xl font-black text-gradient-cyan group-hover:rotate-12 transition-transform">℞</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">
            RECOVER <span className="text-cyan-400">ACCESS</span>
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
            Secure Credential Retrieval Protocol
          </p>
        </div>

        <div className="card-glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          {message && (
            <div className="mb-4 p-3 bg-emerald-500/100/15 text-emerald-300 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/15 text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1"
                placeholder="Enter your email"
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
                'Request Reset Link'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link to="/login" className="text-sm text-cyan-400 font-bold hover:text-cyan-300 transition-colors uppercase tracking-widest">
              ← Back to Terminal
            </Link>
          </div>

          <div className="mt-8 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
            <div className="flex gap-3">
              <span className="text-lg">ℹ️</span>
              <div className="text-[10px] text-slate-400 font-medium leading-relaxed">
                <strong className="text-sky-400 uppercase tracking-wider block mb-1">Authorization Details:</strong>
                • <strong className="text-slate-200">Admins:</strong> Check registeren mailbox for direct reset link.<br />
                • <strong className="text-slate-200">Staff:</strong> Approval request will be sent to system administrator.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;