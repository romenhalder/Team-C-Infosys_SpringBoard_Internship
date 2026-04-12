import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheckIcon, 
  BeakerIcon, 
  UserPlusIcon, 
  ArrowRightIcon,
  FingerPrintIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const Setup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const response = await axios.get(`${API_URL}/setup/check`);
      setSetupRequired(response.data.setupRequired);
      if (!response.data.setupRequired) {
        navigate('/login');
      }
    } catch (err) {
      console.error('Failed to check setup status', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^[0-9]{10,15}$/.test(formData.phone)) newErrors.phone = 'Phone must be 10-15 digits';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters required';
    
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitError('');

    try {
      await axios.post(`${API_URL}/setup/init`, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Initialization failed: Authority record collision or database error.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-navy flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
             <FingerPrintIcon className="h-8 w-8 text-cyan-500" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Querying System State...</p>
        </div>
      </div>
    );
  }

  if (!setupRequired) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-slate-navy flex items-center justify-center p-4">
        <div className="max-w-md w-full card-glass p-8 text-center space-y-6 border-t-4 border-t-emerald-500 shadow-glow-emerald animate-fade-slide-up">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
             <ShieldCheckIcon className="h-12 w-12 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white italic">Protocol Initialized</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Root Administrator Identity has been forged. Synchronizing access registers...
          </p>
          <div className="flex justify-center">
             <div className="h-1 w-24 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[loading_2.5s_ease-in-out_infinite]" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-fade-slide-up">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-slate-900/50 backdrop-blur-2xl border border-white/10 shadow-2xl mb-6 relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <BeakerIcon className="h-12 w-12 text-cyan-400 relative z-10 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter italic">
            SYSTEM <span className="text-gradient-cyan">INIT</span>
          </h2>
          <p className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
            Deploying PharmaTrack Core Architecture
          </p>
        </div>

        <div className="card-glass p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          
          {submitError && (
            <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/20 text-rose-300 rounded-xl flex items-center space-x-3 text-xs font-bold">
               <ShieldExclamationIcon className="h-5 w-5 flex-shrink-0" />
               <span>{submitError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Administrator Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Dr. John Doe"
                className={`input-field h-12 !bg-slate-950/50 ${errors.fullName ? 'border-rose-500/50' : 'border-slate-800'}`}
              />
              {errors.fullName && <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Email Endpoint</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@pharmatrack.pro"
                className={`input-field h-12 !bg-slate-950/50 ${errors.email ? 'border-rose-500/50' : 'border-slate-800'}`}
              />
              {errors.email && <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact No.</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`input-field h-12 !bg-slate-950/50 ${errors.phone ? 'border-rose-500/50' : 'border-slate-800'}`}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Network Key</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input-field h-12 !bg-slate-950/50 ${errors.password ? 'border-rose-500/50' : 'border-slate-800'}`}
                  />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Verify Network Key</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field h-12 !bg-slate-950/50 ${errors.confirmPassword ? 'border-rose-500/50' : 'border-slate-800'}`}
              />
              {errors.confirmPassword && <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-glow-cyan active:scale-[0.98] transition-all flex items-center justify-center group"
            >
              Initialize Network Authority
              <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        <div className="text-center space-y-2">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global GXP & HIPAA Compliance Standard</p>
           <div className="flex justify-center space-x-3 opacity-30 grayscale contrast-125">
              <div className="h-6 w-12 bg-slate-700 rounded flex items-center justify-center text-[8px] font-black text-white">FDA</div>
              <div className="h-6 w-12 bg-slate-700 rounded flex items-center justify-center text-[8px] font-black text-white">EU-GMP</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;