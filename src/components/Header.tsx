import React from 'react';
import { Settings, AuthUser } from '../types/database';
import { Globe, Coins, Calendar, User, LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  settings: Settings;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, currentUser, onLogout, onOpenSettings }) => {
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
              // fallback image if broken
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
