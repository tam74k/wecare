import React, { useState } from 'react';
import { AuthUser, Customer, Vehicle } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import { Loader2, Camera, Trash2 } from 'lucide-react';

interface CustomerCarAddViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  onBack: () => void;
  onCarSaved: (vehicle: Vehicle) => void;
  onCreateVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
}

export const CustomerCarAddView: React.FC<CustomerCarAddViewProps> = ({
  currentUser,
  customer,
  onBack,
  onCarSaved,
  onCreateVehicle
}) => {
  // State
  const [carType, setCarType] = useState<'sedan' | 'hatch' | 'suv' | 'van'>('sedan');
  const [brand, setBrand] = useState('تويوتا');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('—');
  const [colorKey, setColorKey] = useState('white');
  const [letters, setLetters] = useState('');
  const [digits, setDigits] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Type definitions exactly matching B-Car-Add.dc.html
  const TYPES: Array<{ id: 'sedan' | 'hatch' | 'suv' | 'van'; label: string }> = [
    { id: 'sedan', label: 'سيدان' },
    { id: 'hatch', label: 'هاتشباك' },
    { id: 'suv', label: 'SUV / جيب' },
    { id: 'van', label: 'فان' }
  ];

  // Color definitions exactly matching B-Car-Add.dc.html
  const COLORS = [
    { id: 'white', name: 'أبيض', hex: '#FFFFFF' },
    { id: 'black', name: 'أسود', hex: '#1A1F24' },
    { id: 'silver', name: 'فضي', hex: '#C4CBD0' },
    { id: 'gray', name: 'رمادي', hex: '#6B7280' },
    { id: 'red', name: 'أحمر', hex: '#B91C1C' },
    { id: 'blue', name: 'أزرق', hex: '#1D4ED8' },
    { id: 'beige', name: 'بيج', hex: '#D8C6A5' },
    { id: 'green', name: 'أخضر', hex: '#166534' }
  ];

  const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  const selectedColor = COLORS.find((c) => c.id === colorKey) || COLORS[0];
  const selectedType = TYPES.find((t) => t.id === carType) || TYPES[0];

  // Format letters with spaces for plate display
  const lettersDisp = letters ? letters.split('').join(' ') : 'أ ب ج';
  const lettersColor = letters ? '#0E1B24' : '#B8C4C8';

  // Convert digits to Eastern Arabic numerals for plate
  const digitsAr = digits.replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)]);
  const digitsDisp = digits ? digitsAr : '١٢٣٤';
  const digitsColor = digits ? '#0E1B24' : '#B8C4C8';

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      setErrorMsg(null);
      const url = await uploadStorageAsset(file, 'vehicles');
      setPhotoUrl(url);
    } catch (err: any) {
      setErrorMsg('فشل رفع الصورة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanLetters = letters.replace(/\s+/g, '').trim();
    const cleanDigits = digits.trim();

    if (!cleanLetters && !cleanDigits) {
      setErrorMsg('يرجى إدخال أرقام أو حروف لوحة السيارة');
      return;
    }

    const fullPlateNumber = `${cleanLetters} ${cleanDigits}`.trim();
    const customerId = customer?.id || currentUser.customer_id || currentUser.id;

    // Build vehicle type description, e.g. "تويوتا كورولا (سيدان)"
    const typeParts = [brand !== 'اختر الماركة' && brand !== 'أخرى' ? brand : '', model.trim(), `(${selectedType.label})`]
      .filter(Boolean)
      .join(' ');

    const finalVehicleType = typeParts || selectedType.label;

    try {
      setIsSubmitting(true);
      const created = await onCreateVehicle({
        customer_id: customerId,
        vehicle_type: finalVehicleType,
        color: selectedColor.name,
        plate_number: fullPlateNumber,
        vehicle_image_url: photoUrl || undefined,
        image_url: photoUrl || undefined
      });

      onCarSaved(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ السيارة، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
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
            aria-label="رجوع"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0E1B24',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 6l6 6-6 6"></path>
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
            إضافة سيارة جديدة
          </h1>
        </header>

        {/* Main Content Form */}
        <form onSubmit={handleSubmit}>
          <main style={{ padding: '10px 20px 120px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  borderRadius: '14px',
                  color: '#E11D48',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Section: Car & License Plate Interactive Preview */}
            <section
              aria-label="معاينة السيارة"
              style={{
                background: '#F2F5F6',
                borderRadius: '24px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {/* Vector Car with Dynamic Fill Color */}
              <svg width="240" height="96" viewBox="0 0 200 80" role="img" aria-label="معاينة لون السيارة">
                <path
                  d="M10 55 L18 38 Q22 32 30 31 L60 28 L78 14 Q84 10 92 10 L130 10 Q138 10 144 15 L162 28 L182 32 Q190 34 191 42 L192 55 Q192 60 186 60 L170 60 A16 16 0 0 0 138 60 L66 60 A16 16 0 0 0 34 60 L16 60 Q10 60 10 55 Z"
                  fill={selectedColor.hex}
                  stroke="#34474F"
                  strokeWidth="1.5"
                  style={{ transition: 'fill 0.3s' }}
                />
                <path d="M86 16 L74 28 L108 28 L108 16 Z" fill="#CFE3EA" stroke="#34474F" strokeWidth="1" />
                <path d="M114 16 L114 28 L152 28 L141 18 Q137 16 131 16 Z" fill="#CFE3EA" stroke="#34474F" strokeWidth="1" />
                <circle cx="50" cy="60" r="12" fill="#1F2A30" />
                <circle cx="50" cy="60" r="5" fill="#9AA5AA" />
                <circle cx="154" cy="60" r="12" fill="#1F2A30" />
                <circle cx="154" cy="60" r="5" fill="#9AA5AA" />
              </svg>

              {/* Type and Color Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                <span style={{ fontWeight: 600 }}>{selectedType.label}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedColor.name}</span>
              </div>

              {/* Official Egyptian License Plate Preview */}
              <div
                style={{
                  width: '170px',
                  border: '2px solid #0E1B24',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#FFFFFF'
                }}
                role="img"
                aria-label="معاينة رقم اللوحة"
              >
                <div
                  style={{
                    height: '20px',
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', height: '42px' }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '19px',
                      fontWeight: 700,
                      letterSpacing: '2px',
                      color: lettersColor,
                      borderLeft: '2px solid #0E1B24',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {lettersDisp}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '19px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      color: digitsColor,
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    {digitsDisp}
                  </span>
                </div>
              </div>
            </section>

            {/* Section: Car Type */}
            <section aria-labelledby="ca-type" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 id="ca-type" style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                  نوع السيارة
                </h2>
                <span style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
                  سعر الباقة بيختلف حسب النوع
                </span>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="ca-type"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px'
                }}
              >
                {TYPES.map((t) => {
                  const isSelected = t.id === carType;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setCarType(t.id)}
                      style={{
                        height: '60px',
                        borderRadius: '16px',
                        border: `2px solid ${isSelected ? '#0B7F72' : '#E2E9EA'}`,
                        background: isSelected ? '#E3F2EF' : '#FFFFFF',
                        color: isSelected ? '#0B5F56' : '#34474F',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontFamily: "'Cairo', sans-serif",
                        transition: 'all 0.2s'
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
                        <path d="M3 13l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4a1 1 0 0 1-1 1h-1.5"></path>
                        <path d="M5.5 18H4a1 1 0 0 1-1-1v-4h18"></path>
                        <path d="M8.5 18h7"></path>
                        <circle cx="7" cy="18" r="1.5"></circle>
                        <circle cx="17" cy="18" r="1.5"></circle>
                      </svg>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section: Brand & Model & Year */}
            <section aria-label="الماركة والموديل" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="ca-brand" style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                  الماركة
                </label>
                <select
                  id="ca-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
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
                >
                  <option>اختر الماركة</option>
                  <option>تويوتا</option>
                  <option>هيونداي</option>
                  <option>كيا</option>
                  <option>نيسان</option>
                  <option>شيفروليه</option>
                  <option>مرسيدس</option>
                  <option>بي إم دبليو</option>
                  <option>ميتسوبيشي</option>
                  <option>رينو</option>
                  <option>إم جي (MG)</option>
                  <option>شيري</option>
                  <option>أخرى</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="ca-model" style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                    الموديل
                  </label>
                  <input
                    id="ca-model"
                    type="text"
                    placeholder="مثال: كورولا"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="ca-year" style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                    السنة <span style={{ fontWeight: 400, fontSize: '12px', color: '#5B6B73' }}>(اختياري)</span>
                  </label>
                  <select
                    id="ca-year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{
                      height: '52px',
                      boxSizing: 'border-box',
                      border: '1px solid #D5DEE0',
                      borderRadius: '14px',
                      padding: '0 10px',
                      fontSize: '16px',
                      color: '#0E1B24',
                      background: '#FFFFFF',
                      minWidth: 0,
                      outline: 'none',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    <option>—</option>
                    <option>2026</option>
                    <option>2025</option>
                    <option>2024</option>
                    <option>2023</option>
                    <option>2022</option>
                    <option>2021</option>
                    <option>2020</option>
                    <option>أقدم</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Color Palette */}
            <section aria-labelledby="ca-color" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                <h2 id="ca-color" style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                  اللون
                </h2>
                <span style={{ fontSize: '14px', color: '#34474F', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                  {selectedColor.name}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="ca-color"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  gap: '4px'
                }}
              >
                {COLORS.map((c) => {
                  const isSelected = c.id === colorKey;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={c.name}
                      onClick={() => setColorKey(c.id)}
                      style={{
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
                      <span
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: '1px solid #C3CED1',
                          boxShadow: isSelected ? '0 0 0 3px #FFFFFF, 0 0 0 5px #0B7F72' : 'none',
                          transition: 'box-shadow 0.2s',
                          display: 'block'
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section: Plate Number */}
            <section aria-labelledby="ca-plate" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 id="ca-plate" style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                رقم اللوحة
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="ca-letters" style={{ fontSize: '13px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                    الحروف
                  </label>
                  <input
                    id="ca-letters"
                    type="text"
                    maxLength={3}
                    placeholder="أ ب ج"
                    value={letters}
                    onChange={(e) => setLetters(e.target.value.replace(/\s+/g, '').slice(0, 3))}
                    style={{
                      height: '52px',
                      boxSizing: 'border-box',
                      border: '1px solid #D5DEE0',
                      borderRadius: '14px',
                      padding: '0 14px',
                      fontSize: '18px',
                      textAlign: 'center',
                      letterSpacing: '4px',
                      color: '#0E1B24',
                      background: '#FFFFFF',
                      minWidth: 0,
                      outline: 'none',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="ca-digits" style={{ fontSize: '13px', color: '#34474F', fontFamily: "'Cairo', sans-serif" }}>
                    الأرقام
                  </label>
                  <input
                    id="ca-digits"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    value={digits}
                    onChange={(e) => setDigits(e.target.value.replace(/[^0-9٠-٩]/g, '').slice(0, 4))}
                    style={{
                      height: '52px',
                      boxSizing: 'border-box',
                      border: '1px solid #D5DEE0',
                      borderRadius: '14px',
                      padding: '0 14px',
                      fontSize: '18px',
                      textAlign: 'center',
                      letterSpacing: '3px',
                      color: '#0E1B24',
                      background: '#FFFFFF',
                      minWidth: 0,
                      outline: 'none',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Section: Car Photo (Optional) */}
            <section aria-labelledby="ca-photo" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 id="ca-photo" style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                صورة السيارة <span style={{ fontWeight: 400, fontSize: '12px', color: '#5B6B73' }}>(اختياري)</span>
              </h2>

              {photoUrl ? (
                <div
                  style={{
                    position: 'relative',
                    height: '140px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid #D5DEE0'
                  }}
                >
                  <img src={photoUrl} alt="صورة السيارة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="ca-file"
                  style={{
                    height: '96px',
                    borderRadius: '16px',
                    border: '2px dashed #C3CED1',
                    background: '#F7F9F9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    color: '#5B6B73',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
                      <span>جاري رفع وضغط الصورة...</span>
                    </>
                  ) : (
                    <>
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
                        <path d="M4 8h3l2-3h6l2 3h3v11H4z"></path>
                        <circle cx="12" cy="13" r="3.5"></circle>
                      </svg>
                      التقط أو ارفع صورة
                    </>
                  )}
                </label>
              )}
              <input
                id="ca-file"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0 }}
              />
            </section>
          </main>

          {/* Bottom Save Action Button */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '390px',
              padding: '14px 20px 22px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E9EA',
              boxSizing: 'border-box',
              zIndex: 40
            }}
          >
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              style={{
                height: '54px',
                borderRadius: '16px',
                background: '#0B7F72',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                fontFamily: "'Cairo', sans-serif",
                transition: 'background 0.2s',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#075E55')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#0B7F72')}
            >
              {isSubmitting ? 'جاري حفظ السيارة...' : 'حفظ السيارة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
