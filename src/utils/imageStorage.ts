export const BUCKET_NAME = 'carwash-assets';

/**
 * ضغط الصورة في المتصفح لأقصى درجة ممكنة لتقليص مساحة التخزين وحمايتها
 * بصيغة WebP الحديثة مع الحفاظ على وضوح الصورة وتفاصيلها الأساسية
 * @param file ملف الصورة الأصلي المرفوع
 * @param maxDimension أقصى حد للأبعاد (طول أو عرض) بالبكسل
 * @param quality جودة الضغط من 0 إلى 1 (الموصى بها 0.55 - 0.62)
 */
export const compressImage = (file: File, maxDimension = 500, quality = 0.58): Promise<Blob> => {
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

        // تقليص الأبعاد بالتناسب بحيث لا يتجاوز العرض ولا الارتفاع الحد الأقصى
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('فشل معالجة أبعاد الصورة'));
          return;
        }

        // تمكين التنعيم المتقدم عالي الجودة أثناء التصغير
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // التصدير بأعلى نسبة ضغط ممكنة بصيغة WebP (الموفرة لأكثر من 90% من الحجم)
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
 * بأعلى نسبة توفير مساحة تخزينية ممكنة (عادة بين 10KB إلى 30KB فقط للصورة)
 */
export const uploadStorageAsset = async (
  file: File,
  folder: 'logos' | 'vehicles' | 'employees' | 'ads' | 'store_products' | 'store_receipts' | string,
  _oldUrl?: string,
  customMaxWidthOrOptions?: number | { maxWidth?: number; quality?: number; format?: string },
  customQuality?: number
): Promise<string> => {
  let targetMaxDimension: number | undefined;
  let targetQuality: number | undefined;

  if (typeof customMaxWidthOrOptions === 'object' && customMaxWidthOrOptions !== null) {
    targetMaxDimension = customMaxWidthOrOptions.maxWidth;
    targetQuality = customMaxWidthOrOptions.quality;
  } else {
    targetMaxDimension = customMaxWidthOrOptions;
    targetQuality = customQuality;
  }

  // تحديد أبعاد قياسية ذكية تحقق أعلى ضغط وتوفر هائل في السعة
  const maxDimension =
    targetMaxDimension ||
    (folder === 'logos'
      ? 300
      : folder === 'employees'
      ? 450
      : folder === 'vehicles'
      ? 480
      : folder === 'ads'
      ? 750
      : folder === 'store_products'
      ? 500
      : 480);

  // ضغط فائق لاستهلاك أقل مساحة تخزين (تصل لـ 95% توفير)
  const quality = targetQuality !== undefined ? targetQuality : 0.58;
  const compressedBlob = await compressImage(file, maxDimension, quality);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(compressedBlob);
    reader.onloadend = () => resolve(reader.result as string);
  });
};
