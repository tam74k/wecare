import { supabase } from '../lib/supabase';

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
              // بديل JPEG
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
 * استخراج مسار الملف داخل الـ Bucket من الرابط الكامل
 */
export const extractPathFromStorageUrl = (url: string): string | null => {
  if (!url || !url.includes(BUCKET_NAME)) return null;
  const parts = url.split(`${BUCKET_NAME}/`);
  return parts[1] ? parts[1].split('?')[0] : null;
};

/**
 * رفع الأصل (شعار أو صورة مركبة) إلى Supabase Storage بعد ضغطه مع حذف القديم
 */
export const uploadStorageAsset = async (
  file: File,
  folder: 'logos' | 'vehicles' | 'employees',
  oldUrl?: string
): Promise<string> => {
  // 1. ضغط الصورة أولاً
  const maxWidth = folder === 'logos' ? 400 : folder === 'employees' ? 800 : 900;
  const compressedBlob = await compressImage(file, maxWidth, 0.82);

  const fileExt = 'webp';
  const fileName = `${folder}/${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  // 2. محاولة الحفظ في Supabase Storage
  if (supabase) {
    try {
      // حذف الشعار / الصورة القديمة إن وُجدت لمنع تراكم الملفات في السحابة
      if (oldUrl) {
        const oldPath = extractPathFromStorageUrl(oldUrl);
        if (oldPath) {
          await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
        }
      }

      // رفع الملف المضغوط الجديد
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, compressedBlob, {
          contentType: 'image/webp',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Storage upload fallback to data URL', e);
    }
  }

  // 3. في حال عدم تفعيل السحابة أو أثناء التطوير، تحويل الملف المضغوط إلى Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(compressedBlob);
    reader.onloadend = () => resolve(reader.result as string);
  });
};
