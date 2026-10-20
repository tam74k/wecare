import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  LogOut,
  Car,
  ClipboardList,
  CalendarDays,
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Package,
  CreditCard,
  Sparkles,
  AlertCircle,
  Camera,
  Upload,
  Loader2,
  ImageIcon,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  MessageCircle,
  Calendar,
  Tag,
  Smartphone,
  Star,
  MessageSquare,
  ShoppingBag,
  Search,
  Copy,
  Check,
  ZoomIn
} from 'lucide-react';
import {
  AuthUser,
  Settings,
  Customer,
  Vehicle,
  Subscription,
  Visit,
  Package as PackageType,
  PackageCategory,
  CoverageArea,
  Employee,
  PaymentMethod,
  PackagePricing,
  Advertisement,
  StoreProduct,
  StoreOrder,
  StoreOrderItem,
  StoreOrderStatus
} from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';

interface CustomerPortalViewProps {
  currentUser: AuthUser;
  settings: Settings;
  customers: Customer[];
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  visits: Visit[];
  packages: PackageType[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  employees: Employee[];
  pricing?: PackagePricing[];
  paymentMethods?: PaymentMethod[];
  advertisements?: Advertisement[];
  onLogout: () => void;
  onCreateVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle | null>;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
  onCreateSubscription?: (subscription: Omit<Subscription, 'id' | 'status' | 'created_at'>) => Promise<Subscription>;
  onCancelSubscription?: (subscriptionId: string, reason?: string) => Promise<void>;
  onRateVisit?: (visitId: string, rating: number, comment?: string) => Promise<void>;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  currentUser,
  settings,
  customers,
  vehicles,
  subscriptions,
  visits,
  packages,
  categories,
  coverageAreas,
  employees,
  pricing = [],
  paymentMethods = [],
  advertisements = [],
  onLogout,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onCreateSubscription,
  onCancelSubscription,
  onRateVisit
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'visits' | 'vehicles' | 'store' | 'profile'>('subscriptions');
  const [showSubModal, setShowSubModal] = useState(false);

  // Store & E-Commerce State
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
  const [myStoreOrders, setMyStoreOrders] = useState<StoreOrder[]>([]);
  const [loadingMyStoreOrders, setLoadingMyStoreOrders] = useState(false);
  const [cart, setCart] = useState<Array<{ product: StoreProduct; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [storeSubTab, setStoreSubTab] = useState<'catalog' | 'my_orders'>('catalog');
  const [storeSearch, setStoreSearch] = useState('');
  const [storeCategory, setStoreCategory] = useState('all');
  const [selectedProductModal, setSelectedProductModal] = useState<StoreProduct | null>(null);

  // Checkout Form State
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [deliveryTime, setDeliveryTime] = useState('06:00 م - 09:00 م');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay'>('vodafone_cash');
  const [transferReceiptUrl, setTransferReceiptUrl] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<StoreOrder | null>(null);
  const [copiedType, setCopiedType] = useState<'vodafone' | 'instapay' | null>(null);

  // Cancellation State (Subscriptions & Store Orders)
  const [cancelSubModal, setCancelSubModal] = useState<{
    sub: Subscription;
    pkgName: string;
    isPending: boolean;
  } | null>(null);
  const [subCancelReason, setSubCancelReason] = useState('');
  const [isCancellingSub, setIsCancellingSub] = useState(false);

  const [cancelOrderModal, setCancelOrderModal] = useState<StoreOrder | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // Advertisements slider state & selection
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const [selectedAdForModal, setSelectedAdForModal] = useState<Advertisement | null>(null);

  // Active ads for slider
  const activeAds = useMemo(() => {
    return (advertisements || []).filter((ad) => ad.is_active && Boolean(ad.image_url));
  }, [advertisements]);

  // Continuous auto-sliding (every 4.5 seconds)
  useEffect(() => {
    if (activeAds.length <= 1 || isSliderHovered) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeAds.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeAds.length, isSliderHovered]);

  const handleNextSlide = () => {
    if (activeAds.length === 0) return;
    setCurrentSlideIndex((prev) => (prev + 1) % activeAds.length);
  };

  const handlePrevSlide = () => {
    if (activeAds.length === 0) return;
    setCurrentSlideIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length);
  };

  // Find the live customer object
  const customerId = currentUser.customer_id || currentUser.id;
  const currentCustomer = customers.find((c) => c.id === customerId) || currentUser.customer_data;

  // Load store products and customer orders
  const loadStoreData = async () => {
    try {
      setLoadingStoreProducts(true);
      const prods = await api.getStoreProducts(true);
      setStoreProducts(prods);
    } catch (e) {
      console.error('Error fetching store products:', e);
    } finally {
      setLoadingStoreProducts(false);
    }

    try {
      setLoadingMyStoreOrders(true);
      const ords = await api.getStoreOrders(customerId);
      setMyStoreOrders(ords);
    } catch (e) {
      console.error('Error fetching customer store orders:', e);
    } finally {
      setLoadingMyStoreOrders(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, [customerId]);

  // Filter items belonging to this customer
  const myVehicles = vehicles.filter((v) => v.customer_id === customerId);
  const mySubscriptions = subscriptions.filter((s) => s.customer_id === customerId);
  const mySubscriptionIds = new Set(mySubscriptions.map((s) => s.id));
  const myVisits = visits.filter((v) => mySubscriptionIds.has(v.subscription_id));

  // Customer area name
  const area = coverageAreas.find((a) => a.id === currentCustomer?.area_id);

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    vehicle_type: '',
    color: '',
    plate_number: '',
    vehicle_image_url: ''
  });
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [updatingVehicleId, setUpdatingVehicleId] = useState<string | null>(null);
  const [vehicleMsg, setVehicleMsg] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState<{ worker: Employee; photoUrl: string } | null>(null);

  // Rating & Review State for Completed Washes
  const [ratingVisit, setRatingVisit] = useState<Visit | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string | null>(null);

  // Completed unrated visits
  const unratedCompletedVisits = useMemo(() => {
    return myVisits.filter((v) => v.status === 'completed' && !v.rating);
  }, [myVisits]);

  const handleOpenRatingModal = (vis: Visit) => {
    setRatingVisit(vis);
    setRatingScore(vis.rating || 5);
    setRatingHover(0);
    setRatingComment(vis.rating_comment || '');
    setRatingSuccessMsg(null);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingVisit) return;
    try {
      setIsSubmittingRating(true);
      const targetId = ratingVisit.id;
      const score = ratingScore || 5;
      const comment = ratingComment.trim();

      if (onRateVisit) {
        await onRateVisit(targetId, score, comment);
      } else {
        await api.updateVisit(targetId, {
          rating: score,
          rating_comment: comment
        });

        // Create system notification
        const targetSub = subscriptions.find((s) => s.id === ratingVisit.subscription_id);
        const targetVeh = vehicles.find((v) => v.id === targetSub?.vehicle_id);

        await api.createNotification({
          title: `تقييم جديد (${score} نجوم) لغسلة مكتملة`,
          message: `قام العميل ${currentCustomer?.full_name || 'عميل'} بتقييم غسلة سيارته ${targetVeh ? `(${targetVeh.vehicle_type} - ${targetVeh.plate_number})` : ''} بـ ${score} من 5 نجوم${comment ? `.\nالتعليق: "${comment}"` : ''}`,
          type: 'rating',
          reference_id: targetId,
          customer_id: customerId,
          rating: score,
          rating_comment: comment,
          is_read: false
        });
      }

      ratingVisit.rating = score;
      ratingVisit.rating_comment = comment;

      setRatingSuccessMsg('شكراً لك! تم إرسال تقييمك وتعليقك بنجاح ونقله لإدارة النظام.');
      setTimeout(() => {
        setRatingSuccessMsg(null);
        setRatingVisit(null);
      }, 2000);
    } catch (err: any) {
      alert('حدث خطأ أثناء إرسال التقييم: ' + (err.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Confirm cancel subscription or subscription request
  const handleConfirmCancelSubscription = async () => {
    if (!cancelSubModal) return;
    try {
      setIsCancellingSub(true);
      if (onCancelSubscription) {
        await onCancelSubscription(cancelSubModal.sub.id, subCancelReason);
      } else {
        await api.cancelSubscription(cancelSubModal.sub.id, subCancelReason, 'العميل');
      }
      setCancelSubModal(null);
      setSubCancelReason('');
      alert(
        cancelSubModal.isPending
          ? 'تم إلغاء طلب الاشتراك بنجاح.'
          : 'تم إلغاء الاشتراك وإيقاف الزيارات المتبقية بنجاح.'
      );
    } catch (err: any) {
      alert('حدث خطأ أثناء إلغاء الاشتراك: ' + (err.message || ''));
    } finally {
      setIsCancellingSub(false);
    }
  };

  // Confirm cancel store product order
  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderModal) return;
    try {
      setIsCancellingOrder(true);
      await api.cancelStoreOrder(cancelOrderModal.id, currentCustomer?.full_name);
      setMyStoreOrders((prev) =>
        prev.map((o) => (o.id === cancelOrderModal.id ? { ...o, status: 'cancelled' } : o))
      );
      setCancelOrderModal(null);
      alert('تم إلغاء طلب المنتجات بنجاح.');
    } catch (err: any) {
      alert('حدث خطأ أثناء إلغاء طلب المنتجات: ' + (err.message || ''));
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Set default address for store checkout
  useEffect(() => {
    if (currentCustomer) {
      const parts = [
        area?.name,
        currentCustomer.building_number ? `عمارة ${currentCustomer.building_number}` : '',
        currentCustomer.block_number ? `مجموعة ${currentCustomer.block_number}` : '',
        currentCustomer.detailed_address || ''
      ].filter(Boolean);
      if (parts.length > 0) {
        setDeliveryAddress(parts.join(' - '));
      }
    }
  }, [currentCustomer, area]);

  // Cart operations
  const addToCart = (product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: StoreProduct; quantity: number }>
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Totals
  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.product.discount_price && item.product.discount_price > 0
        ? item.product.discount_price
        : item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [cart]);

  // Copy helper
  const handleCopyPaymentInfo = (text: string, type: 'vodafone' | 'instapay') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Receipt image upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingReceipt(true);
      const url = await uploadStorageAsset(file, 'store_receipts');
      setTransferReceiptUrl(url);
    } catch (err: any) {
      alert('فشل رفع صورة الإيصال: ' + (err.message || ''));
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('السلة فارغة! يرجى اختيار منتجات أولاً.');
      return;
    }
    if (!deliveryDate || !deliveryTime) {
      alert('يرجى تحديد التاريخ والوقت المناسبين لاستلام الطلب.');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const orderItems: StoreOrderItem[] = cart.map((item) => {
        const itemPrice = item.product.discount_price && item.product.discount_price > 0
          ? item.product.discount_price
          : item.product.price;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: itemPrice,
          total: itemPrice * item.quantity,
          image_url: item.product.image_url
        };
      });

      const newOrder = await api.createStoreOrder({
        customer_id: customerId,
        customer_name: currentUser.full_name || currentCustomer?.full_name || 'عميل',
        customer_phone: currentCustomer?.phone || currentUser.phone || '',
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        delivery_address: deliveryAddress.trim() || undefined,
        payment_method: paymentMethod,
        transfer_receipt_url: transferReceiptUrl.trim() || undefined,
        status: 'pending',
        items: orderItems,
        subtotal: cartSubtotal,
        discount_amount: 0,
        total_amount: cartSubtotal,
        notes: orderNotes.trim() || undefined
      });

      setMyStoreOrders((prev) => [newOrder, ...prev]);
      setOrderSuccessModal(newOrder);
      clearCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
    } catch (err: any) {
      alert('حدث خطأ أثناء تأكيد الطلب: ' + (err.message || ''));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Filtered Store Products
  const storeCategories = useMemo(() => {
    const set = new Set<string>();
    storeProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [storeProducts]);

  const filteredStoreProducts = useMemo(() => {
    return storeProducts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(storeSearch.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(storeSearch.toLowerCase()));
      const matchCategory = storeCategory === 'all' || p.category === storeCategory;
      return matchSearch && matchCategory;
    });
  }, [storeProducts, storeSearch, storeCategory]);

  // Extract distinct vehicle types and colors for autocomplete
  const uniqueVehicleTypes = Array.from(
    new Set(vehicles.map((v) => (v.vehicle_type || (v as any).type || '').trim()).filter(Boolean) as string[])
  ).sort();

  const uniqueVehicleColors = Array.from(
    new Set(vehicles.map((v) => (v.color || '').trim()).filter(Boolean) as string[])
  ).sort();

  // Handle uploading/replacing image for new vehicle
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', newVehicle.vehicle_image_url);
      setNewVehicle((prev) => ({ ...prev, vehicle_image_url: uploadedUrl }));
    } catch (err: any) {
      alert('فشل حفظ الصورة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setNewVehicle((prev) => ({ ...prev, vehicle_image_url: '' }));
  };

  // Handle updating/replacing image for existing vehicle
  const handleUpdateExistingVehicleImage = async (
    vehicleId: string,
    file: File,
    currentImgUrl?: string
  ) => {
    try {
      setUpdatingVehicleId(vehicleId);
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', currentImgUrl);
      if (onUpdateVehicle) {
        await onUpdateVehicle(vehicleId, {
          vehicle_image_url: uploadedUrl,
          image_url: uploadedUrl
        });
      } else {
        await api.updateVehicle(vehicleId, {
          vehicle_image_url: uploadedUrl,
          image_url: uploadedUrl
        });
      }
      setVehicleMsg('تم تحديث صورة السيارة بنجاح!');
      setTimeout(() => setVehicleMsg(null), 3500);
    } catch (err: any) {
      alert('فشل تحديث صورة السيارة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setUpdatingVehicleId(null);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate_number.trim()) {
      alert('يرجى إدخال رقم اللوحة');
      return;
    }

    try {
      setIsAddingVehicle(true);
      await onCreateVehicle({
        customer_id: customerId,
        vehicle_type: newVehicle.vehicle_type.trim(),
        color: newVehicle.color.trim(),
        plate_number: newVehicle.plate_number.trim(),
        vehicle_image_url: newVehicle.vehicle_image_url || undefined,
        image_url: newVehicle.vehicle_image_url || undefined
      });
      setNewVehicle({ vehicle_type: '', color: '', plate_number: '', vehicle_image_url: '' });
      setVehicleMsg('تمت إضافة السيارة بنجاح!');
      setTimeout(() => setVehicleMsg(null), 3500);
    } catch (err: any) {
      alert('فشل إضافة السيارة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsAddingVehicle(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans" dir="rtl">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl sticky top-0 z-30 border-b border-teal-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.company_name}
                className="w-10 h-10 rounded-xl object-cover border border-teal-400/40 shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center font-bold text-white shadow">
                WC
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight">{settings.company_name}</h1>
              <p className="text-[11px] text-teal-300/80 font-medium">بوابة العميل الذكية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-xs">
              <User className="w-3.5 h-3.5 text-teal-300" />
              <span className="font-bold">{currentUser.full_name}</span>
              <span className="text-[10px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded font-medium">عميل</span>
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('wecare:open-install-prompt'))}
              className="px-3 py-2 bg-teal-800/80 hover:bg-teal-700 text-teal-100 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-teal-600/40"
              title="تثبيت التطبيق على الجوال"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-300" />
              <span className="hidden sm:inline">تثبيت التطبيق</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Compact Welcome & Quick Stats */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            {/* Customer Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs text-teal-200 font-bold">أهلاً بك،</span>
                <h2 className="text-base sm:text-lg font-black truncate">{currentUser.full_name}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-teal-100/75 mt-1 font-medium">
                {area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-300" />
                    <span>{area.name}</span>
                  </span>
                )}
                {currentCustomer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-teal-300" />
                    <span dir="ltr">{currentCustomer.phone}</span>
                  </span>
                )}
                {currentCustomer?.building_number && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3 text-teal-300" />
                    <span>عمارة {currentCustomer.building_number} {currentCustomer.block_number ? `(مجموعة ${currentCustomer.block_number})` : ''}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Compact Quick Stats */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-[70px]">
                <div className="text-base sm:text-lg font-black text-white leading-tight">{mySubscriptions.length}</div>
                <div className="text-[10px] text-teal-200 font-medium">اشتراكاتي</div>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-[70px]">
                <div className="text-base sm:text-lg font-black text-emerald-400 leading-tight">
                  {myVisits.filter((v) => v.status === 'completed').length}
                </div>
                <div className="text-[10px] text-teal-200 font-medium">غسلات مكتملة</div>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-[70px]">
                <div className="text-base sm:text-lg font-black text-sky-400 leading-tight">{myVehicles.length}</div>
                <div className="text-[10px] text-teal-200 font-medium">سياراتي</div>
              </div>
            </div>
          </div>
        </div>

        {/* Continuous Advertisements Slider */}
        {activeAds.length > 0 && (
          <div
            className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md group border border-slate-800"
            onMouseEnter={() => setIsSliderHovered(true)}
            onMouseLeave={() => setIsSliderHovered(false)}
          >
            {/* Slider Track */}
            <div
              className="relative w-full h-44 sm:h-52 md:h-60 overflow-hidden cursor-pointer"
              onClick={() => setSelectedAdForModal(activeAds[currentSlideIndex % activeAds.length])}
            >
              {activeAds.map((ad, idx) => {
                const isActiveSlide = idx === (currentSlideIndex % activeAds.length);
                return (
                  <div
                    key={ad.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                      isActiveSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-sm">
                          <Megaphone className="w-3 h-3" />
                          <span>عرض مميز</span>
                        </span>
                        {ad.price && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-sm">
                            <Tag className="w-3 h-3" />
                            <span>{ad.price} {settings.currency_symbol || 'ر.س'}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-xl font-black drop-shadow-md line-clamp-1">{ad.title}</h3>
                      {ad.description && (
                        <p className="text-xs sm:text-sm text-slate-200/90 line-clamp-1 mt-0.5 max-w-2xl drop-shadow">
                          {ad.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-300 group-hover:text-teal-200 flex items-center gap-1 transition-colors">
                          <span>انقر لمشاهدة تفاصيل العرض</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Slider Controls (Prev / Next) */}
            {activeAds.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevSlide();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                  title="السابق"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextSlide();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                  title="التالي"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {activeAds.map((_, dotIdx) => {
                    const isActive = dotIdx === (currentSlideIndex % activeAds.length);
                    return (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlideIndex(dotIdx);
                        }}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          isActive ? 'w-6 bg-teal-400' : 'w-2 bg-white/50 hover:bg-white/80'
                        }`}
                        title={`الانتقال إلى الإعلان ${dotIdx + 1}`}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Banner for completed unrated wash */}
        {unratedCompletedVisits.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-yellow-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs shrink-0">
                <Star className="w-6 h-6 fill-amber-950 text-amber-950" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span>تم إتمام غسلتك بنجاح! يسعدنا تقييمك للخدمة</span>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                    جديد
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  شاركنا تقييمك من 5 نجوم مع كتابة تعليق حول جودة الغسيل لمساعدتنا في تقديم أفضل مستوى دائماً
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenRatingModal(unratedCompletedVisits[0])}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all self-stretch sm:self-auto justify-center"
            >
              <Star className="w-4 h-4 fill-white" />
              <span>تقييم الغسلة الآن (5 نجوم)</span>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>اشتراكاتي ({mySubscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'visits'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>مواعيد وزيارات الغسيل ({myVisits.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>سياراتي ({myVehicles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'store'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>المتجر الإلكتروني</span>
            {cartItemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black animate-bounce shadow-xs">
                {cartItemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>بيانات حسابي</span>
          </button>
        </div>

        {/* Tab Content */}
        {/* ===================== 1. SUBSCRIPTIONS TAB ===================== */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">قائمة الاشتراكات الحالية والسابقة</h3>
              <button
                onClick={() => setShowSubModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>طلب اشتراك جديد</span>
              </button>
            </div>

            {mySubscriptions.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد اشتراكات مسجلة حالياً</h4>
                <p className="text-xs text-slate-400 mt-1">تواصل مع إدارة النظام أو اضغط طلب اشتراك جديد لبدء باقتك</p>
                <button
                  onClick={() => setShowSubModal(true)}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  + طلب اشتراك جديد
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mySubscriptions.map((sub) => {
                  const pkg = packages.find((p) => p.id === sub.package_id);
                  const veh = vehicles.find((v) => v.id === sub.vehicle_id);
                  const worker = employees.find((e) => e.id === sub.assigned_worker_id);

                  const statusBadge = () => {
                    switch (sub.status) {
                      case 'active':
                        return <span className="bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2.5 py-1 rounded-full">نشط</span>;
                      case 'pending':
                        return <span className="bg-amber-100 text-amber-800 font-bold text-[11px] px-2.5 py-1 rounded-full">قيد المراجعة</span>;
                      case 'expired':
                        return <span className="bg-slate-200 text-slate-700 font-bold text-[11px] px-2.5 py-1 rounded-full">منتهي</span>;
                      case 'cancelled':
                        return <span className="bg-rose-100 text-rose-800 font-bold text-[11px] px-2.5 py-1 rounded-full">ملغي</span>;
                      default:
                        return <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-full">{sub.status}</span>;
                    }
                  };

                  return (
                    <div key={sub.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 relative hover:border-teal-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                            {pkg?.name || 'باقة غسيل'}
                          </span>
                          <h4 className="text-sm font-black text-slate-800 mt-1">
                            {sub.preferred_day_of_week ? `يوم: ${sub.preferred_day_of_week}` : ''} ({sub.preferred_time_from || ''} - {sub.preferred_time_to || ''})
                          </h4>
                        </div>
                        {statusBadge()}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">تاريخ البدء:</span>
                          <span className="font-bold text-slate-700">{sub.start_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">تاريخ الانتهاء:</span>
                          <span className="font-bold text-slate-700">{sub.end_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">السيارة:</span>
                          <span className="font-bold text-slate-700">
                            {veh ? `${veh.vehicle_type} (${veh.plate_number})` : 'غير محدد'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">الفني المسؤول:</span>
                          {worker ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {(worker.personal_image_url || worker.national_id_image_url) ? (
                                <img
                                  src={worker.personal_image_url || worker.national_id_image_url}
                                  alt={worker.full_name}
                                  onClick={() => setSelectedWorkerDetails({
                                    worker,
                                    photoUrl: (worker.personal_image_url || worker.national_id_image_url)!
                                  })}
                                  className="w-6 h-6 rounded-full object-cover border border-teal-400 cursor-pointer shadow-xs hover:scale-110 transition-transform"
                                  title="اضغط لتكبير صورة الفني"
                                />
                              ) : null}
                              <span className="font-bold text-slate-700">{worker.full_name}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-700">بانتظار التعيين</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-teal-800">
                          الإجمالي: {sub.total_price} {settings.currency_symbol || 'ج.م'}
                        </span>
                        <span className={`text-[11px] font-bold ${sub.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {sub.payment_status === 'paid' ? 'تم السداد بالكامل ✓' : 'متبقي سداد'}
                        </span>
                      </div>

                      {/* Action to Cancel Subscription or Subscription Request */}
                      {(sub.status === 'pending' || sub.status === 'active') && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {sub.status === 'pending' ? 'يمكنك إلغاء طلب الاشتراك قبل اعتماده' : 'يمكنك إلغاء الاشتراك في هذه الخدمة'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSubCancelReason('');
                              setCancelSubModal({
                                sub,
                                pkgName: pkg?.name || 'باقة الغسيل',
                                isPending: sub.status === 'pending'
                              });
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{sub.status === 'pending' ? 'إلغاء طلب الاشتراك' : 'إلغاء الاشتراك في الخدمة'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== 2. VISITS TAB ===================== */}
        {activeTab === 'visits' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-slate-800">جدول مواعيد وزيارات الغسيل</h3>

            {myVisits.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">لا توجد زيارات مسجلة لاشتراكاتك حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">تاريخ الزيارة</th>
                      <th className="p-3">حالة الزيارة</th>
                      <th className="p-3">الفني المسؤول</th>
                      <th className="p-3">التقييم والرأي (5 نجوم)</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myVisits.map((vis) => {
                      const worker = employees.find((e) => e.id === (vis.assigned_worker_id || (vis as any).worker_id));
                      return (
                        <tr key={vis.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-800">
                            {vis.scheduled_date || (vis as any).visit_date}
                            {vis.scheduled_time_from && (
                              <span className="text-[10px] text-slate-500 font-normal mr-1.5 block">
                                {vis.scheduled_time_from} {vis.scheduled_time_to ? `- ${vis.scheduled_time_to}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {vis.status === 'completed' && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                                تمت بنجاح ✓
                              </span>
                            )}
                            {vis.status === 'scheduled' && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                                قيد الانتظار
                              </span>
                            )}
                            {vis.status === 'cancelled' && (
                              <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                                ملغاة
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {worker ? (
                              <div className="flex items-center gap-2">
                                {(worker.personal_image_url || worker.national_id_image_url) ? (
                                  <div
                                    onClick={() => setSelectedWorkerDetails({
                                      worker,
                                      photoUrl: (worker.personal_image_url || worker.national_id_image_url)!
                                    })}
                                    className="relative group shrink-0 cursor-pointer"
                                    title="اضغط لتكبير صورة الفني المسؤول"
                                  >
                                    <img
                                      src={worker.personal_image_url || worker.national_id_image_url}
                                      alt={worker.full_name}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-teal-500 shadow-xs group-hover:scale-110 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                                    {worker.full_name.slice(0, 1)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-800 flex items-center gap-1">
                                    <span>{worker.full_name}</span>
                                    {(worker.personal_image_url || worker.national_id_image_url) && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedWorkerDetails({
                                          worker,
                                          photoUrl: (worker.personal_image_url || worker.national_id_image_url)!
                                        })}
                                        className="text-[10px] text-teal-600 hover:text-teal-800 font-bold underline cursor-pointer"
                                        title="عرض وتكبير صورة العامل"
                                      >
                                        (تكبير)
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-teal-700 font-medium block">فني WeCare معتمد</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">فني الخدمة</span>
                            )}
                          </td>
                          
                          {/* 5-Star Rating & Comment */}
                          <td className="p-3">
                            {vis.status === 'completed' ? (
                              vis.rating ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center" dir="ltr">
                                      {Array.from({ length: 5 }, (_, i) => i + 1).map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${
                                            s <= (vis.rating || 0)
                                              ? 'text-amber-400 fill-amber-400'
                                              : 'text-slate-200'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="font-black text-amber-700 text-xs font-mono">
                                      {vis.rating}/5
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRatingModal(vis)}
                                      className="text-[10px] text-teal-600 hover:text-teal-800 underline font-bold mr-1 cursor-pointer"
                                      title="تعديل التقييم والتعليق"
                                    >
                                      تعديل
                                    </button>
                                  </div>
                                  {vis.rating_comment && (
                                    <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 max-w-xs leading-tight">
                                      "{vis.rating_comment}"
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRatingModal(vis)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                  <span>تقييم الغسلة (5 نجوم)</span>
                                </button>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                بانتظار إتمام الغسلة
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-slate-500">{vis.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== 3. VEHICLES TAB ===================== */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Registered Vehicles List */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-800">المركبات المسجلة بحسابي</h3>

              {myVehicles.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">لم تسجل أي سيارة بعد. يمكنك إضافة سيارتك بالأسفل.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {myVehicles.map((v) => {
                    const carImg = v.vehicle_image_url || v.image_url;
                    const isUpdatingThis = updatingVehicleId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="p-4 bg-teal-50/40 rounded-2xl border border-teal-100 flex flex-col justify-between gap-3 shadow-2xs hover:border-teal-300 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          {carImg ? (
                            <div
                              className="relative w-16 h-16 rounded-xl overflow-hidden border border-teal-200 shrink-0 shadow-xs cursor-pointer group/img"
                              onClick={() => setExpandedImage(carImg)}
                              title="اضغط لتكبير صورة السيارة"
                            >
                              <img
                                src={carImg}
                                alt="صورة السيارة"
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
                              <Car className="w-8 h-8" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-800 truncate">{v.vehicle_type || 'سيارة'}</div>
                            <div className="text-[11px] text-slate-500">اللون: {v.color || 'غير محدد'}</div>
                            <div className="text-xs font-black text-teal-800 font-mono mt-0.5">{v.plate_number}</div>
                          </div>

                          {onDeleteVehicle && (
                            <button
                              onClick={() => onDeleteVehicle(v.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="حذف المركبة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Replace / Add Photo Action Button */}
                        <div className="pt-2 border-t border-teal-100/60 flex items-center justify-between">
                          <label className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all">
                            {isUpdatingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                <span>جاري حفظ الصورة...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-3.5 h-3.5 text-teal-600" />
                                <span>{carImg ? 'استبدال الصورة' : 'إضافة صورة للسيارة'}</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUpdatingThis}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpdateExistingVehicleImage(v.id, f, carImg);
                                if (e.target) e.target.value = '';
                              }}
                            />
                          </label>

                          {carImg && (
                            <button
                              type="button"
                              onClick={() => setExpandedImage(carImg)}
                              className="text-[11px] text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                            >
                              عرض مكبر
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Vehicle Form */}
            <form onSubmit={handleAddVehicle} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>إضافة سيارة جديدة للحساب</span>
              </h4>

              {vehicleMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{vehicleMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع السيارة</label>
                  <input
                    type="text"
                    list="portal-vehicle-types"
                    placeholder="مرسيدس / هيونداي"
                    value={newVehicle.vehicle_type}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <datalist id="portal-vehicle-types">
                    {uniqueVehicleTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اللون</label>
                  <input
                    type="text"
                    list="portal-vehicle-colors"
                    placeholder="أسود / أبيض"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <datalist id="portal-vehicle-colors">
                    {uniqueVehicleColors.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    placeholder="س ص ع 1234"
                    value={newVehicle.plate_number}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-teal-600" />
                    <span>صورة السيارة (اختياري)</span>
                  </span>
                  {newVehicle.vehicle_image_url && (
                    <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      ✓ تم تحديد صورة
                    </span>
                  )}
                </label>

                {newVehicle.vehicle_image_url ? (
                  <div className="p-2 bg-teal-50/40 rounded-2xl border border-teal-200 max-w-sm">
                    <div className="relative rounded-xl overflow-hidden border border-teal-200 shadow-xs">
                      <img
                        src={newVehicle.vehicle_image_url}
                        alt="صورة السيارة"
                        onClick={() => setExpandedImage(newVehicle.vehicle_image_url)}
                        className="w-full h-36 object-cover cursor-pointer"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex-1 py-1.5 px-3 bg-white hover:bg-teal-50 text-teal-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-teal-200 shadow-2xs transition-all">
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-teal-600" />
                            <span>استبدال الصورة</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingImage}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-rose-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`w-full max-w-sm p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isUploadingImage
                      ? 'border-teal-400 bg-teal-50/50'
                      : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/20 bg-slate-50/50'
                  }`}>
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                        <span className="text-xs font-bold text-teal-700">جاري تحميل وحفظ الصورة...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">اضغط لاختيار أو التقاط صورة للسيارة</span>
                        <span className="text-[10px] text-slate-400">يدعم كافة صيغ الصور الشائعة</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={isAddingVehicle || isUploadingImage}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all disabled:opacity-50"
              >
                {isAddingVehicle ? 'جاري الحفظ...' : '+ حفظ السيارة'}
              </button>
            </form>
          </div>
        )}

        {/* ===================== 4. PROFILE TAB ===================== */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>بيانات العميل الشخصية ومكان الخدمة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{currentCustomer?.full_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">رقم الموبايل:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block" dir="ltr">{currentCustomer?.phone}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">اسم المستخدم للدخول:</span>
                <span className="font-bold text-teal-700 text-sm mt-0.5 block">{currentCustomer?.username || currentCustomer?.phone}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">المنطقة / الكمبوند:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{area?.name || 'غير محدد'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">العمارة والمجموعة:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  عمارة {currentCustomer?.building_number} - مجموعة {currentCustomer?.block_number || 'A'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">العنوان التفصيلي:</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentCustomer?.detailed_address || 'لم يحدد'}</span>
              </div>

              {currentCustomer?.location_url && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">موقع الخريطة (GPS):</span>
                  <a
                    href={currentCustomer.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 mt-1 text-xs"
                  >
                    <span>فتح الموقع في خرائط Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== 5. STORE TAB ===================== */}
        {activeTab === 'store' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Store Header & Sub-tabs */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-teal-600" />
                  <span>متجر وي كير للعناية بالسيارات</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أفضل منتجات وأدوات العناية الفائقة بسيارتك مع التوصيل والاستلام المريح.
                </p>
              </div>

              {/* Sub-tab Switcher: Catalog vs My Orders */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStoreSubTab('catalog')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    storeSubTab === 'catalog'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تصفح المنتجات
                </button>
                <button
                  type="button"
                  onClick={() => setStoreSubTab('my_orders')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    storeSubTab === 'my_orders'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>طلباتي السابقة</span>
                  {myStoreOrders.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-bold">
                      {myStoreOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Catalog Sub-Tab */}
            {storeSubTab === 'catalog' && (
              <div className="space-y-4">
                {/* Search & Categories Bar */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ابحث عن منتج، معطر، ملمع، أدوات تنظيف..."
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 text-slate-800 font-bold"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setStoreCategory('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        storeCategory === 'all'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      كافة الأقسام
                    </button>
                    {storeCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setStoreCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          storeCategory === cat
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingStoreProducts ? (
                    <div className="col-span-full py-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      <span>جاري تحميل منتجات المتجر...</span>
                    </div>
                  ) : filteredStoreProducts.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl border border-slate-200/80 p-8 space-y-2">
                      <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                      <p>لا توجد منتجات تطابق البحث الحالي في المتجر.</p>
                    </div>
                  ) : (
                    filteredStoreProducts.map((prod) => {
                      const inCart = cart.find((item) => item.product.id === prod.id);
                      return (
                        <div
                          key={prod.id}
                          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:shadow-lg transition-all"
                        >
                          {/* Image Container with Badges */}
                          <div
                            className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer"
                            onClick={() => setSelectedProductModal(prod)}
                          >
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80';
                              }}
                            />
                            {/* Badges */}
                            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                              {prod.is_limited_quantity && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md flex items-center gap-1 animate-pulse">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>كمية محدودة!</span>
                                </span>
                              )}
                              {prod.discount_price && prod.discount_price < prod.price && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                                  وفر {Math.round(((prod.price - prod.discount_price) / prod.price) * 100)}%
                                </span>
                              )}
                            </div>

                            <div className="absolute bottom-2.5 right-2.5">
                              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                {prod.category || 'عام'}
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div
                              className="cursor-pointer"
                              onClick={() => setSelectedProductModal(prod)}
                            >
                              <h4 className="font-black text-slate-800 text-sm line-clamp-1 hover:text-teal-700 transition-colors">
                                {prod.name}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                                {prod.description || 'اضغط لمشاهدة التفاصيل الكاملة للمنتج...'}
                              </p>
                            </div>

                            {/* Price and Cart Button */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <div>
                                {prod.discount_price ? (
                                  <div className="flex flex-col">
                                    <span className="text-base font-black text-teal-800">
                                      {prod.discount_price} {settings.currency_symbol || 'ج.م'}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400 line-through">
                                      {prod.price} {settings.currency_symbol || 'ج.م'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-base font-black text-teal-800">
                                    {prod.price} {settings.currency_symbol || 'ج.م'}
                                  </span>
                                )}
                              </div>

                              {inCart ? (
                                <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-xl p-1">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(prod.id, -1)}
                                    className="w-7 h-7 rounded-lg bg-white text-teal-800 font-black hover:bg-teal-100 flex items-center justify-center shadow-xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-7 text-center font-black text-teal-900 text-xs">
                                    {inCart.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(prod.id, 1)}
                                    className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black hover:bg-teal-700 flex items-center justify-center shadow-xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addToCart(prod)}
                                  className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>أضف للسلة</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* My Orders Sub-Tab */}
            {storeSubTab === 'my_orders' && (
              <div className="space-y-4">
                {loadingMyStoreOrders ? (
                  <div className="py-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    <span>جاري تحميل طلباتك السابقة...</span>
                  </div>
                ) : myStoreOrders.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
                    <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
                    <h4 className="font-bold text-slate-800 text-sm">لا توجد طلبات شراء سابقة حتى الآن</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      يمكنك استعراض منتجات المتجر واختيار ما يناسب سيارتك ليصلك حتى باب منزلك بكل راحة.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStoreSubTab('catalog')}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>تصفح المتجر الآن</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myStoreOrders.map((order) => {
                      const getStatusBadge = (st: StoreOrderStatus) => {
                        switch (st) {
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
                                <Check className="w-3.5 h-3.5" />
                                <span>تم التوصيل</span>
                              </span>
                            );
                          case 'cancelled':
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <X className="w-3.5 h-3.5" />
                                <span>تم إلغاء الطلب</span>
                              </span>
                            );
                          default:
                            return null;
                        }
                      };

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-black text-slate-900 text-sm">
                                #{order.order_number}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(order.created_at || Date.now()).toLocaleDateString('ar-EG', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(order.status)}
                              <span className="text-base font-black text-teal-800">
                                {order.total_amount} {settings.currency_symbol || 'ج.م'}
                              </span>
                            </div>
                          </div>

                          {/* Order Details & Delivery */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[11px]">موعد الاستلام:</span>
                              <span className="font-bold text-slate-800 mt-0.5 block">
                                {order.delivery_date} ({order.delivery_time})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">طريقة الدفع:</span>
                              <span className="font-bold text-slate-800 mt-0.5 block">
                                {order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'انستاباي'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">مكان التوصيل:</span>
                              <span className="font-bold text-slate-800 mt-0.5 block truncate">
                                {order.delivery_address || 'العنوان المسجل بالحساب'}
                              </span>
                            </div>
                          </div>

                          {/* Items row */}
                          <div className="flex items-center gap-2 overflow-x-auto pt-1">
                            {order.items?.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-2 shrink-0 text-xs"
                              >
                                {it.image_url && (
                                  <img
                                    src={it.image_url}
                                    alt={it.product_name}
                                    className="w-8 h-8 rounded-lg object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-bold text-slate-800 text-[11px]">
                                    {it.product_name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {it.quantity} × {it.price} {settings.currency_symbol || 'ج.م'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Cancel Order Action */}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">
                                يمكنك إلغاء هذا الطلب طالما لم يتم تسليمه بعد
                              </span>
                              <button
                                type="button"
                                onClick={() => setCancelOrderModal(order)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>إلغاء طلب المنتجات</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Visible on mobile & desktop if cart has items) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-6 left-6 z-40 animate-bounce">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-5 py-3.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-full shadow-2xl flex items-center gap-3 border-2 border-white cursor-pointer active:scale-95 transition-all"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-teal-100" />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-white">
                {cartItemCount}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-teal-100">سلة المشتريات</div>
              <div className="text-sm font-black text-white">
                {cartSubtotal} {settings.currency_symbol || 'ج.م'}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-teal-600" />
                <span>سلة المشتريات ({cartItemCount} أصناف)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold">سلتك فارغة حالياً</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Items List */}
                <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {cart.map((item) => {
                    const price = item.product.discount_price && item.product.discount_price > 0
                      ? item.product.discount_price
                      : item.product.price;
                    return (
                      <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">{item.product.name}</h4>
                            <div className="text-[11px] text-teal-700 font-bold mt-0.5">
                              {price} {settings.currency_symbol || 'ج.م'}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls & Remove */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="w-6 h-6 rounded bg-white text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-slate-900 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className="w-6 h-6 rounded bg-teal-600 text-white font-bold hover:bg-teal-700 flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="حذف من السلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{cartSubtotal} {settings.currency_symbol || 'ج.م'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 bg-teal-50 p-3 rounded-xl border border-teal-200">
                    <span>المجموع الإجمالي:</span>
                    <span className="text-teal-800 text-base">{cartSubtotal} {settings.currency_symbol || 'ج.م'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>متابعة لتأكيد الطلب والدفع</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="px-4 py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    title="تفريغ السلة"
                  >
                    تفريغ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                  <span>تأكيد طلب الشراء والتحويل</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  إجمالي المبلغ المطلوب: {cartSubtotal} {settings.currency_symbol || 'ج.م'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs font-bold text-slate-700">
              {/* Delivery Timing */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>الموعد المناسب لاستلام المشتريات *</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-[11px] text-slate-500">تاريخ الاستلام:</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] text-slate-500">الوقت المفضل:</label>
                    <select
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-bold"
                    >
                      <option value="09:00 ص - 12:00 م">صباحاً (09:00 ص - 12:00 م)</option>
                      <option value="01:00 م - 04:00 م">ظهراً (01:00 م - 04:00 م)</option>
                      <option value="06:00 م - 09:00 م">مساءً (06:00 م - 09:00 م)</option>
                      <option value="09:00 م - 12:00 ص">ليلاً (09:00 م - 12:00 ص)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-[11px] text-slate-500">عنوان الاستلام والملاحظات:</label>
                  <input
                    type="text"
                    placeholder="العمارة، رقم الشقة، أو مكان تواجد السيارة..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Payment Method Selector & Details */}
              <div className="space-y-3">
                <label className="block text-slate-900 font-black text-xs">
                  طريقة التحويل الإلكتروني المطلوبة:
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Vodafone Cash Choice */}
                  <div
                    onClick={() => setPaymentMethod('vodafone_cash')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'vodafone_cash'
                        ? 'border-red-500 bg-red-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        VC
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">فودافون كاش</div>
                        <div className="text-[10px] text-slate-500">Vodafone Cash</div>
                      </div>
                    </div>
                  </div>

                  {/* InstaPay Choice */}
                  <div
                    onClick={() => setPaymentMethod('instapay')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'instapay'
                        ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        IP
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">انستاباي</div>
                        <div className="text-[10px] text-slate-500">InstaPay</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Info Display with Copy Button */}
                {paymentMethod === 'vodafone_cash' ? (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                    <span className="text-[11px] text-red-800 font-bold block">
                      يرجى تحويل مبلغ <strong className="text-sm font-black">{cartSubtotal} {settings.currency_symbol || 'ج.م'}</strong> إلى رقم محفظة فودافون كاش:
                    </span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-200 font-mono">
                      <span className="font-black text-base text-red-900" dir="ltr">
                        {settings.vodafone_cash_number || '01012345678'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyPaymentInfo(
                            settings.vodafone_cash_number || '01012345678',
                            'vodafone'
                          )
                        }
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedType === 'vodafone' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الرقم</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                    <span className="text-[11px] text-purple-800 font-bold block">
                      يرجى تحويل مبلغ <strong className="text-sm font-black">{cartSubtotal} {settings.currency_symbol || 'ج.م'}</strong> إلى حساب انستاباي:
                    </span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-purple-200 font-mono">
                      <span className="font-black text-base text-purple-900" dir="ltr">
                        {settings.instapay_handle || 'wecare@instapay'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyPaymentInfo(
                            settings.instapay_handle || 'wecare@instapay',
                            'instapay'
                          )
                        }
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedType === 'instapay' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الحساب</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Transfer Receipt */}
                <div className="space-y-1.5">
                  <label className="block text-slate-800 text-xs">
                    إرفاق صورة إشعار / إيصال التحويل:
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-teal-50 border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-2xl cursor-pointer transition-colors text-xs text-slate-600">
                      <Upload className="w-4 h-4 text-teal-600" />
                      <span>{isUploadingReceipt ? 'جاري رفع الصورة...' : 'رفع صورة الإشعار من الجهاز'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        disabled={isUploadingReceipt}
                        className="hidden"
                      />
                    </label>

                    {transferReceiptUrl && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-300 shrink-0">
                        <img
                          src={transferReceiptUrl}
                          alt="إشعار التحويل"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  {transferReceiptUrl && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم رفع إشعار التحويل بنجاح!</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-[11px] text-slate-500">ملاحظات إضافية (اختياري):</label>
                  <textarea
                    rows={2}
                    placeholder="أي تعليمات خاصة بالطلب أو التسليم..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                </div>
              </div>

              {/* Confirm / Cancel */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingOrder || isUploadingReceipt}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تأكيد وإرسال طلب الشراء ({cartSubtotal} {settings.currency_symbol || 'ج.م'})</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="relative h-60 rounded-2xl overflow-hidden bg-slate-100">
              <img
                src={selectedProductModal.image_url}
                alt={selectedProductModal.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                {selectedProductModal.is_limited_quantity && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    كمية محدودة!
                  </span>
                )}
                {selectedProductModal.discount_price && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                    خصم خاص
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md">
                  {selectedProductModal.category || 'عام'}
                </span>
                <span className="text-xs text-slate-400">
                  متوفر: {selectedProductModal.stock_quantity ?? 10} قطع
                </span>
              </div>
              <h3 className="text-base font-black text-slate-800">{selectedProductModal.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedProductModal.description || 'منتج عالي الجودة معتمد لخدمات العناية بالسيارات.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                {selectedProductModal.discount_price ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-teal-800">
                      {selectedProductModal.discount_price} {settings.currency_symbol || 'ج.م'}
                    </span>
                    <span className="text-xs font-bold text-slate-400 line-through">
                      {selectedProductModal.price}
                    </span>
                  </div>
                ) : (
                  <span className="text-xl font-black text-teal-800">
                    {selectedProductModal.price} {settings.currency_symbol || 'ج.م'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProductModal);
                  setSelectedProductModal(null);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>إضافة إلى السلة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Confirmation Modal */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800">تم استلام طلب الشراء بنجاح!</h3>
              <p className="text-xs text-slate-500">
                رقم الطلب: <strong className="font-mono text-teal-700 text-sm">#{orderSuccessModal.order_number}</strong>
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1.5 text-right font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">موعد الاستلام:</span>
                <span className="font-bold text-slate-800">{orderSuccessModal.delivery_date} ({orderSuccessModal.delivery_time})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">إجمالي القيمة:</span>
                <span className="font-bold text-emerald-700">{orderSuccessModal.total_amount} {settings.currency_symbol || 'ج.م'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">حالة الطلب:</span>
                <span className="font-bold text-amber-700">قيد المراجعة وتأكيد الدفع</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              تم إشعار إدارة النظام بطلبك الجديد، وسيقوم فريق العمل بتجهيز الأصناف وتوصيلها في الموعد المحدد.
            </p>

            <button
              type="button"
              onClick={() => {
                setOrderSuccessModal(null);
                setStoreSubTab('my_orders');
              }}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              متابعة حالة الطلب في قائمة طلباتي
            </button>
          </div>
        </div>
      )}

      {/* New Subscription Modal for Customer */}
      {showSubModal && (
        <CreateSubscriptionModal
          isOpen={showSubModal}
          onClose={() => setShowSubModal(false)}
          customers={customers}
          vehicles={myVehicles}
          packages={packages}
          categories={categories}
          coverageAreas={coverageAreas}
          pricing={pricing}
          employees={employees}
          settings={settings}
          paymentMethods={paymentMethods}
          canOverridePrice={false}
          preselectedCustomer={currentCustomer}
          onCreateSubscription={async (s) => {
            if (onCreateSubscription) {
              const res = await onCreateSubscription(s);
              setShowSubModal(false);
              return res;
            }
            throw new Error('غير متاح');
          }}
          onCreateVehicle={onCreateVehicle}
        />
      )}
      {/* Vehicle Image Zoom Lightbox */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={expandedImage}
              alt="صورة السيارة مكبرة"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Worker Details & Enlarge Photo Modal (مشاهدة صورة الفني المسؤول بوضوح) */}
      {selectedWorkerDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedWorkerDetails(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <div>
                  <h4 className="font-black text-slate-800 text-sm">
                    {selectedWorkerDetails.worker.full_name}
                  </h4>
                  <span className="text-[10px] text-teal-600 font-bold block">
                    فني الغسيل المعتمد لزيارتك
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkerDetails(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[220px]">
              <img
                src={selectedWorkerDetails.photoUrl}
                alt={selectedWorkerDetails.worker.full_name}
                className="w-full max-h-80 object-contain rounded-2xl shadow-md"
              />
            </div>

            <div className="p-4 bg-white space-y-2 text-xs">
              <div className="p-2.5 bg-teal-50 border border-teal-100 rounded-xl flex items-center gap-2 text-teal-900">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-[11px] font-bold">
                  هذا الفني معتمد ومفوض رسمياً من إدارة WeCare لتقديم خدمة الغسيل.
                </span>
              </div>
              {selectedWorkerDetails.worker.phone && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">رقم الهاتف للتواصل:</span>
                  <a
                    href={`tel:${selectedWorkerDetails.worker.phone}`}
                    className="font-mono font-bold text-teal-700 hover:underline"
                  >
                    {selectedWorkerDetails.worker.phone}
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setSelectedWorkerDetails(null)}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advertisement Details Modal (صفحة بيانات الإعلان) */}
      {selectedAdForModal && (
        <div
          onClick={() => setSelectedAdForModal(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-scaleUp"
          >
            {/* Modal Image Header */}
            <div className="relative w-full h-56 sm:h-64 bg-slate-900 shrink-0">
              <img
                src={selectedAdForModal.image_url}
                alt={selectedAdForModal.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedAdForModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-all shadow-md"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              {selectedAdForModal.price && (
                <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-black text-sm shadow-lg flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  <span>{selectedAdForModal.price} {settings.currency_symbol || 'ر.س'}</span>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>تاريخ العرض: {selectedAdForModal.date}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    <Megaphone className="w-3 h-3 text-teal-600" />
                    <span>عرض حصري</span>
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
                  {selectedAdForModal.title}
                </h3>
              </div>

              {selectedAdForModal.description && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedAdForModal.description}
                </div>
              )}

              {/* Direct Contact Actions */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2.5">
                {selectedAdForModal.whatsapp && (
                  <a
                    href={`https://wa.me/${selectedAdForModal.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 text-sm cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>مراسلة واتساب</span>
                  </a>
                )}
                {selectedAdForModal.phone && (
                  <a
                    href={`tel:${selectedAdForModal.phone}`}
                    className="flex-1 min-w-[140px] py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-600/20 text-sm cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال بالهاتف</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAdForModal(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal تقييم الغسلة (5 نجوم مع كتابة تعليق) */}
      {ratingVisit && (
        <div
          onClick={() => !isSubmittingRating && setRatingVisit(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp p-6 space-y-5 text-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    تقييم جودة الغسيل والخدمة
                  </h3>
                  <p className="text-xs text-slate-500">
                    رأيك يساعدنا على تطوير الأداء ومكافأة الفنيين المتميزين
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingRating}
                onClick={() => setRatingVisit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visit Context Card */}
            {(() => {
              const targetSub = subscriptions.find((s) => s.id === ratingVisit.subscription_id);
              const targetVeh = vehicles.find((v) => v.id === targetSub?.vehicle_id);
              const worker = employees.find((e) => e.id === (ratingVisit.assigned_worker_id || (ratingVisit as any).worker_id));
              return (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">تاريخ الغسلة:</span>
                    <span className="font-bold text-slate-800">
                      {ratingVisit.scheduled_date || (ratingVisit as any).visit_date}
                    </span>
                  </div>
                  {targetVeh && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">السيارة:</span>
                      <span className="font-bold text-teal-800 font-mono">
                        {targetVeh.vehicle_type} ({targetVeh.plate_number})
                      </span>
                    </div>
                  )}
                  {worker && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">فني الغسيل:</span>
                      <span className="font-bold text-slate-800">
                        {worker.full_name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Success Message Banner */}
            {ratingSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{ratingSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-4">
                {/* 5-Star Interactive Selector */}
                <div className="text-center py-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    كم نجمة تمنح هذه الغسلة؟ (من 1 إلى 5 نجوم)
                  </label>
                  <div className="flex items-center justify-center gap-2" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (ratingHover || ratingScore) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          onClick={() => setRatingScore(star)}
                          className="p-1.5 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                          title={`${star} نجوم`}
                        >
                          <Star
                            className={`w-9 h-9 transition-colors ${
                              isFilled
                                ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                                : 'text-slate-200 fill-slate-100'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Rating Label Descriptor */}
                  <div className="text-xs font-black text-amber-700 h-5">
                    {ratingScore === 5 && '⭐⭐⭐⭐⭐ ممتاز جداً (خمس نجوم)'}
                    {ratingScore === 4 && '⭐⭐⭐⭐ جيد جداً'}
                    {ratingScore === 3 && '⭐⭐⭐ جيد (مرضي)'}
                    {ratingScore === 2 && '⭐⭐ مقبول (يحتاج عناية)'}
                    {ratingScore === 1 && '⭐ ضعيف (غير راضٍ)'}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      <span>اكتب تعليقك أو رأيك حول الغسلة</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      اختياري
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="اكتب ملاحظاتك، رأيك في نظافة ولمعان السيارة، أو أي اقتراح تود إيصاله للإدارة..."
                    className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium resize-none transition-all leading-relaxed"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingRating}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingRating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري إرسال التقييم...</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 fill-white" />
                        <span>إرسال التقييم والتعليق</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingRating}
                    onClick={() => setRatingVisit(null)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel Subscription or Subscription Request */}
      {cancelSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-800">
                  {cancelSubModal.isPending ? 'إلغاء طلب الاشتراك في باقة' : 'إلغاء الاشتراك في الخدمة'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {cancelSubModal.isPending
                    ? `هل أنت متأكد من رغبتك في إلغاء طلب الاشتراك في باقة "${cancelSubModal.pkgName}"؟`
                    : `هل أنت متأكد من إلغاء اشتراكك في باقة "${cancelSubModal.pkgName}"؟ سيتم إيقاف كافة الزيارات المجدولة المتبقية المرتبطة به فوراً.`}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب الإلغاء (اختياري)
              </label>
              <textarea
                rows={3}
                value={subCancelReason}
                onChange={(e) => setSubCancelReason(e.target.value)}
                placeholder="يرجى كتابة سبب الإلغاء لمساعدتنا في تحسين خدماتنا..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 font-medium resize-none transition-all leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isCancellingSub}
                onClick={handleConfirmCancelSubscription}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancellingSub ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإلغاء...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>
                      {cancelSubModal.isPending ? 'تأكيد إلغاء الطلب' : 'تأكيد إلغاء الاشتراك'}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isCancellingSub}
                onClick={() => {
                  setCancelSubModal(null);
                  setSubCancelReason('');
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel Store Order */}
      {cancelOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-800">
                  إلغاء طلب المنتجات
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  هل أنت متأكد من رغبتك في إلغاء طلب الشراء رقم #{cancelOrderModal.id.slice(0, 8)} بقيمة {cancelOrderModal.total_amount} {settings.currency_symbol || 'ج.م'}؟
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
              تنبيه: سيتم إيقاف معالجة هذا الطلب وتغيير حالته إلى "ملغي" وإشعار الإدارة فوراً.
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isCancellingOrder}
                onClick={handleConfirmCancelOrder}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancellingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إلغاء الطلب...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>تأكيد إلغاء الطلب</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isCancellingOrder}
                onClick={() => setCancelOrderModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
