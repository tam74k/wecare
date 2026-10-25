import React, { useState, useEffect, useRef } from 'react';
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
  Send,
  UserCheck
} from 'lucide-react';
import { Settings, CoverageArea, Vehicle, Customer, AuthUser } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { normalizeEgyptianPhone } from '../services/api';
import { sendEvolutionWhatsAppOtp } from '../services/whatsappService';

interface LoginViewProps {
  settings: Settings;
  coverageAreas: CoverageArea[];
  vehicles: Vehicle[];
  customers?: Customer[];
  onLoginSuccess: (user: AuthUser) => void;
  onCreateCustomer?: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  coverageAreas,
  vehicles,
  customers = [],
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
  const [rememberMe, setRememberMe] = useState(true);

  // Restore remembered username/phone on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wecare_remember_user');
      if (saved) {
        setLoginUsername(saved);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Live Service / Coverage Areas fetched directly from Database
  const [serviceAreas, setServiceAreas] = useState<CoverageArea[]>(coverageAreas || []);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);

  // Sync when prop updates
  useEffect(() => {
    if (coverageAreas && coverageAreas.length > 0) {
      setServiceAreas(coverageAreas);
    }
  }, [coverageAreas]);

  // Fetch directly from database on mount & when switching to register
  useEffect(() => {
    let isMounted = true;
    const fetchAreasFromDb = async () => {
      try {
        setIsLoadingAreas(true);
        const liveAreas = await api.getCoverageAreas();
        if (isMounted && Array.isArray(liveAreas) && liveAreas.length > 0) {
          setServiceAreas(liveAreas);
        }
      } catch (err) {
        console.error('Failed to load coverage areas from database in LoginView:', err);
      } finally {
        if (isMounted) setIsLoadingAreas(false);
      }
    };

    fetchAreasFromDb();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

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

  // Auto-detection of existing customer state
  const [existingCustomerMatch, setExistingCustomerMatch] = useState<Customer | null>(null);
  const [matchedVehicles, setMatchedVehicles] = useState<Vehicle[]>([]);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const phoneSearchTimeoutRef = useRef<any>(null);

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

    const rawUser = loginUsername.trim();
    if (!rawUser) {
      setLoginError('يرجى إدخال رقم الموبايل أو اسم المستخدم');
      return;
    }

    try {
      setIsLoggingIn(true);
      const authUser = await api.loginUser(rawUser, loginPassword);
      try {
        if (rememberMe) {
          localStorage.setItem('wecare_remember_user', rawUser);
        } else {
          localStorage.removeItem('wecare_remember_user');
        }
      } catch (e) {
        // ignore
      }
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

  const applyCustomerMatch = (match: Customer, custVehs: Vehicle[], rawPhone: string) => {
    setExistingCustomerMatch(match);
    setMatchedVehicles(custVehs);

    const norm = normalizeEgyptianPhone(rawPhone) || rawPhone.trim();
    // Pre-fill form fields automatically from existing record
    setRegForm((prev) => ({
      ...prev,
      phone: rawPhone,
      full_name: match.full_name || match.name || prev.full_name,
      area_id: match.area_id || prev.area_id,
      building_number: match.building_number || prev.building_number,
      block_number: match.block_number || match.block || prev.block_number || 'A',
      detailed_address: match.detailed_address || prev.detailed_address,
      location_url: match.location_url || prev.location_url,
      username: match.username || norm || prev.username,
      include_vehicle: custVehs.length === 0,
      vehicle_type: custVehs[0]?.vehicle_type || prev.vehicle_type,
      plate_number: custVehs[0]?.plate_number || prev.plate_number,
      color: custVehs[0]?.color || prev.color
    }));
  };

  // Auto-detect existing customer upon typing/pasting mobile phone
  const handlePhoneInputChange = (rawPhone: string) => {
    setRegForm((prev) => {
      const shouldSyncUsername = !prev.username || prev.username === prev.phone;
      return {
        ...prev,
        phone: rawPhone,
        username: shouldSyncUsername ? rawPhone : prev.username
      };
    });

    if (phoneSearchTimeoutRef.current) {
      clearTimeout(phoneSearchTimeoutRef.current);
    }

    const digits = rawPhone.replace(/\D/g, '');

    // 1. Quick synchronous matching against customers prop using phonesMatch
    if (digits.length >= 7) {
      const localMatch = (customers || []).find((c) =>
        api.phonesMatch(c.phone || c.mobile || '', rawPhone)
      );
      if (localMatch) {
        const custVehs = (vehicles || []).filter((v) => v.customer_id === localMatch.id);
        applyCustomerMatch(localMatch, custVehs, rawPhone);
        setIsSearchingPhone(false);
        return;
      }
    }

    // 2. Debounced asynchronous match against backend/DB via api.findCustomerByPhone
    if (digits.length >= 7) {
      setIsSearchingPhone(true);
      phoneSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await api.findCustomerByPhone(rawPhone);
          if (res && res.customer) {
            applyCustomerMatch(res.customer, res.vehicles || [], rawPhone);
          } else {
            setExistingCustomerMatch(null);
            setMatchedVehicles([]);
          }
        } catch (err) {
          console.error('Error auto-detecting customer by phone:', err);
        } finally {
          setIsSearchingPhone(false);
        }
      }, 350);
    } else {
      setIsSearchingPhone(false);
      setExistingCustomerMatch(null);
      setMatchedVehicles([]);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Validation
    if (!regForm.full_name.trim()) {
      setRegError('يرجى إدخال الاسم');
      return;
    }
    if (!regForm.phone.trim()) {
      setRegError('يرجى إدخال رقم الموبايل');
      return;
    }
    if (!regForm.password) {
      setRegError('يرجى إدخال كلمة المرور');
      return;
    }
    if (regForm.password.length < 6) {
      setRegError('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
      return;
    }
    if (!regForm.area_id) {
      setRegError('يرجى اختيار الكمبوند');
      return;
    }
    if (!regForm.building_number.trim()) {
      setRegError('يرجى إدخال رقم العمارة');
      return;
    }

    const cleanPhone = normalizeEgyptianPhone(regForm.phone) || regForm.phone.trim();
    const desiredUsername = regForm.username.trim() || cleanPhone;

    try {
      setIsRegistering(true);

      let targetCustomerId: string;
      let targetCustomer: Customer;

      if (existingCustomerMatch) {
        // العميل مسجل مسبقاً في النظام: تحديث بياناته وكلمة المرور دون تكرار الحساب
        targetCustomerId = existingCustomerMatch.id;
        targetCustomer = await api.updateCustomer(existingCustomerMatch.id, {
          full_name: regForm.full_name.trim(),
          name: regForm.full_name.trim(),
          area_id: regForm.area_id,
          building_number: regForm.building_number.trim(),
          block: regForm.block_number.trim() || 'A',
          block_number: regForm.block_number.trim() || 'A',
          detailed_address: regForm.detailed_address.trim(),
          location_url: regForm.location_url.trim(),
          username: desiredUsername,
          password_hash: btoa(regForm.password),
          status: existingCustomerMatch.status === 'active' ? 'active' : 'pending_review'
        });

        // إذا أدخل لوحة سيارة جديدة غير مسجلة لديه مسبقاً
        if (regForm.include_vehicle && regForm.plate_number.trim()) {
          const cleanNewPlate = regForm.plate_number.replace(/\s+/g, '');
          const alreadyHasVeh = matchedVehicles.some(
            (v) => (v.plate_number || (v as any).license_plate || '').replace(/\s+/g, '') === cleanNewPlate
          );
          if (!alreadyHasVeh) {
            const vehPayload = {
              customer_id: targetCustomerId,
              vehicle_type: regForm.vehicle_type.trim(),
              type: regForm.vehicle_type.trim(),
              color: regForm.color.trim(),
              plate_number: regForm.plate_number.trim(),
              license_plate: regForm.plate_number.trim(),
              vehicle_image_url: regForm.vehicle_image_url || undefined,
              image_url: regForm.vehicle_image_url || undefined
            };
            if (onCreateVehicle) {
              await onCreateVehicle(vehPayload);
            } else {
              await api.createVehicle(vehPayload);
            }
          }
        }

        // إذا كان الحساب مفعلاً مسبقاً (نشط): يتم تسجيل الدخول المباشر
        if (existingCustomerMatch.status === 'active') {
          setRegSuccess('أهلاً بك مجدداً! تم تحديث كلمة المرور وتفعيل بياناتك بنجاح. جاري تسجيل الدخول...');
          setTimeout(async () => {
            try {
              const authUser = await api.loginUser(desiredUsername, regForm.password);
              onLoginSuccess(authUser);
            } catch {
              setActiveTab('login');
              setLoginUsername(desiredUsername);
              setLoginPassword(regForm.password);
            }
          }, 1000);
          return;
        }
      } else {
        // عميل جديد تماماً: التحقق من توفر اسم المستخدم
        const isAvail = await api.checkUsernameAvailability(desiredUsername);
        if (!isAvail) {
          setRegError(`اسم المستخدم (${desiredUsername}) مسجل بالفعل مسبقاً، يرجى اختيار اسم مستخدم آخر.`);
          setIsRegistering(false);
          return;
        }

        // إنشاء عميل جديد بحالة pending_review
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

        if (onCreateCustomer) {
          targetCustomer = await onCreateCustomer(custPayload);
        } else {
          targetCustomer = await api.createCustomer(custPayload);
        }
        targetCustomerId = targetCustomer.id;

        // إنشاء المركبة إن وُجدت
        if (regForm.include_vehicle && regForm.plate_number.trim()) {
          const vehPayload: Omit<Vehicle, 'id' | 'created_at'> = {
            customer_id: targetCustomerId,
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
      }

      setCreatedCustomer(targetCustomer);
      setTempCredentials({ username: desiredUsername, pass: regForm.password, phone: regForm.phone.trim() });

      // توليد كود التحقق 6 أرقام
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // إرسال الكود عبر واتساب
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

        // إرسال إشعار للإدارة بوجود حساب معلق بانتظار التفعيل
        try {
          await api.createNotification({
            title: 'طلب تسجيل عميل جديد (معلق للتفعيل)',
            message: `سجل العميل ${targetCustomer.full_name} (${targetCustomer.phone}) حساباً وتعذر وصول كود التفعيل عبر واتساب (${reason}). الحساب بانتظار مراجعة وتفعيل الإدارة من لوحة التحكم.`,
            type: 'warning',
            customer_id: targetCustomerId,
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

  // ==============================================================================
  // 1. Mobile Screen: Login (100% Match with B-Login.dc.html & Cairo font)
  // ==============================================================================
  if (authStage === 'form' && activeTab === 'login') {
    return (
      <div
        dir="rtl"
        className="min-h-screen w-full bg-[#F5F8F8] sm:py-8 sm:px-4 flex items-center justify-center font-['Cairo'] antialiased selection:bg-[#0B7F72] selection:text-white"
        style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}
      >
        <style>{`
          @keyframes wcIn {
            from { opacity: 0; transform: translateX(24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes wcFloat {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-5px) rotate(-3deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .wc-logo { animation: none !important; }
          }
        `}</style>
        <div
          className="w-full sm:w-[390px] min-h-screen sm:min-h-[844px] bg-[#FFFFFF] sm:rounded-[36px] sm:shadow-2xl sm:border border-[#D5DEE0] box-border p-[40px_24px_28px] flex flex-col justify-between gap-[28px] text-[#0E1B24] text-[15px] leading-[1.6]"
          style={{
            width: '100%',
            maxWidth: '390px',
            minHeight: '844px',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            fontFamily: "'Cairo', system-ui, sans-serif",
            color: '#0E1B24',
            fontSize: '15px',
            lineHeight: 1.6,
            padding: '40px 24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px'
          }}
        >
          {/* Logo with Animation */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
            <img
              className="wc-logo"
              src={settings.logo_url || '/assets/wecare-logo.png'}
              alt={settings.company_name || 'WE CARE – Here & Near'}
              style={{
                height: '110px',
                width: 'auto',
                display: 'block',
                animation: 'wcIn 0.9s ease-out both, wcFloat 3.4s ease-in-out 0.9s infinite'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/wecare-logo.png';
              }}
            />
          </div>

          {/* Heading & Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '26px',
                fontWeight: 700,
                lineHeight: 1.35,
                color: '#0E1B24',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              أهلاً بعودتك
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '15px',
                color: '#5B6B73',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              سجّل دخولك برقم موبايلك وكلمة المرور
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loginError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  borderRadius: '14px',
                  color: '#E11D48',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            {/* Phone Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="li-phone" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                رقم الموبايل
              </label>
              <div
                dir="ltr"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #D5DEE0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#FFFFFF'
                }}
              >
                <span
                  style={{
                    padding: '0 12px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    background: '#F5F8F8',
                    color: '#34474F',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRight: '1px solid #D5DEE0',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  +20
                </span>
                <input
                  id="li-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="01xxxxxxxxx"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    border: 'none',
                    padding: '0 14px',
                    fontSize: '16px',
                    color: '#0E1B24',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="li-pass" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const num = (settings as any).phone || (settings as any).whatsapp_number || settings.vodafone_cash_number || '201000000000';
                    const cleanNum = num.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent('مرحباً، أود استعادة كلمة المرور لحسابي في وي كير')}`, '_blank');
                  }}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0B7F72',
                    textDecoration: 'none',
                    padding: '4px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #D5DEE0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#FFFFFF'
                }}
              >
                <input
                  id="li-pass"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    border: 'none',
                    padding: '0 14px',
                    fontSize: '16px',
                    color: '#0E1B24',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  aria-pressed={showLoginPassword ? 'true' : 'false'}
                  style={{
                    width: '48px',
                    height: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: '#5B6B73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {!showLoginPassword ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3l18 18"></path>
                      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"></path>
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                color: '#34474F',
                minHeight: '44px',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#0B7F72',
                  margin: 0,
                  cursor: 'pointer'
                }}
              />
              تذكرني على هذا الجهاز
            </label>

            {/* Bottom Actions */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  background: '#0B7F72',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif",
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#075E55')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0B7F72')}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </button>

              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#34474F',
                  textAlign: 'center',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                عميل جديد؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError(null);
                  }}
                  style={{
                    fontWeight: 600,
                    color: '#0B7F72',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  أنشئ حسابك
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 2. Mobile Screen: Register / Signup (100% Match with B-Signup-1.dc.html & Cairo font)
  // ==============================================================================
  if (authStage === 'form' && activeTab === 'register') {
    return (
      <div
        dir="rtl"
        className="min-h-screen w-full bg-[#F5F8F8] sm:py-8 sm:px-4 flex items-center justify-center font-['Cairo'] antialiased selection:bg-[#0B7F72] selection:text-white"
        style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}
      >
        <div
          className="w-full sm:w-[390px] min-h-screen sm:min-h-[900px] bg-[#FFFFFF] sm:rounded-[36px] sm:shadow-2xl sm:border border-[#D5DEE0] box-border p-[20px_24px_28px] flex flex-col justify-between gap-[20px] text-[#0E1B24] text-[15px] leading-[1.6]"
          style={{
            width: '100%',
            maxWidth: '390px',
            minHeight: '900px',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            fontFamily: "'Cairo', system-ui, sans-serif",
            color: '#0E1B24',
            fontSize: '15px',
            lineHeight: 1.6,
            padding: '20px 24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Logo with Animation */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: '8px' }}>
            <img
              className="wc-logo"
              src={settings.logo_url || '/assets/wecare-logo.png'}
              alt={settings.company_name || 'WE CARE – Here & Near'}
              style={{
                height: '68px',
                width: 'auto',
                display: 'block',
                animation: 'wcIn 0.9s ease-out both, wcFloat 3.4s ease-in-out 0.9s infinite'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/wecare-logo.png';
              }}
            />
          </div>

          {/* Heading & Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                lineHeight: 1.35,
                color: '#0E1B24',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              أنشئ حسابك
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#5B6B73',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              بياناتك الأساسية فقط، وتضيف سيارتك بعد التسجيل.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {regError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  borderRadius: '14px',
                  color: '#E11D48',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{regError}</span>
              </div>
            )}

            {/* Field 1: Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="su-name" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                الاسم
              </label>
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                placeholder="مثال: مسعد محمود"
                value={regForm.full_name}
                onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                style={{
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #D5DEE0',
                  borderRadius: '14px',
                  padding: '0 14px',
                  fontSize: '16px',
                  color: '#0E1B24',
                  background: '#FFFFFF',
                  outline: 'none',
                  fontFamily: "'Cairo', sans-serif"
                }}
                required
              />
            </div>

            {/* Field 2: Mobile */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="su-phone" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                رقم الموبايل
              </label>
              <div
                dir="ltr"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #D5DEE0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#FFFFFF'
                }}
              >
                <span
                  style={{
                    padding: '0 12px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    background: '#F5F8F8',
                    color: '#34474F',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRight: '1px solid #D5DEE0',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  +20
                </span>
                <input
                  id="su-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="01xxxxxxxxx"
                  value={regForm.phone}
                  onChange={(e) => handlePhoneInputChange(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    border: 'none',
                    padding: '0 14px',
                    fontSize: '16px',
                    color: '#0E1B24',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                  required
                />
              </div>
            </div>

            {/* Field 3: Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="su-pass" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                كلمة المرور
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #D5DEE0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#FFFFFF'
                }}
              >
                <input
                  id="su-pass"
                  type={showRegPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="6 أحرف أو أرقام على الأقل"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value, confirm_password: e.target.value })}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    border: 'none',
                    padding: '0 14px',
                    fontSize: '16px',
                    color: '#0E1B24',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  style={{
                    width: '48px',
                    height: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: '#5B6B73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {!showRegPassword ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3l18 18"></path>
                      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"></path>
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Field 4: Compound */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="su-compound" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                الكمبوند
              </label>
              <select
                id="su-compound"
                value={regForm.area_id}
                onChange={(e) => setRegForm({ ...regForm, area_id: e.target.value })}
                style={{
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #D5DEE0',
                  borderRadius: '14px',
                  padding: '0 14px',
                  fontSize: '16px',
                  color: regForm.area_id ? '#0E1B24' : '#5B6B73',
                  background: '#FFFFFF',
                  outline: 'none',
                  fontFamily: "'Cairo', sans-serif"
                }}
                required
              >
                <option value="">
                  {isLoadingAreas && serviceAreas.length === 0
                    ? 'جاري جلب مناطق الخدمة من قاعدة البيانات...'
                    : 'اختر الكمبوند...'}
                </option>
                {serviceAreas
                  .filter((area) => area.is_active !== false)
                  .map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} {area.city ? `(${area.city})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Fields 5 & 6: Building & Group */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="su-building" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                  رقم العمارة
                </label>
                <input
                  id="su-building"
                  type="text"
                  inputMode="numeric"
                  placeholder="88"
                  value={regForm.building_number}
                  onChange={(e) => setRegForm({ ...regForm, building_number: e.target.value })}
                  style={{
                    height: '52px',
                    boxSizing: 'border-box',
                    border: '1px solid #D5DEE0',
                    borderRadius: '14px',
                    padding: '0 14px',
                    fontSize: '16px',
                    color: '#0E1B24',
                    background: '#FFFFFF',
                    minWidth: 0,
                    outline: 'none',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="su-group" style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
                  المجموعة <span style={{ fontWeight: 400, color: '#5B6B73' }}>(اختياري)</span>
                </label>
                <input
                  id="su-group"
                  type="text"
                  placeholder="C"
                  value={regForm.block_number}
                  onChange={(e) => setRegForm({ ...regForm, block_number: e.target.value })}
                  style={{
                    height: '52px',
                    boxSizing: 'border-box',
                    border: '1px solid #D5DEE0',
                    borderRadius: '14px',
                    padding: '0 14px',
                    fontSize: '16px',
                    color: '#0E1B24',
                    background: '#FFFFFF',
                    minWidth: 0,
                    outline: 'none',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <button
                type="submit"
                disabled={isRegistering}
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  background: '#0B7F72',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif",
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#075E55')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0B7F72')}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري إنشاء الحساب...</span>
                  </>
                ) : (
                  <span>إنشاء الحساب</span>
                )}
              </button>

              <p style={{ margin: 0, fontSize: '12px', color: '#5B6B73', textAlign: 'center', fontFamily: "'Cairo', sans-serif" }}>
                بالضغط على "إنشاء الحساب" أنت توافق على{' '}
                <a href="#" style={{ color: '#0B7F72', textDecoration: 'none', fontWeight: 600 }}>
                  الشروط
                </a>{' '}
                و
                <a href="#" style={{ color: '#0B7F72', textDecoration: 'none', fontWeight: 600 }}>
                  سياسة الخصوصية
                </a>
              </p>

              <p style={{ margin: 0, fontSize: '14px', color: '#34474F', textAlign: 'center', fontFamily: "'Cairo', sans-serif" }}>
                عندك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginError(null);
                  }}
                  style={{
                    fontWeight: 600,
                    color: '#0B7F72',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  تسجيل الدخول
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 3. Mobile Screen: OTP Verification Stage
  // ==============================================================================
  if (authStage === 'otp') {
    return (
      <div
        dir="rtl"
        className="min-h-screen w-full bg-[#F5F8F8] sm:py-8 sm:px-4 flex items-center justify-center font-['Cairo'] antialiased selection:bg-[#0B7F72] selection:text-white"
        style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}
      >
        <div
          className="w-full sm:w-[390px] min-h-screen sm:min-h-[844px] bg-[#FFFFFF] sm:rounded-[36px] sm:shadow-2xl sm:border border-[#D5DEE0] box-border p-[32px_24px_28px] flex flex-col justify-between gap-[24px] text-[#0E1B24] text-[15px] leading-[1.6]"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: '8px' }}>
            <img
              className="wc-logo"
              src={settings.logo_url || '/assets/wecare-logo.png'}
              alt={settings.company_name || 'WE CARE'}
              style={{
                height: '68px',
                width: 'auto',
                display: 'block',
                animation: 'wcIn 0.9s ease-out both, wcFloat 3.4s ease-in-out 0.9s infinite'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/wecare-logo.png';
              }}
            />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-[#0E1B24]">تأكيد رقم الهاتف</h3>
            <p className="text-xs text-[#5B6B73] leading-relaxed">
              تم إرسال كود التحقق المكون من 6 أرقام عبر واتساب إلى:
              <br />
              <span dir="ltr" className="font-mono font-bold text-slate-800 text-sm inline-block mt-1.5 bg-[#F5F8F8] border border-[#D5DEE0] px-3 py-1 rounded-xl">
                {tempCredentials?.phone}
              </span>
            </p>

            <div className="pt-2">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black transition-all ${
                  otpCountdown > 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <Clock className={`w-4 h-4 ${otpCountdown > 0 ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}`} />
                {otpCountdown > 0 ? (
                  <span>الوقت المتبقي للكود: <span className="font-mono text-sm tracking-wider mr-1 text-emerald-900">{formatCountdown(otpCountdown)}</span></span>
                ) : (
                  <span>انتهت مهلة صلاحية الكود (00:00)</span>
                )}
              </div>
            </div>
          </div>

          {otpError && (
            <div style={{ padding: '10px 14px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '14px', color: '#E11D48', fontSize: '13px', fontWeight: 600 }}>
              {otpError}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-center text-xs font-bold text-[#34474F] mb-2">
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
                className="w-full text-center tracking-[0.4em] text-2xl font-mono font-black py-3 px-4 bg-[#F5F8F8] border-2 border-teal-500/40 focus:border-teal-600 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-slate-900 transition-all placeholder:tracking-widest placeholder:text-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || enteredOtp.length < 4 || otpCountdown <= 0}
              style={{
                width: '100%',
                height: '54px',
                borderRadius: '16px',
                background: '#0B7F72',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
                gap: '8px'
              }}
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <span>تأكيد الرمز وتفعيل الحساب</span>
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={otpCountdown > 0 || isResendingOtp}
                onClick={handleResendOtp}
                className="text-xs font-bold text-[#0B7F72] disabled:text-slate-400 cursor-pointer"
              >
                {isResendingOtp ? 'جاري إعادة الإرسال...' : otpCountdown > 0 ? `إعادة الإرسال بعد (${formatCountdown(otpCountdown)})` : 'إعادة إرسال الكود'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthStage('form');
                  setActiveTab('login');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>

          <div style={{ marginTop: 'auto' }} />
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 4. Mobile Screen: Pending Review Stage
  // ==============================================================================
  if (authStage === 'pending_review') {
    return (
      <div
        dir="rtl"
        className="min-h-screen w-full bg-[#F5F8F8] sm:py-8 sm:px-4 flex items-center justify-center font-['Cairo'] antialiased selection:bg-[#0B7F72] selection:text-white"
        style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}
      >
        <div
          className="w-full sm:w-[390px] min-h-screen sm:min-h-[844px] bg-[#FFFFFF] sm:rounded-[36px] sm:shadow-2xl sm:border border-[#D5DEE0] box-border p-[32px_24px_28px] flex flex-col justify-between gap-[24px] text-[#0E1B24] text-[15px] leading-[1.6]"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: '8px' }}>
            <img
              className="wc-logo"
              src={settings.logo_url || '/assets/wecare-logo.png'}
              alt={settings.company_name || 'WE CARE'}
              style={{
                height: '68px',
                width: 'auto',
                display: 'block',
                animation: 'wcIn 0.9s ease-out both, wcFloat 3.4s ease-in-out 0.9s infinite'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/wecare-logo.png';
              }}
            />
          </div>

          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#0E1B24]">حسابك بانتظار مراجعة الإدارة</h3>
            <p className="text-xs text-[#5B6B73] leading-relaxed">
              تم استلام بيانات تسجيلك بنجاح. سيقوم فريق العمل بمراجعة الحساب وتفعيله في أقرب وقت.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAuthStage('form');
              setActiveTab('login');
              setLoginUsername(tempCredentials?.username || '');
              setLoginPassword('');
            }}
            style={{
              width: '100%',
              height: '54px',
              borderRadius: '16px',
              background: '#0B7F72',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            العودة لشاشة تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return null;
};
