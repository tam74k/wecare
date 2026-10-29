import React, { useState, useEffect } from 'react';
import { Customer, AuthUser, Settings, Vehicle, Subscription, Package as PackageType } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import {
  extractVehicleDetails,
  buildSafeVehicleUpdate,
  findColorHex,
  parseEgyptianPlate
} from '../utils/vehicleUtils';

interface CustomerCarsListViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  settings: Settings;
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  packages?: PackageType[];
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onBack: () => void;
  onOpenAddVehicle: () => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle | null>;
  onDeleteVehicle?: (id: string) => Promise<void>;
  onRefreshData?: () => void;
}

export const CustomerCarsListView: React.FC<CustomerCarsListViewProps> = ({
  currentUser,
  customer,
  settings,
  vehicles,
  subscriptions,
  packages = [],
  activeTab,
  onSelectTab,
  onBack,
  onOpenAddVehicle,
  onEditVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onRefreshData
}) => {
  // Edit vehicle modal state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editColor, setEditColor] = useState('أبيض');
  const [editType, setEditType] = useState('سيدان');
  const [editPlate, setEditPlate] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [dbColors, setDbColors] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    api.getVehicleColors()
      .then((cols) => {
        if (active && cols) {
          setDbColors(cols.map((c) => c.name));
        }
      })
      .catch(console.warn);
    return () => { active = false; };
  }, []);

  // Parse license plate into letters & eastern Arabic numerals
  const parsePlate = (plateStr?: string) => {
    if (!plateStr || !plateStr.trim()) {
      return { letters: 'س ج', numbers: '١٢٣' };
    }
    const cleaned = plateStr.trim();
    const lettersMatch = cleaned.match(/[\u0600-\u06FFa-zA-Z\s]+/g);
    const digitsMatch = cleaned.match(/[\d\u0660-\u0669]+/g);

    const letters = lettersMatch ? lettersMatch.join('').trim() : 'س ج';
    const rawDigits = digitsMatch ? digitsMatch.join('').trim() : '١٢٣';

    const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const arabicNumbers = rawDigits.replace(/\d/g, (d) => easternDigits[parseInt(d, 10)]);

    return { letters: letters || 'س ج', numbers: arabicNumbers || '١٢٣' };
  };

  // Convert color names to SVG hex fill
  const getColorHex = (colorName?: string) => {
    if (!colorName) return '#E6ECEE';
    const c = colorName.trim();
    if (c === 'أبيض') return '#FFFFFF';
    if (c === 'أسود') return '#2B343B';
    if (c === 'رمادي' || c === 'فضي') return '#8796A0';
    if (c === 'أزرق' || c === 'كحلي') return '#1E3A8A';
    if (c === 'أحمر' || c === 'نبيتي') return '#991B1B';
    if (c === 'زيتي' || c === 'أخضر') return '#065F46';
    if (c === 'بيج' || c === 'شامبين') return '#D4C5B9';
    if (c === 'برونزي' || c === 'بني') return '#78350F';
    return '#E6ECEE';
  };

  // Count text
  const getCountText = () => {
    const count = vehicles.length;
    if (count === 0) return 'لا توجد سيارات مسجلة';
    if (count === 1) return 'سيارة واحدة مسجلة';
    if (count === 2) return 'سيارتان مسجلتان';
    if (count >= 3 && count <= 10) return `${count} سيارات مسجلة`;
    return `${count} سيارة مسجلة`;
  };

  // Check if vehicle has an active subscription
  const isVehicleSubscribed = (vehicleId: string) => {
    return subscriptions.some(
      (s) => s.vehicle_id === vehicleId && (s.status === 'active' || s.status === 'pending')
    );
  };

  const handleOpenEdit = (veh: Vehicle) => {
    // If dedicated edit view handler provided, navigate to full edit screen
    if (onEditVehicle) {
      onEditVehicle(veh);
      return;
    }

    // Otherwise populate internal modal with complete extracted data
    const details = extractVehicleDetails(veh);
    setEditingVehicle(veh);
    setEditBrand(details.brand);
    setEditModel(details.model);
    setEditYear(details.year);
    setEditColor(details.color);
    setEditType(details.bodyType);
    setEditPlate(details.plateRaw);
    setEditImageUrl(details.imageUrl);
    setSaveError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setSaveError(null);
      const url = await uploadStorageAsset(file, 'vehicles');
      setEditImageUrl(url);
    } catch (err: any) {
      setSaveError(err.message || 'فشل رفع صورة السيارة');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !onUpdateVehicle) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      const safeUpdates = buildSafeVehicleUpdate(editingVehicle, {
        brand: editBrand,
        model: editModel,
        year: editYear,
        color: editColor,
        bodyType: editType,
        plate: editPlate,
        imageUrl: editImageUrl
      });

      await onUpdateVehicle(editingVehicle.id, safeUpdates);

      if (onRefreshData) {
        onRefreshData();
      }

      setEditingVehicle(null);
    } catch (err: any) {
      setSaveError(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!onDeleteVehicle) return;
    if (window.confirm('هل أنت متأكد من حذف هذه السيارة؟')) {
      try {
        await onDeleteVehicle(vehicleId);
        if (onRefreshData) {
          onRefreshData();
        }
      } catch (err: any) {
        alert(err.message || 'فشل حذف السيارة');
      }
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
        <header style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="رجوع لحسابي"
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              سياراتي
            </h1>
            <span style={{ fontSize: '13px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
              {getCountText()}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenAddVehicle}
            aria-label="إضافة سيارة جديدة"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#0B7F72',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </button>
        </header>

        {/* Main Content */}
        <main style={{ padding: '12px 20px 110px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {vehicles.length === 0 ? (
            <div
              style={{
                border: '2px dashed #8FCFC4',
                background: '#F2FAF8',
                borderRadius: '24px',
                padding: '30px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: '#0B7F72',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4a1 1 0 0 1-1 1h-1.5"></path>
                  <path d="M5.5 18H4a1 1 0 0 1-1-1v-4h18"></path>
                  <path d="M8.5 18h7"></path>
                  <circle cx="7" cy="18" r="1.5"></circle>
                  <circle cx="17" cy="18" r="1.5"></circle>
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                لا توجد سيارات مسجلة
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                أضف سيارتك الأولى لتتمكن من الاشتراك في باقات الغسيل
              </p>
            </div>
          ) : (
            vehicles.map((veh) => {
              const isSub = isVehicleSubscribed(veh.id);
              const plateInfo = parseEgyptianPlate(veh.plate_number || veh.license_plate);
              const isModelMissing = !veh.model || !veh.model.trim();
              const isColorMissing = !veh.color || !veh.color.trim();
              const hasMissingData = isModelMissing || isColorMissing;
              const carHex = findColorHex(veh.color);

              return (
                <article
                  key={veh.id}
                  style={{
                    border: '1px solid #E2E9EA',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    background: '#FFFFFF'
                  }}
                >
                  {/* Top Image or Illustration */}
                  <div
                    style={{
                      background: '#F2F5F6',
                      height: '150px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {veh.vehicle_image_url || veh.image_url ? (
                      <img
                        src={veh.vehicle_image_url || veh.image_url}
                        alt={veh.brand || veh.vehicle_type}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <svg width="230" height="92" viewBox="0 0 200 80" role="img" aria-label="رسم توضيحي للسيارة">
                        <path
                          d="M10 55 L18 38 Q22 32 30 31 L60 28 L78 14 Q84 10 92 10 L130 10 Q138 10 144 15 L162 28 L182 32 Q190 34 191 42 L192 55 Q192 60 186 60 L170 60 A16 16 0 0 0 138 60 L66 60 A16 16 0 0 0 34 60 L16 60 Q10 60 10 55 Z"
                          fill={carHex}
                          stroke="#8796A0"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        <path d="M86 16 L74 28 L108 28 L108 16 Z" fill="#FFFFFF" stroke="#8796A0" strokeWidth="1" />
                        <path d="M114 16 L114 28 L152 28 L141 18 Q137 16 131 16 Z" fill="#FFFFFF" stroke="#8796A0" strokeWidth="1" />
                        <circle cx="50" cy="60" r="12" fill="#1F2A30" />
                        <circle cx="50" cy="60" r="5" fill="#9AA5AA" />
                        <circle cx="154" cy="60" r="12" fill="#1F2A30" />
                        <circle cx="154" cy="60" r="5" fill="#9AA5AA" />
                      </svg>
                    )}

                    {/* Status Badge */}
                    {isSub ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: '#E3F5EE',
                          color: '#0B6B4F',
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: "'Cairo', sans-serif"
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                        مشتركة في باقة نشطة
                      </span>
                    ) : (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: '#F1F5F9',
                          color: '#64748B',
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: "'Cairo', sans-serif"
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94A3B8' }} />
                        غير مشتركة في باقة
                      </span>
                    )}
                  </div>

                  {/* Body Details */}
                  <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                        <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                          {veh.brand || veh.vehicle_type || 'سيارة'}
                        </h2>
                        <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                          {veh.vehicle_type || 'سيدان'}
                        </span>
                      </div>

                      {/* Egyptian License Plate */}
                      <div
                        style={{
                          width: '140px',
                          border: '2px solid #0E1B24',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#FFFFFF',
                          flexShrink: 0
                        }}
                        role="img"
                        aria-label={`رقم اللوحة ${veh.plate_number}`}
                      >
                        <div
                          style={{
                            height: '18px',
                            background: '#1F6FB2',
                            color: '#FFFFFF',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          <span>مصر</span>
                          <span dir="ltr">EGYPT</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', height: '36px' }}>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '17px',
                              fontWeight: 700,
                              letterSpacing: '2px',
                              borderLeft: '2px solid #0E1B24',
                              fontFamily: "'Cairo', sans-serif"
                            }}
                          >
                            {plateInfo.letters}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '17px',
                              fontWeight: 700,
                              letterSpacing: '1px',
                              fontFamily: "'Cairo', sans-serif"
                            }}
                          >
                            {plateInfo.numbers}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Definition List for Model and Color */}
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#F5F8F8', borderRadius: '12px', padding: '10px 12px' }}>
                        <dt style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>الموديل</dt>
                        <dd
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            color: veh.model ? '#0E1B24' : '#92400E',
                            fontWeight: 600,
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          {veh.model || 'غير مسجّل'}
                        </dd>
                      </div>
                      <div style={{ background: '#F5F8F8', borderRadius: '12px', padding: '10px 12px' }}>
                        <dt style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>اللون</dt>
                        <dd
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            color: veh.color ? '#0E1B24' : '#92400E',
                            fontWeight: 600,
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          {veh.color || 'غير مسجّل'}
                        </dd>
                      </div>
                    </dl>

                    {/* Warning note if data incomplete */}
                    {hasMissingData && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: '#FFFBEB',
                          border: '1px solid #F3D9A4',
                          fontSize: '13px',
                          color: '#78350F',
                          fontFamily: "'Cairo', sans-serif"
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          style={{ flexShrink: 0 }}
                        >
                          <circle cx="12" cy="12" r="9"></circle>
                          <path d="M12 8v5M12 16.5v.01"></path>
                        </svg>
                        <span style={{ flex: 1 }}>أكمل الموديل واللون عشان الفني يتعرف على عربيتك بسهولة</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(veh)}
                        style={{
                          flex: 1,
                          height: '46px',
                          borderRadius: '14px',
                          border: '1px solid #0B7F72',
                          color: '#0B7F72',
                          fontSize: '15px',
                          fontWeight: 600,
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Cairo', sans-serif"
                        }}
                      >
                        {hasMissingData ? 'أكمل بيانات السيارة' : 'تعديل بيانات السيارة'}
                      </button>

                      {onDeleteVehicle && (
                        <button
                          type="button"
                          onClick={() => handleDelete(veh.id)}
                          aria-label="حذف السيارة"
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            border: '1px solid #FEE2E2',
                            background: '#FFF5F5',
                            color: '#EF4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}

          {/* Big Dashed Add Car Button */}
          <button
            type="button"
            onClick={onOpenAddVehicle}
            style={{
              height: '60px',
              borderRadius: '18px',
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
              fontFamily: "'Cairo', sans-serif",
              marginTop: '4px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            إضافة سيارة جديدة
          </button>
        </main>

        {/* Edit Vehicle Modal */}
        {editingVehicle && (
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
            onClick={() => setEditingVehicle(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '20px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                fontFamily: "'Cairo', sans-serif",
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>تعديل بيانات السيارة</h3>
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B73', fontSize: '20px' }}
                >
                  ✕
                </button>
              </div>

              {saveError && (
                <div style={{ padding: '8px 12px', background: '#FEE2E2', color: '#991B1B', borderRadius: '10px', fontSize: '13px', marginBottom: '12px' }}>
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSaveVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                    الماركة (Brand)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مرسيدس / تويوتا / هيونداي"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1px solid #D5DEE0',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                      الموديل (Model)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: C200 / كورولا"
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        border: '1px solid #D5DEE0',
                        padding: '0 12px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                      سنة الصنع
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 2024"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        border: '1px solid #D5DEE0',
                        padding: '0 12px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                      نوع الهيكل
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        border: '1px solid #D5DEE0',
                        padding: '0 8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    >
                      <option value="سيدان">سيدان</option>
                      <option value="SUV / جيب">SUV / جيب</option>
                      <option value="هاتشباك">هاتشباك</option>
                      <option value="كوبيه">كوبيه</option>
                      <option value="فان">فان</option>
                      {editType && !['سيدان', 'SUV / جيب', 'هاتشباك', 'كوبيه', 'فان'].includes(editType) && (
                        <option value={editType}>{editType}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                      اللون
                    </label>
                    <input
                      type="text"
                      list="car-colors-list"
                      placeholder="أبيض / أسود / رمادي"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        border: '1px solid #D5DEE0',
                        padding: '0 12px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        fontFamily: "'Cairo', sans-serif"
                      }}
                    />
                    <datalist id="car-colors-list">
                      {dbColors.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                    رقم اللوحة *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: س ج 123"
                    value={editPlate}
                    onChange={(e) => setEditPlate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1px solid #D5DEE0',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#0E1B24', display: 'block', marginBottom: '4px' }}>
                    صورة السيارة (اختياري)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      style={{ fontSize: '12px' }}
                    />
                    {isUploadingPhoto && <span style={{ fontSize: '12px', color: '#0B7F72' }}>جاري الرفع...</span>}
                  </div>
                  {editImageUrl && (
                    <div style={{ marginTop: '6px', width: '60px', height: '40px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={editImageUrl} alt="معاينة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '12px',
                      background: '#0B7F72',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVehicle(null)}
                    style={{
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E9EA',
                      background: '#F8FAFC',
                      color: '#5B6B73',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
              color: activeTab === 'profile' || activeTab === 'vehicles' ? '#0B7F72' : '#5B6B73',
              fontSize: '12px',
              fontWeight: activeTab === 'profile' || activeTab === 'vehicles' ? 700 : 500,
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
