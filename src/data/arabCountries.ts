export interface ArabCountry {
  name: string;
  currencySymbol: string;
  currencyCode: string;
  dialCode: string; // بدون + وبدون 00 لاستخدامه لاحقاً في واتساب
}

export const ARAB_COUNTRIES: ArabCountry[] = [
  { name: 'مصر', currencySymbol: 'ج.م', currencyCode: 'EGP', dialCode: '20' },
  { name: 'المملكة العربية السعودية', currencySymbol: 'ر.س', currencyCode: 'SAR', dialCode: '966' },
  { name: 'الإمارات العربية المتحدة', currencySymbol: 'د.إ', currencyCode: 'AED', dialCode: '971' },
  { name: 'الكويت', currencySymbol: 'د.ك', currencyCode: 'KWD', dialCode: '965' },
  { name: 'قطر', currencySymbol: 'ر.ق', currencyCode: 'QAR', dialCode: '974' },
  { name: 'البحرين', currencySymbol: 'د.ب', currencyCode: 'BHD', dialCode: '973' },
  { name: 'سلطنة عمان', currencySymbol: 'ر.ع', currencyCode: 'OMR', dialCode: '968' },
  { name: 'الأردن', currencySymbol: 'د.أ', currencyCode: 'JOD', dialCode: '962' },
  { name: 'العراق', currencySymbol: 'د.ع', currencyCode: 'IQD', dialCode: '964' },
  { name: 'لبنان', currencySymbol: 'ل.ل', currencyCode: 'LBP', dialCode: '961' },
  { name: 'فلسطين', currencySymbol: 'ش.ج', currencyCode: 'ILS', dialCode: '970' },
  { name: 'سوريا', currencySymbol: 'ل.س', currencyCode: 'SYP', dialCode: '963' },
  { name: 'اليمن', currencySymbol: 'ر.ي', currencyCode: 'YER', dialCode: '967' },
  { name: 'ليبيا', currencySymbol: 'د.ل', currencyCode: 'LYD', dialCode: '218' },
  { name: 'السودان', currencySymbol: 'ج.س', currencyCode: 'SDG', dialCode: '249' },
  { name: 'تونس', currencySymbol: 'د.ت', currencyCode: 'TND', dialCode: '216' },
  { name: 'الجزائر', currencySymbol: 'د.ج', currencyCode: 'DZD', dialCode: '213' },
  { name: 'المغرب', currencySymbol: 'د.م', currencyCode: 'MAD', dialCode: '212' },
  { name: 'موريتانيا', currencySymbol: 'أ.م', currencyCode: 'MRU', dialCode: '222' },
  { name: 'الصومال', currencySymbol: 'ش.ص', currencyCode: 'SOS', dialCode: '252' },
  { name: 'جيبوتي', currencySymbol: 'ف.ج', currencyCode: 'DJF', dialCode: '253' },
  { name: 'جزر القمر', currencySymbol: 'ف.ق', currencyCode: 'KMF', dialCode: '269' }
];
