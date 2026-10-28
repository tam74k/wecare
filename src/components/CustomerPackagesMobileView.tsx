import React, { useState, useMemo } from 'react';
import {
  AuthUser,
  Settings,
  Customer,
  Vehicle,
  Subscription,
  Package as PackageType,
  PackagePricing,
  CoverageArea,
  SubscriptionStatus
} from '../types/database';

export interface CustomerPackagesMobileViewProps {
  currentUser: AuthUser;
  customer: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  packages: PackageType[];
  pricing?: PackagePricing[];
  coverageAreas?: CoverageArea[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onOpenAddVehicle?: () => void;
  onCreateSubscription?: (
    subscription: Omit<Subscription, 'id' | 'status' | 'created_at'> & { status?: SubscriptionStatus }
  ) => Promise<Subscription>;
}

// Arabic Days mapping
const DAYS_DATA = [
  { key: 'السبت', short: 'سبت', index: 0 },
  { key: 'الأحد', short: 'أحد', index: 1 },
  { key: 'الإثنين', short: 'إثنين', index: 2 },
  { key: 'الثلاثاء', short: 'ثلاثاء', index: 3 },
  { key: 'الأربعاء', short: 'أربعاء', index: 4 },
  { key: 'الخميس', short: 'خميس', index: 5 },
  { key: 'الجمعة', short: 'جمعة', index: 6 }
];

// Time slots matching B-Packages.dc.html
const TIME_SLOTS = [
  { id: 'morn', label: 'صباحاً', range: '8 – 12', from: '08:00', to: '12:00' },
  { id: 'noon', label: 'ظهراً', range: '12 – 4', from: '12:00', to: '16:00' },
  { id: 'eve', label: 'مساءً', range: '4 – 8', from: '16:00', to: '20:00' }
];

export const CustomerPackagesMobileView: React.FC<CustomerPackagesMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  subscriptions,
  packages,
  pricing = [],
  coverageAreas = [],
  activeTab,
  onSelectTab,
  onOpenAddVehicle,
  onCreateSubscription
}) => {
  // 1. Vehicle Selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    return vehicles.length > 0 ? vehicles[0].id : '';
  });
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || (vehicles.length > 0 ? vehicles[0] : null);
  }, [vehicles, selectedVehicleId]);

  // 2. Active Subscription for Customer
  const activeSubscription = useMemo(() => {
    const list = subscriptions.filter((s) => s.status === 'active' || s.status === 'pending');
    if (selectedVehicle) {
      const matchVehicle = list.find((s) => s.vehicle_id === selectedVehicle.id);
      if (matchVehicle) return matchVehicle;
    }
    return list[0] || null;
  }, [subscriptions, selectedVehicle]);

  // 3. Filter Active Packages
  const activePackages = useMemo(() => {
    return packages.filter((p) => p.is_active !== false);
  }, [packages]);

  // Helper to get package price for an area
  const getPackagePrice = (pkgId: string): number => {
    const effectiveAreaId = customer?.area_id || (coverageAreas.length > 0 ? coverageAreas[0].id : '');
    if (effectiveAreaId && pricing.length > 0) {
      const match = pricing.find((pr) => pr.package_id === pkgId && pr.area_id === effectiveAreaId);
      if (match && match.price > 0) return match.price;
    }
    const anyMatch = pricing.find((pr) => pr.package_id === pkgId && pr.price > 0);
    if (anyMatch) return anyMatch.price;
    const pkg = packages.find((p) => p.id === pkgId);
    return (pkg as any)?.base_price || 0;
  };

  // 4. Selected Package State
  const [selectedPackageId, setSelectedPackageId] = useState<string>(() => {
    if (activeSubscription) return activeSubscription.package_id;
    if (activePackages.length > 0) return activePackages[0].id;
    return '';
  });

  const selectedPackage = useMemo(() => {
    return packages.find((p) => p.id === selectedPackageId) || (activePackages.length > 0 ? activePackages[0] : null);
  }, [packages, activePackages, selectedPackageId]);

  // Number of required weekly days for selected package
  const requiredDaysCount = useMemo(() => {
    if (!selectedPackage) return 4;
    return selectedPackage.weekly_visits_count || selectedPackage.base_visits_count || 4;
  }, [selectedPackage]);

  // 5. Selected Days State
  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    if (activeSubscription?.selected_days && activeSubscription.selected_days.length > 0) {
      return activeSubscription.selected_days;
    }
    if (activeSubscription?.preferred_day_of_week) {
      const parsed = activeSubscription.preferred_day_of_week.split(/[،,]/).map((d) => d.trim()).filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
    // Default 4 days: السبت، الإثنين، الأربعاء، الخميس
    return ['السبت', 'الإثنين', 'الأربعاء', 'الخميس'].slice(0, 4);
  });

  // 6. Time Slot State
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => {
    if (activeSubscription?.preferred_time_from === '08:00') return 'morn';
    if (activeSubscription?.preferred_time_from === '12:00') return 'noon';
    return 'eve';
  });

  // 7. Days selection toggling
  const handleToggleDay = (dayKey: string) => {
    setSelectedDays((prev) => {
      const idx = prev.indexOf(dayKey);
      if (idx !== -1) {
        // Remove day
        return prev.filter((d) => d !== dayKey);
      } else {
        // If reached max, replace the first selected day or add
        if (prev.length < requiredDaysCount) {
          return [...prev, dayKey];
        } else {
          const next = [...prev.slice(1), dayKey];
          return next;
        }
      }
    });
  };

  // When package changes, adjust selected days length if needed
  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const pkg = packages.find((p) => p.id === pkgId);
    const req = pkg ? (pkg.weekly_visits_count || pkg.base_visits_count || 4) : 4;
    if (selectedDays.length > req) {
      setSelectedDays((prev) => prev.slice(0, req));
    }
  };

  // Price calculations
  const currentPackagePrice = useMemo(() => {
    if (!selectedPackage) return 0;
    return getPackagePrice(selectedPackage.id);
  }, [selectedPackage, customer?.area_id, pricing]);

  // Readiness & CTA state
  const isDaysReady = selectedDays.length === requiredDaysCount;
  const isSameAsCurrent = useMemo(() => {
    if (!activeSubscription) return false;
    if (activeSubscription.package_id !== selectedPackageId) return false;
    const curDays = activeSubscription.selected_days || (activeSubscription.preferred_day_of_week ? activeSubscription.preferred_day_of_week.split(/[،,]/).map((d) => d.trim()) : []);
    const daysMatch = selectedDays.length === curDays.length && selectedDays.every((d) => curDays.includes(d));
    return daysMatch;
  }, [activeSubscription, selectedPackageId, selectedDays]);

  let ctaLabel = 'طلب الاشتراك';
  let ctaDisabled = false;
  if (!isDaysReady) {
    const diff = requiredDaysCount - selectedDays.length;
    ctaLabel = `اختر ${diff} ${diff === 1 ? 'يوم' : 'أيام'} كمان`;
    ctaDisabled = true;
  } else if (isSameAsCurrent) {
    ctaLabel = 'دي باقتك الحالية';
    ctaDisabled = true;
  } else if (activeSubscription) {
    ctaLabel = 'تغيير الباقة';
  }

  // 8. Subscription Confirmation Modal & Form
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vodafone_cash' | 'instapay'>('cash');
  const [subscriptionNotes, setSubscriptionNotes] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<Subscription | null>(null);

  // Submit Subscription
  const handleConfirmSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !onCreateSubscription) return;

    try {
      setIsSubmitting(true);
      const customerId = customer?.id || currentUser.customer_id || currentUser.id;
      const effectiveAreaId = customer?.area_id || (coverageAreas.length > 0 ? coverageAreas[0].id : '');

      const slot = TIME_SLOTS.find((s) => s.id === selectedSlotId) || TIME_SLOTS[2];

      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + (selectedPackage.duration_days || 30));

      const newSub = await onCreateSubscription({
        customer_id: customerId,
        vehicle_id: selectedVehicle ? selectedVehicle.id : null,
        package_id: selectedPackage.id,
        area_id: effectiveAreaId,
        preferred_day_of_week: selectedDays.join('، '),
        selected_days: selectedDays,
        preferred_time_from: slot.from,
        preferred_time_to: slot.to,
        start_date: startDate,
        end_date: end.toISOString().split('T')[0],
        total_price: currentPackagePrice,
        notes: subscriptionNotes.trim() ? `${subscriptionNotes.trim()} · طريقة الدفع: ${paymentMethod}` : `طريقة الدفع: ${paymentMethod}`,
        payment_status: 'unpaid',
        status: 'pending',
        auto_renew: 1
      });

      setIsConfirmModalOpen(false);
      setSuccessModalData(newSub);
    } catch (err: any) {
      alert('فشل إرسال طلب الاشتراك: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        maxWidth: '390px',
        minHeight: '100vh',
        position: 'relative',
        background: '#FFFFFF',
        fontFamily: "'Cairo', system-ui, sans-serif",
        color: '#0E1B24',
        fontSize: '15px',
        lineHeight: 1.6,
        boxShadow: '0 0 25px rgba(0, 0, 0, 0.06)',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header matching B-Packages.dc.html */}
      <header style={{ padding: '18px 20px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
          الباقات
        </h1>
        <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
          اشتراك شهري يتجدد تلقائياً، وتقدر توقفه في أي وقت
        </span>
      </header>

      {/* Main Content */}
      <main style={{ padding: '12px 20px 180px', display: 'flex', flexDirection: 'column', gap: '22px', flex: 1 }}>
        {/* Section: Current Subscription Banner (if exists) */}
        {activeSubscription && (
          <section
            aria-label="اشتراكك الحالي"
            style={{
              background: '#E3F2EF',
              borderRadius: '18px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#0B7F72',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: '#0B5F56', fontFamily: "'Cairo', sans-serif" }}>
                اشتراكك الحالي: {packages.find((p) => p.id === activeSubscription.package_id)?.name || `${activeSubscription.selected_days?.length || 4} أيام أسبوعياً`}
              </span>
              <span style={{ fontSize: '13px', color: '#0B5F56', fontFamily: "'Cairo', sans-serif" }}>
                {activeSubscription.end_date ? `يتجدد أو ينتهي في ${activeSubscription.end_date}` : 'اشتراك ساري'}
              </span>
            </div>
          </section>
        )}

        {/* Section: Vehicle Info matching B-Packages.dc.html */}
        <section
          aria-labelledby="pk-car"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #E2E9EA',
            borderRadius: '18px',
            padding: '12px 14px'
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B7F72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 13l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4a1 1 0 0 1-1 1h-1.5"></path>
            <path d="M5.5 18H4a1 1 0 0 1-1-1v-4h18"></path>
            <path d="M8.5 18h7"></path>
            <circle cx="7" cy="18" r="1.5"></circle>
            <circle cx="17" cy="18" r="1.5"></circle>
          </svg>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
            <span id="pk-car" style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
              الأسعار لسيارة
            </span>
            <span style={{ fontWeight: 700, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
              {selectedVehicle
                ? `${selectedVehicle.brand || selectedVehicle.vehicle_type || 'سيارة'} · ${selectedVehicle.model || selectedVehicle.plate_number}`
                : 'لا توجد سيارة محددة'}
            </span>
          </div>
          {vehicles.length > 1 ? (
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(true)}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0B7F72',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 4px',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              تغيير
            </button>
          ) : vehicles.length === 0 && onOpenAddVehicle ? (
            <button
              type="button"
              onClick={onOpenAddVehicle}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0B7F72',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 4px',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              + إضافة سيارة
            </button>
          ) : null}
        </section>

        {/* Step 1: Choose Washing Days / Package matching B-Packages.dc.html */}
        <section aria-labelledby="pk-choose" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 id="pk-choose" style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
            ١. اختر الباقة أو عدد أيام الغسيل
          </h2>

          <div role="radiogroup" aria-labelledby="pk-choose" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activePackages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const isCurrent = activeSubscription?.package_id === pkg.id;
              const price = getPackagePrice(pkg.id);
              const weeklyVisits = pkg.weekly_visits_count || pkg.base_visits_count || 4;

              return (
                <button
                  key={pkg.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectPackage(pkg.id)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    borderRadius: '20px',
                    border: `2px solid ${isSelected ? '#0B7F72' : '#E2E9EA'}`,
                    background: isSelected ? '#F2FAF8' : '#FFFFFF',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    color: '#0E1B24',
                    fontSize: '15px',
                    fontFamily: "'Cairo', sans-serif",
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Radio dot */}
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#0B7F72' : '#B8C4C8'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: isSelected ? '#0B7F72' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    ></span>
                  </span>

                  {/* Title & Subtitle */}
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700 }}>{pkg.name}</span>
                      {isCurrent && (
                        <span
                          style={{
                            padding: '1px 8px',
                            borderRadius: '999px',
                            background: '#0B7F72',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          باقتك الحالية
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '13px', color: '#5B6B73' }}>
                      {pkg.description || `حوالي ${weeklyVisits * 4} غسلة في الشهر (${weeklyVisits} أيام أسبوعياً)`}
                    </span>
                  </span>

                  {/* Price */}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25, flexShrink: 0 }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#0B7F72' }}>
                      {price > 0 ? price : '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#5B6B73' }}>ج.م / شهرياً</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feature Bullets matching B-Packages.dc.html */}
          <ul
            style={{
              margin: '6px 0 0',
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '14px',
              color: '#34474F',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B7F72" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
              الفني بيوصل لحد عربيتك في الكمبوند
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B7F72" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
              نفس الفني ونفس المواعيد كل أسبوع
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B7F72" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
              تقدر تضيف خدمات إضافية لأي غسلة
            </li>
          </ul>
        </section>

        {/* Step 2: Choose Days matching B-Packages.dc.html */}
        <section aria-labelledby="pk-days" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 id="pk-days" style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              ٢. اختر الأيام
            </h2>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: isDaysReady ? '#0B6B4F' : '#92400E',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              اخترت {selectedDays.length} من {requiredDaysCount}
            </span>
          </div>

          <div
            role="group"
            aria-labelledby="pk-days"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '8px'
            }}
          >
            {DAYS_DATA.map((day) => {
              const isSelected = selectedDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleToggleDay(day.key)}
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    border: `1px solid ${isSelected ? '#0B7F72' : '#D5DEE0'}`,
                    background: isSelected ? '#0B7F72' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#34474F',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    transition: 'all 0.15s ease'
                  }}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 3: Choose Time Slot matching B-Packages.dc.html */}
        <section aria-labelledby="pk-time" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 id="pk-time" style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
            ٣. اختر الوقت
          </h2>

          <div
            role="radiogroup"
            aria-labelledby="pk-time"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '8px'
            }}
          >
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedSlotId(slot.id)}
                  style={{
                    height: '64px',
                    borderRadius: '14px',
                    border: `2px solid ${isSelected ? '#0B7F72' : '#E2E9EA'}`,
                    background: isSelected ? '#E3F2EF' : '#FFFFFF',
                    color: isSelected ? '#0B5F56' : '#34474F',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1.3,
                    fontFamily: "'Cairo', sans-serif",
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{slot.label}</span>
                  <span style={{ fontSize: '12px' }}>{slot.range}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Sticky Bottom Bar matching B-Packages.dc.html */}
      <div
        style={{
          position: 'fixed',
          bottom: '76px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          boxSizing: 'border-box',
          padding: '12px 20px 14px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E9EA',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 35,
          boxShadow: '0 -6px 18px rgba(12,37,48,0.08)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
            {selectedPackage?.name || `${requiredDaysCount} أيام أسبوعياً`}
          </span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
            {currentPackagePrice > 0 ? `${currentPackagePrice} ج.م` : '—'}
          </span>
        </div>
        <button
          type="button"
          disabled={ctaDisabled}
          onClick={() => setIsConfirmModalOpen(true)}
          style={{
            flex: 1,
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: ctaDisabled ? '#E6ECED' : '#0B7F72',
            color: ctaDisabled ? '#5B6B73' : '#FFFFFF',
            fontSize: '16px',
            fontWeight: 700,
            cursor: ctaDisabled ? 'not-allowed' : 'pointer',
            fontFamily: "'Cairo', sans-serif",
            transition: 'all 0.15s ease'
          }}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Vehicle Picker Modal (when customer has multiple vehicles) */}
      {isVehicleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setIsVehicleModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '390px',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E9EA', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>اختر السيارة للاشتراك</h3>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vehicles.map((v) => {
                const isSelected = v.id === selectedVehicle?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId(v.id);
                      setIsVehicleModalOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: `1.5px solid ${isSelected ? '#0B7F72' : '#CBD5E1'}`,
                      background: isSelected ? '#F2FAF8' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0E1B24' }}>
                        {v.brand || v.vehicle_type || 'سيارة'} {v.model ? `· ${v.model}` : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5B6B73' }}>
                        لوحة: {v.plate_number} {v.color ? `· لون ${v.color}` : ''}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#0B7F72', fontWeight: 700, fontSize: '16px' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subscription Confirmation & Checkout Modal */}
      {isConfirmModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 65,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setIsConfirmModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '390px',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E9EA', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                تأكيد طلب الاشتراك
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Summary details card */}
            <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '12px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>الباقة:</span>
                <span style={{ fontWeight: 700, color: '#0E1B24' }}>{selectedPackage?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>السيارة:</span>
                <span style={{ fontWeight: 600, color: '#0E1B24' }}>
                  {selectedVehicle ? `${selectedVehicle.brand || selectedVehicle.vehicle_type} (${selectedVehicle.plate_number})` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>أيام الغسيل:</span>
                <span style={{ fontWeight: 600, color: '#0B7F72' }}>{selectedDays.join('، ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>الوقت المفضل:</span>
                <span style={{ fontWeight: 600, color: '#0E1B24' }}>
                  {TIME_SLOTS.find((s) => s.id === selectedSlotId)?.label} ({TIME_SLOTS.find((s) => s.id === selectedSlotId)?.range})
                </span>
              </div>
              <div style={{ borderTop: '1px solid #E2E9EA', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>قيمة الاشتراك الشهري:</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#0B7F72' }}>
                  {currentPackagePrice} ج.م
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ بدء الاشتراك
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  طريقة سداد الاشتراك
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: `1px solid ${paymentMethod === 'cash' ? '#0B7F72' : '#CBD5E1'}`,
                      background: paymentMethod === 'cash' ? '#E3F2EF' : '#FFFFFF',
                      color: paymentMethod === 'cash' ? '#0B7F72' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    نقداً مع الفني
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vodafone_cash')}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: `1px solid ${paymentMethod === 'vodafone_cash' ? '#0B7F72' : '#CBD5E1'}`,
                      background: paymentMethod === 'vodafone_cash' ? '#E3F2EF' : '#FFFFFF',
                      color: paymentMethod === 'vodafone_cash' ? '#0B7F72' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    فودافون كاش
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('instapay')}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: `1px solid ${paymentMethod === 'instapay' ? '#0B7F72' : '#CBD5E1'}`,
                      background: paymentMethod === 'instapay' ? '#E3F2EF' : '#FFFFFF',
                      color: paymentMethod === 'instapay' ? '#0B7F72' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    إنستاباي
                  </button>
                </div>
              </div>

              {/* Electronic payment info */}
              {paymentMethod !== 'cash' && (
                <div style={{ padding: '10px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}>
                  {paymentMethod === 'vodafone_cash'
                    ? `رقم تحويل فودافون كاش: ${settings.vodafone_cash_number || '01000000000'}`
                    : `معرف تحويل إنستاباي: ${settings.instapay_handle || 'wecare@instapay'}`}
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات أو طلبات خاصة (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={subscriptionNotes}
                  onChange={(e) => setSubscriptionNotes(e.target.value)}
                  placeholder="ملاحظات حول موقع السيارة أو أي تعليمات خاصة..."
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '8px 10px',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontFamily: "'Cairo', sans-serif",
                    resize: 'none'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#0B7F72',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  fontFamily: "'Cairo', sans-serif",
                  marginTop: '6px'
                }}
              >
                {isSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال طلب الاشتراك'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '350px',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px'
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0E1B24' }}>
              تم استلام طلب الاشتراك بنجاح!
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              سيقوم فريق العمل بتأكيد جدول الغسيل وتكليف الفني المخصص لبدء الزيارات في الموعد المحدد.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccessModalData(null);
                onSelectTab('home');
              }}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                background: '#0B7F72',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
                marginTop: '8px'
              }}
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation matching B-Packages.dc.html & other mobile screens */}
      <nav
        aria-label="التنقل الرئيسي"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          height: '76px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E9EA',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          alignItems: 'center',
          paddingBottom: '6px',
          boxSizing: 'border-box',
          zIndex: 40
        }}
      >
        {/* 1. الرئيسية */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'home' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'home' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"></path>
          </svg>
          الرئيسية
        </button>

        {/* 2. الباقات (Active) */}
        <button
          type="button"
          onClick={() => onSelectTab('subscriptions')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#0B7F72',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l9 5-9 5-9-5z"></path>
            <path d="M3 13l9 5 9-5"></path>
          </svg>
          الباقات
        </button>

        {/* 3. الخدمات */}
        <button
          type="button"
          onClick={() => onSelectTab('services')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'services' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'services' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5"></path>
            <path d="M3 21l3-3"></path>
          </svg>
          الخدمات
        </button>

        {/* 4. المتجر */}
        <button
          type="button"
          onClick={() => onSelectTab('store')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'store' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'store' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"></path>
            <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
          </svg>
          المتجر
        </button>

        {/* 5. حسابي */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'profile' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>
          </svg>
          حسابي
        </button>
      </nav>
    </div>
  );
};
