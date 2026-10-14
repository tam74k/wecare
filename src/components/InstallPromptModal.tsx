import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  X,
  Share2,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __wecareDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export const InstallPromptModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed and opened from Home Screen)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode);
    if (isInStandaloneMode) {
      return; // Already running as an installed PWA
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for Chromium/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      window.__wecareDeferredPrompt = promptEvent;

      // Check if user has already seen and dismissed prompt
      const dismissedTimestamp = localStorage.getItem('wecare_pwa_prompt_dismissed');
      const alreadyInstalled = localStorage.getItem('wecare_pwa_installed');

      if (!alreadyInstalled) {
        // If not dismissed, or dismissed more than 3 days ago, show modal
        if (!dismissedTimestamp || Date.now() - parseInt(dismissedTimestamp, 10) > 3 * 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            setIsOpen(true);
          }, 1500);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS or browsers where beforeinstallprompt doesn't fire, check first time visit
    const dismissedTimestamp = localStorage.getItem('wecare_pwa_prompt_dismissed');
    const alreadyInstalled = localStorage.getItem('wecare_pwa_installed');

    if (!alreadyInstalled && (!dismissedTimestamp || Date.now() - parseInt(dismissedTimestamp, 10) > 3 * 24 * 60 * 60 * 1000)) {
      // Small timeout to allow initial render
      const timer = setTimeout(() => {
        // If beforeinstallprompt hasn't opened it yet (e.g. on iOS Safari or desktop)
        setIsOpen(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // 4. Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalledSuccess(true);
      localStorage.setItem('wecare_pwa_installed', 'true');
      setDeferredPrompt(null);
      window.__wecareDeferredPrompt = null;
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Global trigger event to open install prompt anytime from a button
    const handleOpenTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('wecare:open-install-prompt', handleOpenTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('wecare:open-install-prompt', handleOpenTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    // If on iOS -> Show visual iOS installation guide
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    // If we have the captured beforeinstallprompt event
    const promptEvent = deferredPrompt || window.__wecareDeferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalledSuccess(true);
          localStorage.setItem('wecare_pwa_installed', 'true');
          setTimeout(() => {
            setIsOpen(false);
          }, 2500);
        } else {
          handleDismiss();
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setShowAndroidGuide(true);
      }
    } else {
      // If beforeinstallprompt is not available (e.g. Firefox, Samsung Internet in certain modes)
      setShowAndroidGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setShowIosGuide(false);
    setShowAndroidGuide(false);
    // Remember dismissal
    localStorage.setItem('wecare_pwa_prompt_dismissed', Date.now().toString());
  };

  const handleNeverShowAgain = () => {
    setIsOpen(false);
    localStorage.setItem('wecare_pwa_prompt_dismissed', (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
  };

  if (!isOpen || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div
        className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-slideUp sm:animate-scaleUp max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with App Branding */}
        <div className="relative bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 p-6 text-white text-center overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-sky-500/20 rounded-full blur-2xl pointer-events-none"></div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Icon Badge */}
          <div className="relative inline-flex items-center justify-center mx-auto mb-3">
            <div className="w-20 h-20 rounded-2xl bg-teal-600 p-1 shadow-xl shadow-teal-950/40 border-2 border-teal-400/30 flex items-center justify-center overflow-hidden">
              <img
                src="/icons/icon-192.png"
                alt="WeCare App Icon"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  // Fallback if image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-full shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>

          <h2 className="text-xl font-black text-white">تثبيت تطبيق وي كير</h2>
          <p className="text-xs text-teal-200/90 font-medium mt-1">
            نظام إدارة خدمات واشتراكات الغسيل المتنقل
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {isInstalledSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-slate-800">تم تثبيت التطبيق بنجاح!</h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                تمت إضافة أيقونة وي كير إلى الشاشة الرئيسية لهاتفك. يمكنك الآن فتح التطبيق مباشرة في أي وقت.
              </p>
            </div>
          ) : showIosGuide ? (
            /* iOS Specific Step-by-Step Installation Guide */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-sm bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                <Smartphone className="w-4 h-4 text-teal-600 shrink-0" />
                <span>طريقة التثبيت على أجهزة آيفون (iOS Safari):</span>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">اضغط على زر المشاركة</span>
                    <span>في أسفل متصفح Safari، اضغط على زر المشاركة (المربع الذي يخرج منه سهم للأعلى </span>
                    <Share2 className="w-3.5 h-3.5 inline-block text-teal-600 mx-1" />
                    <span>).</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">اختر "إضافة إلى الشاشة الرئيسية"</span>
                    <span>مرر القائمة لأسفل ثم اضغط على </span>
                    <strong className="text-slate-900 inline-flex items-center gap-1 font-black">
                      <PlusSquare className="w-3.5 h-3.5 text-teal-600" />
                      إضافة إلى الشاشة الرئيسية (Add to Home Screen)
                    </strong>
                    <span>.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">تأكيد الإضافة</span>
                    <span>اضغط على كلمة <strong>"إضافة" (Add)</strong> في أعلى يمين الشاشة لإضافة أيقونة وي كير لهاتفك.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  الرجوع
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  حسناً، فهمت
                </button>
              </div>
            </div>
          ) : showAndroidGuide ? (
            /* Android Fallback Guide (If browser suppressed prompt) */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-sm bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
                <span>طريقة التثبيت عبر المتصفح يدوياً:</span>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">افتح قائمة المتصفح</span>
                    <span>اضغط على زر الخيارات (النقاط الثلاث <strong>⋮</strong>) في أعلى أو أسفل المتصفح.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">اختر "تثبيت التطبيق"</span>
                    <span>اضغط على خيار <strong>"تثبيت التطبيق" (Install app)</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAndroidGuide(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  الرجوع
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  حسناً، تم
                </button>
              </div>
            </div>
          ) : (
            /* Main Install Invitation View */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <span>تطبيق سريع وسهل على شاشة جوالك</span>
                </div>
                <p>
                  ثبّت تطبيق <strong>وي كير</strong> الآن على هاتفك للوصول المباشر والفوري دون الحاجة لفتح المتصفح أو كتابة الرابط في كل مرة:
                </p>
                <ul className="space-y-1.5 pt-1 text-slate-700 font-medium list-none">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>أيقونة خاصة على الشاشة الرئيسية مثل أي تطبيق هاتف.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>يعمل بشاشة كاملة وسرعة فائقة بدون أشرطة المتصفح.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>متابعة فورية لغسلات سيارتك ومواعيد اشتراكك.</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 transition-all cursor-pointer transform active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت التطبيق على الشاشة الرئيسية</span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="flex-1 py-2.5 px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    لاحقاً
                  </button>
                  <button
                    type="button"
                    onClick={handleNeverShowAgain}
                    className="py-2.5 px-3 text-slate-400 hover:text-slate-600 font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    عدم الإظهار مجدداً
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
