import React, { useState, useMemo, useEffect } from 'react';
import {
  AuthUser,
  Settings,
  Customer,
  Vehicle,
  OnDemandService,
  ServiceBooking
} from '../types/database';
import * as api from '../services/api';

export interface CustomerCareMobileViewProps {
  currentUser: AuthUser;
  customer: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  selectedService?: OnDemandService | null;
  allServices?: OnDemandService[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onBack: () => void;
  onOpenAddVehicle?: () => void;
}

export const CustomerCareMobileView: React.FC<CustomerCareMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  selectedService,
  allServices = [],
  activeTab,
  onSelectTab,
  onBack,
  onOpenAddVehicle
}) => {
  // Services list from props or DB
  const [servicesList, setServicesList] = useState<OnDemandService[]>(allServices);
  const [loadingServices, setLoadingServices] = useState(allServices.length === 0);

  // Load services if not provided
  useEffect(() => {
    if (allServices.length > 0) {
      setServicesList(allServices);
      setLoadingServices(false);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        setLoadingServices(true);
        const data = await api.getServices();
        if (isMounted) {
          setServicesList(data);
        }
      } catch (err) {
        console.error('Failed to load services for Care view:', err);
      } finally {
        if (isMounted) setLoadingServices(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [allServices]);

  // Selected vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    if (vehicles.length > 0) {
      return vehicles[0].id;
    }
    return '';
  });
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  // Active category filter: 'all' | 'wash' | 'maint' | 'shine'
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Multi-selected service IDs
  const [pickedServiceIds, setPickedServiceIds] = useState<string[]>(() => {
    if (selectedService?.id) {
      return [selectedService.id];
    }
    return [];
  });

  // Sheet / Modal state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [selectedOilType, setSelectedOilType] = useState('mobil');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [bookingConfirmationLine, setBookingConfirmationLine] = useState('');

  // Selected vehicle object
  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  // Filter relevant services
  // If the initial selectedService is for building, show building services; otherwise show car care services.
  const isBuildingScope = selectedService?.category === 'building';

  const relevantServices = useMemo(() => {
    let list = servicesList.filter((s) => {
      if (isBuildingScope) {
        return s.category === 'building';
      }
      return s.category === 'car';
    });

    if (activeCategoryFilter !== 'all') {
      list = list.filter((s) => {
        if (s.sub_category) {
          return s.sub_category === activeCategoryFilter;
        }
        if (activeCategoryFilter === 'wash') return s.group_name.includes('غسيل');
        if (activeCategoryFilter === 'maint') return s.group_name.includes('صيانة') || s.kind === 'oil';
        if (activeCategoryFilter === 'shine') return s.group_name.includes('عناية') || s.name.includes('تلميع') || s.name.includes('بخار');
        return true;
      });
    }

    return list;
  }, [servicesList, isBuildingScope, activeCategoryFilter]);

  // Chosen service items
  const chosenServices = useMemo(() => {
    return servicesList.filter((s) => pickedServiceIds.includes(s.id));
  }, [servicesList, pickedServiceIds]);

  // Has oil service chosen
  const hasOilService = useMemo(() => {
    return chosenServices.some((s) => s.kind === 'oil' || s.id === 'srv-oil' || s.name.includes('زيت'));
  }, [chosenServices]);

  // Total price
  const totalPrice = useMemo(() => {
    return chosenServices.reduce((acc, s) => acc + (s.price || 0), 0);
  }, [chosenServices]);

  // Category filter tabs
  const categoryFilters = useMemo(() => {
    if (isBuildingScope) {
      return [
        { id: 'all', label: 'الكل' },
        { id: 'تنظيف', label: 'تنظيف' },
        { id: 'تركيبات', label: 'تركيبات وصيانة' }
      ];
    }
    return [
      { id: 'all', label: 'الكل' },
      { id: 'wash', label: 'غسيل' },
      { id: 'maint', label: 'صيانة' },
      { id: 'shine', label: 'حماية وتلميع' }
    ];
  }, [isBuildingScope]);

  // Next 8 days
  const dateOptions = useMemo(() => {
    const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const fullDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const result = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayIndex = d.getDay();
      const dayNum = d.getDate();
      const monthName = arabicMonths[d.getMonth()];
      const iso = d.toISOString().split('T')[0];

      result.push({
        top: days[dayIndex],
        num: `${dayNum}`,
        full: `${fullDays[dayIndex]} ${dayNum} ${monthName}`,
        iso
      });
    }
    return result;
  }, []);

  // Oil options
  const oilOptions = [
    { id: 'mobil', label: 'موبيل 5000' },
    { id: 'power', label: 'باور' },
    { id: 'total', label: 'توتال' },
    { id: 'own', label: 'زيتي' }
  ];

  // Toggle pick a service
  const handleTogglePick = (serviceId: string) => {
    setPickedServiceIds((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
    setIsDone(false);
  };

  // Submit booking
  const handleConfirmBooking = async () => {
    if (!customer?.id) {
      alert('يرجى تسجيل الدخول لتأكيد الحجز');
      return;
    }
    if (chosenServices.length === 0) {
      alert('يرجى اختيار خدمة واحدة على الأقل');
      return;
    }
    if (!selectedTime) {
      alert('يرجى تحديد وقت الحجز');
      return;
    }

    const selectedDay = dateOptions[selectedDateIndex] || dateOptions[0];
    const servicesNames = chosenServices.map((s) => s.name).join(' + ');
    const primaryService = chosenServices[0];

    const customerBld = customer.building_number ? `عمارة ${customer.building_number}` : (customer.detailed_address || 'الكمبوند');
    const location = currentVehicle
      ? `${currentVehicle.brand || ''} ${currentVehicle.model || ''} (${currentVehicle.plate_number}) - تحت ${customerBld}`
      : customerBld;

    try {
      setIsBookingSubmitting(true);
      await api.createServiceBooking({
        service_id: primaryService.id,
        service_name: primaryService.name,
        service_ids: JSON.stringify(chosenServices.map((s) => s.id)),
        services_summary: servicesNames,
        customer_id: customer.id,
        customer_name: customer.name || currentUser.full_name || 'عميل',
        customer_phone: customer.phone || currentUser.phone,
        vehicle_id: currentVehicle?.id,
        location_address: location,
        booking_date: selectedDay.iso,
        booking_time: selectedTime,
        selected_option: hasOilService ? selectedOilType : undefined,
        oil_type: hasOilService ? selectedOilType : undefined,
        notes: `طلب حجز مباشر: ${servicesNames}`,
        price: totalPrice,
        status: 'pending',
        payment_method: 'cash',
        payment_status: 'unpaid'
      });

      const confirmLine = `${selectedDay.full} · ${selectedTime} · الفني بيوصل لحد عربيتك`;
      setBookingConfirmationLine(confirmLine);
      setIsDone(true);
    } catch (err) {
      console.error('Failed to create service booking:', err);
      alert('حدث خطأ أثناء حفظ الحجز، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Parse includes
  const getIncludesList = (srv: OnDemandService): string[] => {
    if (Array.isArray(srv.includes)) return srv.includes;
    if (typeof srv.includes === 'string' && srv.includes.trim()) {
      try {
        const parsed = JSON.parse(srv.includes);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return srv.includes.split(',').map((s) => s.trim());
      }
    }
    // Fallback default features if empty
    if (srv.kind === 'oil') return ['زيت من المتجر أو زيتك', 'عند باب العمارة', 'فحص السوائل'];
    if (srv.group_name.includes('غسيل')) return ['الهيكل الخارجي', 'الزجاج والجنوط', 'المقصورة الداخلية'];
    if (srv.name.includes('بخار')) return ['الفرش', 'السقف والأبواب', 'مجاري التكييف'];
    if (srv.name.includes('تلميع')) return ['تلميع الطلاء', 'حماية تدوم طويلاً', 'تنظيف المقصورة'];
    return ['خدمة احترافية شاملة', 'فريق متخصص', 'ضمان الجودة'];
  };

  // Map icon
  const renderIcon = (iconType?: string) => {
    switch (iconType) {
      case 'spark':
        return (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path>
          </svg>
        );
      case 'drop':
        return (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z"></path>
          </svg>
        );
      case 'steam':
        return (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 4c-1.5 1.5-1.5 3 0 4.5S9.5 11.5 8 13"></path>
            <path d="M12 4c-1.5 1.5-1.5 3 0 4.5S13.5 11.5 12 13"></path>
            <path d="M16 4c-1.5 1.5-1.5 3 0 4.5S17.5 11.5 16 13"></path>
            <path d="M4 17h16v3H4z"></path>
          </svg>
        );
      case 'gem':
        return (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3h12l3 6-9 12L3 9z"></path>
            <path d="M3 9h18M9 3l3 18M15 3l-3 18"></path>
          </svg>
        );
      default:
        return (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path>
          </svg>
        );
    }
  };

  // Screen header title
  const screenTitle = selectedService?.name || 'العناية بالسيارة';
  const screenSubtitle = selectedService?.description || 'الفني بييجي لحد عربيتك. اختار خدمة أو أكتر واحجزهم في زيارة واحدة.';

  const n = chosenServices.length;
  const countText = n === 1 ? 'خدمة واحدة · زيارة واحدة' : n === 2 ? 'خدمتين · زيارة واحدة' : `${n} خدمات · زيارة واحدة`;
  const totalText = totalPrice > 0 ? `${totalPrice} ج.م` : 'حسب الاختيار';

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
        background: '#F3F6F6',
        fontFamily: "'Cairo', system-ui, sans-serif",
        color: '#0E1B24',
        fontSize: '15px',
        lineHeight: 1.6,
        paddingBottom: '86px'
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#0C2530',
          color: '#FFFFFF',
          padding: '16px 16px 70px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          fontFamily: "'Cairo', sans-serif"
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="رجوع للخدمات"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 6l6 6-6 6"></path>
            </svg>
          </button>

          {/* Dynamic logo from settings */}
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt={settings.company_name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'contain',
                background: '#FFFFFF',
                padding: '2px'
              }}
            />
          )}

          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.3,
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            {screenTitle}
          </h1>
        </div>

        <p
          style={{
            margin: '0 4px',
            fontSize: '14px',
            color: '#C9D8DC',
            lineHeight: 1.5,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          {screenSubtitle}
        </p>
      </header>

      {/* Main Content */}
      <main
        style={{
          padding: '0 16px 140px',
          marginTop: '-52px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Floating Vehicle Selection Card */}
        <section
          aria-label="السيارة"
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '14px',
            boxShadow: '0 8px 24px rgba(12,37,48,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#E3F2EF',
              color: '#0B7F72',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <svg
              width="26"
              height="26"
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
            <span style={{ fontSize: '12px', color: '#5B6B73' }}>
              {isBuildingScope ? 'الخدمة للعقار' : 'الخدمة لسيارة'}
            </span>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>
              {currentVehicle
                ? `${currentVehicle.brand || ''} ${currentVehicle.model || ''} · ${currentVehicle.vehicle_type || ''}`
                : 'سيارتي الرئيسية'}
            </span>
            <span style={{ fontSize: '13px', color: '#5B6B73' }}>
              {currentVehicle?.plate_number ? `لوحة: ${currentVehicle.plate_number} · ` : ''}
              {customer?.building_number ? `تحت عمارة ${customer.building_number}` : (customer?.detailed_address || 'الكمبوند')}
            </span>
          </div>

          {vehicles.length > 1 ? (
            <button
              type="button"
              onClick={() => setShowVehiclePicker(true)}
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
          ) : (
            onOpenAddVehicle && (
              <button
                type="button"
                onClick={onOpenAddVehicle}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0B7F72',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '10px 4px',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                + سيارة
              </button>
            )
          )}
        </section>

        {/* Category Filter Chips */}
        <div
          role="tablist"
          aria-label="أنواع خدمات العناية"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          {categoryFilters.map((cat) => {
            const isSelected = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveCategoryFilter(cat.id)}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '999px',
                  border: `1px solid ${isSelected ? '#0E1B24' : '#D5DEE0'}`,
                  background: isSelected ? '#0E1B24' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#34474F',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif",
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Services List Cards */}
        {loadingServices ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#5B6B73' }}>
            جاري تحميل الخدمات...
          </div>
        ) : relevantServices.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '30px 16px',
              textAlign: 'center',
              color: '#5B6B73'
            }}
          >
            لا توجد خدمات مطابقة لهذا التصنيف حالياً
          </div>
        ) : (
          relevantServices.map((srv) => {
            const isPicked = pickedServiceIds.includes(srv.id);
            const includes = getIncludesList(srv);
            const tileBg = srv.tile_bg || '#E3F2EF';
            const tileFg = srv.tile_fg || '#0B7F72';
            const priceText = srv.price > 0 ? `${srv.price} ج.م` : 'حسب التفاصيل';
            const durationText = srv.duration_minutes ? `المدة: ${srv.duration_minutes} دقيقة` : 'المدة: 45 دقيقة';

            return (
              <article
                key={srv.id}
                style={{
                  background: '#FFFFFF',
                  border: `2px solid ${isPicked ? '#0B7F72' : '#FFFFFF'}`,
                  borderRadius: '22px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isPicked ? '0 4px 16px rgba(11,127,114,0.15)' : '0 2px 10px rgba(12,37,48,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header Banner Tile */}
                <div
                  style={{
                    height: '112px',
                    background: tileBg,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: tileFg
                  }}
                >
                  {renderIcon(srv.icon_type)}

                  {/* Category badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.92)',
                      color: '#34474F',
                      fontSize: '12px',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    {srv.group_name || 'خدمة'}
                  </span>

                  {/* Popular badge */}
                  {srv.popular ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '2px 10px',
                        borderRadius: '999px',
                        background: '#F59E0B',
                        color: '#3B2300',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      الأكثر طلباً
                    </span>
                  ) : null}
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0E1B24' }}>
                      {srv.name}
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#5B6B73' }}>
                      {srv.description}
                    </p>
                  </div>

                  {/* Features List */}
                  {includes.length > 0 && (
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}
                    >
                      {includes.map((inc, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            background: '#F5F8F8',
                            fontSize: '12px',
                            color: '#34474F'
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0B7F72"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                          </svg>
                          {inc}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Price & Action Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid #EEF2F3'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#0E1B24' }}>
                        {priceText}
                      </span>
                      <span style={{ fontSize: '12px', color: '#5B6B73' }}>
                        {durationText}
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-pressed={isPicked}
                      aria-label={`${isPicked ? 'إزالة ' : 'إضافة '} ${srv.name}`}
                      onClick={() => handleTogglePick(srv.id)}
                      style={{
                        height: '44px',
                        padding: '0 18px',
                        borderRadius: '12px',
                        border: isPicked ? '1px solid #0B7F72' : 'none',
                        background: isPicked ? '#E3F2EF' : '#0B7F72',
                        color: isPicked ? '#0B5F56' : '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: "'Cairo', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isPicked && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                        </svg>
                      )}
                      {isPicked ? 'مضافة' : 'أضف'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* Floating Bottom Bar (Visible when >= 1 service picked and sheet closed) */}
      {n > 0 && !isSheetOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '76px',
            left: 0,
            right: 0,
            maxWidth: '430px',
            margin: '0 auto',
            padding: '12px 16px 14px',
            background: '#FFFFFF',
            borderTop: '1px solid #E2E9EA',
            boxShadow: '0 -6px 18px rgba(12,37,48,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 40
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
            <span style={{ fontSize: '12px', color: '#5B6B73', whiteSpace: 'nowrap' }}>
              {countText}
            </span>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0E1B24' }}>
              {totalText}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSheetOpen(true);
              setIsDone(false);
            }}
            style={{
              flex: 1,
              height: '52px',
              borderRadius: '16px',
              border: 'none',
              background: '#0B7F72',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif",
              boxShadow: '0 4px 12px rgba(11,127,114,0.25)'
            }}
          >
            اختر الموعد
          </button>
        </div>
      )}

      {/* Booking Bottom Sheet Modal */}
      {isSheetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12,37,48,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            zIndex: 60
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSheetOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cr-sheet"
            style={{
              maxWidth: '430px',
              width: '100%',
              margin: '0 auto',
              background: '#FFFFFF',
              borderRadius: '26px 26px 0 0',
              padding: '12px 18px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            {/* Drag handle */}
            <span
              style={{
                alignSelf: 'center',
                width: '44px',
                height: '5px',
                borderRadius: '999px',
                background: '#D5DEE0'
              }}
            ></span>

            {!isDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                  <h2 id="cr-sheet" style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#0E1B24' }}>
                    حدد الموعد
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsSheetOpen(false)}
                    aria-label="إغلاق"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#F3F6F6',
                      color: '#34474F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18"></path>
                    </svg>
                  </button>
                </div>

                {/* Selected Services Summary */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px',
                    borderRadius: '14px',
                    background: '#F5F8F8'
                  }}
                >
                  {chosenServices.map((srv) => (
                    <div
                      key={srv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        color: '#34474F'
                      }}
                    >
                      <span>{srv.name}</span>
                      <span style={{ fontWeight: 600, color: '#0E1B24' }}>
                        {srv.price > 0 ? `${srv.price} ج.م` : 'حسب التفاصيل'}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: '4px',
                      paddingTop: '6px',
                      borderTop: '1px solid #E2E9EA',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0B7F72'
                    }}
                  >
                    <span>الإجمالي التقديري</span>
                    <span>{totalText}</span>
                  </div>
                </div>

                {/* If Oil service selected: oil type selection */}
                {hasOilService && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span id="cr-oil" style={{ fontSize: '14px', fontWeight: 700, color: '#0E1B24' }}>
                      نوع الزيت
                    </span>
                    <div
                      role="radiogroup"
                      aria-labelledby="cr-oil"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}
                    >
                      {oilOptions.map((o) => {
                        const isSel = selectedOilType === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={isSel}
                            onClick={() => setSelectedOilType(o.id)}
                            style={{
                              height: '44px',
                              borderRadius: '12px',
                              border: `2px solid ${isSel ? '#0B7F72' : '#E2E9EA'}`,
                              background: isSel ? '#E3F2EF' : '#FFFFFF',
                              color: isSel ? '#0B5F56' : '#34474F',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '0 2px',
                              fontFamily: "'Cairo', sans-serif",
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Day Selection Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span id="cr-date" style={{ fontSize: '14px', fontWeight: 700, color: '#0E1B24' }}>
                    اليوم
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="cr-date"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: '6px'
                    }}
                  >
                    {dateOptions.map((d, idx) => {
                      const isSel = selectedDateIndex === idx;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          role="radio"
                          aria-checked={isSel}
                          aria-label={d.full}
                          onClick={() => setSelectedDateIndex(idx)}
                          style={{
                            height: '56px',
                            borderRadius: '12px',
                            border: `2px solid ${isSel ? '#0B7F72' : '#E2E9EA'}`,
                            background: isSel ? '#E3F2EF' : '#FFFFFF',
                            color: isSel ? '#0B5F56' : '#34474F',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1.25,
                            fontFamily: "'Cairo', sans-serif",
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '11px' }}>{d.top}</span>
                          <span style={{ fontSize: '15px', fontWeight: 700 }}>{d.num}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Picker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="cr-time" style={{ fontSize: '14px', fontWeight: 700, color: '#0E1B24' }}>
                    الوقت
                  </label>
                  <input
                    id="cr-time"
                    type="time"
                    dir="ltr"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{
                      height: '50px',
                      boxSizing: 'border-box',
                      border: `1px solid ${selectedTime ? '#0B7F72' : '#D5DEE0'}`,
                      borderRadius: '12px',
                      padding: '0 12px',
                      fontSize: '17px',
                      color: '#0E1B24',
                      background: '#FFFFFF',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  />
                </div>

                {/* Confirm CTA */}
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={!selectedTime || isBookingSubmitting}
                  style={{
                    height: '54px',
                    borderRadius: '16px',
                    border: 'none',
                    background: selectedTime && !isBookingSubmitting ? '#0B7F72' : '#E6ECED',
                    color: selectedTime && !isBookingSubmitting ? '#FFFFFF' : '#5B6B73',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: selectedTime && !isBookingSubmitting ? 'pointer' : 'not-allowed',
                    fontFamily: "'Cairo', sans-serif",
                    boxShadow: selectedTime ? '0 4px 14px rgba(11,127,114,0.3)' : 'none'
                  }}
                >
                  {isBookingSubmitting
                    ? 'جاري تأكيد الحجز...'
                    : selectedTime
                    ? `تأكيد الحجز · ${totalText}`
                    : 'اختر الوقت'}
                </button>
              </div>
            ) : (
              /* Success / Done State */
              <div
                aria-live="polite"
                style={{
                  padding: '16px 0 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '10px'
                }}
              >
                <span
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#E3F5EE',
                    color: '#0B6B4F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '4px'
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                  </svg>
                </span>

                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0E1B24' }}>
                  تم الحجز بنجاح
                </h2>

                <span style={{ fontSize: '14px', color: '#34474F', lineHeight: 1.5, maxWidth: '300px' }}>
                  {bookingConfirmationLine}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsSheetOpen(false);
                    onSelectTab('profile');
                  }}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    height: '50px',
                    borderRadius: '14px',
                    background: '#0B7F72',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  تابع من حسابي وطلباتي
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSheetOpen(false);
                    setIsDone(false);
                    setPickedServiceIds([]);
                  }}
                  style={{
                    height: '44px',
                    border: 'none',
                    background: 'transparent',
                    color: '#34474F',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  احجز خدمة تانية
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Switcher Modal */}
      {showVehiclePicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12,37,48,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 70
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVehiclePicker(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>اختر السيارة للخدمة</h3>
              <button
                type="button"
                onClick={() => setShowVehiclePicker(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#F3F6F6',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {vehicles.map((v) => {
                const isSelected = selectedVehicleId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId(v.id);
                      setShowVehiclePicker(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: `1.5px solid ${isSelected ? '#0B7F72' : '#EEF2F3'}`,
                      background: isSelected ? '#E3F2EF' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'right',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0E1B24' }}>
                        {v.brand} {v.model} ({v.vehicle_type})
                      </div>
                      <div style={{ fontSize: '12px', color: '#5B6B73' }}>
                        لوحة: {v.plate_number} · لون {v.color}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#0B7F72', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="التنقل الرئيسي"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: '430px',
          margin: '0 auto',
          height: '76px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E9EA',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          alignItems: 'center',
          paddingBottom: '6px',
          zIndex: 50
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
            <path d="M12 3l9 5-9 5-9-5z"></path>
            <path d="M3 13l9 5 9-5"></path>
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
