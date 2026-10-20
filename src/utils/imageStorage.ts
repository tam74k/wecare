export const BUCKET_NAME = 'carwash-assets';

/**
 * ضغط الصورة في المتصفح لتقليص مساحة التخزين بدون فقدان ملحوظ للجودة
 * @param file ملف الصورة الأصلي المرفوع
 * @param maxWidth أقصى عرض بالبكسل
 * @param quality جودة الضغط من 0 إلى 1
 */
export const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('فشل معالجة أبعاد الصورة'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // التصدير بصيغة WebP لتوفير أعلى نسبة ضغط بأفضل نقاء
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) resolve(jpegBlob);
                  else reject(new Error('فشل ضغط الصورة'));
                },
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * استخراج مسار الملف (دالة مساعدة للتوافق العكسي)
 */
export const extractPathFromStorageUrl = (url: string): string | null => {
  return url || null;
};

/**
 * معالجة وضغط الصورة وحفظها كـ Data URL مضغوط WebP محلياً في قاعدة البيانات
 * دون الحاجة لأي سحابة أو خدمة خارجية
 */
export const uploadStorageAsset = async (
  file: File,
  folder: 'logos' | 'vehicles' | 'employees' | 'ads' | 'store_products' | 'store_receipts' | string,
  _oldUrl?: string,
  customMaxWidthOrOptions?: number | { maxWidth?: number; quality?: number; format?: string },
  customQuality?: number
): Promise<string> => {
  let targetMaxWidth: number | undefined;
  let targetQuality: number | undefined;

  if (typeof customMaxWidthOrOptions === 'object' && customMaxWidthOrOptions !== null) {
    targetMaxWidth = customMaxWidthOrOptions.maxWidth;
    targetQuality = customMaxWidthOrOptions.quality;
  } else {
    targetMaxWidth = customMaxWidthOrOptions;
    targetQuality = customQuality;
  }

  const maxWidth =
    targetMaxWidth ||
    (folder === 'logos'
      ? 400
      : folder === 'employees'
      ? 600
      : folder === 'ads'
      ? 1000
      : folder === 'store_products'
      ? 800
      : 700);

  // ضغط فائق الجودة والحجم بصيغة WebP الحديثة (0.65 إلى 0.7 تمنح ضغطاً يصل لـ 85-90% مع وضوح عالي للوثائق)
  const quality = targetQuality !== undefined ? targetQuality : 0.68;
  const compressedBlob = await compressImage(file, maxWidth, quality);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(compressedBlob);
    reader.onloadend = () => resolve(reader.result as string);
  });
};
