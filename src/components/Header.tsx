import React, { useState, useRef, useEffect } from 'react';
import { Settings, AuthUser, SystemNotification } from '../types/database';
import { Globe, Coins, Calendar, User, LogOut, Shield, Bell, Star, CheckCheck, MessageSquare, Clock, X, Info, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  settings: Settings;
  currentUser?: AuthUser | null;
  notifications?: SystemNotification[];
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onMarkNotificationAsRead?: (id: string) => Promise<void>;
  onMarkAllNotificationsAsRead?: () => Promise<void>;
  onNavigateNotification?: (notification: SystemNotification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  notifications = [],
  onLogout,
  onOpenSettings,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onNavigateNotification
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  const todayDate = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <header className="h-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Company Name & Logo */}
      <div className="flex items-center gap-4">
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.company_name}
            className="w-12 h-12 rounded-xl object-cover border border-teal-200 shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=150&auto=format&fit=crop&q=80';
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-600 to-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            WC
          </div>
        )}
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {settings.company_name}
          </h2>
          {(settings.country || settings.currency_symbol) && (
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {settings.country && (
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>{settings.country}</span>
                </span>
              )}
              {settings.country && settings.currency_symbol && <span>•</span>}
              {settings.currency_symbol && (
                <span className="flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  <Coins className="w-3.5 h-3.5 text-teal-600" />
                  <span>العملة المعتمدة: {settings.currency_symbol} {settings.currency_code ? `(${settings.currency_code})` : ''}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Info & Quick Meta */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>{todayDate}</span>
        </div>

        {/* Notification Bell (Only for Staff / Admin) */}
        {currentUser && currentUser.role !== 'customer' && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-xl transition-all cursor-pointer border ${
                unreadCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={unreadCount > 0 ? `لديك ${unreadCount} إشعار جديد! اضغط للمشاهدة` : 'إشعارات وتنبيهات النظام'}
            >
              <Bell
                className={`w-5 h-5 transition-transform ${
                  unreadCount > 0 ? 'text-amber-600 animate-bell-ring' : 'text-slate-700'
                }`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-scaleUp text-right">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">إشعارات النظام</h4>
                      <p className="text-[11px] text-slate-500">
                        {unreadCount > 0 ? `${unreadCount} إشعار جديد غير مقروء` : 'لا توجد إشعارات جديدة'}
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 && onMarkAllNotificationsAsRead && (
                    <button
                      type="button"
                      onClick={() => onMarkAllNotificationsAsRead()}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>تحديد الكل كمقروء</span>
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {(!notifications || notifications.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold">صندوق الإشعارات فارغ حالياً</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read && onMarkNotificationAsRead) {
                            onMarkNotificationAsRead(notif.id);
                          }
                          if (onNavigateNotification) {
                            onNavigateNotification(notif);
                          }
                          setShowNotifications(false);
                        }}
                        className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 group ${
                          notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-teal-50/50 hover:bg-teal-50/80'
                        }`}
                      >
                        {/* Icon / Star badge */}
                        <div className="shrink-0 mt-0.5">
                          {notif.type === 'rating' ? (
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                              <Info className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {notif.title}
                            </span>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                            )}
                          </div>

                          {/* Star Rating Rendering */}
                          {notif.rating && (
                            <div className="flex items-center gap-1 my-1">
                              {Array.from({ length: 5 }, (_, i) => i + 1).map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= (notif.rating || 0)
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                              <span className="text-[11px] font-bold text-amber-700 mr-1">
                                {notif.rating} من 5
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-slate-600 leading-snug whitespace-pre-line mt-0.5">
                            {notif.message}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/80">
                            <span className="text-[10px] text-teal-700 font-bold group-hover:text-teal-900 flex items-center gap-0.5 transition-colors">
                              <span>انقر للانتقال للتفاصيل والاشتراك</span>
                              <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                            </span>

                            {notif.created_at && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(notif.created_at).toLocaleString('ar-EG', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current Logged In User Card */}
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-700 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-800 leading-tight">
                {currentUser.full_name}
              </div>
              <div className="text-[10px] font-bold mt-0.5">
                {currentUser.role === 'admin' && (
                  <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">مدير النظام</span>
                )}
                {currentUser.role === 'supervisor' && (
                  <span className="text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">مشرف مناطق</span>
                )}
                {currentUser.role === 'worker' && (
                  <span className="text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">فني غسيل</span>
                )}
                {currentUser.role === 'customer' && (
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">عميل</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 sm:px-3 sm:py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="تسجيل الخروج من الحساب"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        )}
      </div>
    </header>
  );
};

