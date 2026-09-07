import React, { useState } from 'react';
import { Customer, Vehicle, CoverageArea } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import {
  Users,
  UserPlus,
  Car,
  KeyRound,
  Phone,
  Building,
  MapPin,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Hash,
  ShieldAlert,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Edit2,
  ExternalLink,
  LocateFixed,
  FileText
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  vehicles: Vehicle[];
  coverageAreas: CoverageArea[];
  onCreateCustomer: (cust: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  onUpdateCustomer?: (id: string, updates: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onResetPassword: (id: string, newPass: string) => Promise<void>;
  onCreateVehicle: (veh: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
  onDeleteVehicle: (id: string) => Promise<void>;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  vehicles,
  coverageAreas,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onResetPassword,
  onCreateVehicle,
  onDeleteVehicle
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedCustomerForVehicles, setSelectedCustomerForVehicles] = useState<Customer | null>(null);
  const [resetModalCustomer, setResetModalCustomer] = useState<Customer | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Edit Customer Modal State
  const [editCustomerModal, setEditCustomerModal] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    area_id: '',
    building_number: '',
    block_number: '',
    detailed_address: '',
    location_url: ''
  });
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  // New Customer Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    area_id: '',
    building_number: '',
    block_number: '',
    detailed_address: '',
    location_url: '',
    username: '',
    password: ''
  });
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Vehicle Form State
  const [vehicleFormData, setVehicleFormData] = useState({
    vehicle_type: '',
    color: '',
    plate_number: '',
    vehicle_image_url: ''
  });

  // Distinct vehicle types and colors for autocomplete suggestions
  const uniqueVehicleTypes = Array.from(
    new Set(vehicles.map((v) => (v.vehicle_type || (v as any).type || '').trim()).filter(Boolean) as string[])
  ).sort();

  const uniqueVehicleColors = Array.from(
    new Set(vehicles.map((v) => (v.color || '').trim()).filter(Boolean) as string[])
  ).sort();

  const [isUploadingVehicleImage, setIsUploadingVehicleImage] = useState(false);
  const [vehicleUploadNotice, setVehicleUploadNotice] = useState<string | null>(null);

  const handleVehicleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingVehicleImage(true);
      setVehicleUploadNotice('جاري حفظ صورة السيارة...');
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', vehicleFormData.vehicle_image_url);
      setVehicleFormData((prev) => ({ ...prev, vehicle_image_url: uploadedUrl }));
      setVehicleUploadNotice('تم حفظ صورة السيارة بنجاح');
      setTimeout(() => setVehicleUploadNotice(null), 3000);
    } catch (err: any) {
      alert('فشل رفع صورة السيارة: ' + (err.message || 'يرجى المحاولة مجدداً'));
      setVehicleUploadNotice(null);
    } finally {
      setIsUploadingVehicleImage(false);
    }
  };

  const handleGetGPSLocation = (target: 'create' | 'edit') => {
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم خاصية تحديد الموقع الجغرافي (GPS)');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        if (target === 'create') {
          setFormData((prev) => ({ ...prev, location_url: mapsUrl }));
        } else {
          setEditFormData((prev) => ({ ...prev, location_url: mapsUrl }));
        }
        setIsLocating(false);
      },
      (err) => {
        alert('تعذر جلب الموقع الجغرافي: ' + (err.message || 'يرجى التأكد من تفعيل أذونات الموقع'));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditCustomerModal(cust);
    setEditFormData({
      full_name: cust.full_name || '',
      phone: cust.phone || '',
      area_id: cust.area_id || '',
      building_number: cust.building_number || '',
      block_number: cust.block || cust.block_number || '',
      detailed_address: cust.detailed_address || '',
      location_url: cust.location_url || ''
    });
    setEditErrorMessage(null);
  };

  const handleUpdateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomerModal) return;
    setEditErrorMessage(null);

    // التحقق من تكرار الهاتف لعميل آخر
    const phoneConflict = customers.some(
      (c) => c.id !== editCustomerModal.id && c.phone.trim() === editFormData.phone.trim()
    );
    if (phoneConflict) {
      setEditErrorMessage(`عفواً، رقم الموبايل (${editFormData.phone}) مسجل بالفعل لعميل آخر.`);
      return;
    }

    try {
      setIsUpdatingCustomer(true);
      if (onUpdateCustomer) {
        await onUpdateCustomer(editCustomerModal.id, {
          full_name: editFormData.full_name.trim(),
          phone: editFormData.phone.trim(),
          area_id: editFormData.area_id,
          building_number: editFormData.building_number.trim(),
          block: editFormData.block_number.trim(),
          block_number: editFormData.block_number.trim(),
          detailed_address: editFormData.detailed_address.trim(),
          location_url: editFormData.location_url.trim()
        });
      }
      alert('تم تحديث بيانات العميل بنجاح!');
      setEditCustomerModal(null);
    } catch (err: any) {
      setEditErrorMessage(err.message || 'حدث خطأ أثناء تعديل بيانات العميل');
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // التحقق الصارم من عدم تكرار رقم الموبايل
    const phoneExists = customers.some(
      (c) => c.phone.trim() === formData.phone.trim()
    );
    if (phoneExists) {
      setErrorMessage(`عفواً، رقم الموبايل (${formData.phone}) مسجل بالفعل لعميل آخر. رقم الموبايل يجب أن يكون فريداً تماماً!`);
      return;
    }

    try {
      await onCreateCustomer({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        area_id: formData.area_id,
        building_number: formData.building_number.trim(),
        block_number: formData.block_number.trim(),
        detailed_address: formData.detailed_address.trim(),
        location_url: formData.location_url.trim(),
        username: formData.username.trim() || formData.phone.trim(),
        password_hash: btoa(formData.password || '123456')
      });
      alert('تم تسجيل العميل بنجاح!');
      setActiveTab('list');
      setFormData({
        full_name: '',
        phone: '',
        area_id: '',
        building_number: '',
        block_number: '',
        detailed_address: '',
        location_url: '',
        username: '',
        password: ''
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ بيانات العميل');
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForVehicles) return;
    if (!vehicleFormData.plate_number.trim()) {
      alert('يرجى إدخال رقم اللوحة');
      return;
    }

    await onCreateVehicle({
      customer_id: selectedCustomerForVehicles.id,
      vehicle_type: vehicleFormData.vehicle_type,
      color: vehicleFormData.color,
      plate_number: vehicleFormData.plate_number.trim(),
      vehicle_image_url: vehicleFormData.vehicle_image_url
    });

    alert('تمت إضافة المركبة بنجاح!');
    setVehicleFormData({
      vehicle_type: '',
      color: '',
      plate_number: '',
      vehicle_image_url: ''
    });
  };

  const handleConfirmResetPassword = async () => {
    if (!resetModalCustomer || !newPassword.trim()) return;
    await onResetPassword(resetModalCustomer.id, newPassword.trim());
    alert(`تم إعادة تعيين كلمة مرور العميل (${resetModalCustomer.full_name}) بنجاح!`);
    setResetModalCustomer(null);
    setNewPassword('');
  };

  const getAreaName = (id: string) => coverageAreas.find((a) => a.id === id)?.name || 'غير محدد';
  const getCustomerVehicles = (customerId: string) => vehicles.filter((v) => v.customer_id === customerId);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إدارة العملاء والمركبات</h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل بيانات العملاء السكنيين، أرقام الموبايل الفريدة، إدارة أسطول مركبات العميل، وحسابات الدخول
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل العملاء
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'create' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + تسجيل عميل جديد
          </button>
        </div>
      </div>

      {/* Tab 1: Customer List */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">قائمة العملاء المسجلين ({customers.length})</h3>
            <button
              onClick={() => setActiveTab('create')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>عميل جديد</span>
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              لا يوجد عملاء مسجلين حتى الآن. ابدأ بإضافة عميل جديد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="p-4">اسم العميل</th>
                    <th className="p-4">رقم الموبايل (فريد)</th>
                    <th className="p-4">الكمبوند / المنطقة</th>
                    <th className="p-4">العنوان وتفاصيله</th>
                    <th className="p-4">الموقع (Location)</th>
                    <th className="p-4">المركبات المسجلة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {customers.map((cust) => {
                    const custVehicles = getCustomerVehicles(cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{cust.full_name}</td>
                        <td className="p-4 font-mono font-bold text-teal-700">{cust.phone}</td>
                        <td className="p-4">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                            {getAreaName(cust.area_id)}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <div>
                            عمارة: <strong className="text-slate-800">{cust.building_number}</strong> | مربع: <strong className="text-slate-800">{cust.block || cust.block_number || '-'}</strong>
                          </div>
                          {cust.detailed_address && (
                            <div className="text-[11px] text-slate-500 mt-1 flex items-start gap-1 max-w-[220px]" title={cust.detailed_address}>
                              <FileText className="w-3 h-3 text-teal-600 shrink-0 mt-0.5" />
                              <span className="truncate">{cust.detailed_address}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {cust.location_url ? (
                            <a
                              href={cust.location_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                              title="فتح الموقع في خرائط Google"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>الموقع</span>
                              <ExternalLink className="w-3 h-3 text-emerald-500 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">غير محدد</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedCustomerForVehicles(cust)}
                            className="text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 flex items-center gap-1.5 transition-colors"
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span>{custVehicles.length} سيارات (إدارة)</span>
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditCustomer(cust)}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-200 transition-colors"
                              title="تعديل بيانات العميل والموقع"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => setResetModalCustomer(cust)}
                              className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-amber-200 transition-colors"
                              title="تصفير كلمة المرور من قبل الأدمن"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>الباسورد</span>
                            </button>
                            <button
                              onClick={() => onDeleteCustomer(cust.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="حذف العميل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Create Customer Form */}
      {activeTab === 'create' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">استمارة تسجيل عميل جديد</h3>
              <p className="text-xs text-slate-400">
                تسجيل بيانات العميل مع التحقق الصارم من عدم تكرار رقم الموبايل وتعيين العنوان
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم العميل الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="د. طارق محمود"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم الموبايل (فريد UNIQUE)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المنطقة / الكمبوند</label>
                <select
                  required
                  value={formData.area_id}
                  onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                >
                  <option value="">اختر الكمبوند...</option>
                  {coverageAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.city})
                    </option>
                  ))}
                </select>
              </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم العمارة</label>
                    <input
                      type="text"
                      required
                      placeholder="12"
                      value={formData.building_number}
                      onChange={(e) => setFormData({ ...formData, building_number: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">المربع (Block)</label>
                    <input
                      type="text"
                      required
                      placeholder="A, B, C..."
                      value={formData.block_number}
                      onChange={(e) => setFormData({ ...formData, block_number: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium uppercase font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* حقول Location والعنوان التفصيلي (غير إلزامي) */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600" />
                        <span>الموقع الجغرافي (Location)</span>
                        <span className="text-[10px] text-slate-400 font-normal">(غير إلزامي)</span>
                      </label>
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={() => handleGetGPSLocation('create')}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="التقاط الإحداثيات الحالية للموقع عبر GPS"
                      >
                        <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'جاري التحديد...' : 'تحديد موقعي الآن (GPS)'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="رابط خرائط Google أو إحداثيات (30.123, 31.456)..."
                        value={formData.location_url}
                        onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                      />
                      {formData.location_url && (
                        <a
                          href={formData.location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute left-3 top-2.5 text-xs text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1"
                        >
                          <span>معاينة</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      يمكنك لصق رابط من Google Maps أو الضغط على زر تحديد الموقع الحالي.
                    </p>
                  </div>

                  {/* Detailed Address Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span>عنوان تفصيلي (Detailed Address)</span>
                      <span className="text-[10px] text-slate-400 font-normal">(غير إلزامي)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="مثال: فيلا 12، الدور الثاني، شقة 4، مدخل جانبي بجوار البوابة الرئيسية..."
                      value={formData.detailed_address}
                      onChange={(e) => setFormData({ ...formData, detailed_address: e.target.value })}
                      className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم (تطبيق العميل المستقبلي)
                </label>
                <input
                  type="text"
                  placeholder="اختياري (الافتراضي: رقم الموبايل)"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور المبدئية</label>
                <input
                  type="password"
                  placeholder="•••••••• (الافتراضي: 123456)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-sm rounded-xl shadow-md hover:from-teal-700 hover:to-emerald-700 transition-all"
              >
                تسجيل العميل
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicles Management Modal */}
      {selectedCustomerForVehicles && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  إدارة مركبات العميل: {selectedCustomerForVehicles.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  يمكن للعميل إضافة أكثر من سيارة للاشتراك في باقات الغسيل
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForVehicles(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-2"
              >
                ✕
              </button>
            </div>

            {/* List of customer's vehicles */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase">السيارات المسجلة حالياً</h4>
              {getCustomerVehicles(selectedCustomerForVehicles.id).length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500 font-medium">
                  لا توجد سيارات مسجلة لهذا العميل بعد. أضف سيارة بالأسفل.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getCustomerVehicles(selectedCustomerForVehicles.id).map((veh) => (
                    <div
                      key={veh.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={veh.vehicle_image_url}
                          alt={veh.vehicle_type}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {veh.vehicle_type} - {veh.color}
                          </div>
                          <div className="text-xs font-mono font-bold text-teal-700">
                            لوحة: {veh.plate_number}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteVehicle(veh.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5"
                        title="حذف السيارة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Vehicle Form */}
            <form onSubmit={handleAddVehicle} className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-4">
              <h4 className="text-xs font-bold text-teal-900">+ إضافة سيارة جديدة للعميل</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع السيارة</label>
                  <input
                    type="text"
                    list="cust-view-vehicle-types"
                    placeholder="مرسيدس C200 / كيا سبورتاج"
                    value={vehicleFormData.vehicle_type}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                  />
                  <datalist id="cust-view-vehicle-types">
                    {uniqueVehicleTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اللون</label>
                  <input
                    type="text"
                    list="cust-view-vehicle-colors"
                    placeholder="رمادي / أسود"
                    value={vehicleFormData.color}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, color: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                  />
                  <datalist id="cust-view-vehicle-colors">
                    {uniqueVehicleColors.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم اللوحة</label>
                  <input
                    type="text"
                    required
                    placeholder="س ص ع 1234"
                    value={vehicleFormData.plate_number}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, plate_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* صورة السيارة مع خاصية الرفع والضغط */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    <span>صورة السيارة</span>
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded">
                    مخزن مضغوط (carwash-assets)
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  {vehicleFormData.vehicle_image_url ? (
                    <img
                      src={vehicleFormData.vehicle_image_url}
                      alt="معاينة السيارة"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-50 shrink-0"
                      onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/50?text=Car')}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Car className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                      {isUploadingVehicleImage ? (
                        <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>{isUploadingVehicleImage ? 'جاري ضغط ورفع الصورة...' : 'رفع صورة من الجهاز'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVehicleImageFileChange}
                        disabled={isUploadingVehicleImage}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      يتم تقليص حجم الصورة تلقائياً لتفادي استهلاك مساحة التخزين.
                    </p>
                  </div>
                </div>

                {vehicleUploadNotice && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{vehicleUploadNotice}</span>
                  </div>
                )}

                <input
                  type="url"
                  placeholder="أو ضع رابط مباشر للصورة..."
                  value={vehicleFormData.vehicle_image_url}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicle_image_url: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                إضافة السيارة لسجل العميل
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">تصفير كلمة المرور من الإدارة</h3>
                <p className="text-xs text-slate-500">للعميل: {resetModalCustomer.full_name}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                placeholder="أدخل كلمة المرور الجديدة..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handleConfirmResetPassword}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                تأكيد وتحديث كلمة المرور
              </button>
              <button
                onClick={() => setResetModalCustomer(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تعديل بيانات العميل</h3>
                  <p className="text-xs text-slate-500">
                    تحديث بيانات العميل، العنوان التفصيلي، والموقع الجغرافي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditCustomerModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{editErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل الكامل *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / الكمبوند *</label>
                  <select
                    required
                    value={editFormData.area_id}
                    onChange={(e) => setEditFormData({ ...editFormData, area_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">اختر المنطقة...</option>
                    {coverageAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم العمارة *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.building_number}
                      onChange={(e) => setEditFormData({ ...editFormData, building_number: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المربع (Block)</label>
                    <input
                      type="text"
                      value={editFormData.block_number}
                      onChange={(e) => setEditFormData({ ...editFormData, block_number: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Detailed Address */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      <span>الموقع (Location)</span>
                      <span className="text-[10px] text-slate-400 font-normal">(غير إلزامي)</span>
                    </label>
                    <button
                      type="button"
                      disabled={isLocating}
                      onClick={() => handleGetGPSLocation('edit')}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      title="التقاط الإحداثيات الحالية للموقع عبر GPS"
                    >
                      <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                      <span>{isLocating ? 'جاري التحديد...' : 'تحديد موقعي الآن (GPS)'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="رابط خرائط Google أو إحداثيات..."
                      value={editFormData.location_url}
                      onChange={(e) => setEditFormData({ ...editFormData, location_url: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                    {editFormData.location_url && (
                      <a
                        href={editFormData.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute left-3 top-2 text-xs text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1"
                      >
                        <span>معاينة</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>عنوان تفصيلي (Detailed Address)</span>
                    <span className="text-[10px] text-slate-400 font-normal">(غير إلزامي)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="شقة، دور، معالم مميزة..."
                    value={editFormData.detailed_address}
                    onChange={(e) => setEditFormData({ ...editFormData, detailed_address: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="submit"
                  disabled={isUpdatingCustomer}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isUpdatingCustomer ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditCustomerModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
