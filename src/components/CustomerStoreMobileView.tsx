import React, { useState, useMemo } from 'react';
import { AuthUser, Settings, Customer, StoreProduct, StoreOrder } from '../types/database';
import * as api from '../services/api';
import { uploadStorageAsset } from '../utils/imageStorage';

export interface CustomerStoreMobileViewProps {
  currentUser: AuthUser;
  customer: Customer | null;
  settings: Settings;
  storeProducts: StoreProduct[];
  loadingStoreProducts?: boolean;
  myStoreOrders?: StoreOrder[];
  loadingMyStoreOrders?: boolean;
  activeTab: string;
  onSelectTab: (tab: 'home' | 'subscriptions' | 'services' | 'visits' | 'vehicles' | 'store' | 'profile') => void;
  onOrderCreated?: () => Promise<void> | void;
}

// Category tile color palettes matching B-Store.dc.html
const CATEGORY_TILE_COLORS: Record<string, [string, string]> = {
  'معطرات': ['#F6EEF6', '#8B3F8B'],
  'أدوات عناية': ['#F1EEE8', '#8A6A2E'],
  'إكسسوارات': ['#F1EEE8', '#8A6A2E'],
  'عناية داخلية': ['#EAF1F6', '#1F6FB2'],
  'عناية خارجية': ['#E3F2EF', '#0B7F72'],
  'زيوت المحرك': ['#FEF3C7', '#92400E'],
  'oil': ['#FEF3C7', '#92400E'],
  'ext': ['#E3F2EF', '#0B7F72'],
  'int': ['#EAF1F6', '#1F6FB2'],
  'scent': ['#F6EEF6', '#8B3F8B'],
  'acc': ['#F1EEE8', '#8A6A2E']
};

