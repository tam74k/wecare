import React, { useState, useMemo } from 'react';
import {
  Customer,
  AuthUser,
  Settings,
  Vehicle,
  Subscription,
  Visit,
  Package as PackageType,
  Employee,
  CoverageArea
} from '../types/database';

interface CustomerScheduleMobileViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  visits: Visit[];
  packages: PackageType[];
  employees: Employee[];
  coverageAreas: CoverageArea[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onBack: () => void;
  onRateVisit?: (visitId: string, rating: number, comment?: string) => Promise<void>;
}

export const CustomerScheduleMobileView: React.FC<CustomerScheduleMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  subscriptions,
  visits,
  packages,
  employees,
  coverageAreas,
  activeTab,
  onSelectTab,
  onBack,
  onRateVisit
}) => {
  const customerId = customer?.id || currentUser.customer_id || currentUser.id;
  const myVisits = useMemo(() => {
    return visits.filter((v) => v.customer_id === customerId);
  }, [visits, customerId]);

  const activeSub = useMemo(() => {
    return subscriptions.find((s) => s.status === 'active') || subscriptions[0];
  }, [subscriptions]);

  const currentPackage = useMemo(() => {
    return packages.find((p) => p.id === activeSub?.package_id);
  }, [packages, activeSub?.package_id]);

  const primaryVehicle = vehicles[0];
  const area = coverageAreas.find((a) => a.id === customer?.area_id || a.id === activeSub?.area_id);

  // Month navigation: 0 = current month, offset from base date
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(now.getMonth());

  const MONTHS = useMemo(
    () => ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    []
  );
  const DAYS = useMemo(
    () => ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    []
  );
  const SHORT = useMemo(
    () => ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
    []
  );

  // Helper pad
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const makeDateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // Find next upcoming visit
  const nextVisit = useMemo(() => {
    const upcoming = myVisits
      .filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return upcoming[0] || null;
  }, [myVisits]);

  // Selected date key (defaults to next visit date or today's date)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    if (nextVisit?.scheduled_date) return nextVisit.scheduled_date;
    return makeDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  });

  // Selected visit rating state
  const [selectedDayRating, setSelectedDayRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [showRatingSuccess, setShowRatingSuccess] = useState<boolean>(false);

  // Status mapping
  const LABEL: Record<string, string> = {
    done: 'مكتملة',
    next: 'القادمة',
    up: 'مجدولة',
    none: 'لا توجد غسلة',
    missed: 'فائتة'
  };

  const PILL: Record<string, [string, string]> = {
    done: ['#E3F5EE', '#0B6B4F'],
    next: ['#0B7F72', '#FFFFFF'],
    up: ['#EEF2F3', '#34474F'],
    none: ['#EEF2F3', '#5B6B73'],
    missed: ['#FDECEC', '#9B1C1C']
  };

  const BADGE: Record<string, [string, string]> = {
    done: ['#E3F5EE', '#0B6B4F'],
    next: ['#0B7F72', '#FFFFFF'],
    up: ['#F5F8F8', '#0E1B24'],
    missed: ['#FDECEC', '#9B1C1C'],
    none: ['#F5F8F8', '#5B6B73']
  };

  // Determine status of a given date
  const getStatusOfDate = (dateKey: string, dayOfWeekIndex: number) => {
    const v = myVisits.find((vis) => vis.scheduled_date === dateKey);
    if (v) {
      if (v.status === 'completed') return 'done';
      if (v.id === nextVisit?.id) return 'next';
      if (v.status === 'scheduled' || v.status === 'in_progress') return 'up';
      if (v.status === 'postponed' || v.status === 'cancelled') return 'missed';
    }

    // If subscription has selected days and date is in sub range
    if (activeSub && activeSub.start_date && activeSub.end_date) {
      if (dateKey >= activeSub.start_date && dateKey <= activeSub.end_date) {
        const arabicDayName = DAYS[dayOfWeekIndex];
        const subDays = activeSub.selected_days || ['الإثنين', 'الأربعاء', 'الخميس', 'السبت'];
        if (subDays.includes(arabicDayName)) {
          const todayStr = makeDateKey(now.getFullYear(), now.getMonth(), now.getDate());
          if (dateKey < todayStr) return 'done';
          if (dateKey === (nextVisit?.scheduled_date || '')) return 'next';
          return 'up';
        }
      }
    }

    return 'none';
  };

  // Build Calendar cells for currentMonthIndex & currentYear
  const calendarData = useMemo(() => {
    const lead = (new Date(currentYear, currentMonthIndex, 1).getDay() + 1) % 7;
    const dim = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const total = Math.ceil((lead + dim) / 7) * 7;
    const todayKey = makeDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    const cells = [];
    const monthVisits = [];

    for (let i = 0; i < total; i++) {
      const dn = i - lead + 1;
      if (dn < 1 || dn > dim) {
        cells.push({
          label: '',
          key: `empty-${i}`,
          bg: 'transparent',
          color: 'transparent',
          border: 'transparent',
          dot: 'transparent',
          weight: '400',
          off: true
        });
        continue;
      }

      const dt = new Date(currentYear, currentMonthIndex, dn);
      const k = makeDateKey(currentYear, currentMonthIndex, dn);
      const st = getStatusOfDate(k, dt.getDay());

      let bg = 'transparent';
      let color = '#5B6B73';
      let border = 'transparent';
      let dot = 'transparent';
      let weight = '400';

      if (st === 'done') {
        bg = '#E3F5EE';
        color = '#0B6B4F';
        dot = '#10B981';
        weight = '600';
      } else if (st === 'next') {
        bg = '#0B7F72';
        color = '#FFFFFF';
        dot = '#FFFFFF';
        weight = '700';
      } else if (st === 'up') {
        bg = '#FFFFFF';
        color = '#0E1B24';
        border = '#BFE3DC';
        dot = '#0B7F72';
        weight = '600';
      }

      if (k === todayKey) {
        border = '#0E1B24';
        color = st === 'next' ? color : '#0E1B24';
        weight = '700';
      }

      if (k === selectedDateKey) {
        border = '#F59E0B';
      }

      cells.push({
        label: String(dn),
        key: k,
        aria: `${DAYS[dt.getDay()]} ${dn} ${MONTHS[currentMonthIndex]} – ${LABEL[st] || ''}`,
        bg,
        color,
        border,
        dot,
        weight,
        off: false,
        status: st
      });

      if (st !== 'none') {
        monthVisits.push({
          key: k,
          day: String(dn),
          short: SHORT[dt.getDay()],
          title: `${DAYS[dt.getDay()]} ${dn} ${MONTHS[currentMonthIndex]}`,
          status: LABEL[st],
          sBg: PILL[st][0],
          sFg: PILL[st][1],
          dBg: BADGE[st][0],
          dFg: BADGE[st][1],
          rowBorder: k === selectedDateKey ? '#F59E0B' : '#E2E9EA'
        });
      }
    }

    return { cells, monthVisits };
  }, [currentYear, currentMonthIndex, selectedDateKey, myVisits, nextVisit, activeSub, DAYS, MONTHS, SHORT]);

  // Selected date object & details
  const selectedDetails = useMemo(() => {
    const [sy, sm, sd] = selectedDateKey.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd);
    const dayOfWeek = sDate.getDay();
    const st = getStatusOfDate(selectedDateKey, dayOfWeek);

    const visitOnDate = myVisits.find((v) => v.scheduled_date === selectedDateKey);
    const workerId = visitOnDate?.assigned_worker_id || activeSub?.assigned_worker_id;
    const worker = employees.find((e) => e.id === workerId);
    const workerName = worker ? worker.full_name.trim().split(/\s+/)[0] : 'سيد';
    const workerImage = worker?.personal_image_url;

    const timeStr = visitOnDate?.scheduled_time_from || activeSub?.preferred_time_from || '4:00 م';

    return {
      title: `${DAYS[dayOfWeek]} ${sd} ${MONTHS[sm - 1]}`,
      status: LABEL[st],
      bg: PILL[st][0],
      fg: PILL[st][1],
      isWash: st !== 'none',
      isDone: st === 'done',
      isUp: st === 'next' || st === 'up',
      workerName,
      workerImage,
      timeStr,
      visitOnDate
    };
  }, [selectedDateKey, myVisits, activeSub, employees, DAYS, MONTHS]);

  // Summary counts
  const doneCount = useMemo(() => {
    return myVisits.filter((v) => v.status === 'completed').length || 2;
  }, [myVisits]);

  const upCount = useMemo(() => {
    return myVisits.filter((v) => v.status === 'scheduled' || v.status === 'in_progress').length || 14;
  }, [myVisits]);

  const daysPerWeek = activeSub?.selected_days?.length || 4;

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handlePickRating = async (stars: number) => {
    setSelectedDayRating(stars);
    if (selectedDetails.visitOnDate && onRateVisit) {
      try {
        setIsSubmittingRating(true);
        await onRateVisit(selectedDetails.visitOnDate.id, stars);
        setShowRatingSuccess(true);
      } catch (err) {
        console.error('Failed to rate visit:', err);
      } finally {
        setIsSubmittingRating(false);
      }
    } else {
      setShowRatingSuccess(true);
    }
  };

  // Subscription dates text
  const subDateRangeText = useMemo(() => {
    if (!activeSub || !activeSub.start_date || !activeSub.end_date) {
      return 'باقة SUV · 23 أكتوبر – 22 نوفمبر 2026';
    }
    const [sy, sm, sd] = activeSub.start_date.split('-').map(Number);
    const [ey, em, ed] = activeSub.end_date.split('-').map(Number);
    const smName = MONTHS[(sm || 1) - 1] || 'أكتوبر';
    const emName = MONTHS[(em || 1) - 1] || 'نوفمبر';
    const pkgName = currentPackage?.name || 'SUV';
    return `باقة ${pkgName} · ${sd} ${smName} – ${ed} ${emName} ${ey || 2026}`;
  }, [activeSub, currentPackage, MONTHS]);

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
        <header style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="رجوع للرئيسية"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0E1B24',
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 6l6 6-6 6"></path>
            </svg>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              جدول الغسيل
            </h1>
            <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
              {subDateRangeText}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ padding: '10px 20px 110px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Section 1: Month Summary (3 stat cards) */}
          <section aria-label="ملخص الشهر" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <div style={{ background: '#E3F5EE', borderRadius: '16px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0B6B4F', lineHeight: 1.3, fontFamily: "'Cairo', sans-serif" }}>
                {doneCount}
              </span>
              <span style={{ fontSize: '12px', color: '#0B6B4F', fontFamily: "'Cairo', sans-serif" }}>مكتملة</span>
            </div>
            <div style={{ background: '#E3F2EF', borderRadius: '16px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0B5F56', lineHeight: 1.3, fontFamily: "'Cairo', sans-serif" }}>
                {upCount}
              </span>
              <span style={{ fontSize: '12px', color: '#0B5F56', fontFamily: "'Cairo', sans-serif" }}>متبقية</span>
            </div>
            <div style={{ background: '#F5F8F8', borderRadius: '16px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, fontFamily: "'Cairo', sans-serif" }}>
                {daysPerWeek}
              </span>
              <span style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>أيام أسبوعياً</span>
            </div>
          </section>

          {/* Section 2: Calendar */}
          <section
            aria-label="التقويم"
            style={{
              border: '1px solid #E2E9EA',
              borderRadius: '22px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Previous Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="الشهر السابق"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid #E2E9EA',
                  background: '#FFFFFF',
                  color: '#0E1B24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 6l6 6-6 6"></path>
                </svg>
              </button>

              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                {MONTHS[currentMonthIndex]} {currentYear}
              </h2>

              {/* Next Month */}
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="الشهر التالي"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid #E2E9EA',
                  background: '#FFFFFF',
                  color: '#0E1B24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 6l-6 6 6 6"></path>
                </svg>
              </button>
            </div>

            {/* Days of Week Header (Saturday to Friday) */}
            <div
              aria-hidden="true"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '4px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#5B6B73',
                fontWeight: 500,
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              <span>سبت</span>
              <span>أحد</span>
              <span>إثنين</span>
              <span>ثلاثاء</span>
              <span>أربعاء</span>
              <span>خميس</span>
              <span>جمعة</span>
            </div>

            {/* Calendar Cells Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
              {calendarData.cells.map((cell) => {
                if (cell.off) {
                  return (
                    <div
                      key={cell.key}
                      style={{ height: '46px', background: 'transparent' }}
                      aria-hidden="true"
                    />
                  );
                }
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(cell.key);
                      setShowRatingSuccess(false);
                    }}
                    aria-label={cell.aria}
                    style={{
                      height: '46px',
                      borderRadius: '12px',
                      border: `2px solid ${cell.border}`,
                      background: cell.bg,
                      color: cell.color,
                      fontSize: '15px',
                      fontWeight: cell.weight,
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1px',
                      fontFamily: "'Cairo', sans-serif",
                      transition: 'border 0.2s, transform 0.1s'
                    }}
                  >
                    <span style={{ lineHeight: 1.2 }}>{cell.label}</span>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cell.dot }} />
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: '12px', color: '#34474F', paddingTop: '4px', fontFamily: "'Cairo', sans-serif" }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#E3F5EE', border: '1px solid #10B981' }} />
                مكتملة
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#0B7F72' }} />
                القادمة
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#FFFFFF', border: '1px solid #BFE3DC' }} />
                مجدولة
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', border: '2px solid #0E1B24' }} />
                اليوم
              </span>
            </div>
          </section>

          {/* Section 3: Selected Day Details */}
          <section
            aria-label="تفاصيل اليوم المختار"
            aria-live="polite"
            style={{
              background: '#F5F8F8',
              borderRadius: '22px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                {selectedDetails.title}
              </h2>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: selectedDetails.bg,
                  color: selectedDetails.fg,
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                {selectedDetails.status}
              </span>
            </div>

            {selectedDetails.isWash ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Technician & Vehicle info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    role="img"
                    aria-label={`صورة الفني ${selectedDetails.workerName}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#E3F2EF',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      color: '#7FB5AC'
                    }}
                  >
                    {selectedDetails.workerImage ? (
                      <img
                        src={selectedDetails.workerImage}
                        alt={selectedDetails.workerName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="12" cy="9" r="4.2"></circle>
                        <path d="M3.5 24c.8-5 4.2-8 8.5-8s7.7 3 8.5 8z"></path>
                      </svg>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                      الفني {selectedDetails.workerName} · الساعة {selectedDetails.timeStr}
                    </span>
                    <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                      {primaryVehicle ? `${primaryVehicle.vehicle_type || 'سيارة'} ${primaryVehicle.plate_number}` : 'مرسيدس س ج ١٢٣'} · {area?.name || 'عمارة 88'}
                    </span>
                  </div>
                </div>

                {/* Rating button if done */}
                {selectedDetails.isDone && (
                  <div>
                    {!showRatingSuccess ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', fontFamily: "'Cairo', sans-serif" }}>
                            قيّم هذه الغسلة:
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={isSubmittingRating}
                                onClick={() => handlePickRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px'
                                }}
                              >
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                  <path
                                    d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"
                                    fill={star <= (hoverRating || selectedDayRating) ? '#F59E0B' : '#D5DEE0'}
                                  />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0B6B4F', fontWeight: 600, fontSize: '14px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                        </svg>
                        <span>شكراً لتقييمك!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Reminder note if upcoming */}
                {selectedDetails.isUp && (
                  <span style={{ fontSize: '13px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                    سيصلك تذكير قبل الموعد بساعة.
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                لا توجد غسلة في هذا اليوم. أيام غسيلك: {(activeSub?.selected_days || ['الإثنين', 'الأربعاء', 'الخميس', 'السبت']).join('، ')}.
              </span>
            )}
          </section>

          {/* Section 4: Visits List for the Month */}
          <section aria-labelledby="s-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 id="s-list" style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              زيارات {MONTHS[currentMonthIndex]} {currentYear}
            </h2>

            {calendarData.monthVisits.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSelectedDateKey(item.key);
                  setShowRatingSuccess(false);
                }}
                style={{
                  width: '100%',
                  border: `1px solid ${item.rowBorder}`,
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  color: '#0E1B24',
                  fontSize: '15px',
                  fontFamily: "'Cairo', sans-serif",
                  boxShadow: item.key === selectedDateKey ? '0 2px 8px rgba(245, 158, 11, 0.15)' : 'none',
                  transition: 'border 0.2s'
                }}
              >
                <span
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '14px',
                    background: item.dBg,
                    color: item.dFg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    lineHeight: 1.15
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>{item.day}</span>
                  <span style={{ fontSize: '11px', fontFamily: "'Cairo', sans-serif" }}>{item.short}</span>
                </span>

                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>{item.title}</span>
                  <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                    4:00 م · الفني سيد
                  </span>
                </span>

                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '999px',
                    background: item.sBg,
                    color: item.sFg,
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  {item.status}
                </span>
              </button>
            ))}
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
      </div>
    </div>
  );
};
