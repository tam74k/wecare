import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Car,
  MapPin,
  Building,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LocateFixed,
  ShieldCheck,
  Check,
  Camera,
  Trash2,
  MessageSquare,
  Clock,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Send
} from 'lucide-react';
import { Settings, CoverageArea, Vehicle, Customer, AuthUser } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { sendEvolutionWhatsAppOtp } from '../services/whatsappService';

interface LoginViewProps {
  settings: Settings;
  coverageAreas: CoverageArea[];
  vehicles: Vehicle[];
  onLoginSuccess: (user: AuthUser) => void;
  onCreateCustomer?: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  coverageAreas,
  vehicles,
  onLoginSuccess,
  onCreateCustomer,
  onCreateVehicle
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form State
  const [regForm, setRegForm] = useState({
    full_name: '',
    phone: '',
    area_id: '',
    building_number: '',
    block_number: 'A',
    detailed_address: '',
    location_url: '',
    username: '',
    password: '',
    confirm_password: '',
    include_vehicle: true,
    vehicle_type: '',
    color: '',
    plate_number: '',
    vehicle_image_url: ''
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUploadingCarImg, setIsUploadingCarImg] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // WhatsApp OTP & Account Approval Workflow States
  const [authStage, setAuthStage] = useState<'form' | 'otp' | 'pending_review'>('form');
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const [tempCredentials, setTempCredentials] = useState<{ username: string; pass: string; phone: string } | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(120);
  const [otpExpired, setOtpExpired] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pendingReviewReason, setPendingReviewReason] = useState<string>('');

  // 2-minute countdown timer effect (120 seconds)
  useEffect(() => {
    let timer: any = null;
    if (authStage === 'otp' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setOtpExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStage, otpCountdown]);

  // Format seconds to mm:ss
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle uploading/replacing car image in signup form
  const handleCarImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCarImg(true);
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', regForm.vehicle_image_url);
      setRegForm((prev) => ({ ...prev, vehicle_image_url: uploadedUrl }));
    } catch (err: any) {
      alert('فشل حفظ الصورة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsUploadingCarImg(false);
      if (e.target) e.target.value = '';
    }
  };

  // Real-time username check state
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Extract distinct vehicle types & colors for autocomplete
  const uniqueVehicleTypes = Array.from(
    new Set(vehicles.map((v) => (v.vehicle_type || (v as any).type || '').trim()).filter(Boolean) as string[])
  ).sort();

  const uniqueVehicleColors = Array.from(
    new Set(vehicles.map((v) => (v.color || '').trim()).filter(Boolean) as string[])
  ).sort();

  // Set default coverage area if available
  useEffect(() => {
    if (coverageAreas.length > 0 && !regForm.area_id) {
      setRegForm((prev) => ({ ...prev, area_id: coverageAreas[0].id }));
    }
  }, [coverageAreas]);

