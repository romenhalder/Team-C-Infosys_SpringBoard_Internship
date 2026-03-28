import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, clearError } from './authSlice';
import { 
  ShieldCheckIcon, 
  LockClosedIcon, 
  UserIcon,
  FingerPrintIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

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
    if (field === 'password') return formData.password.length >= 6;
    return true;
  };

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <div className="max-w-md w-full z-10">
        {/* Superior Branding */}
        <div className="text-center mb-10 animate-fade-slide-up stagger-1">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-glow-cyan">
              <span className="text-4xl font-black text-gradient-cyan">℞</span>
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="flex items-center space-x-1 bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">System Live</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            PharmaTrack <span className="text-cyan-400">Pro</span>
          </h1>
          <div className="flex items-center justify-center space-x-2 text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            <CpuChipIcon className="h-3 w-3" />
            <span>Advanced Inventory Control</span>
          </div>
        </div>

        {/* Access Terminal Card */}
        <div className="card-glass p-0 overflow-hidden animate-fade-slide-up stagger-2 border-t-4 border-t-cyan-500">
          <div className="bg-slate-900/50 border-b border-slate-800 px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <LockClosedIcon className="h-4 w-4 text-cyan-500" />
              <span className="text-xs font-black text-slate-300 tracking-widest uppercase">Secure Access Terminal</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">v3.4.0-REL</span>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 animate-shake">
                <div className="p-1 rounded-lg bg-rose-500/20">
                  <FingerPrintIcon className="h-5 w-5 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-0.5">Authentication Failure</p>
                  <p className="text-xs text-rose-400/80 leading-relaxed font-medium">{error}</p>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-label ml-1">Personnel Identifier</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    name="identifier"
                    type="text"
                    required
                    value={formData.identifier}
                    onChange={handleChange}
                    onBlur={() => handleBlur('identifier')}
                    className={`input-field pl-12 h-12 !bg-slate-900/40 border-slate-800 focus:border-cyan-500 transition-all ${isFieldValid('identifier') === false ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
                    placeholder="Email or Mobile"
                  />
                </div>
                {isFieldValid('identifier') === false && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1">Requires valid personnel ID</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-label">Access Passcode</label>
                  <Link to="/forgot-password" title="Recover Access" className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors">
                    Reset
                  </Link>
                </div>
                <div className="relative group">
                  <ShieldCheckIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    className={`input-field pl-12 h-12 !bg-slate-900/40 border-slate-800 focus:border-cyan-500 transition-all ${isFieldValid('password') === false ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {isFieldValid('password') === false && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1">Minimum 6-character encryption</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-cyan-500 text-slate-950 font-black text-sm rounded-xl shadow-glow-cyan hover:bg-cyan-400 hover:scale-[1.01] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 tracking-[0.2em] uppercase"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-slate-950" />
                ) : (
                  <>
                    <span>Initialize Session</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between">
              <p className="text-[10px] font-medium text-slate-500">
                Unauthorized access is strictly monitored.
              </p>
              <div className="flex items-center space-x-1">
                 <div className="w-1 h-1 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encrypted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Footer */}
        <div className="mt-8 flex flex-col items-center space-y-4 animate-fade-slide-up stagger-3">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-slate-500 saturate-[0.5]">
              <ShieldCheckIcon className="h-4 w-4" />
              <span className="text-[9px] font-bold uppercase tracking-widest italic">GXP Compliant</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800" />
            <div className="flex items-center space-x-2 text-slate-500 saturate-[0.5]">
              <LockClosedIcon className="h-4 w-4" />
              <span className="text-[9px] font-bold uppercase tracking-widest italic">HIPAA Ready</span>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-600 font-medium">
            &copy; {new Date().getFullYear()} PharmaTrack Systems International
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
