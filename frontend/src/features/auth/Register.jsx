import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, clearError, clearMessages } from './authSlice';
import { 
  UserPlusIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  LockClosedIcon, 
  MapPinIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

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
      navigate('/login');
    }
    return () => {
      dispatch(clearError());
      dispatch(clearMessages());
    };
  }, [registrationSuccess, navigate, dispatch]);

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Identity Name Required';
    if (!formData.email.trim()) errors.email = 'Email Endpoint Required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Malformed Email Address';
    
    if (!formData.phone.trim()) errors.phone = 'Contact Telemetry Required';
    else if (!/^[0-9]{10,15}$/.test(formData.phone)) errors.phone = '10-15 Digits Standard Only';
    
    if (!formData.password) errors.password = 'Security Key Required';
    else if (formData.password.length < 6) errors.password = 'Min. 6 Alpha-Numeric Bits';
    
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Entropy Mismatch';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const registerData = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      address: formData.address,
      role: 'EMPLOYEE',
    };

    dispatch(register(registerData));
  };

  return (
    <div className="min-h-screen bg-mesh-dark flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full animate-fade-slide-up">
        {/* Identity Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-slate-900/50 backdrop-blur-2xl border border-white/10 shadow-2xl mb-6 relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <FingerPrintIcon className="h-12 w-12 text-cyan-400 relative z-10 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter italic">
            IDENTITY <span className="text-gradient-cyan">INIT</span>
          </h2>
          <p className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
            Credential Provisioning Terminal
          </p>
        </div>

        <div className="card-glass p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          
          {error && (
            <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/20 text-rose-300 rounded-xl text-center text-xs font-bold font-mono">
              [SYSTEM_ERROR]: {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Professional Full Name</label>
              <div className="relative">
                 <UserPlusIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                 <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`input-field pl-12 h-12 !bg-slate-950/50 ${validationErrors.fullName ? 'border-rose-500/50' : 'border-slate-800'}`}
                  placeholder="e.g. Satish Reddy"
                />
              </div>
              {validationErrors.fullName && <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">{validationErrors.fullName}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Digital End-point</label>
                <div className="relative">
                   <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                   <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input-field pl-12 h-12 !bg-slate-950/50 ${validationErrors.email ? 'border-rose-500/50' : 'border-slate-800'}`}
                    placeholder="email@rx.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Telemetry</label>
                <div className="relative">
                   <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                   <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`input-field pl-12 h-12 !bg-slate-950/50 ${validationErrors.phone ? 'border-rose-500/50' : 'border-slate-800'}`}
                    placeholder="10 Digits"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Physicial Node / Address</label>
              <div className="relative">
                 <MapPinIcon className="absolute left-4 top-4 h-4 w-4 text-slate-600" />
                 <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  className="input-field pl-12 py-3 !bg-slate-950/50 border-slate-800 text-xs"
                  placeholder="Street / Unit / Zone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative">
                   <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                   <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input-field pl-12 h-12 !bg-slate-950/50 ${validationErrors.password ? 'border-rose-500/50' : 'border-slate-800'}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Re-Verify</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field h-12 !bg-slate-950/50 ${validationErrors.confirmPassword ? 'border-rose-500/50' : 'border-slate-800'}`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-glow-indigo active:scale-[0.98] transition-all flex items-center justify-center group disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Provision Access
                  <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Authorized personnel only.{' '}
              <Link to="/login" className="text-cyan-400 font-black hover:text-cyan-300 transition-colors">
                ESTABLISH SESSION
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-4">
           <div className="flex items-center text-[9px] font-black text-emerald-500/60 uppercase">
              <ShieldCheckIcon className="h-3 w-3 mr-1" />
              AES-256 SECURED
           </div>
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Protocol v4.0</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
