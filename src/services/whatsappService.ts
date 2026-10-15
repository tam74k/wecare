import { Settings } from '../types/database';

export interface WhatsAppSendResult {
  success: boolean;
  isNotOnWhatsApp?: boolean;
  error?: string;
  details?: any;
}

/**
 * تنسيق رقم الهاتف ليناسب معايير الإرسال الدولي لواتساب
 */
export function formatWhatsAppNumber(phone: string, dialCode: string = '20'): string {
  let clean = phone.replace(/[^0-9]/g, '');
  const cleanDial = dialCode.replace(/[^0-9]/g, '') || '20';

  if (!clean) return '';

  // إذا بدأ الرقم بـ 00، احذفه
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }

  // إذا كان الرقم مصري أو عربي ويبدأ بصفر محلي (مثال: 01012345678)
  if (clean.startsWith('0')) {
    clean = `${cleanDial}${clean.slice(1)}`;
  } else if (!clean.startsWith(cleanDial) && clean.length <= 10) {
    clean = `${cleanDial}${clean}`;
  }

  return clean;
}

/**
 * استخراج عنوان خادم Evolution API ومعرف الـ Instance
 */
export function parseEvolutionEndpoint(instanceConfig: string): { url: string; instance: string } {
  const trimmed = (instanceConfig || '').trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const origin = parsed.origin;
      const parts = parsed.pathname.split('/').filter(Boolean);

      // إذا كان الرابط يحتوي بالفعل على مسار sendText
      if (parsed.pathname.includes('/message/sendText')) {
        return {
          url: trimmed,
          instance: parts[parts.length - 1] || 'instance'
        };
      }

      // إذا كان الرابط بالشكل https://evo.domain.com/my-instance
      if (parts.length > 0) {
        const inst = parts[parts.length - 1];
        return {
          url: `${origin}/message/sendText/${inst}`,
          instance: inst
        };
      }

      // إذا كان الرابط فقط الدومين https://evo.domain.com
      return {
        url: `${origin}/message/sendText/default`,
        instance: 'default'
      };
    } catch {
      return {
        url: `${trimmed}/message/sendText/default`,
        instance: 'default'
      };
    }
  }

  // إذا كان المدخل اسم instance فقط (مثل: wecare-bot)
  const baseEnv = (import.meta as any).env?.VITE_EVOLUTION_API_URL || 'http://localhost:8080';
  const cleanBase = baseEnv.replace(/\/+$/, '');
  return {
    url: `${cleanBase}/message/sendText/${trimmed}`,
    instance: trimmed
  };
}

/**
 * إرسال رسالة نصية عامة عبر Evolution API
 */
export async function sendEvolutionWhatsAppText(
  phone: string,
  messageText: string,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const instanceConfig = settings.whatsapp_instance?.trim();
  const apiKey = settings.whatsapp_api_key?.trim();

  // فحص توافر بيانات الربط
  if (!instanceConfig || !apiKey) {
    return {
      success: false,
      error: 'بيانات ربط واتساب (Instance / API Key) غير مكتملة في إعدادات النظام'
    };
  }

  const formattedNumber = formatWhatsAppNumber(phone, settings.dial_code || '20');
  if (!formattedNumber || formattedNumber.length < 8) {
    return {
      success: false,
      error: 'رقم الهاتف غير صالح للإرسال'
    };
  }

  const { url } = parseEvolutionEndpoint(instanceConfig);

  const payload = {
    number: formattedNumber,
    text: messageText,
    options: {
      delay: 1200,
      presence: 'composing',
      linkPreview: false
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500); // مهلة 8.5 ثوانٍ كحد أقصى

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        apiKey: apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseData = await response.json().catch(() => null);

    if (response.ok) {
      // فحص هل الرقم غير موجود في واتساب
      if (
        responseData?.exists === false ||
        responseData?.response?.message === 'The number does not exist on whatsapp' ||
        responseData?.message?.includes?.('does not exist')
      ) {
        return {
          success: false,
          isNotOnWhatsApp: true,
          error: 'الرقم المسجل غير مشترك في تطبيق واتساب'
        };
      }

      return {
        success: true,
        details: responseData
      };
    } else {
      const errorMsg =
        responseData?.message ||
        responseData?.error ||
        responseData?.response?.message ||
        `فشل الإرسال (رمز الحالة: ${response.status})`;

      const isNotOnWa =
        typeof errorMsg === 'string' &&
        (errorMsg.toLowerCase().includes('not exist') ||
          errorMsg.toLowerCase().includes('invalid number') ||
          errorMsg.toLowerCase().includes('whatsapp'));

      return {
        success: false,
        isNotOnWhatsApp: isNotOnWa,
        error: errorMsg,
        details: responseData
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'انتهت مهلة الاتصال بخادم واتساب (تأكد من عمل الخادم والإنترنت)'
      };
    }
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء الاتصال بخادم واتساب'
    };
  }
}

/**
 * إرسال رسالة كود التحقق OTP عبر Evolution API المسجل في النظام
 */
export async function sendEvolutionWhatsAppOtp(
  phone: string,
  otpCode: string,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const company = settings.company_name || 'وي كير';
  const messageText = `رمز التحقق الخاص بك لتسجيل الدخول في ${company} هو:\n\n*${otpCode}*\n\n⏱️ صلاحية الكود: دقيقتان فقط.\nيرجى عدم مشاركة هذا الرمز مع أي شخص.`;
  return sendEvolutionWhatsAppText(phone, messageText, settings);
}

/**
 * بيانات إشعار إتمام الغسلة / الزيارة
 */
