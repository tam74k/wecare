import React, { useState, useEffect, useMemo } from 'react';
import { Customer, AuthUser, Advertisement, Settings, Vehicle } from '../types/database';
import * as api from '../services/api';
import { formatWhatsAppNumber } from '../services/whatsappService';

interface CustomerHomeNewViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  settings: Settings;
  advertisements?: Advertisement[];
  onOpenAddVehicle: () => void;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
}

export const CustomerHomeNewView: React.FC<CustomerHomeNewViewProps> = ({
  currentUser,
  customer,
  settings,
  advertisements = [],
  onOpenAddVehicle,
  onCreateVehicle,
  activeTab,
  onSelectTab
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liveAds, setLiveAds] = useState<Advertisement[]>(advertisements || []);
  const [selectedAdModal, setSelectedAdModal] = useState<Advertisement | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (advertisements && advertisements.length > 0) {
      setLiveAds(advertisements);
    }
  }, [advertisements]);

  // Fetch directly from database on mount to guarantee fresh advertisements
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

  // Quick Add Vehicle Modal state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickCar, setQuickCar] = useState({
    vehicle_type: 'سيدان',
    color: 'أبيض',
    plate_number: ''
  });
  const [isSubmittingCar, setIsSubmittingCar] = useState(false);
  const [carError, setCarError] = useState<string | null>(null);

  // Dynamic visual themes matching B-Home-New.dc.html
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

  // Fallback slides in case no ads are registered yet
  const DEFAULT_FALLBACK_SLIDES = useMemo(() => [
    {
      id: 'fallback-1',
      tag: 'عرض WE CARE',
      title: 'التعقيم الشامل بالبخار',
      sub: 'الفرش والسقف ومجاري التكييف',
      cta: 'اعرف أكثر',
      price: '200',
      imageUrl: '',
      rawAd: null as Advertisement | null,
      ...COLOR_THEMES[0]
    },
    {
      id: 'fallback-2',
      tag: 'عرض WE CARE',
      title: 'باقة التلميع الماسي',
      sub: 'لمعان يدوم وحماية للطلاء',
      cta: 'اعرف أكثر',
      price: '350',
      imageUrl: '',
      rawAd: null as Advertisement | null,
      ...COLOR_THEMES[1]
    },
    {
      id: 'fallback-3',
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
      id: 'fallback-4',
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
      const ctaText = (ad.whatsapp || ad.phone) ? 'تواصل معنا' : 'اعرف أكثر';
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

  const fullName = customer?.full_name || customer?.name || currentUser.full_name || 'مسعد';
  const firstName = fullName.trim().split(/\s+/)[0] || 'مسعد';
  const initialLetter = (firstName.charAt(0) || 'م').toUpperCase();

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarError(null);
    if (!quickCar.plate_number.trim()) {
      setCarError('يرجى إدخال رقم اللوحة');
      return;
    }
    const customerId = customer?.id || currentUser.customer_id || currentUser.id;
    if (onCreateVehicle) {
      try {
        setIsSubmittingCar(true);
        await onCreateVehicle({
          customer_id: customerId,
          vehicle_type: quickCar.vehicle_type,
          color: quickCar.color,
          plate_number: quickCar.plate_number.trim()
        });
        setShowQuickAddModal(false);
      } catch (err: any) {
        setCarError(err.message || 'حدث خطأ أثناء حفظ السيارة');
      } finally {
        setIsSubmittingCar(false);
      }
    } else {
      onOpenAddVehicle();
    }
  };

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/wecare-logo.png';
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
                background: '#E3F2EF',
                color: '#0B5F56',
                fontWeight: 700,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              {initialLetter}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
              أهلاً بك في WE CARE
            </span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              {firstName}
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ padding: '12px 20px 110px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Carousel / Advertisements */}
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

          {/* Section 2: Add First Car */}
          <section
            aria-labelledby="n-car"
            style={{
              border: '2px dashed #8FCFC4',
              background: '#F2FAF8',
              borderRadius: '24px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '22px',
                background: '#0B7F72',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 13l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4a1 1 0 0 1-1 1h-1.5"></path>
                <path d="M5.5 18H4a1 1 0 0 1-1-1v-4h18"></path>
                <path d="M8.5 18h7"></path>
                <circle cx="7" cy="18" r="1.5"></circle>
                <circle cx="17" cy="18" r="1.5"></circle>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 id="n-car" style={{ margin: 0, fontSize: '19px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                أضف سيارتك الأولى
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                عشان تقدر تشترك في باقة شهرية ونحدد لك مواعيد الغسيل
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddVehicle}
              style={{
                alignSelf: 'stretch',
                height: '52px',
                borderRadius: '14px',
                background: '#0B7F72',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: "'Cairo', sans-serif",
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#075E55')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#0B7F72')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              أضف سيارة جديدة
            </button>
          </section>

          {/* Section 3: 3 Steps */}
          <section aria-labelledby="n-steps" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 id="n-steps" style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              ابدأ في 3 خطوات
            </h2>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1px solid #0B7F72',
                  background: '#FFFFFF'
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#0B7F72',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  1
                </span>
                <span style={{ flex: 1, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>أضف سيارتك</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0B5F56', fontFamily: "'Cairo', sans-serif" }}>
                  الآن
                </span>
              </li>
              <li
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1px solid #E2E9EA',
                  background: '#FFFFFF'
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#F5F8F8',
                    color: '#5B6B73',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  2
                </span>
                <span style={{ flex: 1, color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>اختر باقتك الشهرية</span>
              </li>
              <li
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1px solid #E2E9EA',
                  background: '#FFFFFF'
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#F5F8F8',
                    color: '#5B6B73',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  3
                </span>
                <span style={{ flex: 1, color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>حدد أيام ومواعيد الغسيل</span>
              </li>
            </ol>
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
            zIndex: 50,
            boxSizing: 'border-box'
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
              border: 'none',
              background: 'transparent',
              color: activeTab === 'home' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'home' ? 600 : 400,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
              border: 'none',
              background: 'transparent',
              color: activeTab === 'subscriptions' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'subscriptions' ? 600 : 400,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
              border: 'none',
              background: 'transparent',
              color: activeTab === 'visits' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'visits' ? 600 : 400,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
              border: 'none',
              background: 'transparent',
              color: activeTab === 'store' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'store' ? 600 : 400,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
              border: 'none',
              background: 'transparent',
              color: activeTab === 'profile' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'profile' ? 600 : 400,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>
            </svg>
            حسابي
          </button>
        </nav>

        {/* Quick Add Vehicle Sheet / Modal */}
        {showQuickAddModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(14, 27, 36, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setShowQuickAddModal(false)}
          >
            <div
              dir="rtl"
              style={{
                width: '100%',
                maxWidth: '390px',
                background: '#FFFFFF',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px 32px',
                boxSizing: 'border-box',
                fontFamily: "'Cairo', sans-serif",
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0E1B24' }}>
                  إضافة سيارة جديدة
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  style={{
                    background: '#F5F8F8',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#5B6B73'
                  }}
                >
                  ✕
                </button>
              </div>

              {carError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#FFF1F2',
                    border: '1px solid #FECDD3',
                    borderRadius: '12px',
                    color: '#E11D48',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '14px'
                  }}
                >
                  {carError}
                </div>
              )}

              <form onSubmit={handleSaveCar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>
                    نوع السيارة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: سيدان / تويوتا كورولا"
                    value={quickCar.vehicle_type}
                    onChange={(e) => setQuickCar({ ...quickCar, vehicle_type: e.target.value })}
                    style={{
                      height: '50px',
                      borderRadius: '14px',
                      border: '1px solid #D5DEE0',
                      padding: '0 14px',
                      fontSize: '15px',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>
                      اللون
                    </label>
                    <input
                      type="text"
                      placeholder="أبيض / أسود / رمادي"
                      value={quickCar.color}
                      onChange={(e) => setQuickCar({ ...quickCar, color: e.target.value })}
                      style={{
                        height: '50px',
                        borderRadius: '14px',
                        border: '1px solid #D5DEE0',
                        padding: '0 14px',
                        fontSize: '15px',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>
                      رقم اللوحة *
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: أ ب ج 1234"
                      value={quickCar.plate_number}
                      onChange={(e) => setQuickCar({ ...quickCar, plate_number: e.target.value })}
                      style={{
                        height: '50px',
                        borderRadius: '14px',
                        border: '1px solid #D5DEE0',
                        padding: '0 14px',
                        fontSize: '15px',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCar}
                  style={{
                    height: '52px',
                    borderRadius: '16px',
                    background: '#0B7F72',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '8px',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  {isSubmittingCar ? 'جاري حفظ السيارة...' : 'حفظ السيارة'}
                </button>
              </form>
            </div>
          </div>
        )}

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