  // Debounced username availability check
  useEffect(() => {
    const trimmed = regForm.username.trim();
    if (!trimmed || trimmed.length < 3) {
      setUsernameCheckStatus('idle');
      return;
    }

    setUsernameCheckStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const isAvail = await api.checkUsernameAvailability(trimmed);
        setUsernameCheckStatus(isAvail ? 'available' : 'taken');
      } catch {
        setUsernameCheckStatus('idle');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [regForm.username]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setIsLoggingIn(true);
      const authUser = await api.loginUser(loginUsername.trim(), loginPassword);
      onLoginSuccess(authUser);
    } catch (err: any) {
      setLoginError(err.message || 'فشل تسجيل الدخول، يرجى التأكد من البيانات');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle GPS location click
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم خاصية تحديد الموقع الجغرافي (GPS)');
      return;
    }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setRegForm((prev) => ({ ...prev, location_url: mapUrl }));
        setIsLocatingGPS(false);
      },
      (err) => {
        alert('تعذر جلب الموقع: ' + (err.message || 'تأكد من تفعيل صلاحيات الـ GPS'));
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Validation
    if (!regForm.full_name.trim()) {
      setRegError('يرجى إدخال الاسم الكامل للعميل');
      return;
    }
    if (!regForm.phone.trim()) {
      setRegError('يرجى إدخال رقم الموبايل');
      return;
    }
    if (!regForm.area_id) {
      setRegError('يرجى اختيار المنطقة أو الكمبوند');
      return;
    }
    if (!regForm.building_number.trim()) {
      setRegError('يرجى إدخال رقم العمارة/الفيلا');
      return;
    }

    const desiredUsername = regForm.username.trim() || regForm.phone.trim();
    if (!desiredUsername) {
      setRegError('يرجى تحديد اسم المستخدم للحساب');
      return;
    }
    if (desiredUsername.length < 3) {
      setRegError('اسم المستخدم يجب ألا يقل عن 3 أحرف/أرقام');
      return;
    }

    if (!regForm.password) {
      setRegError('يرجى إدخال كلمة المرور');
      return;
    }
    if (regForm.password.length < 4) {
      setRegError('كلمة المرور يجب ألا تقل عن 4 خانات');
      return;
    }
    if (regForm.password !== regForm.confirm_password) {
      setRegError('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    if (regForm.include_vehicle && !regForm.plate_number.trim()) {
      setRegError('يرجى إدخال رقم لوحة السيارة أو إلغاء تحديد إضافة سيارة');
      return;
    }

    try {
      setIsRegistering(true);

      // Verify username uniqueness
      const isAvail = await api.checkUsernameAvailability(desiredUsername);
      if (!isAvail) {
        setRegError(`اسم المستخدم (${desiredUsername}) مسجل بالفعل مسبقاً، يرجى اختيار اسم مستخدم آخر.`);
        setIsRegistering(false);
        return;
      }

      // Create Customer with status 'pending_review' initially
      const custPayload: Omit<Customer, 'id' | 'created_at'> = {
        full_name: regForm.full_name.trim(),
        phone: regForm.phone.trim(),
        area_id: regForm.area_id,
        building_number: regForm.building_number.trim(),
        block_number: regForm.block_number.trim() || 'A',
        detailed_address: regForm.detailed_address.trim(),
        location_url: regForm.location_url.trim(),
        username: desiredUsername,
        password_hash: btoa(regForm.password),
        status: 'pending_review'
      };

      let createdCust: Customer;
      if (onCreateCustomer) {
        createdCust = await onCreateCustomer(custPayload);
      } else {
        createdCust = await api.createCustomer(custPayload);
      }

      // Create vehicle if included
      if (regForm.include_vehicle && regForm.plate_number.trim()) {
        const vehPayload: Omit<Vehicle, 'id' | 'created_at'> = {
          customer_id: createdCust.id,
          vehicle_type: regForm.vehicle_type.trim(),
          color: regForm.color.trim(),
          plate_number: regForm.plate_number.trim(),
          vehicle_image_url: regForm.vehicle_image_url || undefined,
          image_url: regForm.vehicle_image_url || undefined
        };
        if (onCreateVehicle) {
          await onCreateVehicle(vehPayload);
        } else {
          await api.createVehicle(vehPayload);
        }
      }

      setCreatedCustomer(createdCust);
      setTempCredentials({ username: desiredUsername, pass: regForm.password, phone: regForm.phone.trim() });

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Send OTP via Evolution API WhatsApp service
      const sendRes = await sendEvolutionWhatsAppOtp(regForm.phone.trim(), otp, settings);
      setIsRegistering(false);

      if (sendRes.success) {
        setGeneratedOtp(otp);
        setEnteredOtp('');
        setOtpCountdown(120);
        setOtpExpired(false);
        setOtpError(null);
        setAuthStage('otp');
      } else {
        const reason = sendRes.isNotOnWhatsApp
          ? 'الرقم المسجل غير مشترك في تطبيق واتساب'
          : (sendRes.error || 'تعذر إرسال رمز التحقق عبر واتساب');
        setPendingReviewReason(reason);
        setAuthStage('pending_review');

        // Dispatch admin notification
        try {
          await api.createNotification({
            title: 'طلب تسجيل عميل جديد (معلق للمراجعة)',
            message: `سجل العميل ${createdCust.full_name} (${createdCust.phone}) حساباً جديداً وتعذر إرسال رمز التحقق له عبر واتساب (${reason}). الحساب معلق بانتظار مراجعة وتفعيل الإدارة.`,
            type: 'warning',
            customer_id: createdCust.id,
            is_read: false
          });
        } catch (notifErr) {
          console.error('Failed to notify admin:', notifErr);
        }
      }
    } catch (err: any) {
      setRegError(err.message || 'حدث خطأ أثناء تسجيل الحساب');
      setIsRegistering(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (otpExpired || otpCountdown <= 0) {
      setOtpError('انتهت مهلة صلاحية الرمز (دقيقتان). يرجى الضغط على "إعادة إرسال الكود" لاستلام كود جديد.');
      return;
    }

    const clean = enteredOtp.trim();
    if (!clean || clean.length < 4) {
      setOtpError('يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    if (clean !== generatedOtp) {
      setOtpError('رمز التحقق غير صحيح، يرجى التأكد من الرمز المستلم على واتساب');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      if (createdCustomer) {
        await api.updateCustomer(createdCustomer.id, { status: 'active' });
      }
      setRegSuccess('تم تأكيد رقم الهاتف وتفعيل الحساب بنجاح! جاري تسجيل الدخول...');

      setTimeout(async () => {
        try {
          if (tempCredentials) {
            const authUser = await api.loginUser(tempCredentials.username, tempCredentials.pass);
            onLoginSuccess(authUser);
          }
        } catch {
          setAuthStage('form');
          setActiveTab('login');
          if (tempCredentials) {
            setLoginUsername(tempCredentials.username);
            setLoginPassword(tempCredentials.pass);
          }
        }
      }, 1200);
    } catch (err: any) {
      setOtpError(err.message || 'حدث خطأ أثناء تفعيل الحساب');
      setIsVerifyingOtp(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!tempCredentials) return;
    try {
      setIsResendingOtp(true);
      setOtpError(null);
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const sendRes = await sendEvolutionWhatsAppOtp(tempCredentials.phone, newOtp, settings);

      if (sendRes.success) {
        setGeneratedOtp(newOtp);
        setEnteredOtp('');
        setOtpCountdown(120);
        setOtpExpired(false);
      } else {
        const reason = sendRes.isNotOnWhatsApp
          ? 'الرقم المسجل غير مشترك في تطبيق واتساب'
          : (sendRes.error || 'تعذر إرسال رمز التحقق عبر واتساب');
        setPendingReviewReason(reason);
        setAuthStage('pending_review');

        if (createdCustomer) {
          try {
            await api.createNotification({
              title: 'طلب تسجيل عميل جديد (معلق للمراجعة)',
              message: `سجل العميل ${createdCustomer.full_name} (${createdCustomer.phone}) وتعذر وصول رمز التحقق عبر واتساب (${reason}). الحساب معلق لمراجعة وتفعيل الإدارة.`,
              type: 'warning',
              customer_id: createdCustomer.id,
              is_read: false
            });
          } catch {}
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'حدث خطأ أثناء إعادة إرسال الرمز');
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-[#0a232e] to-[#042f2e] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden" dir="rtl">
      {/* Decorative ambient background elements */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Container Card */}
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-teal-500/20 overflow-hidden relative z-10 transition-all">
        {/* Brand Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-teal-950 via-slate-900 to-slate-900 text-white border-b border-teal-900/60 text-center relative">
          <div className="flex justify-center mb-3">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.company_name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-400/40 shadow-xl shadow-teal-500/20"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-teal-500/20 ring-2 ring-teal-400/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            {settings.company_name || 'وي كير لخدمات الغسيل الذكي'}
          </h1>
          <p className="text-xs text-teal-200/80 font-medium">
            منظومة إدارة الاشتراكات وخدمات الغسيل الميداني والعقاري
          </p>

          {/* Role Recognition Badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-teal-900/60 border border-teal-700/50 rounded-full text-[11px] text-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>نظام التعرف الذكي على الصلاحيات (مدير / مشرف / عامل / عميل)</span>
          </div>
        </div>

        {/* Tab Switcher (Visible only in initial form stage) */}
        {authStage === 'form' && (
          <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حساب عميل جديد</span>
            </button>
          </div>
        )}

        {/* Body Form */}
        <div className="p-6 sm:p-8">
          {/* ======================= TAB 1: LOGIN ======================= */}
          {authStage === 'form' && activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fadeIn">
              {loginError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم أو رقم الموبايل *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4 text-teal-600" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="أدخل اسم المستخدم أو رقم الموبايل"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>كلمة المرور</span>
                  <span className="text-[10px] text-teal-600 font-normal">
                    (اتركها فارغة إذا تم إلغاء كلمة المرور من الإدارة)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-teal-600" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pr-10 pl-11 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-[11px] text-teal-900 leading-relaxed">
                <span className="font-bold">ملاحظة:</span> بمجرد تسجيل الدخول، يتعرف النظام تلقائياً على رتبتك وصلاحياتك (سواء كنت مديراً، مشرفاً، عاملاً، أو عميلاً) ويعرض الواجهة المخصصة لك.
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-black text-sm rounded-xl shadow-lg shadow-teal-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق والتعرف على الصلاحيات...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول للنظام</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================= TAB 2: REGISTER ======================= */}
          {authStage === 'form' && activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fadeIn max-h-[70vh] overflow-y-auto pr-1 pl-1 custom-scrollbar">
              {regError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-start gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم الكامل للعميل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد محمد علي"
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الموبايل * (فريد)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 font-bold"
                  />
                </div>
              </div>

              {/* Address Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    منطقة التغطية / الكمبوند *
                  </label>
                  <select
                    required
                    value={regForm.area_id}
                    onChange={(e) => setRegForm({ ...regForm, area_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 font-medium"
                  >
                    <option value="">اختر المنطقة...</option>
                    {coverageAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name} {area.city ? `(${area.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم العمارة / الفيلا *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 45 أو فيلا 12"
                    value={regForm.building_number}
                    onChange={(e) => setRegForm({ ...regForm, building_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المجموعة / البلوك
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: A أو مجاورة 3"
                    value={regForm.block_number}
                    onChange={(e) => setRegForm({ ...regForm, block_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              {/* Optional Detailed Address & GPS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان تفصيلي (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="الدور، الشقة، علامة مميزة..."
                    value={regForm.detailed_address}
                    onChange={(e) => setRegForm({ ...regForm, detailed_address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">الموقع الجغرافي (GPS)</label>
                    <button
                      type="button"
                      onClick={handleGetGPS}
                      disabled={isLocatingGPS}
                      className="text-[10px] text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <LocateFixed className="w-3 h-3" />
                      <span>{isLocatingGPS ? 'جاري التحديد...' : 'جلب موقعي الحالي'}</span>
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="رابط خرائط جوجل أو اضغط جلب موقعي"
                    value={regForm.location_url}
                    onChange={(e) => setRegForm({ ...regForm, location_url: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Account Credentials (Username & Password) */}
              <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>بيانات حساب تسجيل الدخول (اسم المستخدم فريد وغير قابل للتكرار)</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      اسم المستخدم المرغوب *
                    </label>
                    {usernameCheckStatus === 'checking' && (
                      <span className="text-[10px] text-sky-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>جاري التحقق...</span>
                      </span>
                    )}
                    {usernameCheckStatus === 'available' && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>اسم المستخدم متاح ومميز</span>
                      </span>
                    )}
                    {usernameCheckStatus === 'taken' && (
                      <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>مأخوذ بالفعل! اختر اسماً آخر</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ahmed_ali أو رقم الموبايل"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value.trim() })}
                    className={`w-full px-3 py-2 text-xs bg-white border rounded-xl font-bold transition-all ${
                      usernameCheckStatus === 'available'
                        ? 'border-emerald-400 ring-1 ring-emerald-400/20'
                        : usernameCheckStatus === 'taken'
                        ? 'border-rose-400 ring-1 ring-rose-400/20'
                        : 'border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور *</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        className="w-full px-3 py-2 pl-9 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور *</label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={regForm.confirm_password}
                      onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={regForm.include_vehicle}
                    onChange={(e) => setRegForm({ ...regForm, include_vehicle: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-teal-600" />
                    <span>إضافة سيارتي الأولى في الحساب الآن</span>
                  </span>
                </label>

                {regForm.include_vehicle && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fadeIn">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع السيارة</label>
                      <input
                        type="text"
                        list="login-vehicle-types"
                        placeholder="مرسيدس / هيونداي"
                        value={regForm.vehicle_type}
                        onChange={(e) => setRegForm({ ...regForm, vehicle_type: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <datalist id="login-vehicle-types">
                        {uniqueVehicleTypes.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اللون</label>
                      <input
                        type="text"
                        list="login-vehicle-colors"
                        placeholder="أسود / أبيض"
                        value={regForm.color}
                        onChange={(e) => setRegForm({ ...regForm, color: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <datalist id="login-vehicle-colors">
                        {uniqueVehicleColors.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم اللوحة *</label>
                      <input
                        type="text"
                        placeholder="أ ب ج 123"
                        value={regForm.plate_number}
                        onChange={(e) => setRegForm({ ...regForm, plate_number: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                      />
                    </div>

                    {/* Car Image Upload Option */}
                    <div className="sm:col-span-3 pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-teal-600" />
                          <span>صورة السيارة (اختياري)</span>
                        </span>
                        {regForm.vehicle_image_url && (
                          <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            ✓ تم تحديد صورة
                          </span>
                        )}
                      </label>

                      {regForm.vehicle_image_url ? (
                        <div className="p-2 bg-white rounded-xl border border-teal-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={regForm.vehicle_image_url}
                              alt="صورة السيارة"
                              className="w-12 h-12 object-cover rounded-lg border border-teal-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 block truncate">تم حفظ صورة السيارة</span>
                              <span className="text-[10px] text-slate-400">يمكنك استبدالها أو حذفها</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <label className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 cursor-pointer transition-colors">
                              <span>استبدال</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingCarImg}
                                onChange={handleCarImageUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setRegForm((prev) => ({ ...prev, vehicle_image_url: '' }))}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="إزالة الصورة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className={`w-full p-2.5 border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          isUploadingCarImg
                            ? 'border-teal-400 bg-teal-50/50'
                            : 'border-slate-200 hover:border-teal-400 bg-white hover:bg-teal-50/20'
                        }`}>
                          {isUploadingCarImg ? (
                            <>
                              <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                              <span className="text-xs font-bold text-teal-700">جاري حفظ الصورة...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 text-teal-600" />
                              <span className="text-xs font-bold text-slate-600">اضغط لاختيار صورة للسيارة</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingCarImg}
                            onChange={handleCarImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isRegistering || usernameCheckStatus === 'taken'}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-black text-sm rounded-xl shadow-lg shadow-teal-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تسجيل الحساب والتحقق...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء الحساب وبدء الاستخدام</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================= STAGE 2: OTP VERIFICATION ======================= */}
          {authStage === 'otp' && (
            <div className="space-y-5 animate-fadeIn" dir="rtl">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  تأكيد رقم الهاتف عبر واتساب
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  تم إرسال رمز تحقق سري مكون من 6 أرقام عبر واتساب إلى رقم هاتفك:
                  <br />
                  <span dir="ltr" className="font-mono font-black text-slate-800 text-sm inline-block mt-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                    {tempCredentials?.phone}
                  </span>
                </p>

                {/* 2-Minute Countdown Timer Badge */}
                <div className="pt-2">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black transition-all ${
                      otpCountdown > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${otpCountdown > 0 ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}`} />
                    {otpCountdown > 0 ? (
                      <span>الوقت المتبقي لصلاحية الكود: <span className="font-mono text-sm tracking-wider mr-1 text-emerald-900">{formatCountdown(otpCountdown)}</span></span>
                    ) : (
                      <span>انتهت مهلة صلاحية الكود (00:00)</span>
                    )}
                  </div>
                </div>
              </div>

              {otpError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-center text-xs font-bold text-slate-700 mb-2">
                    أدخل رمز التحقق (OTP)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    dir="ltr"
                    inputMode="numeric"
                    autoFocus
                    disabled={isVerifyingOtp || otpCountdown <= 0}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="● ● ● ● ● ●"
                    className="w-full text-center tracking-[0.4em] text-2xl font-mono font-black py-3 px-4 bg-slate-50 border-2 border-teal-500/40 focus:border-teal-600 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-slate-900 transition-all placeholder:tracking-widest placeholder:text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || enteredOtp.length < 4 || otpCountdown <= 0}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق وتفعيل الحساب...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الرمز والدخول للحساب</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={otpCountdown > 0 || isResendingOtp}
                    onClick={handleResendOtp}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
                  >
                    {isResendingOtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري إرسال كود جديد...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {otpCountdown > 0
                            ? `إعادة الإرسال بعد (${formatCountdown(otpCountdown)})`
                            : 'إعادة إرسال كود التحقق'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthStage('form');
                      setActiveTab('login');
                      setLoginError(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================= STAGE 3: PENDING ADMIN REVIEW ======================= */}
          {authStage === 'pending_review' && (
            <div className="space-y-4 animate-fadeIn text-center" dir="rtl">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-800">
                حسابك معلق لمراجعة الإدارة
              </h3>

              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-right space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-900 font-semibold leading-relaxed">
                    تم استلام وحفظ بيانات حسابك بنجاح، ولكن تعذر إرسال رمز التحقق التلقائي عبر تطبيق واتساب إلى رقم الهاتف المسجل:
                    <span dir="ltr" className="font-mono font-black text-slate-800 mr-1 ml-1 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                      {tempCredentials?.phone}
                    </span>
                  </p>
                </div>

                {pendingReviewReason && (
                  <div className="text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-950">سبب التحويل للمراجعة:</span> {pendingReviewReason}
                  </div>
                )}

                <p className="text-slate-600 text-[11px] leading-relaxed pt-1.5 border-t border-amber-200/60">
                  تم إرسال إشعار لإدارة النظام لمراجعة وتفعيل حسابك يدوياً. سيقوم فريق العمل بمراجعة الطلب والتواصل معك في أقرب وقت، ويمكنك بعدها تسجيل الدخول مباشرة.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStage('form');
                    setActiveTab('login');
                    setLoginUsername(tempCredentials?.username || '');
                    setLoginPassword('');
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة لشاشة تسجيل الدخول</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