export interface VisitCompletionMessageData {
  customerName: string;
  phone: string;
  serviceName?: string;
  vehicleDetails?: string;
  buildingDetails?: string;
  workerName?: string;
  visitDate: string;
  visitTime?: string;
  notes?: string;
  portalUrl?: string;
}

/**
 * صياغة رسالة إتمام الزيارة وطلب التقييم
 */
export function formatVisitCompletionMessage(data: VisitCompletionMessageData, companyName: string): string {
  const company = companyName || 'وي كير لخدمات الغسيل';
  const name = data.customerName || 'عميلنا العزيز';

  let details = '';
  if (data.serviceName) {
    details += `\n• *نوع الخدمة:* ${data.serviceName}`;
  }
  if (data.vehicleDetails) {
    details += `\n• *المركبة:* ${data.vehicleDetails}`;
  }
  if (data.buildingDetails) {
    details += `\n• *الموقع/العمارة:* ${data.buildingDetails}`;
  }
  if (data.visitDate) {
    const timeStr = data.visitTime ? ` (${data.visitTime})` : '';
    details += `\n• *تاريخ الإتمام:* ${data.visitDate}${timeStr}`;
  }
  if (data.workerName) {
    details += `\n• *فني الغسيل:* ${data.workerName}`;
  }
  if (data.notes && data.notes.trim()) {
    details += `\n• *ملاحظات الخدمة:* ${data.notes.trim()}`;
  }

  const url = data.portalUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    `مرحباً أ/ *${name}* ✨\n\n` +
    `يسعدنا إبلاغك بأنه تم الانتهاء من تنفيذ خدمة الغسيل بنجاح اليوم بواسطة فريق *${company}* 🚗✨\n\n` +
    `📋 *بيانات وتفاصيل الغسلة:*` +
    `${details}\n\n` +
    `⭐⭐⭐⭐⭐ *رأيك يهمنا دائماً!*\n` +
    `نرجو منك التكرم بالدخول إلى حسابك لتقييم مستوى الخدمة ومشاركتنا تعليقك (من 1 إلى 5 نجوم):\n` +
    `${url ? `🔗 *رابط الدخول والتقييم:*\n${url}\n\n` : ''}` +
    `شكراً لثقتكم واختياركم *${company}* 💙`
  );
}

/**
 * إرسال تفاصيل الزيارة المكتملة وطلب التقييم للعميل عبر واتساب
 */
export async function sendEvolutionWhatsAppVisitCompleted(
  data: VisitCompletionMessageData,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const companyName = settings.company_name || 'وي كير';
  const messageText = formatVisitCompletionMessage(data, companyName);
  return sendEvolutionWhatsAppText(data.phone, messageText, settings);
}

/**
 * توليد رابط محادثة واتساب مباشر محمل بنص الرسالة (wa.me)
 */
export function generateWhatsAppChatLink(phone: string, messageText: string, dialCode: string = '20'): string {
  const formatted = formatWhatsAppNumber(phone, dialCode);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(messageText)}`;
}

/**
 * بيانات إشعار تأجيل الزيارة / الغسلة
 */
export interface VisitPostponementMessageData {
  customerName: string;
  phone: string;
  serviceName?: string;
  vehicleDetails?: string;
  buildingDetails?: string;
  oldDate?: string;
  newDate: string;
  newTime?: string;
  reason: string;
  workerNote?: string;
  portalUrl?: string;
}

/**
 * صياغة رسالة إشعار تأجيل الزيارة والموعد الجديد
 */
export function formatVisitPostponementMessage(data: VisitPostponementMessageData, companyName: string): string {
  const company = companyName || 'وي كير لخدمات الغسيل';
  const name = data.customerName || 'عميلنا العزيز';

  let details = '';
  if (data.serviceName) {
    details += `\n• *نوع الخدمة:* ${data.serviceName}`;
  }
  if (data.vehicleDetails) {
    details += `\n• *السيارة:* ${data.vehicleDetails}`;
  }
  if (data.buildingDetails) {
    details += `\n• *الموقع:* ${data.buildingDetails}`;
  }
  if (data.oldDate) {
    details += `\n• *الموعد السابق:* ${data.oldDate}`;
  }
  const timeStr = data.newTime ? ` (${data.newTime})` : '';
  details += `\n• *الموعد الجديد المقرر:* ${data.newDate}${timeStr}`;
  if (data.reason) {
    details += `\n• *سبب التأجيل:* ${data.reason}`;
  }
  if (data.workerNote && data.workerNote.trim()) {
    details += `\n• *ملاحظات إضافية:* ${data.workerNote.trim()}`;
  }

  const url = data.portalUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    `مرحباً أ/ *${name}* 🌸\n\n` +
    `نود إحاطة سيادتكم بأنه تم تأجيل موعد زيارة الغسيل لسيارتكم ونقلها للموعد الجديد التالي:\n\n` +
    `📋 *بيانات التأجيل والموعد الجديد:*` +
    `${details}\n\n` +
    `نعتذر عن أي إزعاج، ونحرص دائماً على تقديم الخدمة بأعلى معايير الجودة والعناية بسيارتكم 🚗✨\n\n` +
    `${url ? `🔗 *لمتابعة جدول مواعيدك وحسابك:*\n${url}\n\n` : ''}` +
    `لأي استفسار يسعدنا دائماً تواصلكم معنا.\n` +
    `شكراً لتفهمكم المستمر لفريق *${company}* 💙`
  );
}

/**
 * إرسال إشعار تأجيل الزيارة للعميل عبر واتساب
 */
export async function sendEvolutionWhatsAppVisitPostponed(
  data: VisitPostponementMessageData,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const companyName = settings.company_name || 'وي كير';
  const messageText = formatVisitPostponementMessage(data, companyName);
  return sendEvolutionWhatsAppText(data.phone, messageText, settings);
}