export const CustomerStoreMobileView: React.FC<CustomerStoreMobileViewProps> = ({
  currentUser,
  customer,
  settings,
  storeProducts,
  loadingStoreProducts = false,
  myStoreOrders = [],
  loadingMyStoreOrders = false,
  activeTab,
  onSelectTab,
  onOrderCreated
}) => {
  // Navigation / sub-view state
  const [activeView, setActiveView] = useState<'catalog' | 'orders'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart state: map of productId -> quantity
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout form state
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [deliveryTime, setDeliveryTime] = useState('06:00 م - 09:00 م');
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.detailed_address || customer?.building_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay' | 'cash'>('cash');
  const [transferReceiptUrl, setTransferReceiptUrl] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<StoreOrder | null>(null);

  // Cart helpers
  const getProductQty = (productId: string) => cartQuantities[productId] || 0;

  const handleIncQty = (product: StoreProduct) => {
    setCartQuantities((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const handleDecQty = (productId: string) => {
    setCartQuantities((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartQuantities((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clearCart = () => {
    setCartQuantities({});
  };

  // Cart items list with products
  const cartItems = useMemo(() => {
    return Object.entries(cartQuantities)
      .map(([id, qty]) => {
        const product = storeProducts.find((p) => p.id === id);
        if (!product || qty <= 0) return null;
        const unitPrice = product.discount_price && product.discount_price < product.price ? product.discount_price : product.price;
        return {
          product,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty
        };
      })
      .filter(Boolean) as Array<{ product: StoreProduct; quantity: number; unitPrice: number; totalPrice: number }>;
  }, [cartQuantities, storeProducts]);

  const totalCartCount = useMemo(() => {
    return Object.values(cartQuantities).reduce((sum, q) => sum + q, 0);
  }, [cartQuantities]);

  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cartItems]);

  // Dynamic Categories derived from existing products
  const categories = useMemo(() => {
    const set = new Set<string>();
    storeProducts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['all', ...Array.from(set)];
  }, [storeProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return storeProducts.filter((p) => {
      if (!p.is_available) return false;
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [storeProducts, selectedCategory, searchQuery]);

  // Color helper for categories
  const getTileColors = (catName?: string): [string, string] => {
    if (!catName) return ['#E3F2EF', '#0B7F72'];
    return CATEGORY_TILE_COLORS[catName] || ['#E3F2EF', '#0B7F72'];
  };

  // Handle Receipt Upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingReceipt(true);
      const url = await uploadStorageAsset(file, 'store_receipts');
      setTransferReceiptUrl(url);
    } catch (err: any) {
      alert('فشل رفع إيصال التحويل: ' + (err.message || ''));
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (paymentMethod !== 'cash' && !transferReceiptUrl) {
      alert('يرجى إرفاق صورة إيصال التحويل لتأكيد الطلب');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const customerId = customer?.id || currentUser.customer_id || currentUser.id;
      const customerName = customer?.full_name || customer?.name || currentUser.full_name || 'عميل';
      const customerPhone = customer?.phone || currentUser.phone || '';

      const orderItems = cartItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.totalPrice,
        image_url: item.product.image_url
      }));

      const newOrder = await api.createStoreOrder({
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        delivery_address: deliveryAddress.trim() || undefined,
        payment_method: paymentMethod as any,
        transfer_receipt_url: transferReceiptUrl.trim() || undefined,
        status: 'pending',
        items: orderItems,
        subtotal: cartTotalAmount,
        discount_amount: 0,
        total_amount: cartTotalAmount,
        notes: orderNotes.trim() || undefined
      });

      setCompletedOrder(newOrder);
      clearCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      if (onOrderCreated) {
        await onOrderCreated();
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء إتمام الطلب: ' + (err.message || ''));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        maxWidth: '390px',
        minHeight: '100vh',
        position: 'relative',
        background: '#FFFFFF',
        fontFamily: "'Cairo', system-ui, sans-serif",
        color: '#0E1B24',
        fontSize: '15px',
        lineHeight: 1.6,
        boxShadow: '0 0 25px rgba(0, 0, 0, 0.06)',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header matching B-Store.dc.html */}
      <header style={{ padding: '18px 20px 6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
              {settings.store_name?.trim() ? `متجر ${settings.store_name.trim()}` : 'المتجر'}
            </h1>
            <span style={{ fontSize: '14px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
              منتجات العناية بسيارتك
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Orders History Pill */}
            {myStoreOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'orders' ? 'catalog' : 'orders')}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '12px',
                  border: `1px solid ${activeView === 'orders' ? '#0B7F72' : '#E2E9EA'}`,
                  background: activeView === 'orders' ? '#E3F2EF' : '#FFFFFF',
                  color: activeView === 'orders' ? '#0B7F72' : '#0E1B24',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>طلباتي</span>
                <span
                  style={{
                    background: '#0B7F72',
                    color: '#FFFFFF',
                    borderRadius: '999px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  {myStoreOrders.length}
                </span>
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={totalCartCount > 0 ? `السلة، فيها ${totalCartCount} منتجات` : 'السلة فارغة'}
              style={{
                position: 'relative',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                border: '1px solid #E2E9EA',
                background: '#FFFFFF',
                color: '#0E1B24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"></path>
                <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
              </svg>
              {totalCartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '-6px',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 5px',
                    boxSizing: 'border-box',
                    borderRadius: '999px',
                    background: '#0B7F72',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FFFFFF'
                  }}
                >
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeView === 'catalog' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '48px', boxSizing: 'border-box', borderRadius: '14px', background: '#F3F6F6', padding: '0 14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B6B73" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-4-4"></path>
            </svg>
            <label htmlFor="st-search" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>ابحث في المتجر</label>
            <input
              id="st-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج"
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                border: 'none',
                background: 'transparent',
                fontSize: '15px',
                color: '#0E1B24',
                outline: 'none',
                fontFamily: "'Cairo', sans-serif"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ padding: '10px 20px 170px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {/* Delivery Announcement Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '14px',
            background: '#E3F2EF',
            color: '#0B5F56',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M3 7h11v9H3z"></path>
            <path d="M14 10h4l3 3v3h-7"></path>
            <circle cx="7" cy="18" r="1.8"></circle>
            <circle cx="17" cy="18" r="1.8"></circle>
          </svg>
          طلبك بيوصلك مع الفني في غسلتك القادمة
        </div>

        {activeView === 'catalog' ? (
          <>
            {/* Category Filter Pills */}
            <div role="tablist" aria-label="أقسام المتجر" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map((catKey) => {
                const isSelected = selectedCategory === catKey;
                const label = catKey === 'all' ? 'الكل' : catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedCategory(catKey)}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '999px',
                      border: `1px solid ${isSelected ? '#0E1B24' : '#D5DEE0'}`,
                      background: isSelected ? '#0E1B24' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#34474F',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif",
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            {loadingStoreProducts ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#5B6B73', fontSize: '14px', fontWeight: 600 }}>
                جاري تحميل المنتجات...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '20px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                  <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"></path>
                  <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
                </svg>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#334155' }}>لا توجد منتجات مطابقة</span>
                <span style={{ fontSize: '13px' }}>جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً</span>
              </div>
            ) : (
              <section
                aria-label="المنتجات"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px'
                }}
              >
                {filteredProducts.map((item) => {
                  const qty = getProductQty(item.id);
                  const [tileBg, tileInk] = getTileColors(item.category);
                  const effectivePrice = item.discount_price && item.discount_price < item.price ? item.discount_price : item.price;
                  const hasDiscount = item.discount_price && item.discount_price < item.price;

                  return (
                    <article
                      key={item.id}
                      style={{
                        border: '1px solid #E2E9EA',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      {/* Product Image / Tile Area */}
                      <div
                        style={{
                          height: '125px',
                          background: tileBg,
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              // If image fails, hide and show fallback icon
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}

                        {/* Fallback Icon when image not available */}
                        {!item.image_url && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              color: tileInk
                            }}
                          >
                            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3z"></path>
                              <path d="M7 12h10"></path>
                            </svg>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.category || 'منتج'}</span>
                          </div>
                        )}

                        {/* Discount Badge */}
                        {hasDiscount && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: '#EF4444',
                              color: '#FFFFFF',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '6px'
                            }}
                          >
                            خصم
                          </span>
                        )}
                      </div>

                      {/* Product Info & Action */}
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '12px', color: '#5B6B73', fontWeight: 500, fontFamily: "'Cairo', sans-serif" }}>
                          {item.category || 'عام'}
                        </span>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: '#0E1B24',
                            minHeight: '38px',
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          {item.name}
                        </h2>

                        {/* Price */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0B7F72', fontFamily: "'Cairo', sans-serif" }}>
                            {effectivePrice} ج.م
                          </span>
                          {hasDiscount && (
                            <span style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>
                              {item.price} ج.م
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => handleIncQty(item)}
                              aria-label={`أضف ${item.name} للسلة`}
                              style={{
                                width: '100%',
                                height: '44px',
                                borderRadius: '12px',
                                border: 'none',
                                background: '#0B7F72',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Cairo', sans-serif",
                                transition: 'background 0.15s ease'
                              }}
                            >
                              أضف للسلة
                            </button>
                          ) : (
                            <div
                              style={{
                                height: '44px',
                                borderRadius: '12px',
                                border: '1px solid #0B7F72',
                                display: 'grid',
                                gridTemplateColumns: '44px minmax(0, 1fr) 44px',
                                alignItems: 'center',
                                background: '#FFFFFF'
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleIncQty(item)}
                                aria-label={`زيادة كمية ${item.name}`}
                                style={{
                                  height: '42px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#0B7F72',
                                  fontSize: '22px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                +
                              </button>
                              <span
                                aria-live="polite"
                                style={{ textAlign: 'center', fontWeight: 700, color: '#0E1B24', fontSize: '15px' }}
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDecQty(item.id)}
                                aria-label={`تقليل كمية ${item.name}`}
                                style={{
                                  height: '42px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#0B7F72',
                                  fontSize: '22px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                −
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        ) : (
          /* My Orders View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                طلباتي السابقة ({myStoreOrders.length})
              </h2>
              <button
                type="button"
                onClick={() => setActiveView('catalog')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0B7F72',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                ← العودة للمتجر
              </button>
            </div>

            {loadingMyStoreOrders ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#5B6B73' }}>
                جاري تحميل الطلبات...
              </div>
            ) : myStoreOrders.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '20px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B'
                }}
              >
                لم تقم بإجراء أي طلبات متجر سابقة بعد.
              </div>
            ) : (
              myStoreOrders.map((ord) => {
                const getStatusBadge = (st: string) => {
                  switch (st) {
                    case 'pending':
                      return { bg: '#FEF3C7', color: '#92400E', label: 'قيد المراجعة' };
                    case 'preparing':
                      return { bg: '#E0E7FF', color: '#3730A3', label: 'جاري التجهيز' };
                    case 'paid':
                      return { bg: '#E0F2FE', color: '#0369A1', label: 'تم الدفع' };
                    case 'delivered':
                      return { bg: '#D1FAE5', color: '#065F46', label: 'تم التسليم' };
                    case 'cancelled':
                      return { bg: '#FEE2E2', color: '#991B1B', label: 'ملغي' };
                    default:
                      return { bg: '#F1F5F9', color: '#475569', label: st };
                  }
                };
                const badge = getStatusBadge(ord.status);

                return (
                  <div
                    key={ord.id}
                    style={{
                      border: '1px solid #E2E9EA',
                      borderRadius: '16px',
                      padding: '14px',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#0E1B24' }}>
                        {ord.order_number || `طلب #${ord.id.slice(0, 6)}`}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: badge.bg,
                          color: badge.color
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#5B6B73' }}>
                      موعد التسليم: {ord.delivery_date} ({ord.delivery_time || 'غسلتك القادمة'})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0' }}>
                      {(ord.items || []).map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#334155' }}>
                            {it.product_name} × {it.quantity}
                          </span>
                          <span style={{ fontWeight: 600, color: '#0E1B24' }}>
                            {it.total ?? (it as any).total_price ?? (it.price * it.quantity)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        borderTop: '1px solid #F1F5F9',
                        paddingTop: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                        fontSize: '14px'
                      }}
                    >
                      <span>الإجمالي</span>
                      <span style={{ color: '#0B7F72' }}>{ord.total_amount} ج.م</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Cart Bar matching B-Store.dc.html */}
      {totalCartCount > 0 && activeView === 'catalog' && (
        <div
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '390px',
            padding: '12px 20px 14px',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            borderTop: '1px solid #E2E9EA',
            boxShadow: '0 -6px 18px rgba(12,37,48,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 35
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: '#5B6B73', fontFamily: "'Cairo', sans-serif" }}>
              السلة · {totalCartCount} {totalCartCount === 1 ? 'منتج' : 'منتجات'}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0E1B24', fontFamily: "'Cairo', sans-serif" }}>
              {cartTotalAmount} ج.م
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            style={{
              flex: 1,
              height: '52px',
              borderRadius: '16px',
              border: 'none',
              background: '#0B7F72',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            إتمام الطلب
          </button>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 60,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '390px',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              boxSizing: 'border-box',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E9EA', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B7F72" strokeWidth="2">
                  <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"></path>
                  <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
                </svg>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0E1B24' }}>
                  سلة المشتريات ({totalCartCount})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            {cartItems.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748B' }}>
                السلة فارغة حالياً
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px',
                      borderRadius: '14px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0E1B24' }}>
                        {item.product.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#0B7F72', fontWeight: 600 }}>
                        {item.unitPrice} ج.م للقطعة
                      </span>
                    </div>

                    {/* Qty Controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '2px 6px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleIncQty(item.product)}
                        style={{ border: 'none', background: 'transparent', color: '#0B7F72', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}
                      >
                        +
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '16px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDecQty(item.product.id)}
                        style={{ border: 'none', background: 'transparent', color: '#0B7F72', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}
                      >
                        −
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #E2E9EA' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>الإجمالي الكلي:</span>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: '#0B7F72' }}>
                    {cartTotalAmount} ج.م
                  </span>
                </div>

                {/* Checkout Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#0B7F72',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                >
                  متابعة الشراء وتحديد موعد التسليم
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 65,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setIsCheckoutOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '390px',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E9EA', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0E1B24' }}>
                تأكيد طلب الشراء ({cartTotalAmount} ج.م)
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Delivery Note */}
              <div
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#E3F2EF',
                  color: '#0B5F56',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                سيقوم فني الغسيل بتسليم الطلب أثناء زيارته القادمة المحددة أدناه.
              </div>

              {/* Delivery Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ التسليم المفضل
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                />
              </div>

              {/* Delivery Time */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  وقت الزيارة المفضل
                </label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: "'Cairo', sans-serif",
                    background: '#FFFFFF'
                  }}
                >
                  <option value="06:00 م - 09:00 م">الفترة المسائية (06:00 م - 09:00 م)</option>
                  <option value="09:00 ص - 12:00 م">الفترة الصباحية (09:00 ص - 12:00 م)</option>
                  <option value="مع أقرب غسلة قادمة">مع أقرب غسلة مجدولة للسيارة</option>
                </select>
              </div>

              {/* Delivery Address */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  عنوان التسليم أو رقم الموقف / الفيلا
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="مثال: فيلا 12، كمبوند الياسمين، موقف B4"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: "'Cairo', sans-serif"
                  }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  طريقة الدفع
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: `1px solid ${paymentMethod === 'cash' ? '#0B7F72' : '#CBD5E1'}`,
                      background: paymentMethod === 'cash' ? '#E3F2EF' : '#FFFFFF',
                      color: paymentMethod === 'cash' ? '#0B7F72' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    نقداً مع الفني
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vodafone_cash')}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: `1px solid ${paymentMethod === 'vodafone_cash' ? '#0B7F72' : '#CBD5E1'}`,
                      background: paymentMethod === 'vodafone_cash' ? '#E3F2EF' : '#FFFFFF',
                      color: paymentMethod === 'vodafone_cash' ? '#0B7F72' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    فودافون كاش
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('instapay')}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: `1px solid ${paymentMethod === 'instapay' ? '#0B7F72' : '#CBD5E1'}`,
                      background: paymentMethod === 'instapay' ? '#E3F2EF' : '#FFFFFF',
                      color: paymentMethod === 'instapay' ? '#0B7F72' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Cairo', sans-serif"
                    }}
                  >
                    إنستاباي
                  </button>
                </div>
              </div>

              {/* Electronic Payment Details & Receipt */}
              {paymentMethod !== 'cash' && (
                <div style={{ padding: '10px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {paymentMethod === 'vodafone_cash'
                      ? `رقم فودافون كاش: ${settings.vodafone_cash_number || '01000000000'}`
                      : `معرف إنستاباي: ${settings.instapay_handle || 'wecare@instapay'}`}
                  </span>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                      إرفاق إيصال التحويل:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      disabled={isUploadingReceipt}
                      style={{ fontSize: '12px' }}
                    />
                    {isUploadingReceipt && <span style={{ fontSize: '11px', color: '#0B7F72' }}>جاري الرفع...</span>}
                    {transferReceiptUrl && <span style={{ fontSize: '11px', color: '#16A34A', display: 'block' }}>✓ تم رفع الإيصال</span>}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="أي تعليمات أو ملاحظات للفني..."
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '8px 10px',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontFamily: "'Cairo', sans-serif",
                    resize: 'none'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingOrder || isUploadingReceipt}
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#0B7F72',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmittingOrder ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingOrder ? 0.7 : 1,
                  fontFamily: "'Cairo', sans-serif",
                  marginTop: '6px'
                }}
              >
                {isSubmittingOrder ? 'جاري إرسال الطلب...' : `تأكيد الطلب بمبلغ ${cartTotalAmount} ج.م`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {completedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '350px',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px'
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0E1B24' }}>
              تم استلام طلبك بنجاح!
            </h3>
            <span style={{ fontSize: '13px', color: '#5B6B73' }}>
              رقم الطلب: <strong style={{ color: '#0E1B24' }}>{completedOrder.order_number || completedOrder.id.slice(0, 8)}</strong>
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              سيتم تجهيز طلبك وتسليمه بواسطة فني الغسيل في موعدك المحدد.
            </p>
            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                setActiveView('orders');
              }}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                background: '#0B7F72',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
                marginTop: '8px'
              }}
            >
              متابعة طلباتي
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation matching B-Store.dc.html & other mobile screens */}
      <nav
        aria-label="التنقل الرئيسي"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          height: '76px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E9EA',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          alignItems: 'center',
          paddingBottom: '6px',
          boxSizing: 'border-box',
          zIndex: 40
        }}
      >
        {/* 1. الرئيسية */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'home' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'home' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"></path>
          </svg>
          الرئيسية
        </button>

        {/* 2. الباقات */}
        <button
          type="button"
          onClick={() => onSelectTab('subscriptions')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'subscriptions' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'subscriptions' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l9 5-9 5-9-5z"></path>
            <path d="M3 13l9 5 9-5"></path>
          </svg>
          الباقات
        </button>

        {/* 3. الخدمات */}
        <button
          type="button"
          onClick={() => onSelectTab('services')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'services' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'services' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5"></path>
            <path d="M3 21l3-3"></path>
          </svg>
          الخدمات
        </button>

        {/* 4. المتجر (Active) */}
        <button
          type="button"
          onClick={() => onSelectTab('store')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#0B7F72',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"></path>
            <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
          </svg>
          المتجر
        </button>

        {/* 5. حسابي */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'profile' ? '#0B7F72' : '#5B6B73',
            fontSize: '12px',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>
          </svg>
          حسابي
        </button>
      </nav>
    </div>
  );
};
