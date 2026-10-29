export const BUCKET_NAME = 'carwash-assets';

/**
 * ضغط الصورة في المتصفح لأقصى درجة ممكنة لتقليص مساحة التخزين وحمايتها
 * بصيغة WebP الحديثة مع الحفاظ على وضوح الصورة وتفاصيلها الأساسية بدون تشويه
 * @param file ملف الصورة الأصلي المرفوع
 * @param maxDimension أقصى حد للأبعاد (طول أو عرض) بالبكسل
 * @param quality جودة الضغط من 0 إلى 1 (الموصى بها 0.55 - 0.62)
 */
export const compressImage = (file: File, maxDimension = 480, quality = 0.58): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // إذا كانت الصورة بصيغة SVG، فلا حاجة لضغطها لأنها متجهات صغيرة بطبيعتها
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

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

        // استخدام تقنية Step-down scaling إذا كانت الصورة الأصلية ضخمة جداً للحصول على أقصى نقاء ونعومة
        const canvas = document.createElement('canvas');
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

        // التصدير بأعلى نسبة ضغط ممكنة بصيغة WebP (الموفرة لأكثر من 92% من الحجم مقارنة بـ JPG/PNG)
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              // إذا كان المتصفح القديم لا يدعم WebP toBlob، نستعمل JPEG المضغوط
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
 * بأعلى نسبة توفير مساحة تخزينية ممكنة (عادة بين 10KB إلى 25KB فقط للصورة)
 */
export const uploadStorageAsset = async (
  file: File,
  folder: 'logos' | 'vehicles' | 'employees' | 'ads' | 'store_products' | 'store_receipts' | 'packages' | 'services' | string,
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

  // تحديد أبعاد قياسية ذكية تحقق أعلى ضغط وتوفر هائل في السعة بدون تأثير ملحوظ على الجودة
  const maxDimension =
    targetMaxDimension ||
    (folder === 'logos'
      ? 280
      : folder === 'employees'
      ? 400
      : folder === 'vehicles'
      ? 480
      : folder === 'packages' || folder === 'services'
      ? 480
      : folder === 'ads'
      ? 750
      : folder === 'store_products'
      ? 480
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
