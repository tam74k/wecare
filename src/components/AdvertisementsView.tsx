import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Calendar,
  Phone,
  MessageCircle,
  DollarSign,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Eye,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Advertisement, Settings } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import { formatWhatsAppNumber } from '../services/whatsappService';

interface AdvertisementsViewProps {
  advertisements: Advertisement[];
  settings: Settings;
  onCreateAdvertisement: (ad: Omit<Advertisement, 'id' | 'created_at'>) => Promise<Advertisement>;
  onUpdateAdvertisement: (ad: Advertisement) => Promise<Advertisement>;
  onDeleteAdvertisement: (id: string) => Promise<boolean>;
}

export const AdvertisementsView: React.FC<AdvertisementsViewProps> = ({
  advertisements,
  settings,
  onCreateAdvertisement,
  onUpdateAdvertisement,
  onDeleteAdvertisement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [previewAd, setPreviewAd] = useState<Advertisement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    phone: '',
    whatsapp: '',
    price: 0,
    image_url: '',
    is_active: true
  });

  const [isUploading, setIsUploading] = useState(false);

  // Filtered ads
  const filteredAds = advertisements.filter((ad) => {
    const matchSearch =
      ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ad.description && ad.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ad.phone && ad.phone.includes(searchQuery)) ||
      (ad.whatsapp && ad.whatsapp.includes(searchQuery));

    if (!matchSearch) return false;

    if (statusFilter === 'active') return ad.is_active;
    if (statusFilter === 'inactive') return !ad.is_active;
    return true;
  });

  const activeCount = advertisements.filter((a) => a.is_active).length;

  const handleOpenCreateModal = () => {
    setEditingAd(null);
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      phone: '',
      whatsapp: '',
      price: 0,
      image_url: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      date: ad.date || new Date().toISOString().split('T')[0],
      phone: ad.phone || '',
      whatsapp: ad.whatsapp || '',
      price: ad.price || 0,
      image_url: ad.image_url || '',
      is_active: ad.is_active
    });
    setIsModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadStorageAsset(file, 'ads', formData.image_url);
      setFormData((prev) => ({ ...prev, image_url: url }));
    } catch (err: any) {
      alert('فشل رفع الصورة: ' + (err.message || err));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleToggleActive = async (ad: Advertisement) => {
    try {
      await onUpdateAdvertisement({
        ...ad,
        is_active: !ad.is_active
      });
    } catch (err: any) {
      alert('حدث خطأ أثناء تعديل حالة الإعلان: ' + (err.message || err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('يرجى كتابة اسم الإعلان');
      return;
    }
    if (!formData.image_url.trim()) {
      alert('يرجى رفع أو إدخال صورة للإعلان');
      return;
    }

    try {
      if (editingAd) {
        await onUpdateAdvertisement({
          ...editingAd,
          ...formData,
          price: Number(formData.price) || 0
        });
      } else {
        await onCreateAdvertisement({
          ...formData,
          price: Number(formData.price) || 0
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('فشل حفظ الإعلان: ' + (err.message || err));
    }
  };

  return (
    <div className="space-y-6 font-cairo animate-fadeIn pb-12">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-xl text-white shadow-md shadow-amber-500/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <span>إدارة الإعلانات والعروض الترويجية</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إضافة وتعديل الإعلانات التي تظهر في سلايدر بوابة العملاء مع تحديد الصور والأسعار وروابط الاتصال والواتساب
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-amber-600/20 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة إعلان جديد</span>
        </button>
      </div>

      {/* 2. Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي الإعلانات</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{advertisements.length}</h3>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">الإعلانات النشطة (تظهر للعملاء)</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">معروضة في سلايدر بوابة العميل</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">الإعلانات غير النشطة</p>
            <h3 className="text-2xl font-black text-slate-400 mt-1">{advertisements.length - activeCount}</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">معطلة أو مؤقتة</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="البحث باسم الإعلان، الوصف، رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">جميع الإعلانات</option>
            <option value="active">النشطة فقط</option>
            <option value="inactive">غير النشطة</option>
          </select>
        </div>
      </div>

      {/* 4. Advertisements Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAds.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400">
            <Megaphone className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold">لا توجد إعلانات مطابقة</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول إعلان</span>
            </button>
          </div>
        ) : (
          filteredAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Image Preview & Status Badge */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden group">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur transition flex items-center gap-1 ${
                      ad.is_active
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-800/80 text-slate-200 hover:bg-slate-900'
                    }`}
                    title="انقر للتبديل بين نشط وغير نشط"
                  >
                    {ad.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{ad.is_active ? 'نشط (معروض)' : 'غير نشط'}</span>
                  </button>
                </div>

                {/* Price Tag Badge */}
                {ad.price > 0 && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-amber-500 text-white text-xs font-black rounded-lg shadow-md font-mono">
                    {ad.price.toLocaleString('ar-EG')} {settings.currency_symbol}
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="font-mono">{ad.date}</span>
                    </span>
                  </div>
                  <h3 className="font-black text-slate-800 text-sm line-clamp-1">{ad.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {ad.description || 'لا يوجد وصف'}
                  </p>
                </div>

                {/* Contact Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  {ad.phone && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-700 rounded-lg text-[11px] font-mono">
                      <Phone className="w-3 h-3 text-sky-600" />
                      <span dir="ltr">{ad.phone}</span>
                    </span>
                  )}
                  {ad.whatsapp && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-mono">
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      <span dir="ltr">{ad.whatsapp}</span>
                    </span>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setPreviewAd(ad)}
                    className="text-xs text-sky-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>معاينة الإعلان</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(ad)}
                      className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`هل أنت متأكد من حذف الإعلان "${ad.title}"؟`)) {
                          await onDeleteAdvertisement(ad.id);
                        }
                      }}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                <h3 className="font-black text-lg">
                  {editingAd ? 'تعديل الإعلان' : 'إضافة إعلان ترويجي جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الإعلان <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خصم 20% على باقة التلميع الشاملة"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف الإعلان:</label>
                <textarea
                  rows={3}
                  placeholder="تفاصيل العرض، الشروط، المزايا المتاحة..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Date & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإعلان:</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر (إن وُجد):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full pl-12 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {settings.currency_symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم للاتصال:</label>
                  <input
                    type="text"
                    placeholder="010xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم واتساب:</label>
                  <input
                    type="text"
                    placeholder="2010xxxxxxxx"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Image Upload / URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  صورة الإعلان <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer py-2.5 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2 transition">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                          <span>جاري رفع ومعالجة الصورة...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-amber-600" />
                          <span>اختر صورة من جهازك (رفع مباشر)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={handleImageFileChange}
                      />
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="أو أدخل رابط الصورة مباشرة (URL)..."
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>

                  {formData.image_url && (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-2 left-2 p-1 bg-black/60 text-white rounded-lg hover:bg-black"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="adActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="adActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  الإعلان نشط (يظهر تلقائياً في سلايدر بوابة العميل)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ الإعلان</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Preview Modal (كما يراه العميل) */}
      {previewAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="relative h-56 bg-slate-900">
              <img
                src={previewAd.image_url}
                alt={previewAd.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setPreviewAd(null)}
                className="absolute top-3 left-3 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              {previewAd.price > 0 && (
                <div className="absolute bottom-3 left-3 px-3 py-1 bg-amber-500 text-white font-black text-sm rounded-xl shadow-lg font-mono">
                  {previewAd.price.toLocaleString('ar-EG')} {settings.currency_symbol}
                </div>
              )}
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{previewAd.date}</span>
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[11px]">
                  عرض خاص
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-900 leading-snug">{previewAd.title}</h2>

              {previewAd.description && (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {previewAd.description}
                </p>
              )}

              {/* Action Contact Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {previewAd.phone && (
                  <a
                    href={`tel:${previewAd.phone}`}
                    className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال هاتفي</span>
                  </a>
                )}
                {previewAd.whatsapp && (
                  <a
                    href={`https://wa.me/${formatWhatsAppNumber(previewAd.whatsapp, settings?.dial_code || '20')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>مراسلة واتساب</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
