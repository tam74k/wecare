import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  Edit,
  Trash2,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  CreditCard,
  Check
} from 'lucide-react';
import {
  StoreProduct,
  StoreOrder,
  StoreOrderStatus,
  Settings
} from '../types/database';
import * as api from '../services/api';
import { uploadStorageAsset } from '../utils/imageStorage';

interface StoreManagementViewProps {
  settings: Settings;
  onUpdateSettings?: (newSettings: Partial<Settings>) => Promise<any>;
}

export const StoreManagementView: React.FC<StoreManagementViewProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');

  // Products State
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 8;

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'عناية خارجية',
    price: '',
    discount_price: '',
    image_url: '',
    is_limited_quantity: false,
    stock_quantity: '10',
    is_available: true
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 8;

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Payment Settings Form
  const [vodafoneNumber, setVodafoneNumber] = useState(settings.vodafone_cash_number || '');
  const [instapayHandle, setInstapayHandle] = useState(settings.instapay_handle || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Load Data
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await api.getStoreProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching store products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await api.getStoreOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching store orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  useEffect(() => {
    setVodafoneNumber(settings.vodafone_cash_number || '');
    setInstapayHandle(settings.instapay_handle || '');
  }, [settings]);

  // Statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const preparingOrders = orders.filter((o) => o.status === 'preparing').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const limitedStockCount = products.filter((p) => p.is_limited_quantity).length;
    return {
      totalOrders,
      pendingOrders,
      preparingOrders,
      deliveredOrders,
      totalRevenue,
      limitedStockCount
    };
  }, [orders, products]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()));
      const matchCategory =
        productCategoryFilter === 'all' || p.category === productCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, productSearch, productCategoryFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, productPage]);

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer_phone.includes(orderSearch);
      const matchStatus =
        orderStatusFilter === 'all' || o.status === orderStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, orderPage]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;

  // Handlers for Product Modal
  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      category: 'عناية خارجية',
      price: '',
      discount_price: '',
      image_url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
      is_limited_quantity: false,
      stock_quantity: '10',
      is_available: true
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: StoreProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category || 'عام',
      price: product.price.toString(),
      discount_price: product.discount_price ? product.discount_price.toString() : '',
      image_url: product.image_url,
      is_limited_quantity: Boolean(product.is_limited_quantity),
      stock_quantity: (product.stock_quantity ?? 10).toString(),
      is_available: product.is_available ?? true
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price || !productForm.image_url) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم، السعر، ورابط الصورة).');
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category.trim() || 'عام',
      price: parseFloat(productForm.price),
      discount_price: productForm.discount_price ? parseFloat(productForm.discount_price) : undefined,
      image_url: productForm.image_url.trim(),
      is_limited_quantity: productForm.is_limited_quantity,
      stock_quantity: parseInt(productForm.stock_quantity) || 0,
      is_available: productForm.is_available
    };

    try {
      if (editingProduct) {
        await api.updateStoreProduct({
          ...editingProduct,
          ...payload
        });
      } else {
        await api.createStoreProduct(payload);
      }
      setIsProductModalOpen(false);
      loadProducts();
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ المنتج: ' + (err.message || ''));
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${name}" نهائياً من المتجر؟`)) {
      return;
    }
    try {
      await api.deleteStoreProduct(id);
      loadProducts();
    } catch (err: any) {
      alert('فشل حذف المنتج: ' + (err.message || ''));
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const url = await uploadStorageAsset(file, 'store_products');
      setProductForm((prev) => ({ ...prev, image_url: url }));
    } catch (err: any) {
      alert('فشل رفع الصورة: ' + (err.message || ''));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Status Change Handler
  const handleUpdateOrderStatus = async (orderId: string, newStatus: StoreOrderStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await api.updateStoreOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء تحديث حالة الطلب: ' + (err.message || ''));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطلب #${orderNumber}؟`)) return;
    try {
      await api.deleteStoreOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      alert('فشل حذف الطلب: ' + (err.message || ''));
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      if (onUpdateSettings) {
        await onUpdateSettings({
          vodafone_cash_number: vodafoneNumber.trim(),
          instapay_handle: instapayHandle.trim()
        });
      } else {
        await api.updateSettings({
          vodafone_cash_number: vodafoneNumber.trim(),
          instapay_handle: instapayHandle.trim()
        });
      }
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert('فشل حفظ بيانات الدفع: ' + (err.message || ''));
    } finally {
      setSavingSettings(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: StoreOrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Package className="w-3.5 h-3.5" />
            <span>جاري استكمال الاصناف</span>
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تم الدفع</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <Truck className="w-3.5 h-3.5" />
            <span>تم التوصيل</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>ملغي</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShoppingBag className="w-5 h-5 text-teal-200" />
            </div>
            <h1 className="text-xl md:text-2xl font-black">إدارة المتجر الإلكتروني</h1>
            <span className="text-xs bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 px-2.5 py-0.5 rounded-full font-bold">
              منتجات وعروض
            </span>
          </div>
          <p className="text-xs md:text-sm text-teal-100/90 font-medium">
            متابعة طلبات الشراء، إدارة المنتجات، تحديد الأسعار والخصومات، وضبط حسابات الدفع الإلكتروني.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          <button
            onClick={openNewProductModal}
            className="px-4 py-2.5 bg-white text-teal-800 hover:bg-teal-50 rounded-xl font-bold text-xs md:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
          <button
            onClick={() => {
              loadProducts();
              loadOrders();
            }}
            className="p-2.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-white transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">طلبات قيد المراجعة</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{stats.pendingOrders}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">جاري استكمالها</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{stats.preparingOrders}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">طلبات تم توصيلها</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{stats.deliveredOrders}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">إجمالي المبيعات</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              {stats.totalRevenue.toLocaleString()} {settings.currency_symbol || 'ج.م'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلبات الشراء ({orders.length})</span>
          {stats.pendingOrders > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {stats.pendingOrders}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`py-3 px-5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'products'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>منتجات المتجر ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>حسابات التحويل (فودافون كاش & انستاباي)</span>
        </button>
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم الطلب، اسم العميل، أو الهاتف..."
                value={orderSearch}
                onChange={(e) => {
                  setOrderSearch(e.target.value);
                  setOrderPage(1);
                }}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 text-slate-800 font-bold"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={orderStatusFilter}
                onChange={(e) => {
                  setOrderStatusFilter(e.target.value);
                  setOrderPage(1);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">كافة الحالات</option>
                <option value="pending">قيد المراجعة</option>
                <option value="preparing">جاري استكمال الاصناف</option>
                <option value="paid">تم الدفع</option>
                <option value="delivered">تم التوصيل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">رقم الطلب</th>
                    <th className="py-3 px-4">العميل</th>
                    <th className="py-3 px-4">موعد الاستلام المطلوب</th>
                    <th className="py-3 px-4">طريقة الدفع & الإيصال</th>
                    <th className="py-3 px-4">إجمالي القيمة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {loadingOrders ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        جاري تحميل طلبات الشراء...
                      </td>
                    </tr>
                  ) : paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد طلبات تطابق البحث الحالي
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-black text-slate-900">
                          #{order.order_number}
                          <div className="text-[10px] text-slate-400 font-sans">
                            {new Date(order.created_at || Date.now()).toLocaleDateString('ar-EG', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{order.customer_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                            <Phone className="w-3 h-3 inline text-slate-400" />
                            {order.customer_phone}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <span>{order.delivery_date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {order.delivery_time}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {order.payment_method === 'vodafone_cash' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                فودافون كاش
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                انستاباي
                              </span>
                            )}
                            {order.transfer_receipt_url ? (
                              <button
                                onClick={() => setViewReceiptUrl(order.transfer_receipt_url!)}
                                className="text-teal-700 hover:text-teal-900 underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>إيصال التحويل</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">بدون إيصال</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          {order.total_amount} {settings.currency_symbol || 'ج.م'}
                          <div className="text-[10px] text-slate-400 font-normal">
                            ({order.items?.length || 0} صنف)
                          </div>
                        </td>

                        <td className="py-3 px-4">{renderStatusBadge(order.status)}</td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="عرض تفاصيل الطلب وتغيير الحالة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id, order.order_number)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف الطلب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalOrderPages > 1 && (
              <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
                <span>
                  عرض {paginatedOrders.length} من إجمالي {filteredOrders.length} طلب
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 bg-slate-100 rounded-lg">
                    صفحة {orderPage} من {totalOrderPages}
                  </span>
                  <button
                    disabled={orderPage >= totalOrderPages}
                    onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Products Management */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Product Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج، الوصف، أو القسم..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 text-slate-800 font-bold"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={productCategoryFilter}
                onChange={(e) => {
                  setProductCategoryFilter(e.target.value);
                  setProductPage(1);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">كافة التصنيفات</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingProducts ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                جاري تحميل المنتجات...
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                لا توجد منتجات مسجلة تطابق البحث
              </div>
            ) : (
              paginatedProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:shadow-md transition-all"
                >
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    {/* Badges */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                      {p.is_limited_quantity && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          كمية محدودة!
                        </span>
                      )}
                      {p.discount_price && p.discount_price < p.price && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs">
                          خصم {Math.round(((p.price - p.discount_price) / p.price) * 100)}%
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.is_available
                            ? 'bg-teal-700/80 text-white backdrop-blur-xs'
                            : 'bg-slate-700/80 text-slate-200 backdrop-blur-xs'
                        }`}
                      >
                        {p.is_available ? 'متاح للطلب' : 'غير متاح'}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 text-slate-700 backdrop-blur-xs shadow-xs">
                        {p.category || 'عام'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{p.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {p.description || 'لا يوجد وصف للمنتج'}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        {p.discount_price ? (
                          <>
                            <span className="text-base font-black text-teal-700">
                              {p.discount_price} {settings.currency_symbol || 'ج.م'}
                            </span>
                            <span className="text-xs font-bold text-slate-400 line-through">
                              {p.price}
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-black text-teal-700">
                            {p.price} {settings.currency_symbol || 'ج.م'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        الكمية في المخزن: {p.stock_quantity ?? 10}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openEditProductModal(p)}
                        className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Product Pagination */}
          {totalProductPages > 1 && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs font-bold text-slate-600">
              <span>
                عرض {paginatedProducts.length} من إجمالي {filteredProducts.length} منتج
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={productPage <= 1}
                  onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-slate-100 rounded-lg">
                  صفحة {productPage} من {totalProductPages}
                </span>
                <button
                  disabled={productPage >= totalProductPages}
                  onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Payment Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              <span>إعدادات حسابات التحويل الإلكتروني للمتجر</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              هذه الحسابات تظهر تلقائياً للعملاء في تطبيق العميل عند تأكيد طلبات الشراء للتحويل إليها وإرفاق إشعار التحويل.
            </p>
          </div>

          <form onSubmit={handleSavePaymentSettings} className="space-y-4">
            {/* Vodafone Cash */}
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200/70 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                  VC
                </div>
                <label className="text-xs font-bold text-red-900">
                  رقم محفظة فودافون كاش (Vodafone Cash)
                </label>
              </div>
              <input
                type="text"
                placeholder="مثال: 01012345678"
                value={vodafoneNumber}
                onChange={(e) => setVodafoneNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-red-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
                dir="ltr"
              />
              <p className="text-[11px] text-red-700/80">
                سيتمكن العميل من نسخ هذا الرقم بضغطة زر وإرسال قيمة الطلب إليه عبر فودافون كاش.
              </p>
            </div>

            {/* InstaPay */}
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200/70 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center">
                  IP
                </div>
                <label className="text-xs font-bold text-purple-900">
                  عنوان أو رقم حساب انستاباي (InstaPay Handle / Number)
                </label>
              </div>
              <input
                type="text"
                placeholder="مثال: wecare@instapay أو رقم موبايل الحساب"
                value={instapayHandle}
                onChange={(e) => setInstapayHandle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                dir="ltr"
              />
              <p className="text-[11px] text-purple-700/80">
                يمكن إدخال عنوان الدفع اللحظي (IPA) أو رقم الهاتف المرتبط بحساب انستاباي.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {settingsSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>تم حفظ بيانات الدفع بنجاح!</span>
                </>
              ) : (
                <span>{savingSettings ? 'جاري الحفظ...' : 'حفظ بيانات الدفع'}</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                <span>{editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمتجر'}</span>
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">اسم المنتج / السلعة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: معطر جو فاخر للسيارة"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">القسم / التصنيف</label>
                  <input
                    type="text"
                    placeholder="مثال: معطرات، عناية خارجية..."
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1">الكمية المتوفرة</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">السعر الأساسي ({settings.currency_symbol || 'ج.م'}) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    placeholder="150"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1">سعر الخصم (اختياري)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="120"
                    value={productForm.discount_price}
                    onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">وصف المنتج ومميزاته</label>
                <textarea
                  rows={2}
                  placeholder="اكتب وصفاً جذاباً للسلعة..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              {/* Image Upload and URL */}
              <div className="space-y-2">
                <label className="block">صورة المنتج *</label>
                <div className="flex items-center gap-3">
                  <img
                    src={productForm.image_url}
                    alt="معاينة"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer text-xs transition-colors">
                      <UploadCloud className="w-4 h-4 text-teal-600" />
                      <span>{isUploadingImage ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="أو الصق رابط صورة مباشر..."
                      value={productForm.image_url}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-normal"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_limited_quantity}
                    onChange={(e) =>
                      setProductForm({ ...productForm, is_limited_quantity: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">إشعار "كمية محدودة"</div>
                    <div className="text-[10px] text-slate-400">إظهار شارة حصرية تحث على الشراء</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_available}
                    onChange={(e) =>
                      setProductForm({ ...productForm, is_available: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">متاح للبيع بالمتجر</div>
                    <div className="text-[10px] text-slate-400">يمكن إخفاؤه مؤقتاً عند النفاذ</div>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                >
                  {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details & Status Update Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-teal-600" />
                  <span>تفاصيل الطلب #{selectedOrder.order_number}</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  تاريخ الطلب: {new Date(selectedOrder.created_at || Date.now()).toLocaleString('ar-EG')}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Delivery Info */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-medium">اسم العميل:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedOrder.customer_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">رقم الهاتف:</span>
                  <div className="font-bold text-slate-900 font-mono mt-0.5" dir="ltr">
                    {selectedOrder.customer_phone}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium">تاريخ الاستلام المحدد:</span>
                  <div className="font-bold text-teal-800 mt-0.5">{selectedOrder.delivery_date}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">الوقت المناسب:</span>
                  <div className="font-bold text-teal-800 mt-0.5">{selectedOrder.delivery_time}</div>
                </div>
              </div>

              {selectedOrder.delivery_address && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 font-medium">عنوان الاستلام / ملاحظات الموقع:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedOrder.delivery_address}</div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 font-medium">ملاحظات إضافية من العميل:</span>
                  <div className="font-semibold text-slate-700 mt-0.5 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">الأصناف المطلوبة:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                        />
                      )}
                      <div>
                        <div className="font-bold text-slate-800">{item.product_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.quantity} × {item.price} {settings.currency_symbol || 'ج.م'}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-slate-900">
                      {item.total} {settings.currency_symbol || 'ج.م'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-xl border border-teal-200 text-teal-900 font-bold text-sm">
                <span>المبلغ الإجمالي المستحق:</span>
                <span className="font-black text-base">
                  {selectedOrder.total_amount} {settings.currency_symbol || 'ج.م'}
                </span>
              </div>
            </div>

            {/* Payment & Receipt */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">طريقة التحويل:</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {selectedOrder.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'انستاباي'}
                </div>
              </div>
              {selectedOrder.transfer_receipt_url ? (
                <button
                  onClick={() => setViewReceiptUrl(selectedOrder.transfer_receipt_url!)}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة إيصال التحويل</span>
                </button>
              ) : (
                <span className="text-slate-400">لم يتم إرفاق إيصال</span>
              )}
            </div>

            {/* Status Change Pipeline */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">تحديث حالة الطلب:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={updatingOrderId === selectedOrder.id}
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'pending')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOrder.status === 'pending'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  قيد المراجعة
                </button>

                <button
                  type="button"
                  disabled={updatingOrderId === selectedOrder.id}
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'paid')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOrder.status === 'paid'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  تم الدفع
                </button>

                <button
                  type="button"
                  disabled={updatingOrderId === selectedOrder.id}
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'preparing')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOrder.status === 'preparing'
                      ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'
                  }`}
                >
                  جاري استكمال الاصناف
                </button>

                <button
                  type="button"
                  disabled={updatingOrderId === selectedOrder.id}
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'delivered')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOrder.status === 'delivered'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50'
                  }`}
                >
                  تم التوصيل
                </button>

                <button
                  type="button"
                  disabled={updatingOrderId === selectedOrder.id}
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'cancelled')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOrder.status === 'cancelled'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  الغاء الطلب
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Viewer Modal */}
      {viewReceiptUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setViewReceiptUrl(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-4 space-y-3 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 text-xs">إشعار / إيصال التحويل المرفق</span>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden max-h-[70vh] bg-slate-100 flex items-center justify-center">
              <img
                src={viewReceiptUrl}
                alt="إيصال التحويل"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="pt-1 flex justify-between items-center text-xs">
              <a
                href={viewReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح في نافذة جديدة</span>
              </a>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
