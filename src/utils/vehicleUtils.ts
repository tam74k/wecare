import { Vehicle } from '../types/database';

/**
 * Normalize Arabic text (remove hamzas, trim whitespace)
 */
export function normalizeArabic(text?: string | null): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * Standard known body types
 */
export const BODY_TYPES = ['سيدان', 'SUV / جيب', 'هاتشباك', 'كوبيه', 'فان', 'سيارة'];

/**
 * Color definitions with hex and Arabic names
 */
export const CAR_COLORS = [
  { id: 'white', name: 'أبيض', aliases: ['ابيض', 'white'], hex: '#FFFFFF' },
  { id: 'black', name: 'أسود', aliases: ['اسود', 'black'], hex: '#1A1F24' },
  { id: 'silver', name: 'فضي', aliases: ['silver'], hex: '#C4CBD0' },
  { id: 'gray', name: 'رمادي', aliases: ['رصاصي', 'gray', 'grey'], hex: '#6B7280' },
  { id: 'red', name: 'أحمر', aliases: ['احمر', 'نبيتي', 'خمري', 'red'], hex: '#B91C1C' },
  { id: 'blue', name: 'أزرق', aliases: ['ازرق', 'كحلي', 'blue'], hex: '#1D4ED8' },
  { id: 'beige', name: 'بيج', aliases: ['شامبين', 'سمني', 'beige'], hex: '#D8C6A5' },
  { id: 'green', name: 'أخضر', aliases: ['اخضر', 'زيتي', 'جنزبيل', 'green'], hex: '#166534' }
];

/**
 * Find SVG hex fill color from any Arabic or English color string
 */
export function findColorHex(colorName?: string | null): string {
  if (!colorName || !colorName.trim()) return '#F2F5F6';
  const norm = normalizeArabic(colorName);
  for (const c of CAR_COLORS) {
    if (normalizeArabic(c.name) === norm || c.aliases.some((a) => norm.includes(normalizeArabic(a)))) {
      return c.hex;
    }
  }
  return '#F2F5F6';
}

/**
 * Find matching color ID ('white', 'black', 'red', ...)
 */
export function findColorKey(colorName?: string | null): string {
  if (!colorName || !colorName.trim()) return 'white';
  const norm = normalizeArabic(colorName);
  for (const c of CAR_COLORS) {
    if (normalizeArabic(c.name) === norm || c.aliases.some((a) => norm.includes(normalizeArabic(a)))) {
      return c.id;
    }
  }
  return 'white';
}

/**
 * Extract Egyptian license plate letters and numbers
 */
export function parseEgyptianPlate(plateStr?: string | null): { letters: string; numbers: string; full: string } {
  if (!plateStr || !plateStr.trim()) {
    return { letters: 'س ج', numbers: '١٢٣', full: '' };
  }
  const cleaned = plateStr.trim();
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  // Match letters (Arabic / English)
  const lettersMatch = cleaned.match(/[\u0600-\u06FFa-zA-Z\s]+/g);
  // Match digits (Western or Eastern Arabic)
  const digitsMatch = cleaned.match(/[\d\u0660-\u0669]+/g);

  const letters = lettersMatch ? lettersMatch.join('').trim() : '';
  const rawDigits = digitsMatch ? digitsMatch.join('').trim() : '';

  // Convert digits to Eastern Arabic numerals for the visual plate
  const arabicNumbers = rawDigits.replace(/\d/g, (d) => easternDigits[parseInt(d, 10)]);

  return {
    letters: letters || 'س ج',
    numbers: arabicNumbers || '١٢٣',
    full: cleaned
  };
}

/**
 * Comprehensive vehicle detail extractor that recovers all fields
 * and ensures no data is lost or defaulted incorrectly.
 */
