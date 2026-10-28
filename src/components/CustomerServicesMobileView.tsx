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
import { CustomerCareMobileView } from './CustomerCareMobileView';

export interface CustomerServicesMobileViewProps {
  currentUser: AuthUser;
  customer: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onOpenAddVehicle?: () => void;
}

export const CustomerServicesMobileView: React.FC<CustomerServicesMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  activeTab,
  onSelectTab,
  onOpenAddVehicle
}) => {
  // Top category tab: 'car' | 'building'
  const [activeCategory, setActiveCategory] = useState<'car' | 'building'>('car');

  // Currently expanded service ID
  const [openServiceId, setOpenServiceId] = useState<string | null>('srv-cai');

  // Selected Service for Details Screen (matching B-Care.dc.html)
  const [selectedDetailService, setSelectedDetailService] = useState<OnDemandService | null>(null);

  // Services data from DB
  const [services, setServices] = useState<OnDemandService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Customer Bookings
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Form states per service
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({
    'srv-cai': 'to',
    'srv-sph': 'to',
    'srv-oil': 'mobil',
    'srv-rent': 'day',
    'srv-rentd': 'day'
  });
  const [rentalDetails, setRentalDetails] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    return vehicles.length > 0 ? vehicles[0].id : '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // Selected vehicle
  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || (vehicles.length > 0 ? vehicles[0] : null);
  }, [vehicles, selectedVehicleId]);

  // Next 6 dates starting from today
  const upcomingDates = useMemo(() => {
    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const fullDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const list = [];
    const base = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const dayNum = d.getDate();
      const dayOfWeek = d.getDay();
      const monthStr = monthNames[d.getMonth()];
      const isoDate = d.toISOString().split('T')[0];

      list.push({
        top: dayNames[dayOfWeek],
        num: String(dayNum),
        full: `${fullDayNames[dayOfWeek]} ${dayNum} ${monthStr}`,
        iso: isoDate
      });
    }
    return list;
  }, []);

  // Filter services by active tab ('car' vs 'building')
  const currentServices = useMemo(() => {
    return services.filter((s) => s.category === activeCategory && s.is_active);
  }, [services, activeCategory]);

  // Group services by group_name
  const groupedServices = useMemo(() => {
    const groups: Array<{ groupName: string; items: OnDemandService[] }> = [];
    currentServices.forEach((srv) => {
      let g = groups.find((x) => x.groupName === srv.group_name);
      if (!g) {
        g = { groupName: srv.group_name, items: [] };
        groups.push(g);
      }
      g.items.push(srv);
    });
    return groups;
  }, [currentServices]);

  // Check if a service is currently booked by customer
  const getActiveBooking = (serviceId: string): ServiceBooking | null => {
    return (
      bookings.find(
        (b) => b.service_id === serviceId && (b.status === 'pending' || b.status === 'confirmed')
      ) || null
    );
  };

  // Toggle accordion row
  const handleToggleRow = (serviceId: string) => {
    setOpenServiceId((prev) => (prev === serviceId ? null : serviceId));
  };

  // Change option
  const handleOptionChange = (serviceId: string, optionKey: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [serviceId]: optionKey
    }));
  };

  // Book a service
  const handleConfirmBooking = async (service: OnDemandService) => {
    if (!selectedTime) return;

    try {
      setIsSubmitting(true);
      const customerId = customer?.id || currentUser.customer_id || currentUser.id;
      const customerName = customer?.full_name || customer?.name || currentUser.full_name || 'عميل';
      const customerPhone = customer?.phone || currentUser.phone || '';
      const chosenDate = upcomingDates[selectedDayIndex] || upcomingDates[0];
      const opt = selectedOptions[service.id] || '';

      // Derive location address
      let locAddress = customer?.detailed_address || customer?.building_number || 'الكمبوند';
      if (currentVehicle) {
        locAddress = `${currentVehicle.brand || currentVehicle.vehicle_type} (${currentVehicle.plate_number}) · ${locAddress}`;
      }

      const newBooking = await api.createServiceBooking({
        service_id: service.id,
        service_name: service.name,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        vehicle_id: currentVehicle ? currentVehicle.id : undefined,
        location_address: locAddress,
        booking_date: chosenDate.iso,
        booking_time: selectedTime,
        selected_option: opt || undefined,
        notes: rentalDetails.trim() || undefined,
        price: service.price || 0,
        status: 'pending',
        payment_method: 'cash',
        payment_status: 'unpaid'
      });

      setBookings((prev) => [newBooking, ...prev]);
      alert('تم إرسال طلب الحجز بنجاح! سنتواصل معك للتأكيد.');
    } catch (err: any) {
      alert('حدث خطأ أثناء حجز الخدمة: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If a service is selected to view details (B-Care.dc.html)
  if (selectedDetailService) {
    return (
      <CustomerCareMobileView
        currentUser={currentUser}
        customer={customer}
        settings={settings}
        vehicles={vehicles}
        selectedService={selectedDetailService}
        allServices={services}
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
      {/* Header matching B-Services.dc.html */}
      <header style={{ padding: '18px 20px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
          الخدمات
        </h1>
        <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
          اختار الخدمة وحدد اليوم والوقت
        </span>
      </header>

      {/* Main Content */}
      <main style={{ padding: '12px 20px 110px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Top Segmented Tab Switcher matching B-Services.dc.html */}
        <div
          role="tablist"
          aria-label="نوع الخدمة"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '4px',
            background: '#EEF2F3',
            borderRadius: '14px',
            padding: '4px',
            marginBottom: '6px'
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'car'}
            onClick={() => {
              setActiveCategory('car');
              setOpenServiceId(null);
            }}
            style={{
              height: '46px',
              borderRadius: '11px',
              border: 'none',
              background: activeCategory === 'car' ? '#FFFFFF' : 'transparent',
              color: activeCategory === 'car' ? '#0E1B24' : '#5B6B73',
              boxShadow: activeCategory === 'car' ? '0 1px 3px rgba(12,37,48,0.12)' : 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif",
              transition: 'all 0.15s ease'
            }}
          >
            السيارات
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'building'}
            onClick={() => {
              setActiveCategory('building');
              setOpenServiceId(null);
            }}
            style={{
              height: '46px',
              borderRadius: '11px',
              border: 'none',
              background: activeCategory === 'building' ? '#FFFFFF' : 'transparent',
              color: activeCategory === 'building' ? '#0E1B24' : '#5B6B73',
              boxShadow: activeCategory === 'building' ? '0 1px 3px rgba(12,37,48,0.12)' : 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif",
              transition: 'all 0.15s ease'
            }}
          >
            العمارات
          </button>
        </div>

        {/* Loading state */}
        {loadingServices ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#5B6B73', fontSize: '14px' }}>
            جاري تحميل الخدمات...
          </div>
        ) : groupedServices.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            لا توجد خدمات متاحة حالياً في هذا القسم.
          </div>
        ) : (
          groupedServices.map((group) => (
            <div key={group.groupName} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Group Heading */}
              <h2
                style={{
                  margin: '18px 0 2px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#5B6B73',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                {group.groupName}
              </h2>

              {/* Group Items Accordion */}
              {group.items.map((srv) => {
                const isOpen = openServiceId === srv.id;
                const activeBooking = getActiveBooking(srv.id);
                const isBooked = !!activeBooking;

                // Format price label
                let priceText = 'حسب التفاصيل';
                if (srv.price_type === 'fixed' && srv.price > 0) {
                  priceText = `${srv.price} ج.م`;
                } else if (srv.price_type === 'starting_at' && srv.price > 0) {
                  priceText = `يبدأ من ${srv.price} ج.م`;
                }

                // Options list
                let optionsList: Array<[string, string]> = [];
                try {
                  optionsList = JSON.parse(srv.options || '[]');
                } catch {
                  optionsList = [];
                }

                const currentOpt = selectedOptions[srv.id] || (optionsList[0] ? optionsList[0][0] : '');

                // Location text
                const customerBld = customer?.building_number ? `عمارة ${customer.building_number}` : (customer?.detailed_address || 'الكمبوند');
                let whereText = customerBld;
                if (srv.kind === 'car' || srv.kind === 'oil') {
                  whereText = currentVehicle
                    ? `${currentVehicle.brand || currentVehicle.vehicle_type} (${currentVehicle.plate_number}) · تحت ${customerBld}`
                    : `تحت ${customerBld}`;
                } else if (srv.kind === 'airport') {
                  const port = srv.airport_name || 'المطار';
                  whereText = currentOpt === 'to' ? `من ${customerBld} ← ${port}` : `من ${port} ← ${customerBld}`;
                } else if (srv.kind === 'rental') {
                  whereText = `الاستلام من ${customerBld}`;
                }

                const isRental = srv.kind === 'rental';
                const isReady = selectedTime !== '';

                return (
                  <div key={srv.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Collapsible Row Button */}
                    <div
                      style={{
                        width: '100%',
                        minHeight: '64px',
                        borderBottom: '1px solid #EEF2F3',
                        background: isOpen ? '#F2FAF8' : 'transparent',
                        padding: '10px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'right',
                        color: '#0E1B24',
                        fontSize: '15px',
                        borderRadius: isOpen ? '14px 14px 0 0' : '0',
                        fontFamily: "'Cairo', sans-serif",
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDetailService(srv)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          lineHeight: 1.4,
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'right',
                          padding: 0,
                          cursor: 'pointer',
                          fontFamily: "'Cairo', sans-serif"
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{srv.name}</span>
                          <span style={{ fontSize: '11px', background: '#E3F2EF', color: '#0B7F72', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            تفاصيل ↗
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            color: isBooked ? '#0B6B4F' : '#5B6B73',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {isBooked ? `محجوزة · ${activeBooking.booking_date} (${activeBooking.booking_time})` : srv.description}
                        </span>
                      </button>

                      <span style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', color: '#0B7F72' }}>
                        {priceText}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleRow(srv.id)}
                        aria-label="خيارات الحجز السريع"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
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
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        >
                          <path d="M6 9l6 6 6-6"></path>
                        </svg>
                      </button>
                    </div>

                    {/* Expanded Panel matching B-Services.dc.html */}
                    {isOpen && (
                      <div
                        style={{
                          background: '#F2FAF8',
                          borderBottom: '1px solid #DCEDEA',
                          borderRadius: '0 0 14px 14px',
                          padding: '8px 12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        {isBooked ? (
                          /* Booked State */
                          <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                            <span
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#10B981',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                              </svg>
                            </span>
                            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 700, color: '#0B6B4F' }}>
                                {isRental ? 'استلمنا طلبك' : 'تم الحجز بنجاح'}
                              </span>
                              <span style={{ fontSize: '13px', color: '#34474F' }}>
                                {isRental
                                  ? `هنتواصل معاك بالسعر · ${activeBooking.booking_date} (${activeBooking.booking_time})`
                                  : `الموعد: ${activeBooking.booking_date} (${activeBooking.booking_time})`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onSelectTab('profile')}
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#0B7F72',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px 0',
                                fontFamily: "'Cairo', sans-serif"
                              }}
                            >
                              طلباتي
                            </button>
                          </div>
                        ) : (
                          /* Booking Form */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Location with Pin */}
                            <span style={{ fontSize: '13px', color: '#34474F', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0B7F72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"></path>
                                <circle cx="12" cy="9.5" r="2.5"></circle>
                              </svg>
                              <span style={{ flex: 1 }}>{whereText}</span>
                            </span>

                            {/* Option Chips (if any) */}
                            {optionsList.length > 0 && (
                              <div role="radiogroup" aria-label="خيارات الخدمة" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {optionsList.map(([key, label]) => {
                                  const isSel = currentOpt === key;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSel}
                                      onClick={() => handleOptionChange(srv.id, key)}
                                      style={{
                                        height: '38px',
                                        padding: '0 14px',
                                        borderRadius: '999px',
                                        border: `1px solid ${isSel ? '#0B7F72' : '#D5DEE0'}`,
                                        background: isSel ? '#0B7F72' : '#FFFFFF',
                                        color: isSel ? '#FFFFFF' : '#34474F',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: "'Cairo', sans-serif",
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Rental textarea (if rental service) */}
                            {isRental && (
                              <textarea
                                aria-label="تفاصيل الإيجار"
                                rows={2}
                                value={rentalDetails}
                                onChange={(e) => setRentalDetails(e.target.value)}
                                placeholder="الوجهة، عدد الأيام، نوع العربية المطلوب..."
                                style={{
                                  fontSize: '14px',
                                  border: '1px solid #D5DEE0',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  resize: 'vertical',
                                  color: '#0E1B24',
                                  background: '#FFFFFF',
                                  fontFamily: "'Cairo', sans-serif"
                                }}
                              />
                            )}

                            {/* Date Selector Row matching B-Services.dc.html */}
                            <div role="radiogroup" aria-label="اليوم" style={{ display: 'flex', gap: '6px', overflow: 'hidden' }}>
                              {upcomingDates.map((dt, idx) => {
                                const isSel = idx === selectedDayIndex;
                                return (
                                  <button
                                    key={dt.iso}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSel}
                                    aria-label={dt.full}
                                    onClick={() => setSelectedDayIndex(idx)}
                                    style={{
                                      flex: '1 0 0',
                                      minWidth: 0,
                                      height: '52px',
                                      borderRadius: '12px',
                                      border: `1px solid ${isSel ? '#0B7F72' : '#D5DEE0'}`,
                                      background: isSel ? '#E3F2EF' : '#FFFFFF',
                                      color: isSel ? '#0B5F56' : '#34474F',
                                      padding: 0,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      lineHeight: 1.2,
                                      fontFamily: "'Cairo', sans-serif",
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span style={{ fontSize: '11px' }}>{dt.top}</span>
                                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{dt.num}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Time Input & CTA button */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="time"
                                dir="ltr"
                                aria-label="الوقت"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  height: '48px',
                                  boxSizing: 'border-box',
                                  border: `1px solid ${isReady ? '#0B7F72' : '#D5DEE0'}`,
                                  borderRadius: '12px',
                                  padding: '0 10px',
                                  fontSize: '16px',
                                  color: '#0E1B24',
                                  background: '#FFFFFF',
                                  fontFamily: "'Cairo', sans-serif"
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmBooking(srv)}
                                disabled={!isReady || isSubmitting}
                                style={{
                                  flex: 1,
                                  height: '48px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: !isReady ? '#E6ECED' : '#0B7F72',
                                  color: !isReady ? '#5B6B73' : '#FFFFFF',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  cursor: !isReady ? 'not-allowed' : 'pointer',
                                  fontFamily: "'Cairo', sans-serif",
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isSubmitting
                                  ? 'جاري الإرسال...'
                                  : !isReady
                                  ? 'اختر الوقت'
                                  : isRental
                                  ? 'اطلب عرض سعر'
                                  : 'تأكيد الحجز'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedDetailService(srv)}
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: '1px dashed #0B7F72',
                                background: '#FFFFFF',
                                color: '#0B7F72',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontFamily: "'Cairo', sans-serif"
                              }}
                            >
                              <span>فتح صفحة تفاصيل ومزايا ({srv.name})</span>
                              <span>↗</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </main>

      {/* Bottom Navigation matching B-Services.dc.html & other mobile screens */}
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
