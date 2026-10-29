import React, { useState, useEffect } from 'react';
import { Customer, AuthUser, Vehicle, Subscription, Package as PackageType, CoverageArea, Settings } from '../types/database';
import * as api from '../services/api';

interface CustomerAccountMobileViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  packages: PackageType[];
  coverageAreas: CoverageArea[];
  onLogout: () => void;
  onOpenAddVehicle: () => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle | null>;
  onDeleteVehicle?: (id: string) => Promise<void>;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onRefreshData?: () => void;
}

export const CustomerAccountMobileView: React.FC<CustomerAccountMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  subscriptions,
  packages,
  coverageAreas,
  onLogout,
  onOpenAddVehicle,
  onEditVehicle,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onSelectTab,
  onRefreshData
}) => {
  // Segmented tab inside Account: 'subs' | 'cars' | 'pay'
  const [accountSubTab, setAccountSubTab] = useState<'subs' | 'cars' | 'pay'>('subs');

  // Edit Profile Modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState(customer?.full_name || customer?.name || currentUser.full_name || '');
  const [editBuilding, setEditBuilding] = useState(customer?.building_number || '');
  const [editBlock, setEditBlock] = useState(customer?.block_number || customer?.block || 'A');
  const [editAddress, setEditAddress] = useState(customer?.detailed_address || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Edit Vehicle Modal state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editCarType, setEditCarType] = useState('');
  const [editCarColor, setEditCarColor] = useState('');
  const [editCarPlate, setEditCarPlate] = useState('');
  const [isSavingCar, setIsSavingCar] = useState(false);

  // Add Car Modal state
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [newCarType, setNewCarType] = useState('سيدان');
  const [newCarColor, setNewCarColor] = useState('أبيض');
  const [newCarPlate, setNewCarPlate] = useState('');
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [addCarError, setAddCarError] = useState<string | null>(null);

  // Available Vehicle Colors loaded from database
  const [dbColors, setDbColors] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    api.getVehicleColors()
      .then((cols) => {
        if (active && cols) {
          setDbColors(cols.map((c) => c.name));
        }
      })
      .catch((err) => console.warn('Could not load vehicle colors:', err));
    return () => { active = false; };
  }, []);

  const customerId = customer?.id || currentUser.customer_id || currentUser.id;
  const fullName = customer?.full_name || customer?.name || currentUser.full_name || 'مسعد محمود';
  const initialLetter = (fullName.trim().charAt(0) || 'م').toUpperCase();
  const phone = customer?.phone || currentUser.phone || '01xxxxxxxxx';
  const area = coverageAreas.find((a) => a.id === customer?.area_id);
  const areaName = area?.name || 'كمبوند زايد هايتس';
  const building = customer?.building_number || '88';
  const block = customer?.block_number || customer?.block || 'C';

  // Subscriptions belonging to customer
  const activeSubs = subscriptions.filter((s) => s.customer_id === customerId && s.status === 'active');
  const pastSubs = subscriptions.filter((s) => s.customer_id === customerId && s.status !== 'active');

  // Next renewal date formatting
  const getNextRenewalDate = (sub: Subscription) => {
    if (sub.end_date) {
      try {
        const d = new Date(sub.end_date);
        return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch {
        return sub.end_date;
      }
    }
    return '22 نوفمبر 2026';
  };

  // Total monthly price
  const totalMonthlyPrice = activeSubs.reduce((sum, s) => sum + (s.total_price || 350), 0) || 350;

  // Handle Edit Profile submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileMsg(null);
      await api.updateCustomer(customerId, {
        full_name: editFullName.trim(),
        name: editFullName.trim(),
        building_number: editBuilding.trim(),
        block_number: editBlock.trim(),
        block: editBlock.trim(),
        detailed_address: editAddress.trim()
      });
      setProfileMsg('تم تحديث البيانات بنجاح!');
      if (onRefreshData) onRefreshData();
      setTimeout(() => {
        setShowEditProfileModal(false);
        setProfileMsg(null);
      }, 1200);
    } catch (err: any) {
      setProfileMsg(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Edit Vehicle
  const handleSaveCarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      setIsSavingCar(true);
      if (onUpdateVehicle) {
        await onUpdateVehicle(editingVehicle.id, {
          vehicle_type: editCarType.trim(),
          color: editCarColor.trim(),
          plate_number: editCarPlate.trim()
        });
      }
      setEditingVehicle(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تعديل السيارة');
    } finally {
      setIsSavingCar(false);
    }
  };

  // Handle Add Vehicle
  const handleAddCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCarError(null);
    if (!newCarPlate.trim()) {
      setAddCarError('يرجى إدخال رقم اللوحة');
      return;
    }
    try {
      setIsAddingCar(true);
      if (onCreateVehicle) {
        await onCreateVehicle({
          customer_id: customerId,
          vehicle_type: newCarType.trim(),
          color: newCarColor.trim(),
          plate_number: newCarPlate.trim()
        });
      }
      setShowAddCarModal(false);
      setNewCarPlate('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setAddCarError(err.message || 'حدث خطأ أثناء حفظ السيارة');
    } finally {
      setIsAddingCar(false);
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
        <header style={{ padding: '18px 20px 6px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
            حسابي
          </h1>
        </header>

        {/* Main Content */}
        <main style={{ padding: '10px 20px 110px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Customer Profile Card */}
          <section
            aria-label="بياناتي"
            style={{
              background: '#F5F8F8',
              borderRadius: '22px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <span
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#0B7F72',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              {initialLetter}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.45 }}>
              <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                {fullName}
              </span>
              <span dir="ltr" style={{ fontSize: '14px', color: '#34474F', textAlign: 'right', fontFamily: "'Cairo', sans-serif" }}>
                {phone}
              </span>
              <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                {areaName} · عمارة {building} ({block})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditFullName(fullName);
                setEditBuilding(building);
                setEditBlock(block);
                setEditAddress(customer?.detailed_address || '');
                setShowEditProfileModal(true);
              }}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                padding: '10px 4px',
                color: '#0B7F72',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              تعديل
            </button>
          </section>

          {/* Segmented Tab Control */}
          <div
            role="tablist"
            aria-label="أقسام الحساب"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '4px',
              background: '#EEF2F3',
              borderRadius: '14px',
              padding: '4px'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={accountSubTab === 'subs'}
              onClick={() => setAccountSubTab('subs')}
              style={{
                height: '44px',
                borderRadius: '11px',
                border: 'none',
                background: accountSubTab === 'subs' ? '#FFFFFF' : 'transparent',
                color: accountSubTab === 'subs' ? '#0E1B24' : '#5B6B73',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: accountSubTab === 'subs' ? '0 1px 3px rgba(12,37,48,0.12)' : 'none',
                fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.2s'
              }}
            >
              اشتراكاتي
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={accountSubTab === 'cars'}
              onClick={() => onSelectTab('vehicles')}
              style={{
                height: '44px',
                borderRadius: '11px',
                border: 'none',
                background: accountSubTab === 'cars' ? '#FFFFFF' : 'transparent',
                color: accountSubTab === 'cars' ? '#0E1B24' : '#5B6B73',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: accountSubTab === 'cars' ? '0 1px 3px rgba(12,37,48,0.12)' : 'none',
                fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.2s'
              }}
            >
              سياراتي
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={accountSubTab === 'pay'}
              onClick={() => setAccountSubTab('pay')}
              style={{
                height: '44px',
                borderRadius: '11px',
                border: 'none',
                background: accountSubTab === 'pay' ? '#FFFFFF' : 'transparent',
                color: accountSubTab === 'pay' ? '#0E1B24' : '#5B6B73',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: accountSubTab === 'pay' ? '0 1px 3px rgba(12,37,48,0.12)' : 'none',
                fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.2s'
              }}
            >
              مدفوعاتي
            </button>
          </div>

          {/* TAB 1: اشتراكاتي */}
          {accountSubTab === 'subs' && (
            <section role="tabpanel" aria-label="اشتراكاتي" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeSubs.length === 0 ? (
                <article
                  style={{
                    border: '1px solid #E2E9EA',
                    borderRadius: '20px',
                    padding: '24px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '10px',
                    background: '#FFFFFF'
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0E1B24' }}>
                    لا توجد اشتراكات نشطة حالياً
                  </span>
                  <span style={{ fontSize: '13px', color: '#5B6B73' }}>
                    اختر باقتك الشهرية المفضلة وابدأ العناية بسيارتك
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTab('subscriptions')}
                    style={{
                      height: '44px',
                      padding: '0 20px',
                      borderRadius: '12px',
                      background: '#0B7F72',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '4px',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    تصفح الباقات
                  </button>
                </article>
              ) : (
                activeSubs.map((sub) => {
                  const pkg = packages.find((p) => p.id === sub.package_id);
                  const veh = vehicles.find((v) => v.id === sub.vehicle_id);
                  const pkgName = pkg?.name || 'باقة SUV';
                  const carTitle = veh ? `${veh.vehicle_type || 'مرسيدس'} ${veh.plate_number || ''}` : 'سيارتي';
                  const washDaysCount = sub.selected_days && Array.isArray(sub.selected_days) ? sub.selected_days.length : 4;
                  const price = sub.total_price || 350;
                  const renewalDateStr = getNextRenewalDate(sub);

                  return (
                    <article
                      key={sub.id}
                      style={{
                        border: '1px solid #E2E9EA',
                        borderRadius: '20px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        background: '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                            اشتراك شهري · {pkgName}
                          </h2>
                          <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                            {carTitle} · {washDaysCount} أيام أسبوعياً
                          </span>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '2px 10px',
                            borderRadius: '999px',
                            background: '#E3F5EE',
                            color: '#0B6B4F',
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                          نشط
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.2, fontFamily: "'Cairo', sans-serif" }}>
                          {price}
                        </span>
                        <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                          ج.م / شهرياً
                        </span>
                      </div>
                      <span style={{ fontSize: '14px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                        يتجدد تلقائياً يوم <b>{renewalDateStr}</b>
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onSelectTab('visits')}
                          style={{
                            height: '44px',
                            borderRadius: '12px',
                            border: '1px solid #D5DEE0',
                            background: '#FFFFFF',
                            color: '#34474F',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          جدول الغسيل
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectTab('subscriptions')}
                          style={{
                            height: '44px',
                            borderRadius: '12px',
                            border: '1px solid #D5DEE0',
                            background: '#FFFFFF',
                            color: '#34474F',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          إدارة الاشتراك
                        </button>
                      </div>
                    </article>
                  );
                })
              )}

              {/* Past Subscriptions */}
              <h3 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                اشتراكات سابقة
              </h3>
              {pastSubs.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#5B6B73',
                    padding: '14px',
                    borderRadius: '16px',
                    background: '#F5F8F8',
                    textAlign: 'center',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  لا توجد اشتراكات سابقة
                </p>
              ) : (
                pastSubs.map((sub) => {
                  const pkg = packages.find((p) => p.id === sub.package_id);
                  return (
                    <article
                      key={sub.id}
                      style={{
                        border: '1px solid #E2E9EA',
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{pkg?.name || 'باقة غسيل'}</span>
                        <span style={{ fontSize: '12px', color: '#5B6B73' }}>
                          منتهية {sub.end_date || ''}
                        </span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{sub.total_price || 350} ج.م</span>
                    </article>
                  );
                })
              )}
            </section>
          )}

          {/* TAB 2: سياراتي */}
          {accountSubTab === 'cars' && (
            <section role="tabpanel" aria-label="سياراتي" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vehicles.map((v) => {
                const isCarSubscribed = activeSubs.some((s) => s.vehicle_id === v.id);
                return (
                  <article
                    key={v.id}
                    style={{
                      border: '1px solid #E2E9EA',
                      borderRadius: '20px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: '#FFFFFF'
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: '#E3F2EF',
                        color: '#0B7F72',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <svg
                        width="30"
                        height="30"
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
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                        {v.vehicle_type || 'سيارة'}
                      </span>
                      <span style={{ fontSize: '14px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                        {v.plate_number} · {v.color || 'لون غير محدد'}
                      </span>
                      {isCarSubscribed ? (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0B6B4F', fontFamily: "'Cairo', sans-serif" }}>
                          مشتركة في باقة نشطة
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                          غير مشتركة في باقة
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`تعديل بيانات ${v.vehicle_type || 'السيارة'}`}
                      onClick={() => {
                        if (onEditVehicle) {
                          onEditVehicle(v);
                        } else {
                          setEditingVehicle(v);
                          setEditCarType(v.vehicle_type || '');
                          setEditCarColor(v.color || '');
                          setEditCarPlate(v.plate_number || '');
                        }
                      }}
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        padding: '10px 4px',
                        color: '#0B7F72',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    >
                      تعديل
                    </button>
                  </article>
                );
              })}

              <button
                type="button"
                onClick={onOpenAddVehicle}
                style={{
                  height: '56px',
                  borderRadius: '16px',
                  border: '2px dashed #8FCFC4',
                  background: '#F2FAF8',
                  color: '#0B5F56',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
                إضافة سيارة جديدة
              </button>
            </section>
          )}

          {/* TAB 3: مدفوعاتي */}
          {accountSubTab === 'pay' && (
            <section role="tabpanel" aria-label="مدفوعاتي" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: '#0C2530',
                  color: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                  <span style={{ fontSize: '13px', color: '#C9D8DC', fontFamily: "'Cairo', sans-serif" }}>الدفعة القادمة</span>
                  <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                    {activeSubs[0] ? getNextRenewalDate(activeSubs[0]) : '22 نوفمبر 2026'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#C9D8DC', fontFamily: "'Cairo', sans-serif" }}>تجديد تلقائي للاشتراك</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                  {totalMonthlyPrice}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#C9D8DC', fontFamily: "'Cairo', sans-serif" }}>
                    ج.م
                  </span>
                </span>
              </div>

              <h3 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                السجل
              </h3>

              <article
                style={{
                  border: '1px solid #E2E9EA',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#FFFFFF'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#E3F5EE',
                    color: '#0B6B4F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                    اشتراك شهري · باقة SUV
                  </span>
                  <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                    23 أكتوبر 2026 · مدفوع
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                    {totalMonthlyPrice} ج.م
                  </span>
                  <button
                    type="button"
                    onClick={() => alert(`إيصال سداد اشتراك شهر أكتوبر 2026\nالمبلغ: ${totalMonthlyPrice} ج.م\nالعميل: ${fullName}\nالحالة: مدفوع بالكامل`)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0B7F72',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    الإيصال
                  </button>
                </div>
              </article>
            </section>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            style={{
              marginTop: '8px',
              height: '48px',
              borderRadius: '14px',
              border: '1px solid #F3C4C4',
              background: '#FFFFFF',
              color: '#9B1C1C',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Cairo', sans-serif",
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#FFF5F5')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#FFFFFF')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"></path>
              <path d="M10 8l-4 4 4 4"></path>
              <path d="M6 12h10"></path>
            </svg>
            تسجيل الخروج
          </button>
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
              color: '#5B6B73',
              fontSize: '12px',
              fontWeight: 400,
              cursor: 'pointer',
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
              border: 'none',
              background: 'transparent',
              color: '#5B6B73',
              fontSize: '12px',
              fontWeight: 400,
              cursor: 'pointer',
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
              border: 'none',
              background: 'transparent',
              color: '#5B6B73',
              fontSize: '12px',
              fontWeight: 400,
              cursor: 'pointer',
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
              border: 'none',
              background: 'transparent',
              color: '#5B6B73',
              fontSize: '12px',
              fontWeight: 400,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"></path>
              <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
            </svg>
            المتجر
          </button>

          {/* 5. حسابي (Active) */}
          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            aria-current="page"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              border: 'none',
              background: 'transparent',
              color: '#0B7F72',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
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

        {/* Edit Profile Modal */}
        {showEditProfileModal && (
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
            onClick={() => setShowEditProfileModal(false)}
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
                  تعديل بيانات الحساب
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
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

              {profileMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: profileMsg.includes('نجاح') ? '#E3F5EE' : '#FFF1F2',
                    borderRadius: '12px',
                    color: profileMsg.includes('نجاح') ? '#0B6B4F' : '#E11D48',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '14px'
                  }}
                >
                  {profileMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>الاسم</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
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
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>رقم العمارة</label>
                    <input
                      type="text"
                      value={editBuilding}
                      onChange={(e) => setEditBuilding(e.target.value)}
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
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>المجموعة</label>
                    <input
                      type="text"
                      value={editBlock}
                      onChange={(e) => setEditBlock(e.target.value)}
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
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>العنوان التفصيلي</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
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

                <button
                  type="submit"
                  disabled={isSavingProfile}
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
                  {isSavingProfile ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Vehicle Modal */}
        {editingVehicle && (
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
            onClick={() => setEditingVehicle(null)}
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
                  تعديل بيانات السيارة
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
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

              <form onSubmit={handleSaveCarEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>نوع السيارة</label>
                  <input
                    type="text"
                    value={editCarType}
                    onChange={(e) => setEditCarType(e.target.value)}
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
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>اللون</label>
                    <input
                      type="text"
                      list="customer-car-colors-list"
                      placeholder="اختر أو اكتب اللون..."
                      value={editCarColor}
                      onChange={(e) => setEditCarColor(e.target.value)}
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
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>رقم اللوحة</label>
                    <input
                      type="text"
                      value={editCarPlate}
                      onChange={(e) => setEditCarPlate(e.target.value)}
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
                  disabled={isSavingCar}
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
                  {isSavingCar ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Car Modal */}
        {showAddCarModal && (
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
            onClick={() => setShowAddCarModal(false)}
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
                  onClick={() => setShowAddCarModal(false)}
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

              {addCarError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#FFF1F2',
                    borderRadius: '12px',
                    color: '#E11D48',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '14px'
                  }}
                >
                  {addCarError}
                </div>
              )}

              <form onSubmit={handleAddCarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>نوع السيارة</label>
                  <input
                    type="text"
                    placeholder="مثال: تويوتا كورولا / SUV"
                    value={newCarType}
                    onChange={(e) => setNewCarType(e.target.value)}
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
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>اللون</label>
                    <input
                      type="text"
                      list="customer-car-colors-list"
                      placeholder="اختر أو اكتب اللون..."
                      value={newCarColor}
                      onChange={(e) => setNewCarColor(e.target.value)}
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
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#0E1B24' }}>رقم اللوحة</label>
                    <input
                      type="text"
                      placeholder="س ج ١٢٣"
                      value={newCarPlate}
                      onChange={(e) => setNewCarPlate(e.target.value)}
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
                  disabled={isAddingCar}
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
                  {isAddingCar ? 'جاري الحفظ...' : 'حفظ السيارة'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Datalist for autocomplete vehicle colors */}
        <datalist id="customer-car-colors-list">
          {dbColors.map((colorName) => (
            <option key={colorName} value={colorName} />
          ))}
        </datalist>
      </div>
    </div>
  );
};
