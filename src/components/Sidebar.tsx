import React from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  CalendarDays,
  CreditCard,
  Boxes,
  Truck,
  FileBarChart,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  UserCheck,
  Megaphone,
  ShoppingBag,
  Building,
  Settings as SettingsIcon
} from 'lucide-react';
import { Settings as DatabaseSettings, AuthUser } from '../types/database';
import { LogOut, User, Smartphone } from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'subscriptions'
  | 'subscriptions_cars'
  | 'subscriptions_buildings'
  | 'subscriptions_public'
  | 'calendar'
  | 'customers'
  | 'packages'
  | 'finance'
  | 'inventory'
  | 'suppliers'
  | 'employees'
  | 'permissions'
  | 'reports'
  | 'advertisements'
  | 'store'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount?: number;
  pendingCarsCount?: number;
  pendingBuildingsCount?: number;
  pendingPublicCount?: number;
  pendingOrdersCount?: number;
  settings: DatabaseSettings;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  pendingCarsCount = 0,
  pendingBuildingsCount = 0,
  pendingPublicCount = 0,
  pendingOrdersCount = 0,
  settings,
  currentUser,
  onLogout
}) => {
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'لوحة التحكم', icon: LayoutDashboard },
    {
      id: 'subscriptions_cars' as ActiveTab,
      label: 'اشتراكات السيارات',
      icon: Car,
      badge: pendingCarsCount > 0 ? pendingCarsCount : null
    },
    {
      id: 'subscriptions_buildings' as ActiveTab,
      label: 'اشتراكات العمارات',
      icon: Building,
      badge: pendingBuildingsCount > 0 ? pendingBuildingsCount : null
    },
    {
      id: 'subscriptions_public' as ActiveTab,
      label: 'اشتراكات الخدمات العامة',
      icon: Sparkles,
      badge: pendingPublicCount > 0 ? pendingPublicCount : null
    },
    { id: 'calendar' as ActiveTab, label: 'الرزنامة والجدولة', icon: CalendarDays },
    { id: 'customers' as ActiveTab, label: 'العملاء والمركبات', icon: Users },
    { id: 'packages' as ActiveTab, label: 'الباقات والتسعير المرن', icon: Package },
    { id: 'finance' as ActiveTab, label: 'المالية والخزائن', icon: CreditCard },
    { id: 'inventory' as ActiveTab, label: 'المخزون والمعدات', icon: Boxes },
    { id: 'suppliers' as ActiveTab, label: 'الموردين والحسابات', icon: Truck },
    { id: 'employees' as ActiveTab, label: 'الموظفين', icon: UserCheck },
    { id: 'permissions' as ActiveTab, label: 'مستخدمو النظام والصلاحيات', icon: ShieldCheck },
    { id: 'reports' as ActiveTab, label: 'التقارير الشاملة', icon: FileBarChart },
    { id: 'advertisements' as ActiveTab, label: 'الإعلانات والعروض', icon: Megaphone },
    { id: 'store' as ActiveTab, label: 'متجر المنتجات والطلبات', icon: ShoppingBag, badge: pendingOrdersCount > 0 ? pendingOrdersCount : null },
    { id: 'settings' as ActiveTab, label: 'الإعدادات', icon: SettingsIcon },
  ];

  // Filter menu items by user role
  const filteredMenuItems = menuItems.filter((item) => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin') return true;

    if (currentUser.role === 'supervisor') {
      if (item.id === 'permissions') return false;
      if (item.id === 'finance') return false;
      if (item.id === 'settings') return false;
      return true;
    }

    if (currentUser.role === 'worker') {
      return (
        item.id === 'subscriptions_cars' ||
        item.id === 'subscriptions_buildings' ||
        item.id === 'subscriptions_public' ||
        item.id === 'subscriptions' ||
        item.id === 'calendar'
      );
    }

    return true;
  });

  return (
    <aside className="fixed top-0 right-0 h-screen w-72 bg-gradient-to-b from-slate-900 via-[#0a232e] to-[#042f2e] text-white shadow-2xl z-40 flex flex-col border-l border-teal-900/40">
      {/* Brand Header from system_settings */}
      <div className="p-5 border-b border-teal-900/50 flex items-center gap-3 bg-slate-950/40">
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.company_name}
            className="w-11 h-11 rounded-xl object-cover border border-teal-400/40 shadow-lg shadow-teal-500/20"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/30 font-black text-sm">
            {settings.company_name ? settings.company_name.slice(0, 2) : <Sparkles className="w-6 h-6 text-white" />}
          </div>
        )}
        <div className="overflow-hidden">
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
            <span className="truncate">{settings.company_name}</span>
          </h1>
          {settings.country && (
            <p className="text-xs text-teal-200/70 font-medium truncate">{settings.country}</p>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
        <div className="px-3 py-1 text-[11px] font-bold text-teal-300/60 uppercase tracking-wider">
          القائمة الرئيسية
        </div>
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-teal-600 to-sky-600 text-white shadow-lg shadow-teal-700/25 ring-1 ring-teal-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-teal-400/80'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-amber-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Fixed Footer Note & User Status */}
      <div className="p-4 border-t border-teal-900/40 bg-slate-950/40 space-y-2.5">
        {currentUser && (
          <div className="p-2.5 rounded-2xl bg-teal-950/60 border border-teal-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-teal-600/30 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="overflow-hidden text-right">
                <div className="text-xs font-bold text-white truncate">{currentUser.full_name}</div>
                <div className="text-[10px] text-teal-300/80 truncate">
                  {currentUser.role === 'admin' ? 'مدير عام' : currentUser.role === 'supervisor' ? 'مشرف مناطق' : 'فني غسيل'}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('wecare:open-install-prompt'))}
          className="w-full py-2 px-3 rounded-xl bg-teal-800/40 hover:bg-teal-700/60 border border-teal-600/30 text-teal-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          title="تثبيت التطبيق على الجوال أو الكمبيوتر"
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-400" />
          <span>تثبيت التطبيق 📲</span>
        </button>

        <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-900/40 text-xs text-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-emerald-300 text-[11px]">النظام متصل ونشط</span>
          </div>
          <span className="text-[10px] text-slate-400">الإصدار 1.0</span>
        </div>
      </div>
    </aside>
  );
};
