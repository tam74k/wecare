import React, { useState, useEffect, useMemo } from 'react';
import { Customer, AuthUser, Advertisement, Settings, Vehicle, Subscription, Visit, Package as PackageType, Employee } from '../types/database';
import * as api from '../services/api';
import { formatWhatsAppNumber } from '../services/whatsappService';

interface CustomerHomeMobileViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  visits: Visit[];
  packages: PackageType[];
  employees: Employee[];
  advertisements?: Advertisement[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onRateVisit?: (visitId: string, rating: number, comment?: string) => Promise<void>;
  onOpenAddVehicle?: () => void;
}

export const CustomerHomeMobileView: React.FC<CustomerHomeMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  subscriptions,
  visits,
  packages,
  employees,
  advertisements = [],
  activeTab,
  onSelectTab,
  onRateVisit,
  onOpenAddVehicle
}) => {
  // Advertisements state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liveAds, setLiveAds] = useState<Advertisement[]>(advertisements || []);
  const [selectedAdModal, setSelectedAdModal] = useState<Advertisement | null>(null);

  // Sync ads with prop
  useEffect(() => {
    if (advertisements && advertisements.length > 0) {
      setLiveAds(advertisements);
    }
  }, [advertisements]);

  // Fetch ads from database to ensure fresh data
  useEffect(() => {
    let isMounted = true;
    api.getAdvertisements(true).then((fresh) => {
      if (isMounted && fresh && fresh.length > 0) {
        setLiveAds(fresh);
      }
    }).catch((err) => {
      console.warn('Could not load advertisements:', err);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Primary customer vehicle and active subscription
  const primaryVehicle = vehicles[0];
  const activeSub = subscriptions.find((s) => s.status === 'active') || subscriptions[0];
  const currentPackage = packages.find((p) => p.id === activeSub?.package_id);

  // Auto-renewal state for active subscription
  const [isAutoRenew, setIsAutoRenew] = useState<boolean>(() => {
    if (!activeSub) return true;
    return activeSub.auto_renew !== undefined ? Boolean(activeSub.auto_renew) : true;
  });

  useEffect(() => {
    if (activeSub && activeSub.auto_renew !== undefined) {
      setIsAutoRenew(Boolean(activeSub.auto_renew));
    }
  }, [activeSub?.id, activeSub?.auto_renew]);

  const handleToggleAutoRenew = async () => {
    const nextVal = !isAutoRenew;
    setIsAutoRenew(nextVal);
    if (activeSub?.id) {
      try {
        await api.updateSubscriptionAutoRenew(activeSub.id, nextVal);
      } catch (err) {
        console.error('Error toggling auto renew:', err);
      }
    }
  };

  // Upcoming Visits & Next Wash calculation
  const customerId = customer?.id || currentUser.customer_id || currentUser.id;
  const myVisits = useMemo(() => {
    return visits.filter((v) => v.customer_id === customerId);
  }, [visits, customerId]);

  const nextVisit = useMemo(() => {
    const upcoming = myVisits
      .filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return upcoming[0] || null;
  }, [myVisits]);

  // Rating of last completed visit
  const lastCompletedVisit = useMemo(() => {
    const completed = myVisits
      .filter((v) => v.status === 'completed')
      .sort((a, b) => (b.completed_at || b.scheduled_date).localeCompare(a.completed_at || a.scheduled_date));
    return completed[0] || null;
  }, [myVisits]);

  const [rating, setRating] = useState<number>(() => lastCompletedVisit?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    if (lastCompletedVisit?.rating) {
      setRating(lastCompletedVisit.rating);
    }
  }, [lastCompletedVisit?.id, lastCompletedVisit?.rating]);

  const handlePickRating = async (star: number) => {
    setRating(star);
    if (lastCompletedVisit && onRateVisit) {
      try {
        setIsSubmittingRating(true);
        await onRateVisit(lastCompletedVisit.id, star);
      } catch (err) {
        console.error('Failed to rate visit:', err);
      } finally {
        setIsSubmittingRating(false);
      }
    }
  };

  // Assigned Technician
  const assignedWorker = useMemo(() => {
    const workerId = nextVisit?.assigned_worker_id || activeSub?.assigned_worker_id;
    if (!workerId) return null;
    return employees.find((e) => e.id === workerId) || null;
  }, [nextVisit?.assigned_worker_id, activeSub?.assigned_worker_id, employees]);

  const workerName = assignedWorker ? assignedWorker.full_name.trim().split(/\s+/)[0] : 'سيد';

  // Format Next Wash Date & Relative Day
  const nextWashInfo = useMemo(() => {
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    if (!nextVisit) {
      return {
        relative: 'غداً، الإثنين',
        full: '26 أكتوبر · الساعة 4:00 م',
        dayName: 'الإثنين',
        dayNum: 26
      };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [y, m, d] = nextVisit.scheduled_date.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      target.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const dayName = arabicDays[target.getDay()] || 'الإثنين';

      let relative = '';
      if (diffDays === 0) {
        relative = `اليوم، ${dayName}`;
      } else if (diffDays === 1) {
        relative = `غداً، ${dayName}`;
      } else if (diffDays === 2) {
        relative = `بعد غد، ${dayName}`;
      } else {
        relative = `يوم ${dayName}`;
      }

      const monthName = arabicMonths[(m || 1) - 1] || 'أكتوبر';
      const timeFormatted = nextVisit.scheduled_time_from || '4:00 م';
      const full = `${d} ${monthName} · الساعة ${timeFormatted}`;

      return { relative, full, dayName, dayNum: d };
    } catch {
      return {
        relative: 'غداً، الإثنين',
        full: '26 أكتوبر · الساعة 4:00 م',
        dayName: 'الإثنين',
        dayNum: 26
      };
    }
  }, [nextVisit]);

  // This Week's Schedule (4 cards matching B-Mobile.dc.html)
  const weekSchedule = useMemo(() => {
    const upcomingScheduled = myVisits
      .filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

    if (upcomingScheduled.length >= 4) {
      const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return upcomingScheduled.slice(0, 4).map((v, i) => {
        const parts = v.scheduled_date.split('-').map(Number);
        const d = parts[2] || 26;
        const dt = new Date(parts[0], parts[1] - 1, d);
        const dayName = arabicDays[dt.getDay()] || v.day_of_week || 'الإثنين';
        return {
          dayName,
          dayNum: String(d),
          subText: i === 0 ? 'القادمة' : (v.scheduled_time_from || '4:00 م'),
          isNext: i === 0
        };
      });
    }

    // Default matching B-Mobile.dc.html
    return [
      { dayName: 'الإثنين', dayNum: '26', subText: 'القادمة', isNext: true },
      { dayName: 'الأربعاء', dayNum: '28', subText: '4:00 م', isNext: false },
      { dayName: 'الخميس', dayNum: '29', subText: '4:00 م', isNext: false },
      { dayName: 'السبت', dayNum: '31', subText: '4:00 م', isNext: false }
    ];
  }, [myVisits]);

  // Subscription Month Progress & Expiry Info
  const subProgress = useMemo(() => {
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    if (!activeSub || !activeSub.end_date) {
      return {
        percent: 10,
        endDateStr: '22 نوفمبر',
        daysLeft: 28
      };
    }

    try {
      const start = new Date(activeSub.start_date || activeSub.created_at || Date.now()).getTime();
      const end = new Date(activeSub.end_date).getTime();
      const now = Date.now();

      const total = Math.max(1, end - start);
      const elapsed = Math.max(0, now - start);
      const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

      const [ey, em, ed] = activeSub.end_date.split('-').map(Number);
      const mName = arabicMonths[(em || 1) - 1] || 'نوفمبر';
      const endDateStr = `${ed} ${mName}`;

      return { percent: percent || 10, endDateStr, daysLeft: daysLeft || 28 };
    } catch {
      return { percent: 10, endDateStr: '22 نوفمبر', daysLeft: 28 };
    }
  }, [activeSub]);

  // Customer Name and Initial
  const fullName = customer?.full_name || customer?.name || currentUser.full_name || 'مسعد';
  const firstName = fullName.trim().split(/\s+/)[0] || 'مسعد';
  const initialLetter = (firstName.charAt(0) || 'م').toUpperCase();

  // Color themes for advertisements matching B-Mobile.dc.html
  const COLOR_THEMES = useMemo(() => [
    {
      bg: '#0B7F72',
      fg: '#FFFFFF',
      subFg: '#D3EEE9',
      tile: '#0A6B60',
      tagBg: '#F59E0B',
      tagFg: '#3B2300',
      defaultTag: 'عرض WE CARE'
    },
    {
      bg: '#0C2530',
      fg: '#FFFFFF',
      subFg: '#C9D8DC',
      tile: '#1B3B47',
      tagBg: '#F59E0B',
      tagFg: '#3B2300',
      defaultTag: 'عرض WE CARE'
    },
    {
      bg: '#EAF1F6',
      fg: '#0E1B24',
      subFg: '#4A5B63',
      tile: '#FFFFFF',
      tagBg: '#0E1B24',
      tagFg: '#FFFFFF',
      defaultTag: 'إعلان'
    },
    {
      bg: '#F4EFE6',
      fg: '#0E1B24',
      subFg: '#4A5B63',
      tile: '#FFFFFF',
      tagBg: '#0E1B24',
      tagFg: '#FFFFFF',
      defaultTag: 'إعلان'
    }
  ], []);

  const DEFAULT_FALLBACK_SLIDES = useMemo(() => [
    {
      id: 'fb-1',
      tag: 'عرض WE CARE',
      title: 'التعقيم الشامل بالبخار',
      sub: 'الفرش والسقف ومجاري التكييف',
      cta: 'أضف للغسلة القادمة',
      price: '200',
      imageUrl: '',
      rawAd: null as Advertisement | null,
      ...COLOR_THEMES[0]
    },
    {
      id: 'fb-2',
      tag: 'عرض WE CARE',
      title: 'باقة التلميع الماسي',
      sub: 'لمعان يدوم وحماية للطلاء',
      cta: 'أضف للغسلة القادمة',
      price: '350',
      imageUrl: '',
      rawAd: null as Advertisement | null,
      ...COLOR_THEMES[1]
    },
    {
      id: 'fb-3',
      tag: 'إعلان',
      title: 'تكييف كاريير 2.25 حصان انفرتر',
      sub: 'بدلاً من 49,000 ج.م',
      cta: 'عرض التفاصيل',
      price: '44,190',
      imageUrl: '',
      rawAd: null as Advertisement | null,
      ...COLOR_THEMES[2]
    },
    {
      id: 'fb-4',
      tag: 'إعلان',
      title: 'شقة للبيع على بوابة 1',
      sub: '160 م² · تشطيب سوبر لوكس',
      cta: 'تواصل مع المعلن',
      price: '5 مليون',
      imageUrl: '',
      rawAd: null as Advertisement | null,
      ...COLOR_THEMES[3]
    }
  ], [COLOR_THEMES]);

  // Compute slides directly from database advertisements
  const slides = useMemo(() => {
    const activeAdsList = (liveAds || []).filter((a) => a.is_active);
    if (activeAdsList.length === 0) {
      return DEFAULT_FALLBACK_SLIDES;
    }
    return activeAdsList.map((ad, idx) => {
      const theme = COLOR_THEMES[idx % COLOR_THEMES.length];
      let displayPrice = '';
      if (ad.price !== undefined && ad.price !== null) {
        displayPrice = Number(ad.price).toLocaleString('ar-EG');
      }
      const ctaText = (ad.whatsapp || ad.phone) ? 'تواصل معنا' : 'أضف للغسلة القادمة';
      return {
        id: ad.id,
        tag: theme.defaultTag,
        title: ad.title,
        sub: ad.description || '',
        cta: ctaText,
        price: displayPrice,
        imageUrl: ad.image_url || '',
        rawAd: ad,
        ...theme
      };
    });
  }, [liveAds, COLOR_THEMES, DEFAULT_FALLBACK_SLIDES]);

  // Auto-rotate slides every 4 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0'
      }}
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
        dir="rtl"
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          background: '#FFFFFF',
          fontFamily: "'Cairo', system-ui, sans-serif",
          color: '#0E1B24',
          fontSize: '15px',
          lineHeight: 1.6,
          boxShadow: '0 0 25px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Header */}
        <header style={{ padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
            <img
              className="wc-logo"
              src={settings.logo_url || '/assets/wecare-logo.png'}
              alt={settings.company_name || 'WE CARE – Here & Near'}
              style={{
                height: '52px',
                width: 'auto',
                display: 'block',
                animation: 'wcIn 0.9s ease-out both, wcFloat 3.4s ease-in-out 0.9s infinite'
              }}
            />
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              aria-label="حسابي"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                background: '#E3F2EF',
                color: '#0B5F56',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              {initialLetter}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>أهلاً بك</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>{firstName}</h1>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ padding: '12px 20px 110px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Advertisements Carousel */}
          <section aria-label="إعلانات وعروض" aria-roledescription="carousel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ borderRadius: '20px', overflow: 'hidden' }}>
              <div
                dir="ltr"
                style={{
                  display: 'flex',
                  transform: `translateX(-${currentSlide * 100}%)`,
                  transition: 'transform 0.6s ease'
                }}
              >
                {slides.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    dir="rtl"
                    onClick={() => {
                      if (item.rawAd) {
                        setSelectedAdModal(item.rawAd);
                      }
                    }}
                    style={{
                      flex: '0 0 100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      height: '160px',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '20px',
                      background: item.imageUrl ? '#0C2530' : item.bg,
                      cursor: item.rawAd ? 'pointer' : 'default',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {/* Full background image when present */}
                    {item.imageUrl && (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1
                          }}
                        />
                        {/* Gradient overlay crafted to let the image be significantly clearer while maintaining full text contrast */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to left, rgba(12, 37, 48, 0.72) 0%, rgba(12, 37, 48, 0.38) 50%, rgba(12, 37, 48, 0.08) 100%)',
                            zIndex: 2
                          }}
                        />
                      </>
                    )}

                    {/* Content on top */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 3,
                        height: '100%',
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        boxSizing: 'border-box',
                        color: item.imageUrl ? '#FFFFFF' : item.fg
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span
                          style={{
                            alignSelf: 'flex-start',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: item.imageUrl ? '#F59E0B' : item.tagBg,
                            color: item.imageUrl ? '#3B2300' : item.tagFg,
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          {item.tag}
                        </span>
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            lineHeight: 1.3,
                            fontFamily: "'Cairo', sans-serif",
                            color: item.imageUrl ? '#FFFFFF' : item.fg,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textShadow: item.imageUrl ? '0 2px 8px rgba(0, 0, 0, 0.95), 0 1px 3px rgba(0, 0, 0, 0.9)' : 'none'
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            color: item.imageUrl ? '#D3EEE9' : item.subFg,
                            fontFamily: "'Cairo', sans-serif",
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.3,
                            textShadow: item.imageUrl ? '0 1px 4px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.85)' : 'none'
                          }}
                        >
                          {item.sub}
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: item.imageUrl ? '#5EEAD4' : item.fg,
                            fontFamily: "'Cairo', sans-serif",
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            textShadow: item.imageUrl ? '0 1px 3px rgba(0, 0, 0, 0.85)' : 'none'
                          }}
                        >
                          {item.cta}
                        </span>
                      </div>

                      {item.price ? (
                        <div
                          style={{
                            width: '76px',
                            height: '76px',
                            borderRadius: '18px',
                            background: item.imageUrl ? 'rgba(12, 37, 48, 0.65)' : item.tile,
                            backdropFilter: item.imageUrl ? 'blur(8px)' : 'none',
                            border: item.imageUrl ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            lineHeight: 1.2,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                            color: item.imageUrl ? '#FFFFFF' : item.fg
                          }}
                        >
                          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Cairo', sans-serif" }}>
                            {item.price}
                          </span>
                          <span style={{ fontSize: '11px', color: item.imageUrl ? '#D3EEE9' : item.subFg, fontFamily: "'Cairo', sans-serif" }}>
                            {settings.currency_symbol || 'ج.م'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`الإعلان ${i + 1}`}
                  style={{
                    height: '24px',
                    padding: '0 3px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: i === currentSlide ? '22px' : '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: i === currentSlide ? '#0B7F72' : '#C3CED1',
                      transition: 'width 0.3s'
                    }}
                  />
                </button>
              ))}
            </div>
          </section>

          {/* Section 2: Next Wash Card ("غسلتك القادمة") */}
          <section
            aria-labelledby="b-next"
            style={{
              background: '#0B7F72',
              color: '#FFFFFF',
              borderRadius: '24px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h2 id="b-next" style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#D3EEE9', fontFamily: "'Cairo', sans-serif" }}>
              غسلتك القادمة
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.25, fontFamily: "'Cairo', sans-serif" }}>
                {nextWashInfo.relative}
              </span>
              <span style={{ fontSize: '17px', color: '#E6F6F3', fontFamily: "'Cairo', sans-serif" }}>
                {nextWashInfo.full}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#E6F6F3', fontFamily: "'Cairo', sans-serif" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 13l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4a1 1 0 0 1-1 1h-1.5"></path>
                <path d="M5.5 18H4a1 1 0 0 1-1-1v-4h18"></path>
                <path d="M8.5 18h7"></path>
                <circle cx="7" cy="18" r="1.5"></circle>
                <circle cx="17" cy="18" r="1.5"></circle>
              </svg>
              <span>
                {primaryVehicle ? `${primaryVehicle.vehicle_type || 'سيارة'} ${primaryVehicle.plate_number}` : 'مرسيدس س ج ١٢٣'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0A6B60', borderRadius: '16px', padding: '10px 12px' }}>
              <div
                role="img"
                aria-label={`صورة الفني ${workerName}`}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: '#E3F2EF',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  color: '#7FB5AC'
                }}
              >
                {assignedWorker?.personal_image_url ? (
                  <img
                    src={assignedWorker.personal_image_url}
                    alt={workerName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="9" r="4.2"></circle>
                    <path d="M3.5 24c.8-5 4.2-8 8.5-8s7.7 3 8.5 8z"></path>
                  </svg>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                  {workerName}
                </span>
                <span style={{ fontSize: '13px', color: '#D3EEE9', fontFamily: "'Cairo', sans-serif" }}>
                  الفني المسؤول عن سيارتك
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: This Week's Schedule ("مواعيد هذا الأسبوع") */}
          <section aria-labelledby="b-week" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 id="b-week" style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                مواعيد هذا الأسبوع
              </h2>
              <button
                type="button"
                onClick={() => onSelectTab('visits')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0B7F72',
                  textDecoration: 'none',
                  padding: '8px 0',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                الجدول كاملاً
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
              {weekSchedule.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: item.isNext ? '2px solid #0B7F72' : '1px solid #E2E9EA',
                    background: item.isNext ? '#E3F2EF' : '#FFFFFF',
                    borderRadius: '16px',
                    padding: '10px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0'
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: item.isNext ? '#0B5F56' : '#5B6B73',
                      fontWeight: 600,
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {item.dayName}
                  </span>
                  <span
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: item.isNext ? '#0B5F56' : '#0E1B24',
                      lineHeight: 1.3,
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {item.dayNum}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: item.isNext ? '#0B5F56' : '#5B6B73',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {item.subText}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Monthly Subscription ("اشتراكك الشهري") */}
          <section
            aria-labelledby="b-sub"
            style={{
              background: '#F5F8F8',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 id="b-sub" style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                  اشتراكك الشهري
                </h2>
                <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                  باقة {currentPackage?.name || 'SUV'} · {activeSub?.selected_days?.length || 4} أيام أسبوعياً
                </span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: activeSub?.status === 'active' ? '#E3F5EE' : '#FEE2E2',
                  color: activeSub?.status === 'active' ? '#0B6B4F' : '#991B1B',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: activeSub?.status === 'active' ? '#10B981' : '#EF4444'
                  }}
                />
                {activeSub?.status === 'active' ? 'نشط' : activeSub?.status === 'pending' ? 'قيد المراجعة' : 'منتهي'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1.2, fontFamily: "'Cairo', sans-serif" }}>
                {activeSub ? activeSub.total_price : 350}
              </span>
              <span style={{ fontSize: '15px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                {settings.currency_symbol || 'ج.م'} / شهرياً
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                role="progressbar"
                aria-label="الشهر الحالي"
                aria-valuenow={subProgress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  height: '8px',
                  borderRadius: '999px',
                  background: '#E2E9EA',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${subProgress.percent}%`,
                    height: '100%',
                    background: '#0B7F72',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              {isAutoRenew ? (
                <span style={{ fontSize: '14px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                  يتجدد تلقائياً يوم <b>{subProgress.endDateStr}</b> · متبقٍ {subProgress.daysLeft} يوم
                </span>
              ) : (
                <span style={{ fontSize: '14px', color: '#92400E', fontFamily: "'Cairo', sans-serif" }}>
                  ينتهي يوم <b>{subProgress.endDateStr}</b> ولن يتجدد
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '14px',
                borderTop: '1px solid #E2E9EA'
              }}
            >
              <span id="b-auto-label" style={{ fontSize: '15px', fontWeight: 500, fontFamily: "'Cairo', sans-serif" }}>
                التجديد التلقائي
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAutoRenew}
                aria-labelledby="b-auto-label"
                onClick={handleToggleAutoRenew}
                style={{
                  width: '56px',
                  height: '32px',
                  borderRadius: '999px',
                  border: 'none',
                  padding: '3px',
                  background: isAutoRenew ? '#0B7F72' : '#C3CED1',
                  display: 'flex',
                  justifyContent: isAutoRenew ? 'flex-start' : 'flex-end',
                  cursor: 'pointer',
                  transition: 'background 0.25s ease'
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                آخر دفعة: {activeSub ? activeSub.total_price : 350} {settings.currency_symbol || 'ج.م'} · {activeSub?.payment_status === 'paid' ? 'تم السداد' : 'تم السداد'}
              </span>
              <button
                type="button"
                onClick={() => onSelectTab('subscriptions')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontWeight: 600,
                  color: '#0B7F72',
                  cursor: 'pointer',
                  padding: '4px 0',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                إدارة
              </button>
            </div>
          </section>

          {/* Section 5: Rate Last Wash ("قيّم آخر غسلة") */}
          <section
            aria-labelledby="b-rate"
            style={{
              border: '1px solid #E2E9EA',
              borderRadius: '20px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {rating === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 id="b-rate" style={{ margin: 0, fontSize: '15px', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                  قيّم آخر غسلة
                </h2>
                <div role="group" aria-label="التقييم بالنجوم" style={{ display: 'flex', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        disabled={isSubmittingRating}
                        onClick={() => handlePickRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`تقييم ${star} من 5`}
                        style={{
                          width: '44px',
                          height: '44px',
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <svg
                          width="30"
                          height="30"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          style={{
                            transition: 'transform 0.15s ease',
                            transform: isFilled ? 'scale(1.15)' : 'scale(1)'
                          }}
                        >
                          <path
                            d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"
                            fill={isFilled ? '#F59E0B' : '#D5DEE0'}
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0B6B4F', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                </svg>
                <span>شكراً! وصلنا تقييمك ({rating} من 5)</span>
              </div>
            )}
          </section>
        </main>

        {/* Bottom Navigation */}
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
            zIndex: 40,
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)'
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"></path>
            </svg>
            الرئيسية
          </button>

          {/* 2. الباقات */}
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
              color: activeTab === 'subscriptions' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'subscriptions' ? 700 : 500,
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l9 5-9 5-9-5z"></path>
              <path d="M3 13l9 5 9-5"></path>
            </svg>
            الباقات
          </button>

          {/* 3. الخدمات */}
          <button
            type="button"
            onClick={() => onSelectTab('visits')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'visits' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'visits' ? 700 : 500,
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>
            </svg>
            حسابي
          </button>
        </nav>

        {/* Advertisement Details Modal */}
        {selectedAdModal && (
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setSelectedAdModal(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#FFFFFF',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                fontFamily: "'Cairo', sans-serif",
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedAdModal.image_url && (
                <div style={{ position: 'relative', width: '100%', height: '180px', background: '#0E1B24' }}>
                  <img
                    src={selectedAdModal.image_url}
                    alt={selectedAdModal.title}
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                  {selectedAdModal.price !== undefined && selectedAdModal.price !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#0B7F72',
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '13px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                      }}
                    >
                      {Number(selectedAdModal.price).toLocaleString('ar-EG')} {settings.currency_symbol || 'ج.م'}
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#EAF1F6',
                      color: '#0B7F72',
                      fontSize: '11px',
                      fontWeight: 700,
                      marginBottom: '6px'
                    }}
                  >
                    عرض خاص
                  </span>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0E1B24', lineHeight: 1.4 }}>
                    {selectedAdModal.title}
                  </h3>
                  {(!selectedAdModal.image_url && selectedAdModal.price !== undefined && selectedAdModal.price !== null) && (
                    <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 800, color: '#0B7F72' }}>
                      السعر: {Number(selectedAdModal.price).toLocaleString('ar-EG')} {settings.currency_symbol || 'ج.م'}
                    </div>
                  )}
                </div>

                {selectedAdModal.description && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#4A5B63', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {selectedAdModal.description}
                  </p>
                )}

                {/* Contact buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {selectedAdModal.whatsapp && (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(selectedAdModal.whatsapp, settings.dial_code || '20')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '46px',
                        background: '#25D366',
                        color: '#FFFFFF',
                        borderRadius: '14px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '14px'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                      </svg>
                      تواصل عبر واتساب
                    </a>
                  )}

                  {selectedAdModal.phone && (
                    <a
                      href={`tel:${selectedAdModal.phone}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '46px',
                        background: '#0B7F72',
                        color: '#FFFFFF',
                        borderRadius: '14px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '14px'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      اتصال هاتفي
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedAdModal(null)}
                    style={{
                      height: '42px',
                      border: '1px solid #E2E9EA',
                      background: '#F8FAFC',
                      color: '#5B6B73',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
