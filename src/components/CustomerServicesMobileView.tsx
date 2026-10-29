import React, { useState, useMemo, useEffect } from 'react';
import {
  AuthUser,
  Settings,
  Customer,
  Vehicle,
  OnDemandService,
  ServiceBooking,
  Package as PackageType,
  PackageCategory,
  PackagePricing
} from '../types/database';
import * as api from '../services/api';
import { CustomerCareMobileView } from './CustomerCareMobileView';

export interface CustomerServicesMobileViewProps {
  currentUser: AuthUser;
  customer: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  packages?: PackageType[];
  categories?: PackageCategory[];
  pricing?: PackagePricing[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onOpenAddVehicle?: () => void;
}

export const CustomerServicesMobileView: React.FC<CustomerServicesMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  packages = [],
  categories = [],
  pricing = [],
  activeTab,
  onSelectTab,
  onOpenAddVehicle
}) => {
  // Selected Service for Details Screen (matching B-Care.dc.html)
  const [selectedDetailService, setSelectedDetailService] = useState<OnDemandService | null>(null);

  // Search and Category Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Services data from DB
  const [services, setServices] = useState<OnDemandService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Customer Bookings
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Load services and bookings
  const loadData = async () => {
    try {
      setLoadingServices(true);
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoadingServices(false);
    }

    try {
      setLoadingBookings(true);
      const customerId = customer?.id || currentUser.customer_id || currentUser.id;
      const bks = await api.getServiceBookings(customerId);
      setBookings(bks);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // دمج وقراءة كافة الخدمات المسجلة في النظام تحت تصنيف "خدمات"
  // يشمل ذلك خدمات كتالوج الخدمات الفورية + أي باقات مسجلة تحت تصنيف خدمات
  const unifiedServices = useMemo(() => {
    const list: OnDemandService[] = [...services.filter((s) => s.is_active)];

    // استخراج الخدمات المسجلة في جدول الباقات تحت تصنيف (خدمات)
    if (packages && packages.length > 0) {
      packages.forEach((pkg) => {
        const cat = categories.find((c) => c.id === pkg.category_id);
        const catName = (cat?.name || '').toLowerCase();
        const pkgName = (pkg.name || '').toLowerCase();
        const isServicesCategory =
          catName.includes('خدمات') ||
          catName.includes('خدمة') ||
          catName.includes('فردية') ||
          pkgName.includes('خدمة') ||
          pkg.tier === 'none';

        if (isServicesCategory && pkg.is_active !== false) {
          // التحقق من عدم التكرار بالاسم أو المعرف
          const exists = list.some((s) => s.id === pkg.id || s.name.trim() === pkg.name.trim());
          if (!exists) {
            const effectiveAreaId = customer?.area_id || '';
            const matchPricing = pricing.find(
              (pr) => pr.package_id === pkg.id && (!effectiveAreaId || pr.area_id === effectiveAreaId)
            );
            const priceVal = matchPricing?.price || (pkg as any).base_price || 0;

            list.push({
              id: pkg.id,
              category: 'car',
              group_name: cat?.name || 'خدمات',
              sub_category: 'wash',
              name: pkg.name,
              description: pkg.description || 'خدمة فورية مباشرة مع الفني',
              includes: pkg.weekly_services_plan || [],
              icon_type: 'spark',
              duration_minutes: 45,
              popular: false,
              tile_bg: '#E3F2EF',
              tile_fg: '#0B7F72',
              price: priceVal,
              price_type: priceVal > 0 ? 'fixed' : 'custom',
              kind: 'car',
              is_active: true,
              image_url: pkg.image_url
            });
          }
        }
      });
    }

    return list;
  }, [services, packages, categories, pricing, customer]);

  // التصنيفات الفرعية المستخلصة من الخدمات المتاحة
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    unifiedServices.forEach((s) => {
      if (s.group_name && s.group_name.trim()) {
        set.add(s.group_name.trim());
      }
    });
    return ['all', ...Array.from(set)];
  }, [unifiedServices]);

  // تصفية الخدمات بحسب التصنيف والبحث
  const filteredServices = useMemo(() => {
    return unifiedServices.filter((s) => {
      const matchCat = selectedCategory === 'all' || s.group_name === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.group_name && s.group_name.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [unifiedServices, selectedCategory, searchQuery]);

  // إذا تم اختيار خدمة، عرض شاشة التفاصيل والحجز المطابقة لـ B-Care.dc.html
  if (selectedDetailService) {
    return (
      <CustomerCareMobileView
        currentUser={currentUser}
        customer={customer}
        settings={settings}
        vehicles={vehicles}
        selectedService={selectedDetailService}
        allServices={unifiedServices}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onBack={() => setSelectedDetailService(null)}
        onOpenAddVehicle={onOpenAddVehicle}
      />
    );
  }

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
      {/* Top Header matching Store Layout */}
      <header
        style={{
          padding: '16px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid #E2E9EA'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="شعار النظام"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#0B7F72',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '18px'
                }}
              >
                W
              </div>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0E1B24', lineHeight: 1.2 }}>
                الخدمات
              </h1>
              <span style={{ fontSize: '12px', color: '#5B6B73', fontWeight: 500 }}>
                اطلب خدمة فورية مباشرة مع الفني
              </span>
            </div>
          </div>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#E3F2EF',
              color: '#0B7F72',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {filteredServices.length} متوفرة
          </span>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '46px',
            boxSizing: 'border-box',
            borderRadius: '14px',
            background: '#F3F6F6',
            padding: '0 14px'
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5B6B73"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="M20 20l-4-4"></path>
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن خدمة (غسيل، تلميع، زيت...)"
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#0E1B24',
              outline: 'none',
              fontFamily: "'Cairo', sans-serif"
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '14px 20px 140px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {/* Category Filter Pills (نفس المتجر) */}
        {dynamicCategories.length > 2 && (
          <div role="tablist" aria-label="أقسام الخدمات" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {dynamicCategories.map((catKey) => {
              const isSelected = selectedCategory === catKey;
              const label = catKey === 'all' ? 'الكل' : catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(catKey)}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    border: `1px solid ${isSelected ? '#0E1B24' : '#D5DEE0'}`,
                    background: isSelected ? '#0E1B24' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#34474F',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Services 2-Column Grid (نفس طريقة عرض المتجر) */}
        {loadingServices ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#5B6B73', fontSize: '14px', fontWeight: 600 }}>
            جاري تحميل الخدمات...
          </div>
        ) : filteredServices.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: '20px',
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
              <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5"></path>
              <path d="M3 21l3-3"></path>
            </svg>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#334155' }}>لا توجد خدمات مطابقة</span>
            <span style={{ fontSize: '13px' }}>جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً</span>
          </div>
        ) : (
          <section
            aria-label="الخدمات المتاحة"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '12px'
            }}
          >
            {filteredServices.map((srv) => {
              const tileBg = srv.tile_bg || '#E3F2EF';
              const tileFg = srv.tile_fg || '#0B7F72';

              return (
                <article
                  key={srv.id}
                  onClick={() => setSelectedDetailService(srv)}
                  style={{
                    border: '1px solid #E2E9EA',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Service Image / Tile Area */}
                  <div
                    style={{
                      height: '125px',
                      background: tileBg,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {srv.image_url ? (
                      <img
                        src={srv.image_url}
                        alt={srv.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}

                    {!srv.image_url && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          color: tileFg
                        }}
                      >
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                        </svg>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{srv.group_name || 'خدمة'}</span>
                      </div>
                    )}

                    {/* Popular Badge */}
                    {srv.popular && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#EF4444',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px'
                        }}
                      >
                        الأكثر طلباً
                      </span>
                    )}

                    {/* Duration Badge */}
                    {srv.duration_minutes ? (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          background: 'rgba(14, 27, 36, 0.7)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px'
                        }}
                      >
                        {srv.duration_minutes} د
                      </span>
                    ) : null}
                  </div>

                  {/* Service Info & Action Area */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <span style={{ fontSize: '11px', color: '#5B6B73', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                      {srv.group_name || 'خدمة عناية'}
                    </span>

                    <h3
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0E1B24',
                        minHeight: '38px',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    >
                      {srv.name}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '11px',
                        color: '#64748B',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    >
                      {srv.description || 'طلب فوري ومباشر مع الفني في زيارتك القادمة'}
                    </p>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: 'auto', paddingTop: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0B7F72', fontFamily: "'Cairo', sans-serif" }}>
                        {srv.price > 0 ? `${srv.price} ج.م` : 'حسب الطلب'}
                      </span>
                      {srv.price_type === 'starting_at' && (
                        <span style={{ fontSize: '10px', color: '#5B6B73' }}>يبدأ من</span>
                      )}
                    </div>

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailService(srv);
                      }}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#0B7F72',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Cairo', sans-serif",
                        transition: 'background 0.15s ease',
                        marginTop: '4px'
                      }}
                    >
                      طلب الخدمة
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* Bottom Navigation matching all customer screens */}
      <nav
        aria-label="التنقل الرئيسي"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          boxSizing: 'border-box',
          height: '76px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E9EA',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          padding: '6px 8px 12px',
          zIndex: 40,
          boxShadow: '0 -4px 16px rgba(12, 37, 48, 0.05)'
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
            <path d="M3 10.5L12 3l9 7.5"></path>
            <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"></path>
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          الباقات
        </button>

        {/* 3. الخدمات (Active) */}
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
            color: '#0B7F72',
            fontSize: '12px',
            fontWeight: 700,
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
