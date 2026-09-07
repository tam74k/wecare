import React from 'react';
import { Settings } from '../types/database';
import { Globe, Coins, Calendar } from 'lucide-react';

interface HeaderProps {
  settings: Settings;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, onOpenSettings }) => {
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

      {/* Status Badges & Quick Meta */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>{todayDate}</span>
        </div>

        {/* Status Indicator */}
        <div className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border bg-emerald-50 text-emerald-800 border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>حالة النظام: نشط ومتصل</span>
        </div>
      </div>
    </header>
  );
};
