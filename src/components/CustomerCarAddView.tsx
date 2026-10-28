import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AuthUser, Customer, Vehicle } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import {
  extractVehicleDetails,
  buildSafeVehicleUpdate,
  findColorKey,
  findColorHex,
  CAR_COLORS,
  normalizeArabic
} from '../utils/vehicleUtils';
import { Loader2, Camera, Trash2, ChevronDown, Check, Plus, X } from 'lucide-react';

// ==============================================================================
// Creatable Autocomplete Component for Brand, Model, and Year
// ==============================================================================
interface CreatableAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  onAddOption: (newOpt: string) => void;
  placeholder?: string;
  required?: boolean;
}

const CreatableAutocomplete: React.FC<CreatableAutocompleteProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  onAddOption,
  placeholder,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input value if external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed something custom but didn't select, save and set it
        const trimmed = inputValue.trim();
        if (trimmed && trimmed !== value) {
          onChange(trimmed);
          if (!options.some((opt) => normalizeArabic(opt) === normalizeArabic(trimmed))) {
            onAddOption(trimmed);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [inputValue, value, options, onChange, onAddOption]);

  const queryNorm = normalizeArabic(inputValue);

  // Filter options based on typed input
  const filtered = useMemo(() => {
    if (!queryNorm) return options;
    return options.filter((opt) => normalizeArabic(opt).includes(queryNorm));
  }, [options, queryNorm]);

  // Check if typed value already matches an existing option exactly
  const exactMatch = useMemo(() => {
    if (!queryNorm) return false;
    return options.some((opt) => normalizeArabic(opt) === queryNorm);
  }, [options, queryNorm]);

  const handleSelectOption = (opt: string) => {
    onChange(opt);
    setInputValue(opt);
    setIsOpen(false);
  };

  const handleCreateNew = (newVal: string) => {
    const trimmed = newVal.trim();
    if (!trimmed) return;
    onAddOption(trimmed);
    onChange(trimmed);
    setInputValue(trimmed);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!exactMatch && inputValue.trim()) {
        handleCreateNew(inputValue.trim());
      } else if (filtered.length > 0) {
        handleSelectOption(filtered[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={id} style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif", color: '#0E1B24' }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>

      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            width: '100%',
            height: '52px',
            boxSizing: 'border-box',
            border: isOpen ? '1.5px solid #0B7F72' : '1px solid #D5DEE0',
            borderRadius: '14px',
            padding: '0 38px 0 38px',
            fontSize: '15px',
            color: '#0E1B24',
            background: '#FFFFFF',
            outline: 'none',
            fontFamily: "'Cairo', sans-serif",
            boxShadow: isOpen ? '0 0 0 3px rgba(11, 127, 114, 0.12)' : 'none',
            transition: 'border 0.2s, box-shadow 0.2s'
          }}
        />

        {/* Dropdown Arrow / Search Icon on left */}
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#8A999E',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </div>

        {/* Clear Button on right */}
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onChange('');
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#F1F5F7',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              padding: 0
            }}
            title="مسح"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
            zIndex: 100,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {/* Add Option Button when query is not an exact match */}
          {!exactMatch && inputValue.trim().length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreateNew(inputValue.trim());
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '12px',
                color: '#047857',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                textAlign: 'right',
                fontFamily: "'Cairo', sans-serif",
                marginBottom: '4px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#D1FAE5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ECFDF5')}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#059669',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Plus size={14} strokeWidth={3} />
              </div>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                إضافة "<strong>{inputValue.trim()}</strong>" كعنصر جديد للقائمة
              </span>
            </button>
          )}

          {/* Filtered Options List */}
          {filtered.length > 0 ? (
            filtered.map((opt) => {
              const isSelected = opt === value;
              return (
                <div
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectOption(opt);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#0B7F72' : '#1E293B',
                    background: isSelected ? '#F0FDFA' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{opt}</span>
                  {isSelected && <Check size={16} strokeWidth={2.5} style={{ color: '#0B7F72' }} />}
                </div>
              );
            })
          ) : (
            exactMatch && (
              <div style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                لا توجد عناصر مطابقة
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// Datasets & Constants for Autocomplete Options
// ==============================================================================
const DEFAULT_BRANDS: string[] = [
  'تويوتا',
  'هيونداي',
  'كيا',
  'نيسان',
  'مرسيدس',
  'بي إم دبليو',
  'شيفروليه',
  'ميتسوبيشي',
  'إم جي (MG)',
  'شيري',
  'رينو',
  'سكودا',
  'فولكس فاجن',
  'فيات',
  'بيجو',
  'سوزوكي',
  'فورد',
  'هوندا',
  'أوبل',
  'جيب',
  'أودي',
  'سيات',
  'سيتروين',
  'مازدا',
  'فولفو',
  'لاند روفر',
  'بورش',
  'تسلا',
  'جيلي',
  'بي واي دي (BYD)',
  'هافال',
  'جاك',
  'شانجان',
  'بايك',
  'جيتور',
  'كوبرا',
  'لكزس',
  'سانج يونج'
];

const BRAND_MODELS: Record<string, string[]> = {
  'تويوتا': ['كورولا', 'كامري', 'ياريس', 'ياريس كروس', 'راف 4 (RAV4)', 'فورتشنر', 'لاند كروزر', 'برادو', 'هايلكس', 'سي إتش آر (C-HR)', 'روميون', 'أوربان كروزر', 'أفالون'],
  'هيونداي': ['إلنترا', 'توسان', 'أكسنت', 'كريتا', 'سوناتا', 'سنتافي', 'بايون', 'كونا', 'فيرنا', 'ماتريكس', 'إي 10 (i10)', 'إي 20 (i20)'],
  'كيا': ['سبورتاج', 'سيراتو', 'بيكانتو', 'ريو', 'سورينتو', 'سيلتوس', 'إكسيد (XCeed)', 'كارينز', 'كيه 5 (K5)', 'بيجاس', 'تيلورايد'],
  'نيسان': ['صني', 'قشقاي', 'سنترا', 'جوك', 'إكس تريل', 'باترول', 'كيكس', 'تيدا'],
  'مرسيدس': ['C180', 'C200', 'C300', 'E200', 'E300', 'S500', 'A-Class', 'CLA', 'GLA', 'GLC', 'GLE', 'GLS', 'G-Class'],
  'بي إم دبليو': ['الفئة الثالثة (320i)', 'الفئة الخامسة (520i)', 'الفئة السابعة (740i)', 'X1', 'X3', 'X4', 'X5', 'X6', 'X7'],
  'شيفروليه': ['أوبترا', 'كروز', 'أفيو', 'كابتيفا', 'لانوس', 'تاهو', 'سوبربان', 'بليزر'],
  'ميتسوبيشي': ['لانسر', 'إكليبس كروس', 'إكسباندر', 'باجيرو', 'أتراج', 'ميراج', 'أوتلاندر'],
  'إم جي (MG)': ['MG 5', 'MG 6', 'MG ZS', 'MG RX5', 'MG HS', 'MG One', 'MG GT', 'MG 4'],
  'شيري': ['تيجو 3', 'تيجو 7', 'تيجو 8', 'أريزو 5', 'أريزو 6', 'تيجو 4 برو', 'تيجو 7 برو', 'تيجو 8 برو'],
  'رينو': ['ميجان', 'داستر', 'كادجار', 'لوجان', 'سانديرو', 'ستيب واي', 'كابتشر', 'أوسترال'],
  'سكودا': ['أوكتافيا', 'كودياك', 'كاروك', 'كاميك', 'سوبيرب', 'فابيا', 'سكالا'],
  'فولكس فاجن': ['باسات', 'تيجوان', 'جولف', 'تي روك', 'طوارق', 'بولو', 'جيتا'],
  'فيات': ['تيبو', '500', '500X', 'بونتو', 'أونو'],
  'بيجو': ['301', '208', '2008', '3008', '5008', '508'],
  'سوزوكي': ['سويفت', 'ديزاير', 'بالينو', 'فيتارا', 'جمني', 'إرتيجا', 'سيليريو', 'إسبريسو'],
  'فورد': ['فوكس', 'فيستا', 'إيكوسبورت', 'كوجا', 'إكسبلورر', 'موستانج'],
  'هوندا': ['سيفيك', 'أكورد', 'CR-V', 'HR-V', 'سيتي'],
  'أوبل': ['أسترا', 'كورسا', 'إنسيجنيا', 'كروس لاند', 'جراند لاند', 'موكا'],
  'جيب': ['رانجلر', 'جراند شيروكي', 'رينيجيد', 'كومباس', 'شيروكي'],
  'أودي': ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'Q8'],
  'سيات': ['إبيزا', 'ليون', 'أتيكا', 'أرونا', 'تاراكو'],
  'سيتروين': ['C3', 'C4', 'C5 إيركروس', 'C-إليزيه'],
  'مازدا': ['مازدا 3', 'مازدا 6', 'CX-3', 'CX-5', 'CX-9'],
  'جيلي': ['كولراي', 'أوكافانجو', 'إمجراند', 'جيوميتري C', 'ستار راي'],
  'بي واي دي (BYD)': ['F3', 'سيل (Seal)', 'سونغ بلس (Song Plus)', 'دولفين', 'هان (Han)', 'أتو 3'],
  'هافال': ['جوليون', 'H6'],
  'جاك': ['JS3', 'JS4', 'J7'],
  'شانجان': ['ألسفين', 'CS35 بلس', 'CS55 بلس', 'CS85', 'يوني تي (UNI-T)', 'يوني كي (UNI-K)'],
  'جيتور': ['X70', 'X70 بلس', 'X90 بلس', 'داشينج'],
  'سانج يونج': ['تيفولي', 'تيفولي إكس إل في', 'كوراندو', 'توريس'],
  'بورش': ['كايين', 'ماكان', 'باناميرا', '911', 'تايكان'],
  'تسلا': ['موديل 3', 'موديل Y', 'موديل S', 'موديل X'],
  'لكزس': ['ES', 'LS', 'RX', 'NX', 'LX'],
  'كوبرا': ['فورمينتور', 'ليون', 'أتيكا']
};

const DEFAULT_YEARS: string[] = [
  '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020',
  '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012',
  '2011', '2010', '2009', '2008', '2007', '2006', '2005', '2004',
  '2003', '2002', '2001', '2000', '1999', '1998', '1997', '1996',
  '1995', '1994', '1993', '1992', '1991', '1990'
];

export interface CustomerCarAddViewProps {
  currentUser: AuthUser;
  customer?: Customer | null;
  editingVehicle?: Vehicle | null;
  onBack: () => void;
  onCarSaved: (vehicle: Vehicle) => void;
  onCreateVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle | null>;
}

export const CustomerCarAddView: React.FC<CustomerCarAddViewProps> = ({
  currentUser,
  customer,
  editingVehicle,
  onBack,
  onCarSaved,
  onCreateVehicle,
  onUpdateVehicle
}) => {
  // Extract initial details from vehicle if editing
  const initialDetails = useMemo(() => {
    return extractVehicleDetails(editingVehicle);
  }, [editingVehicle]);

  // State
  const [carType, setCarType] = useState<'sedan' | 'hatch' | 'suv' | 'van'>(initialDetails.carTypeId);
  const [brand, setBrand] = useState(initialDetails.brand || 'تويوتا');
  const [model, setModel] = useState(initialDetails.model || '');
  const [year, setYear] = useState(initialDetails.year && initialDetails.year !== '—' && initialDetails.year !== '-' ? initialDetails.year : '2024');
  const [colorKey, setColorKey] = useState(initialDetails.colorKey || 'white');
  const [letters, setLetters] = useState(initialDetails.letters || '');
  const [digits, setDigits] = useState(initialDetails.digits || '');
  const [photoUrl, setPhotoUrl] = useState(initialDetails.imageUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom options state loaded from localStorage
  const [customBrands, setCustomBrands] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('wecare_custom_car_brands');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [customModels, setCustomModels] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('wecare_custom_car_models');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [customYears, setCustomYears] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('wecare_custom_car_years');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Re-sync if editingVehicle changes
  useEffect(() => {
    if (editingVehicle) {
      const d = extractVehicleDetails(editingVehicle);
      setCarType(d.carTypeId);
      setBrand(d.brand || 'تويوتا');
      setModel(d.model || '');
      setYear(d.year && d.year !== '—' && d.year !== '-' ? d.year : '2024');
      setColorKey(d.colorKey || 'white');
      setLetters(d.letters || '');
      setDigits(d.digits || '');
      setPhotoUrl(d.imageUrl || '');
    }
  }, [editingVehicle]);

  // Handlers to add new options to lists and persist
  const handleAddBrand = (newB: string) => {
    const trimmed = newB.trim();
    if (!trimmed) return;
    try {
      const current: string[] = JSON.parse(localStorage.getItem('wecare_custom_car_brands') || '[]');
      if (!current.some((x) => normalizeArabic(x) === normalizeArabic(trimmed))) {
        localStorage.setItem('wecare_custom_car_brands', JSON.stringify([trimmed, ...current]));
      }
    } catch {}
    setCustomBrands((prev) => [trimmed, ...prev.filter((x) => normalizeArabic(x) !== normalizeArabic(trimmed))]);
  };

  const handleAddModel = (newM: string) => {
    const trimmed = newM.trim();
    if (!trimmed) return;
    try {
      const current: string[] = JSON.parse(localStorage.getItem('wecare_custom_car_models') || '[]');
      if (!current.some((x) => normalizeArabic(x) === normalizeArabic(trimmed))) {
        localStorage.setItem('wecare_custom_car_models', JSON.stringify([trimmed, ...current]));
      }
    } catch {}
    setCustomModels((prev) => [trimmed, ...prev.filter((x) => normalizeArabic(x) !== normalizeArabic(trimmed))]);
  };

  const handleAddYear = (newY: string) => {
    const trimmed = newY.trim();
    if (!trimmed) return;
    try {
      const current: string[] = JSON.parse(localStorage.getItem('wecare_custom_car_years') || '[]');
      if (!current.includes(trimmed)) {
        localStorage.setItem('wecare_custom_car_years', JSON.stringify([trimmed, ...current]));
      }
    } catch {}
    setCustomYears((prev) => [trimmed, ...prev.filter((x) => x !== trimmed)]);
  };

  // Autocomplete options lists
  const brandOptions = useMemo(() => {
    const list: string[] = [];
    if (initialDetails.brand && !list.includes(initialDetails.brand)) {
      list.push(initialDetails.brand);
    }
    customBrands.forEach((b) => {
      if (!list.some((x) => normalizeArabic(x) === normalizeArabic(b))) list.push(b);
    });
    DEFAULT_BRANDS.forEach((b) => {
      if (!list.some((x) => normalizeArabic(x) === normalizeArabic(b))) list.push(b);
    });
    return list;
  }, [customBrands, initialDetails.brand]);

  const modelOptions = useMemo(() => {
    const list: string[] = [];
    if (initialDetails.model && !list.includes(initialDetails.model)) {
      list.push(initialDetails.model);
    }
    customModels.forEach((m) => {
      if (!list.some((x) => normalizeArabic(x) === normalizeArabic(m))) list.push(m);
    });

    // Brand-specific models
    const matchedBrandKey = Object.keys(BRAND_MODELS).find(
      (k) => normalizeArabic(k) === normalizeArabic(brand)
    );
    if (matchedBrandKey && BRAND_MODELS[matchedBrandKey]) {
      BRAND_MODELS[matchedBrandKey].forEach((m) => {
        if (!list.some((x) => normalizeArabic(x) === normalizeArabic(m))) list.push(m);
      });
    } else {
      ['كورولا', 'إلنترا', 'سبورتاج', 'صني', 'توسان', 'سيراتو', 'C200', 'أوبترا', 'تيجو 7', 'ميجان', 'أوكتافيا'].forEach((m) => {
        if (!list.some((x) => normalizeArabic(x) === normalizeArabic(m))) list.push(m);
      });
    }
    return list;
  }, [brand, customModels, initialDetails.model]);

  const yearOptions = useMemo(() => {
    const list: string[] = [];
    if (initialDetails.year && initialDetails.year !== '—' && initialDetails.year !== '-') {
      list.push(initialDetails.year);
    }
    customYears.forEach((y) => {
      if (!list.includes(y)) list.push(y);
    });
    DEFAULT_YEARS.forEach((y) => {
      if (!list.includes(y)) list.push(y);
    });
    return list;
  }, [customYears, initialDetails.year]);

  // Type definitions exactly matching B-Car-Add.dc.html
  const TYPES: Array<{ id: 'sedan' | 'hatch' | 'suv' | 'van'; label: string }> = [
    { id: 'sedan', label: 'سيدان' },
    { id: 'hatch', label: 'هاتشباك' },
    { id: 'suv', label: 'SUV / جيب' },
    { id: 'van', label: 'فان' }
  ];

  // Color definitions exactly matching B-Car-Add.dc.html
  const COLORS = CAR_COLORS;

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
    const resolvedBrand = brand.trim() || 'تويوتا';

    // Edit Existing Vehicle Mode
    if (editingVehicle && onUpdateVehicle) {
      try {
        setIsSubmitting(true);
        const safeUpdates = buildSafeVehicleUpdate(editingVehicle, {
          brand: resolvedBrand,
          model: model.trim(),
          year: year !== '—' ? year : '',
          color: selectedColor.name,
          bodyType: selectedType.label,
          plate: fullPlateNumber,
          imageUrl: photoUrl
        });

        const updated = await onUpdateVehicle(editingVehicle.id, safeUpdates);
        if (updated) {
          onCarSaved(updated);
        } else {
          onCarSaved({ ...editingVehicle, ...safeUpdates } as Vehicle);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'فشل تحديث بيانات السيارة');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Create New Vehicle Mode
    const customerId = customer?.id || currentUser.customer_id || currentUser.id || '';
    const typeParts = [resolvedBrand, model.trim(), `(${selectedType.label})`].filter(Boolean).join(' ');
    const finalVehicleType = typeParts || selectedType.label || 'سيدان';

    try {
      setIsSubmitting(true);
      const created = await onCreateVehicle({
        customer_id: customerId,
        brand: resolvedBrand || undefined,
        model: model.trim() || undefined,
        year: year !== '—' && year !== '-' ? year : undefined,
        vehicle_type: finalVehicleType,
        type: finalVehicleType,
        color: selectedColor.name || 'أبيض',
        plate_number: fullPlateNumber,
        license_plate: fullPlateNumber,
        vehicle_image_url: photoUrl || undefined,
        image_url: photoUrl || undefined
      });

      if (created) {
        onCarSaved(created);
      } else {
        onCarSaved({
          id: 'temp-' + Date.now(),
          customer_id: customerId,
          vehicle_type: finalVehicleType,
          color: selectedColor.name || 'أبيض',
          plate_number: fullPlateNumber
        } as Vehicle);
      }
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
            {editingVehicle ? 'تعديل بيانات السيارة' : 'إضافة سيارة جديدة'}
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

            {/* Section: Brand & Model & Year with Creatable Autocomplete */}
            <section aria-label="نوع السيارة والموديل وسنة الصنع" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. نوع السيارة (الماركة) */}
              <CreatableAutocomplete
                id="ca-brand"
                label="نوع السيارة (الماركة)"
                value={brand}
                onChange={(val) => {
                  setBrand(val);
                }}
                options={brandOptions}
                onAddOption={handleAddBrand}
                placeholder="ابحث أو اكتب نوع السيارة (تويوتا، هيونداي، مرسيدس...)"
                required
              />

              {/* 2. الموديل و 3. سنة الصنع */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '12px' }}>
                <CreatableAutocomplete
                  id="ca-model"
                  label="الموديل"
                  value={model}
                  onChange={(val) => setModel(val)}
                  options={modelOptions}
                  onAddOption={handleAddModel}
                  placeholder="الموديل (كورولا، توسان...)"
                />

                <CreatableAutocomplete
                  id="ca-year"
                  label="سنة الصنع"
                  value={year}
                  onChange={(val) => setYear(val)}
                  options={yearOptions}
                  onAddOption={handleAddYear}
                  placeholder="سنة الصنع..."
                />
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
              {isSubmitting ? 'جاري الحفظ...' : editingVehicle ? 'حفظ تعديلات السيارة' : 'حفظ السيارة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