export function extractVehicleDetails(veh?: Vehicle | null) {
  if (!veh) {
    return {
      brand: '',
      model: '',
      year: '',
      color: '',
      colorKey: 'white',
      colorHex: '#FFFFFF',
      bodyType: 'سيدان',
      carTypeId: 'sedan' as 'sedan' | 'hatch' | 'suv' | 'van',
      plateRaw: '',
      letters: '',
      digits: '',
      imageUrl: ''
    };
  }

  // Plate
  const plateRaw = (veh.plate_number || veh.license_plate || '').trim();
  // Extract letters & digits
  const digitsMatch = plateRaw.match(/[0-9\u0660-\u0669]+/);
  const digits = veh.digits || (digitsMatch ? digitsMatch[0] : '');
  const letters = veh.letters || plateRaw.replace(/[0-9\u0660-\u0669]+/g, '').replace(/[\s-]+/g, ' ').trim();

  // Detect Body Type ('sedan' | 'hatch' | 'suv' | 'van')
  const typeStr = (veh.body_type || veh.vehicle_type || veh.type || '').toLowerCase();
  let carTypeId: 'sedan' | 'hatch' | 'suv' | 'van' = 'sedan';
  let bodyType = veh.body_type || 'سيدان';

  if (typeStr.includes('suv') || typeStr.includes('جيب')) {
    carTypeId = 'suv';
    bodyType = 'SUV / جيب';
  } else if (typeStr.includes('هاتش') || typeStr.includes('hatch')) {
    carTypeId = 'hatch';
    bodyType = 'هاتشباك';
  } else if (typeStr.includes('فان') || typeStr.includes('van')) {
    carTypeId = 'van';
    bodyType = 'فان';
  } else if (typeStr.includes('كوبيه') || typeStr.includes('coupe')) {
    carTypeId = 'sedan';
    bodyType = 'كوبيه';
  } else {
    carTypeId = 'sedan';
    bodyType = veh.body_type || 'سيدان';
  }

  // Brand Resolution
  // 1. If veh.brand is set and not empty, use it.
  // 2. Otherwise check veh.vehicle_type or veh.type if it contains the brand name (e.g. "كورفيت")
  let brand = (veh.brand || '').trim();
  let model = (veh.model || '').trim();

  const isGenericType = (str: string) => {
    const s = str.trim().toLowerCase();
    return !s || s === 'سيارة' || s === 'سيدان' || s === 'hatch' || s === 'suv' || s === 'van';
  };

  if (!brand) {
    const candidateType = (veh.vehicle_type || veh.type || '').replace(/\([^)]*\)/g, '').trim();
    if (candidateType && !isGenericType(candidateType)) {
      // e.g. "كورفيت" or "نيسان قشقاي" or "مرسيدس C200"
      const words = candidateType.split(/\s+/);
      if (words.length === 1) {
        brand = words[0];
      } else if (words.length > 1) {
        brand = words[0];
        if (!model) {
          model = words.slice(1).join(' ');
        }
      }
    }
  }

  // Year
  const year = (veh.year || '').trim();

  // Color
  const color = (veh.color || '').trim();
  const colorKey = findColorKey(color);
  const colorHex = findColorHex(color);

  // Image
  const imageUrl = (veh.vehicle_image_url || veh.image_url || '').trim();

  return {
    brand,
    model,
    year,
    color,
    colorKey,
    colorHex,
    bodyType,
    carTypeId,
    plateRaw,
    letters,
    digits,
    imageUrl
  };
}

/**
 * Builds a safe update payload that preserves all existing non-empty values
 * and never clears any registered vehicle field.
 */
export function buildSafeVehicleUpdate(
  original: Vehicle,
  formData: {
    brand?: string;
    model?: string;
    year?: string;
    color?: string;
    bodyType?: string;
    plate?: string;
    letters?: string;
    digits?: string;
    imageUrl?: string;
  }
): Partial<Vehicle> {
  const updates: Partial<Vehicle> = {
    id: original.id
  };

  // Brand: never empty if originally had one
  const newBrand = formData.brand?.trim();
  if (newBrand) {
    updates.brand = newBrand;
  } else if (original.brand) {
    updates.brand = original.brand;
  } else {
    // If original had name in vehicle_type
    const extracted = extractVehicleDetails(original);
    if (extracted.brand) updates.brand = extracted.brand;
  }

  // Model: update if set, keep existing if not
  const newModel = formData.model?.trim();
  if (newModel) {
    updates.model = newModel;
  } else if (original.model) {
    updates.model = original.model;
  }

  // Year: update if set, keep existing if not
  const newYear = formData.year?.trim();
  if (newYear && newYear !== '—') {
    updates.year = newYear;
  } else if (original.year) {
    updates.year = original.year;
  }

  // Color: update if set, keep existing if not
  const newColor = formData.color?.trim();
  if (newColor) {
    updates.color = newColor;
  } else if (original.color) {
    updates.color = original.color;
  }

  // Plate: update if set, keep existing if not
  const newPlate = formData.plate?.trim();
  if (newPlate) {
    updates.plate_number = newPlate;
    updates.license_plate = newPlate;
  } else if (original.plate_number || original.license_plate) {
    updates.plate_number = original.plate_number || original.license_plate;
    updates.license_plate = original.plate_number || original.license_plate;
  }

  if (formData.letters !== undefined) {
    updates.letters = formData.letters.trim();
  } else if (original.letters) {
    updates.letters = original.letters;
  }

  if (formData.digits !== undefined) {
    updates.digits = formData.digits.trim();
  } else if (original.digits) {
    updates.digits = original.digits;
  }

  if (formData.bodyType !== undefined) {
    updates.body_type = formData.bodyType.trim();
  } else if (original.body_type) {
    updates.body_type = original.body_type;
  }

  // Image: update if set, keep existing if not
  const newImg = formData.imageUrl?.trim();
  if (newImg) {
    updates.vehicle_image_url = newImg;
    updates.image_url = newImg;
  } else if (original.vehicle_image_url || original.image_url) {
    updates.vehicle_image_url = original.vehicle_image_url || original.image_url;
    updates.image_url = original.vehicle_image_url || original.image_url;
  }

  // Composite vehicle_type: ensure car brand & model are preserved
  const effectiveBrand = updates.brand || original.brand || '';
  const effectiveModel = updates.model || original.model || '';
  const effectiveBody = formData.bodyType?.trim() || original.body_type || 'سيدان';

  const parts = [effectiveBrand, effectiveModel, `(${effectiveBody})`].filter(Boolean);
  updates.vehicle_type = parts.join(' ') || effectiveBrand || original.vehicle_type || 'سيارة';
  updates.type = updates.vehicle_type;

  return updates;
}
