import { Settings } from '../types/database';

export interface WhatsAppSendResult {
  success: boolean;
  isNotOnWhatsApp?: boolean;
  error?: string;
  details?: any;
}

export const DEFAULT_EVOLUTION_API_BASE_URL = 'https://evo.101488.xyz';

export const EVOLUTION_API_BASE_URL =
  ((import.meta as any).env?.VITE_EVOLUTION_API_URL || DEFAULT_EVOLUTION_API_BASE_URL).replace(/\/+$/, '');

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
export function parseEvolutionEndpoint(instanceConfig?: string): { url: string; instance: string; baseUrl: string } {
  const trimmed = (instanceConfig || '').trim();
  const defaultBase = EVOLUTION_API_BASE_URL;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const origin = parsed.origin;
      const parts = parsed.pathname.split('/').filter(Boolean);

      // إذا كان الرابط يحتوي بالفعل على مسار sendText
      if (parsed.pathname.includes('/message/sendText')) {
        const inst = parts[parts.length - 1] || 'default';
        return {
          url: trimmed,
          instance: inst,
          baseUrl: origin
        };
      }

      // إذا كان الرابط بالشكل https://evo.101488.xyz/my-instance
      if (parts.length > 0) {
        const inst = parts[parts.length - 1];
        return {
          url: `${origin}/message/sendText/${inst}`,
          instance: inst,
          baseUrl: origin
        };
      }

      // إذا كان الرابط فقط الدومين https://evo.101488.xyz
      return {
        url: `${origin}/message/sendText/default`,
        instance: 'default',
        baseUrl: origin
      };
    } catch {
      return {
        url: `${trimmed.replace(/\/+$/, '')}/message/sendText/default`,
        instance: 'default',
        baseUrl: defaultBase
      };
    }
  }

  // إذا كان المدخل اسم instance فقط (مثل: wecare أو instance-1) أو فارغ
  const instance = trimmed || 'default';
  return {
    url: `${defaultBase}/message/sendText/${instance}`,
    instance,
    baseUrl: defaultBase
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
  if (!apiKey) {
    return {
      success: false,
      error: 'مفتاح الـ Api key الخاص بسيرفر Evolution API غير محدد في إعدادات النظام'
    };
  }

  const formattedNumber = formatWhatsAppNumber(phone, settings.dial_code || '20');
  if (!formattedNumber || formattedNumber.length < 8) {
    return {
      success: false,
      error: 'رقم الهاتف غير صالح للإرسال'
    };
  }

  const company = settings.company_name?.trim() || 'وي كير';
  const companyBoldHeader = `*${company}*`;
  let processedText = messageText.trim();
  if (!processedText.startsWith(companyBoldHeader)) {
    processedText = `${companyBoldHeader}\n\n${processedText}`;
  }

  const { url, instance } = parseEvolutionEndpoint(instanceConfig);

  const payload = {
    number: formattedNumber,
    text: processedText,
    options: {
      delay: 1200,
      presence: 'composing',
      linkPreview: false
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // مهلة 9.5 ثوانٍ كحد أقصى

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        apiKey: apiKey,
        Authorization: `Bearer ${apiKey}`
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
  const company = settings.company_name?.trim() || 'وي كير';
  const messageText = `*${company}*\n\nرمز التحقق الخاص بك لتسجيل الدخول في ${company} هو:\n\n*${otpCode}*\n\n⏱️ صلاحية الكود: دقيقتان فقط.\nيرجى عدم مشاركة هذا الرمز مع أي شخص.`;
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
  const company = companyName?.trim() || 'وي كير لخدمات الغسيل';
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
    `*${company}*\n\n` +
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
    `*${company}*\n\n` +
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

/**
 * اختبار الاتصال بسيرفر Evolution API وإرسال رسالة تجريبية
 */
export async function testEvolutionConnection(
  targetPhone: string,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const company = settings.company_name?.trim() || 'وي كير';
  const testMsg = `اختبار الربط الناجح مع سيرفر Evolution API (${EVOLUTION_API_BASE_URL}) 🚀✨\nتم الاتصال بنجاح وتهيئة خدمة إرسال رسائل الواتساب لنظام *${company}*!`;
  return sendEvolutionWhatsAppText(targetPhone, testMsg, settings);
}

/**
 * بيانات طلب عرض سعر للمورد عبر واتساب
 */
export interface RfqMessageData {
  supplierName: string;
  phone: string;
  rfqNumber: string;
  rfqDate: string;
  items: Array<{
    itemName: string;
    unit: string;
    quantity: number;
    notes?: string;
  }>;
  notes?: string;
}

/**
 * تنسيق نص طلب عرض السعر للمورد
 */
export function formatRfqWhatsAppMessage(data: RfqMessageData, companyName: string): string {
  let itemsList = '';
  data.items.forEach((it, index) => {
    itemsList += `\n${index + 1}. *${it.itemName}* - الكمية: *${it.quantity}* (${it.unit})${it.notes ? ` - ملاحظة: ${it.notes}` : ''}`;
  });

  return (
    `*${companyName}*\n\n` +
    `السادة / *${data.supplierName}* المحترمين 🌸\n` +
    `تحية طيبة وبعد،،\n\n` +
    `نرجو من سيادتكم التكرم بموافاتنا بأفضل *عرض أسعار* ومواعيد التوريد للأصناف والكميات التالية:\n\n` +
    `📋 *بيانات طلب عرض السعر:*` +
    `\n• *رقم الطلب:* ${data.rfqNumber}` +
    `\n• *التاريخ:* ${data.rfqDate}\n\n` +
    `📦 *جدول الأصناف والكميات المطلوبة:*` +
    `${itemsList}\n\n` +
    `${data.notes ? `📝 *ملاحظات خاصة:*\n${data.notes}\n\n` : ''}` +
    `يرجى ملء خانة سعر الوحدة والإجمالي والرد علينا في أقرب وقت لتأكيد أمر التوريد.\n\n` +
    `مع خالص الشكر والتقدير،\n` +
    `*إدارة المشتريات والتوريد - ${companyName}* 🤝✨`
  );
}

/**
 * إرسال طلب عرض سعر للمورد عبر Evolution API
 */
export async function sendEvolutionWhatsAppRfq(
  data: RfqMessageData,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const companyName = settings.company_name || 'وي كير';
  const messageText = formatRfqWhatsAppMessage(data, companyName);
  return sendEvolutionWhatsAppText(data.phone, messageText, settings);
}

/**
 * بيانات أمر التوريد المعتمد للمورد عبر واتساب
 */
export interface PoMessageData {
  supplierName: string;
  phone: string;
  poNumber: string;
  poDate: string;
  items: Array<{
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  currencySymbol?: string;
  notes?: string;
}

/**
 * تنسيق نص أمر التوريد المعتمد للمورد
 */
export function formatPoWhatsAppMessage(data: PoMessageData, companyName: string): string {
  const currency = data.currencySymbol || 'ج.م';
  let itemsList = '';
  data.items.forEach((it, index) => {
    itemsList += `\n${index + 1}. *${it.itemName}* | الكمية: *${it.quantity}* ${it.unit} | السعر: *${it.unitPrice.toLocaleString()}* ${currency} | الإجمالي: *${it.totalPrice.toLocaleString()}* ${currency}`;
  });

  return (
    `*${companyName}*\n\n` +
    `السادة / *${data.supplierName}* المحترمين 🌸\n` +
    `تحية طيبة وبعد،،\n\n` +
    `يسرنا اعتماد وإرسال *أمر التوريد (Purchase Order)* التالي بناءً على الأسعار المتفق عليها:\n\n` +
    `📋 *بيانات أمر التوريد:*` +
    `\n• *رقم الأمر:* ${data.poNumber}` +
    `\n• *تاريخ الطلب:* ${data.poDate}\n\n` +
    `📦 *الأصناف والكميات المعتمدة للتوريد:*` +
    `${itemsList}\n\n` +
    `💰 *إجمالي أمر التوريد:* *${data.totalAmount.toLocaleString()} ${currency}*\n\n` +
    `${data.notes ? `📝 *ملاحظات التوريد والتسليم:*\n${data.notes}\n\n` : ''}` +
    `يرجى التكرم ببدء التجهيز وإشعارنا بموعد وصول الشحنة لإتمام الاستلام وإصدار الفاتورة.\n\n` +
    `شاكرين حسن تعاونكم الدائم،\n` +
    `*إدارة المشتريات - ${companyName}* 🤝🚚`
  );
}

/**
 * إرسال أمر التوريد للمورد عبر Evolution API
 */
export async function sendEvolutionWhatsAppPo(
  data: PoMessageData,
  settings: Settings
): Promise<WhatsAppSendResult> {
  const companyName = settings.company_name || 'وي كير';
  const messageText = formatPoWhatsAppMessage(data, companyName);
  return sendEvolutionWhatsAppText(data.phone, messageText, settings);
}


