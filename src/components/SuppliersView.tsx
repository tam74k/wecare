import React, { useState, useMemo, useRef } from 'react';
import {
  Supplier,
  SupplierTransaction,
  SupplierTransactionType,
  Treasury,
  PaymentMethod,
  Settings,
  PurchaseOrder,
  PurchaseOrderItem,
  InventoryItem
} from '../types/database';
import {
  Truck,
  Plus,
  Search,
  Filter,
  FileText,
  CreditCard,
  Receipt,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Calendar,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Clock,
  Eye,
  Check,
  X,
  Wallet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Barcode,
  Package,
  Layers,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  FileCheck,
  ShoppingCart,
  CheckCircle,
  Coins
} from 'lucide-react';
import { createPurchaseInvoice } from '../services/api';

interface SuppliersViewProps {
  suppliers: Supplier[];
  transactions: SupplierTransaction[];
  purchaseOrders: PurchaseOrder[];
  inventoryItems: InventoryItem[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  settings: Settings;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'current_balance' | 'created_at'>) => Promise<Supplier>;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;
  onDeleteSupplier: (id: string) => Promise<boolean>;
  onCreateTransaction: (tx: Omit<SupplierTransaction, 'id' | 'created_at'>) => Promise<SupplierTransaction>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
  onCreatePurchaseOrder: (order: Omit<PurchaseOrder, 'id' | 'created_at'>) => Promise<PurchaseOrder>;
  onUpdatePurchaseOrder: (order: PurchaseOrder) => Promise<PurchaseOrder>;
  onDeletePurchaseOrder: (id: string) => Promise<boolean>;
  onConvertPurchaseOrderToInvoice: (params: any) => Promise<any>;
  onCreatePurchaseInvoice?: (params: any) => Promise<any>;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  transactions,
  purchaseOrders,
  inventoryItems,
  treasuries,
  paymentMethods,
  settings,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onCreateTransaction,
  onDeleteTransaction,
  onCreatePurchaseOrder,
  onUpdatePurchaseOrder,
  onDeletePurchaseOrder,
  onConvertPurchaseOrderToInvoice,
  onCreatePurchaseInvoice
}) => {
  // Navigation tabs within Suppliers
  const [activeTab, setActiveTab] = useState<'list' | 'orders' | 'statement' | 'transactions'>('list');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'with_balance'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'converted' | 'cancelled'>('all');

  // Statement selected supplier and date filters
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetSupplierId, setPaymentTargetSupplierId] = useState<string>('');

  // Purchase Order Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<PurchaseOrder | null>(null);
  const [convertingOrder, setConvertingOrder] = useState<PurchaseOrder | null>(null);

  // Form state for Supplier
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    opening_balance: 0,
    is_active: true,
    notes: ''
  });

  // Identify Main Treasury & Default Cash Method
  const mainTreasury = useMemo(() => {
    return treasuries.find((t) => t.type === 'main') || treasuries[0];
  }, [treasuries]);

  const cashPaymentMethod = useMemo(() => {
    return paymentMethods.find((pm) => pm.name.includes('كاش') || pm.name.includes('نقدي')) || paymentMethods[0];
  }, [paymentMethods]);

  // Form state for Payment
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    treasury_id: treasuries.find((t) => t.type === 'main')?.id || treasuries[0]?.id || '',
    payment_method_id: paymentMethods[0]?.id || '',
    invoice_number: '',
    notes: ''
  });

  // Form state for Purchase Order (امر توريد - بدون سعر)
  const [orderSupplierId, setOrderSupplierId] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);

  // Item entry inputs for PO modal
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState<boolean>(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Form state for Converting PO to Purchase Invoice
  const [convertInvoiceNumber, setConvertInvoiceNumber] = useState<string>('');
  const [convertInvoiceDate, setConvertInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [convertItems, setConvertItems] = useState<Array<{
    item_id: string;
    item_name: string;
    unit: string;
    quantity_requested: number;
    quantity_received: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>>([]);
  const [convertPaymentType, setConvertPaymentType] = useState<'credit' | 'treasury'>('credit');
  const [convertTreasuryId, setConvertTreasuryId] = useState<string>(treasuries.find((t) => t.type === 'main')?.id || treasuries[0]?.id || '');
  const [convertPaymentMethodId, setConvertPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [convertNotes, setConvertNotes] = useState<string>('');
  const [isSubmittingConvert, setIsSubmittingConvert] = useState<boolean>(false);

  // Form state for Direct Purchase Invoice (فاتورة مشتريات منفصلة تضيف للمخزون)
  const [isDirectInvoiceModalOpen, setIsDirectInvoiceModalOpen] = useState(false);
  const [directSupplierId, setDirectSupplierId] = useState<string>('');
  const [directInvoiceNumber, setDirectInvoiceNumber] = useState<string>('');
  const [directInvoiceDate, setDirectInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [directPaymentType, setDirectPaymentType] = useState<'credit' | 'treasury'>('credit');
  const [directTreasuryId, setDirectTreasuryId] = useState<string>(treasuries.find((t) => t.type === 'main')?.id || treasuries[0]?.id || '');
  const [directPaymentMethodId, setDirectPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [directNotes, setDirectNotes] = useState<string>('');
  const [directInvoiceItems, setDirectInvoiceItems] = useState<Array<{
    item_id: string;
    item_name: string;
    barcode?: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>>([]);
  const [directSelectedItemId, setDirectSelectedItemId] = useState<string>('');
  const [directItemQty, setDirectItemQty] = useState<number>(1);
  const [directItemPrice, setDirectItemPrice] = useState<number>(0);
  const [directBarcodeInput, setDirectBarcodeInput] = useState<string>('');
  const [isSubmittingDirectInvoice, setIsSubmittingDirectInvoice] = useState<boolean>(false);

  // Calculate Overall Statistics
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter((s) => s.is_active).length;
    const totalBalanceDue = suppliers.reduce((acc, s) => acc + (s.current_balance || 0), 0);
    const totalPaid = transactions
      .filter((t) => t.type === 'payment')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalPurchases = transactions
      .filter((t) => t.type === 'purchase')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const pendingOrdersCount = purchaseOrders.filter((o) => o.status === 'pending').length;

    return {
      totalSuppliers,
      activeSuppliers,
      totalBalanceDue,
      totalPaid,
      totalPurchases,
      pendingOrdersCount
    };
  }, [suppliers, transactions, purchaseOrders]);

  // Filtered Suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.tax_number && s.tax_number.includes(searchQuery));

      if (!matchSearch) return false;

      if (statusFilter === 'active') return s.is_active;
      if (statusFilter === 'inactive') return !s.is_active;
      if (statusFilter === 'with_balance') return (s.current_balance || 0) > 0;

      return true;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Filtered Purchase Orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const supplier = suppliers.find((s) => s.id === order.supplier_id);
      const supplierName = supplier?.name || '';
      const matchSearch =
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.notes && order.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (orderStatusFilter !== 'all') {
        return order.status === orderStatusFilter;
      }
      return true;
    });
  }, [purchaseOrders, suppliers, searchQuery, orderStatusFilter]);

  // Autocomplete filtered inventory items
  const autocompleteItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return inventoryItems.slice(0, 10);
    const q = itemSearchQuery.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [inventoryItems, itemSearchQuery]);

  // Handle Barcode Scan / Keydown
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matched = inventoryItems.find(
      (item) =>
        (item.barcode && item.barcode.trim() === code) ||
        item.id === code ||
        item.name.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      addItemToOrder(matched, itemQuantity || 1);
      setBarcodeInput('');
    } else {
      alert(`لم يتم العثور على صنف بالباركود أو الكود: ${code}`);
    }
  };

  // Add Item to Order list
  const addItemToOrder = (item: InventoryItem, qty: number = 1) => {
    const existingIndex = orderItems.findIndex((i) => i.item_id === item.id);
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity_requested += qty;
      setOrderItems(updated);
    } else {
      const newItem: PurchaseOrderItem = {
        id: 'poi-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        item_id: item.id,
        item_name: item.name,
        barcode: item.barcode || '',
        unit: item.unit || 'قطعة',
        quantity_requested: qty,
        notes: itemNotes || ''
      };
      setOrderItems([...orderItems, newItem]);
    }
    // Reset entry inputs
    setSelectedItemId('');
    setItemSearchQuery('');
    setItemQuantity(1);
    setItemNotes('');
    setIsItemDropdownOpen(false);
  };

  // Open Create Supplier Modal
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      tax_number: '',
      opening_balance: 0,
      is_active: true,
      notes: ''
    });
    setIsSupplierModalOpen(true);
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name || !supplierFormData.phone) {
      alert('يرجى ملء اسم المورد ورقم الهاتف على الأقل');
      return;
    }

    try {
      if (editingSupplier) {
        await onUpdateSupplier(editingSupplier.id, supplierFormData);
      } else {
        await onCreateSupplier(supplierFormData);
      }
      setIsSupplierModalOpen(false);
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ بيانات المورد: ' + (err?.message || err));
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (supplierId?: string) => {
    const targetId = supplierId || selectedSupplierId || (suppliers[0]?.id ?? '');
    setPaymentTargetSupplierId(targetId);
    setPaymentFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      treasury_id: mainTreasury?.id || treasuries[0]?.id || '',
      payment_method_id: cashPaymentMethod?.id || paymentMethods[0]?.id || '',
      invoice_number: '',
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentFormData.amount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }
    if (!paymentTargetSupplierId) {
      alert('يرجى اختيار المورد المستحق للدفعة');
      return;
    }

    try {
      await onCreateTransaction({
        supplier_id: paymentTargetSupplierId,
        type: 'payment',
        amount,
        date: paymentFormData.date,
        treasury_id: paymentFormData.treasury_id || null,
        payment_method_id: paymentFormData.payment_method_id || null,
        invoice_number: paymentFormData.invoice_number,
        notes: paymentFormData.notes,
        created_by: 'الإدارة'
      });
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      alert('فشل تسجيل الدفعة: ' + (err?.message || err));
    }
  };

  // Open Create Purchase Order Modal (امر توريد جديد)
  const handleOpenCreateOrderModal = (supplierId?: string) => {
    setEditingOrder(null);
    setOrderSupplierId(supplierId || selectedSupplierId || (suppliers[0]?.id ?? ''));
    setOrderNumber(`PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderNotes('');
    setOrderItems([]);
    setBarcodeInput('');
    setSelectedItemId('');
    setItemSearchQuery('');
    setItemQuantity(1);
    setItemNotes('');
    setIsOrderModalOpen(true);
  };

  // Open Edit Purchase Order Modal
  const handleOpenEditOrderModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setOrderSupplierId(order.supplier_id);
    setOrderNumber(order.order_number);
    setOrderDate(order.order_date);
    setOrderNotes(order.notes || '');
    setOrderItems([...order.items]);
    setBarcodeInput('');
    setSelectedItemId('');
    setItemSearchQuery('');
    setItemQuantity(1);
    setItemNotes('');
    setIsOrderModalOpen(true);
  };

  // Save Purchase Order (امر توريد)
  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId) {
      alert('يرجى اختيار المورد المطلوب التوريد منه');
      return;
    }
    if (!orderNumber.trim()) {
      alert('يرجى تحديد رقم أمر التوريد');
      return;
    }
    if (orderItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل في أمر التوريد');
      return;
    }

    try {
      if (editingOrder) {
        await onUpdatePurchaseOrder({
          ...editingOrder,
          order_number: orderNumber,
          supplier_id: orderSupplierId,
          order_date: orderDate,
          notes: orderNotes,
          items: orderItems
        });
      } else {
        await onCreatePurchaseOrder({
          order_number: orderNumber,
          supplier_id: orderSupplierId,
          order_date: orderDate,
          status: 'pending',
          items: orderItems,
          total_amount: 0,
          notes: orderNotes,
          created_by: 'مسؤول المشتريات'
        });
      }
      setIsOrderModalOpen(false);
      setActiveTab('orders');
    } catch (err: any) {
      alert('فشل حفظ أمر التوريد: ' + (err?.message || err));
    }
  };

  // Open Convert to Invoice Modal (تحويل امر التوريد لفاتورة شراء)
  const handleOpenConvertModal = (order: PurchaseOrder) => {
    setConvertingOrder(order);
    setConvertInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setConvertInvoiceDate(new Date().toISOString().split('T')[0]);
    setConvertNotes(`فاتورة شراء محولة من أمر توريد رقم: ${order.order_number}`);
    setConvertPaymentType('credit');
    setConvertTreasuryId(mainTreasury?.id || treasuries[0]?.id || '');
    setConvertPaymentMethodId(cashPaymentMethod?.id || paymentMethods[0]?.id || '');

    // جهز الأصناف بالكميات المستلمة وأسعار التكلفة
    const preparedItems = order.items.map((i) => {
      const invItem = inventoryItems.find((inv) => inv.id === i.item_id);
      const defaultPrice = i.unit_price || invItem?.unit_cost || 0;
      const qtyReceived = i.quantity_received !== undefined && i.quantity_received !== null ? i.quantity_received : i.quantity_requested;
      return {
        item_id: i.item_id,
        item_name: i.item_name,
        unit: i.unit,
        quantity_requested: i.quantity_requested,
        quantity_received: qtyReceived,
        unit_price: defaultPrice,
        total_price: qtyReceived * defaultPrice,
        notes: i.notes || ''
      };
    });
    setConvertItems(preparedItems);
  };

  // Update item field during conversion
  const handleUpdateConvertItem = (index: number, field: 'quantity_received' | 'unit_price', value: number) => {
    const updated = [...convertItems];
    const item = { ...updated[index] };
    if (field === 'quantity_received') {
      item.quantity_received = value;
    } else {
      item.unit_price = value;
    }
    item.total_price = Number((item.quantity_received * item.unit_price).toFixed(2));
    updated[index] = item;
    setConvertItems(updated);
  };

  // Calculate Grand Total of Conversion Invoice
  const convertGrandTotal = useMemo(() => {
    return convertItems.reduce((acc, it) => acc + (it.total_price || 0), 0);
  }, [convertItems]);

  // Execute Conversion
  const handleExecuteConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingOrder) return;
    if (!convertInvoiceNumber.trim()) {
      alert('يرجى إدخال رقم فاتورة الشراء');
      return;
    }
    if (convertItems.length === 0) {
      alert('لا توجد أصناف في الفاتورة');
      return;
    }

    try {
      setIsSubmittingConvert(true);
      await onConvertPurchaseOrderToInvoice({
        orderId: convertingOrder.id,
        supplierId: convertingOrder.supplier_id,
        orderNumber: convertingOrder.order_number,
        invoiceNumber: convertInvoiceNumber,
        invoiceDate: convertInvoiceDate,
        items: convertItems,
        totalAmount: convertGrandTotal,
        paymentType: convertPaymentType,
        treasuryId: convertPaymentType === 'treasury' ? convertTreasuryId : null,
        paymentMethodId: convertPaymentType === 'treasury' ? convertPaymentMethodId : null,
        notes: convertNotes,
        createdBy: 'الإدارة'
      });
      setConvertingOrder(null);
      alert('تم تحويل أمر التوريد إلى فاتورة شراء بنجاح، وتمت إضافة الكميات الفعلية إلى رصيد المخزون!');
    } catch (err: any) {
      alert('حدث خطأ أثناء تحويل أمر التوريد: ' + (err?.message || err));
    } finally {
      setIsSubmittingConvert(false);
    }
  };

  // Open Direct Purchase Invoice Modal
  const handleOpenDirectInvoiceModal = (supplierId?: string) => {
    const targetSup = supplierId || selectedSupplierId || (suppliers[0]?.id ?? '');
    setDirectSupplierId(targetSup);
    setDirectInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setDirectInvoiceDate(new Date().toISOString().split('T')[0]);
    setDirectPaymentType('credit');
    setDirectTreasuryId(mainTreasury?.id || treasuries[0]?.id || '');
    setDirectPaymentMethodId(cashPaymentMethod?.id || paymentMethods[0]?.id || '');
    setDirectNotes('فاتورة مشتريات مباشرة');
    setDirectInvoiceItems([]);
    setDirectSelectedItemId(inventoryItems[0]?.id || '');
    setDirectItemQty(1);
    setDirectItemPrice(inventoryItems[0]?.unit_cost || 0);
    setDirectBarcodeInput('');
    setIsDirectInvoiceModalOpen(true);
  };

  // Add Item to Direct Invoice
  const handleAddDirectInvoiceItem = (itemToAddId?: string) => {
    const targetId = itemToAddId || directSelectedItemId;
    const invItem = inventoryItems.find((i) => i.id === targetId);
    if (!invItem) return;

    const existingIndex = directInvoiceItems.findIndex((it) => it.item_id === targetId);
    if (existingIndex >= 0) {
      const updated = [...directInvoiceItems];
      updated[existingIndex].quantity += directItemQty || 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setDirectInvoiceItems(updated);
    } else {
      const price = directItemPrice > 0 ? directItemPrice : (invItem.unit_cost || 0);
      const qty = directItemQty > 0 ? directItemQty : 1;
      setDirectInvoiceItems([
        ...directInvoiceItems,
        {
          item_id: invItem.id,
          item_name: invItem.name,
          barcode: invItem.barcode || invItem.item_code,
          unit: invItem.unit || 'قطعة',
          quantity: qty,
          unit_price: price,
          total_price: qty * price,
          notes: ''
        }
      ]);
    }

    setDirectItemQty(1);
    setDirectBarcodeInput('');
  };

  // Quick Barcode Scan for Direct Invoice
  const handleDirectBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = directBarcodeInput.trim().toLowerCase();
      if (!code) return;
      const matched = inventoryItems.find(
        (i) => (i.barcode && i.barcode.toLowerCase() === code) || (i.item_code && i.item_code.toLowerCase() === code)
      );
      if (matched) {
        handleAddDirectInvoiceItem(matched.id);
      } else {
        alert('لم يتم العثور على صنف بهذا الباركود في المخزون');
      }
    }
  };

  // Update item field in Direct Invoice table
  const handleUpdateDirectItem = (index: number, field: 'quantity' | 'unit_price', value: number) => {
    const updated = [...directInvoiceItems];
    const val = Math.max(0, value);
    updated[index][field] = val;
    updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    setDirectInvoiceItems(updated);
  };

  // Remove item from Direct Invoice table
  const handleRemoveDirectItem = (index: number) => {
    setDirectInvoiceItems(directInvoiceItems.filter((_, i) => i !== index));
  };

  // Calculate Direct Grand Total
  const directGrandTotal = useMemo(() => {
    return directInvoiceItems.reduce((acc, it) => acc + (it.total_price || 0), 0);
  }, [directInvoiceItems]);

  // Execute Direct Purchase Invoice Submission
  const handleSaveDirectInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSupplierId) {
      alert('يرجى اختيار المورد');
      return;
    }
    if (!directInvoiceNumber.trim()) {
      alert('يرجى إدخال رقم فاتورة الشراء');
      return;
    }
    if (directInvoiceItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل في فاتورة المشتريات');
      return;
    }
    const hasZeroQty = directInvoiceItems.some((it) => it.quantity <= 0);
    if (hasZeroQty) {
      alert('يرجى التأكد من أن جميع كميات الأصناف أكبر من الصفر');
      return;
    }

    try {
      setIsSubmittingDirectInvoice(true);
      const payload = {
        supplierId: directSupplierId,
        invoiceNumber: directInvoiceNumber.trim(),
        invoiceDate: directInvoiceDate,
        items: directInvoiceItems,
        totalAmount: directGrandTotal,
        paymentType: directPaymentType,
        treasuryId: directPaymentType === 'treasury' ? directTreasuryId : null,
        paymentMethodId: directPaymentType === 'treasury' ? directPaymentMethodId : null,
        notes: directNotes,
        createdBy: 'الإدارة'
      };

      if (onCreatePurchaseInvoice) {
        await onCreatePurchaseInvoice(payload);
      } else {
        await createPurchaseInvoice(payload);
      }

      setIsDirectInvoiceModalOpen(false);
      alert(`تم تسجيل فاتورة المشتريات رقم (${directInvoiceNumber}) بنجاح وتمت إضافة الكميات مباشرة إلى رصيد المخزون وحساب المورد!`);
      setActiveTab('orders');
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ فاتورة المشتريات: ' + (err?.message || err));
    } finally {
      setIsSubmittingDirectInvoice(false);
    }
  };

  // Selected supplier object for Account Statement
  const statementSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  }, [suppliers, selectedSupplierId]);

  // Calculate Statement Transactions & Running Balance
  const statementData = useMemo(() => {
    if (!statementSupplier) return { items: [], openingPrior: 0, periodPurchases: 0, periodPayments: 0, finalBalance: 0 };

    const supplierTxs = transactions
      .filter((t) => t.supplier_id === statementSupplier.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.created_at || '').localeCompare(b.created_at || ''));

    let openingPrior = statementSupplier.opening_balance || 0;
    let filteredTxs = supplierTxs;

    if (statementStartDate) {
      const priorTxs = supplierTxs.filter((t) => t.date < statementStartDate);
      priorTxs.forEach((t) => {
        if (t.type === 'purchase') openingPrior += t.amount;
        else if (t.type === 'payment' || t.type === 'return') openingPrior -= t.amount;
      });
      filteredTxs = filteredTxs.filter((t) => t.date >= statementStartDate);
    }

    if (statementEndDate) {
      filteredTxs = filteredTxs.filter((t) => t.date <= statementEndDate);
    }

    let running = openingPrior;
    let periodPurchases = 0;
    let periodPayments = 0;

    const rows = filteredTxs.map((t) => {
      let debit = 0;
      let credit = 0;

      if (t.type === 'purchase') {
        credit = t.amount;
        running += t.amount;
        periodPurchases += t.amount;
      } else if (t.type === 'payment' || t.type === 'return') {
        debit = t.amount;
        running -= t.amount;
        periodPayments += t.amount;
      }

      return {
        id: t.id,
        date: t.date,
        type: t.type,
        invoice_number: t.invoice_number,
        notes: t.notes,
        debit,
        credit,
        runningBalance: running
      };
    });

    return {
      items: rows,
      openingPrior,
      periodPurchases,
      periodPayments,
      finalBalance: running
    };
  }, [statementSupplier, transactions, statementStartDate, statementEndDate]);

  // Print Handlers
  const handlePrintStatement = () => {
    window.print();
  };

  const paymentSupplierObj = suppliers.find((s) => s.id === paymentTargetSupplierId);
  const currentOrderSupplierObj = suppliers.find((s) => s.id === orderSupplierId);
  const printingSupplierObj = printingOrder ? suppliers.find((s) => s.id === printingOrder.supplier_id) : null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-cairo">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-sky-600 rounded-xl text-white shadow-md shadow-teal-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <span>إدارة الموردين وأوامر التوريد</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إصدار ومتابعة أوامر التوريد بدون أسعار، مسح الباركود، وتحويلها لفواتير شراء تضيف إلى المخزون وتحدث الحسابات
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenDirectInvoiceModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer active:scale-98"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ فاتورة مشتريات (إضافة للمخزون)</span>
          </button>

          <button
            onClick={() => handleOpenCreateOrderModal()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-sky-600/20"
          >
            <FileText className="w-4 h-4" />
            <span>أمر توريد جديد</span>
          </button>

          <button
            onClick={() => handleOpenPaymentModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-emerald-600/20"
          >
            <CreditCard className="w-4 h-4" />
            <span>سداد دفعة للمورد</span>
          </button>

          <button
            onClick={handleOpenCreateSupplier}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مورد جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي الموردين</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalSuppliers}</h3>
            <p className="text-[11px] text-teal-600 font-bold mt-1">
              {stats.activeSuppliers} موردين نشطين
            </p>
          </div>
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">أوامر التوريد النشطة</p>
            <h3 className="text-2xl font-black text-sky-600 mt-1">{stats.pendingOrdersCount}</h3>
            <p className="text-[11px] text-sky-500 font-bold mt-1">أوامر قيد انتظار الاستلام</p>
          </div>
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">الأرصدة المستحقة للموردين</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {stats.totalBalanceDue.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-500">{settings.currency_symbol}</span>
            </h3>
            <p className="text-[11px] text-rose-500 font-bold mt-1">إجمالي الديون القائمة</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي المدفوعات المسددة</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats.totalPaid.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-500">{settings.currency_symbol}</span>
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">دفعات مسددة من الخزائن</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Sub Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm flex items-center gap-2 print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'list'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>قائمة الموردين ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>أوامر التوريد ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'statement'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>كشف حساب المورد التفصيلي</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سجل حركات ودفعات التوريد</span>
        </button>
      </div>

      {/* ============================================================================== */}
      {/* TAB 1: LIST (قائمة الموردين) */}
      {/* ============================================================================== */}
      {activeTab === 'list' && (
        <div className="space-y-4 print:hidden">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث بالاسم، الهاتف، جهة الاتصال، الرقم الضريبي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">جميع الموردين</option>
                <option value="active">النشطين فقط</option>
                <option value="with_balance">الموردين ذوي الأرصدة المستحقة</option>
                <option value="inactive">غير النشطين</option>
              </select>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold">
                    <th className="py-3 px-4">المورد / الشركة</th>
                    <th className="py-3 px-4">جهة الاتصال</th>
                    <th className="py-3 px-4">الهاتف والعنوان</th>
                    <th className="py-3 px-4">الرقم الضريبي</th>
                    <th className="py-3 px-4">الرصيد الافتتاحي</th>
                    <th className="py-3 px-4">الرصيد المستحق الحالي</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold">لم يتم العثور على أي موردين مطابقين للبحث</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-black text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                              {s.name.charAt(0)}
                            </div>
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{s.contact_person || '—'}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-mono text-slate-700 font-bold" dir="ltr">{s.phone}</p>
                          {s.address && <p className="text-[11px] text-slate-400 truncate max-w-xs">{s.address}</p>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{s.tax_number || '—'}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">
                          {(s.opening_balance || 0).toLocaleString('ar-EG')} {settings.currency_symbol}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span
                            className={
                              (s.current_balance || 0) > 0
                                ? 'text-rose-600'
                                : (s.current_balance || 0) < 0
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }
                          >
                            {(s.current_balance || 0).toLocaleString('ar-EG')} {settings.currency_symbol}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {s.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                              <XCircle className="w-3 h-3" /> معطل
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenCreateOrderModal(s.id)}
                              title="أمر توريد جديد"
                              className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenPaymentModal(s.id)}
                              title="تسجيل دفعة سداد"
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSupplierId(s.id);
                                setActiveTab('statement');
                              }}
                              title="كشف حساب تفصيلي"
                              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingSupplier(s);
                                setSupplierFormData({
                                  name: s.name,
                                  contact_person: s.contact_person || '',
                                  phone: s.phone,
                                  email: s.email || '',
                                  address: s.address || '',
                                  tax_number: s.tax_number || '',
                                  opening_balance: s.opening_balance || 0,
                                  is_active: s.is_active,
                                  notes: s.notes || ''
                                });
                                setIsSupplierModalOpen(true);
                              }}
                              title="تعديل بيانات المورد"
                              className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`هل أنت متأكد من حذف المورد "${s.name}" وكافة سجلاته وحركاته؟`)) {
                                  await onDeleteSupplier(s.id);
                                }
                              }}
                              title="حذف"
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
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
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 2: ORDERS (أوامر التوريد - Purchase Orders) */}
      {/* ============================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4 print:hidden">
          {/* Search & Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث برقم أمر التوريد، اسم المورد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد التوريد (بانتظار الاستلام)</option>
                <option value="converted">تم التحويل لفاتورة شراء</option>
                <option value="cancelled">ملغي</option>
              </select>

              <button
                type="button"
                onClick={() => handleOpenDirectInvoiceModal()}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 whitespace-nowrap cursor-pointer active:scale-98"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>+ فاتورة مشتريات مباشرة</span>
              </button>

              <button
                onClick={() => handleOpenCreateOrderModal()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-sky-600/20 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>أمر توريد جديد</span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold">
                    <th className="py-3 px-4">رقم أمر التوريد</th>
                    <th className="py-3 px-4">تاريخ الأمر</th>
                    <th className="py-3 px-4">المورد المطلوب منه</th>
                    <th className="py-3 px-4">عدد الأصناف</th>
                    <th className="py-3 px-4">إجمالي الكميات المطلوبة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">الفاتورة المرتبطة</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold">لا توجد أوامر توريد مطابقة</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const supplier = suppliers.find((s) => s.id === order.supplier_id);
                      const totalQty = (order.items || []).reduce((acc, it) => acc + (it.quantity_requested || 0), 0);
                      const isPending = order.status === 'pending';
                      const isConverted = order.status === 'converted';

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                            {order.order_number}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{order.order_date}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {supplier?.name || 'مورد غير محدد'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700 font-bold">
                            {(order.items || []).length} صنف
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {totalQty} وحدة
                          </td>
                          <td className="py-3.5 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                <Clock className="w-3 h-3" /> قيد التوريد
                              </span>
                            )}
                            {isConverted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> تم التحويل لفاتورة
                              </span>
                            )}
                            {order.status === 'cancelled' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                <XCircle className="w-3 h-3" /> ملغي
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {order.converted_invoice_number ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                {order.converted_invoice_number}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print A4 */}
                              <button
                                onClick={() => setPrintingOrder(order)}
                                title="طباعة أمر التوريد قياس A4"
                                className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Convert to Purchase Invoice Button */}
                              {isPending && (
                                <button
                                  onClick={() => handleOpenConvertModal(order)}
                                  title="تحويل إلى فاتورة شراء وإضافة للمخزون"
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-xs font-bold flex items-center gap-1 shadow-sm"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>تحويل لفاتورة</span>
                                </button>
                              )}

                              {/* Edit Order */}
                              {isPending && (
                                <button
                                  onClick={() => handleOpenEditOrderModal(order)}
                                  title="تعديل أمر التوريد"
                                  className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Order */}
                              <button
                                onClick={async () => {
                                  if (window.confirm(`هل أنت متأكد من حذف أمر التوريد رقم "${order.order_number}"؟`)) {
                                    await onDeletePurchaseOrder(order.id);
                                  }
                                }}
                                title="حذف أمر التوريد"
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 3: ACCOUNT STATEMENT (كشف حساب المورد التفصيلي) */}
      {/* ============================================================================== */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Controls Bar (Hidden during print) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
              <label className="text-xs font-bold text-slate-600">اختر المورد:</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold">من:</span>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold">إلى:</span>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              {(statementStartDate || statementEndDate) && (
                <button
                  onClick={() => {
                    setStatementStartDate('');
                    setStatementEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  إعادة ضبط
                </button>
              )}

              <button
                onClick={handlePrintStatement}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحساب A4</span>
              </button>
            </div>
          </div>

          {/* Printable Statement Layout */}
          {statementSupplier && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm print:border-none print:shadow-none print:p-0">
              {/* Official Header */}
              <div className="border-b-2 border-slate-800 pb-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{settings.company_name}</h2>
                    <p className="text-xs text-slate-500 mt-1">كشف حساب مورد معتمد</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')} - {new Date().toLocaleTimeString('ar-EG')}
                    </p>
                  </div>
                  {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
                  )}
                </div>

                {/* Supplier & Period Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold">اسم المورد:</p>
                    <p className="text-slate-800 font-black mt-0.5">{statementSupplier.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">جهة الاتصال / الهاتف:</p>
                    <p className="text-slate-800 font-bold mt-0.5" dir="ltr">{statementSupplier.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">الرقم الضريبي / السجل:</p>
                    <p className="text-slate-800 font-mono mt-0.5">{statementSupplier.tax_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">الفترة الزمنية:</p>
                    <p className="text-slate-800 font-mono mt-0.5">
                      {statementStartDate || 'البداية'} إلى {statementEndDate || 'الآن'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-slate-500 font-bold">الرصيد السابق</p>
                  <p className="text-base font-black text-slate-800 mt-0.5 font-mono">
                    {statementData.openingPrior.toLocaleString('ar-EG')} {settings.currency_symbol}
                  </p>
                </div>
                <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100">
                  <p className="text-sky-700 font-bold">إجمالي المشتريات (دائن)</p>
                  <p className="text-base font-black text-sky-800 mt-0.5 font-mono">
                    {statementData.periodPurchases.toLocaleString('ar-EG')} {settings.currency_symbol}
                  </p>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                  <p className="text-emerald-700 font-bold">إجمالي السداد (مدين)</p>
                  <p className="text-base font-black text-emerald-800 mt-0.5 font-mono">
                    {statementData.periodPayments.toLocaleString('ar-EG')} {settings.currency_symbol}
                  </p>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <p className="text-rose-700 font-bold">صافي الرصيد المستحق</p>
                  <p className="text-base font-black text-rose-800 mt-0.5 font-mono">
                    {statementData.finalBalance.toLocaleString('ar-EG')} {settings.currency_symbol}
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] font-bold">
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">نوع الحركة</th>
                      <th className="py-2.5 px-3">رقم السند/الفاتورة</th>
                      <th className="py-2.5 px-3">البيان والشرح</th>
                      <th className="py-2.5 px-3 text-left">مدين (سداد دفعات)</th>
                      <th className="py-2.5 px-3 text-left">دائن (مشتريات/توريد)</th>
                      <th className="py-2.5 px-3 text-left">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Row for Prior / Opening Balance */}
                    <tr className="bg-slate-50/70 font-bold text-slate-600">
                      <td className="py-2 px-3 font-mono">{statementStartDate || '—'}</td>
                      <td className="py-2 px-3">رصيد افتتاحي / سابق</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">رصيد ما قبل الفترة المحددة</td>
                      <td className="py-2 px-3 text-left font-mono">—</td>
                      <td className="py-2 px-3 text-left font-mono">—</td>
                      <td className="py-2 px-3 text-left font-mono font-black text-slate-800">
                        {statementData.openingPrior.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                    </tr>

                    {statementData.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          لا توجد حركات مسجلة خلال هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      statementData.items.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono text-slate-600">{row.date}</td>
                          <td className="py-2.5 px-3">
                            {row.type === 'purchase' && <span className="text-sky-700 font-bold">فاتورة توريد</span>}
                            {row.type === 'payment' && <span className="text-emerald-700 font-bold">سند صرف دفعة</span>}
                            {row.type === 'return' && <span className="text-amber-700 font-bold">مرتجع بضاعة</span>}
                            {row.type === 'opening_balance' && <span className="text-purple-700 font-bold">رصيد افتتاحي</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                            {row.invoice_number || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs">{row.notes || '—'}</td>
                          <td className="py-2.5 px-3 text-left font-mono text-emerald-700 font-bold">
                            {row.debit > 0 ? `${row.debit.toLocaleString('ar-EG')} ${settings.currency_symbol}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-sky-700 font-bold">
                            {row.credit > 0 ? `${row.credit.toLocaleString('ar-EG')} ${settings.currency_symbol}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-black text-slate-800">
                            {row.runningBalance.toLocaleString('ar-EG')} {settings.currency_symbol}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-800 border-t-2 border-slate-300">
                      <td colSpan={4} className="py-3 px-3 text-right">
                        الإجمالي النهائي المستحق للمورد:
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-emerald-700">
                        {statementData.periodPayments.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-sky-700">
                        {statementData.periodPurchases.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-rose-700 text-sm">
                        {statementData.finalBalance.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-300 text-xs">
                <div className="text-center">
                  <p className="font-bold text-slate-700">إدارة الحسابات والمراجعة</p>
                  <p className="text-slate-400 mt-1">الاسم والتوقيع: .......................................</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">توقيع وختم المورد بالاستلام والمصادقة</p>
                  <p className="text-slate-400 mt-1">الاسم والتوقيع: .......................................</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 4: TRANSACTIONS (سجل حركات ودفعات التوريد) */}
      {/* ============================================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">سجل المعاملات والفواتير لجميع الموردين</h3>
              <span className="text-xs text-slate-400">إجمالي {transactions.length} حركة مسجلة</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">المورد</th>
                    <th className="py-3 px-4">نوع الحركة</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">رقم الفاتورة/السند</th>
                    <th className="py-3 px-4">البيان والملاحظات</th>
                    <th className="py-3 px-4">المستخدم</th>
                    <th className="py-3 px-4 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        لا توجد أي حركات توريد أو دفعات مسجلة حتى الآن
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const sup = suppliers.find((s) => s.id === tx.supplier_id);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono text-slate-600">{tx.date}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{sup?.name || 'مورد غير معروف'}</td>
                          <td className="py-3 px-4">
                            {tx.type === 'purchase' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700">
                                <ArrowDownLeft className="w-3 h-3" /> فاتورة شراء
                              </span>
                            )}
                            {tx.type === 'payment' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                                <ArrowUpRight className="w-3 h-3" /> سداد دفعة
                              </span>
                            )}
                            {tx.type === 'return' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700">
                                مرتجع توريد
                              </span>
                            )}
                            {tx.type === 'opening_balance' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700">
                                رصيد افتتاحي
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {tx.amount.toLocaleString('ar-EG')} {settings.currency_symbol}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-600">{tx.invoice_number || '—'}</td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{tx.notes || '—'}</td>
                          <td className="py-3 px-4 text-slate-500">{tx.created_by}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={async () => {
                                if (window.confirm('هل أنت متأكد من حذف هذه المعاملة وتعديل رصيد المورد والخزينة تلقائياً؟')) {
                                  await onDeleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition"
                              title="حذف الحركة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 1: CREATE / EDIT PURCHASE ORDER (امر توريد بدون سعر) */}
      {/* ============================================================================== */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">
                    {editingOrder ? 'تعديل أمر توريد' : 'إنشاء أمر توريد جديد (طلب بضاعة)'}
                  </h3>
                  <p className="text-xs text-sky-100 mt-0.5">
                    تحديد المورد والأصناف والكميات المطلوبة بنظام الباركود أو الإكمال التلقائي بدون سعر
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePurchaseOrder} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Top Row: Supplier, Order Number, Order Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المورد المطلوب منه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={orderSupplierId}
                    onChange={(e) => setOrderSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم أمر التوريد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                    placeholder="PO-20261012-001"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ أمر التوريد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              {/* Barcode & Autocomplete Quick-Add Bar */}
              <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-900 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-sky-600" />
                    <span>إضافة الأصناف المطلوبة (بالمسح أو الإكمال التلقائي)</span>
                  </span>
                  <span className="text-[11px] text-sky-600 font-bold">بدون سعر (كميات فقط)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Barcode input */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      مسح الباركود (قارئ الباركود أو إدخال يدوي):
                    </label>
                    <div className="relative">
                      <Barcode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="امسح الباركود واضغط Enter..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBarcodeSubmit();
                          }
                        }}
                        className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                  </div>

                  {/* Autocomplete Name Search */}
                  <div className="md:col-span-5 relative">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      أو ابحث باسم الصنف (إكمال تلقائي):
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ابحث باسم الصنف..."
                        value={itemSearchQuery}
                        onFocus={() => setIsItemDropdownOpen(true)}
                        onChange={(e) => {
                          setItemSearchQuery(e.target.value);
                          setIsItemDropdownOpen(true);
                        }}
                        className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isItemDropdownOpen && (
                      <div className="absolute z-20 top-full right-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {autocompleteItems.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">لا توجد أصناف مطابقة</div>
                        ) : (
                          autocompleteItems.map((it) => (
                            <div
                              key={it.id}
                              onClick={() => {
                                addItemToOrder(it, itemQuantity || 1);
                              }}
                              className="p-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-100 last:border-none flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-800">{it.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  الوحدة: {it.unit} {it.barcode ? `| باركود: ${it.barcode}` : ''}
                                </p>
                              </div>
                              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                                الرصيد: {it.current_stock}
                              </span>
                            </div>
                          ))
                        )}
                        <div className="p-1.5 bg-slate-50 border-t border-slate-100 text-center">
                          <button
                            type="button"
                            onClick={() => setIsItemDropdownOpen(false)}
                            className="text-[11px] text-slate-500 font-bold hover:underline"
                          >
                            إغلاق القائمة
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity requested input */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمية المطلوبة:</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* Add button */}
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleBarcodeSubmit()}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center shadow-sm"
                      title="إضافة الصنف"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">م</th>
                      <th className="py-2.5 px-3">الباركود</th>
                      <th className="py-2.5 px-3">اسم الصنف المطلوب</th>
                      <th className="py-2.5 px-3">الوحدة</th>
                      <th className="py-2.5 px-3 text-center">الكمية المطلوبة</th>
                      <th className="py-2.5 px-3">ملاحظات الصنف</th>
                      <th className="py-2.5 px-3 text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                          <p className="font-bold">لم تقم بإضافة أي أصناف بعد إلى أمر التوريد</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            امسح الباركود أعلاه أو اختر الصنف من البحث للإضافة
                          </p>
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{it.barcode || '—'}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{it.item_name}</td>
                          <td className="py-2 px-3 text-slate-500">{it.unit}</td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={it.quantity_requested}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = [...orderItems];
                                updated[idx].quantity_requested = val;
                                setOrderItems(updated);
                              }}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-sky-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="ملاحظات..."
                              value={it.notes || ''}
                              onChange={(e) => {
                                const updated = [...orderItems];
                                updated[idx].notes = e.target.value;
                                setOrderItems(updated);
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setOrderItems(orderItems.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {orderItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-700">
                        <td colSpan={4} className="py-2 px-3 text-right">
                          إجمالي بنود أمر التوريد: {orderItems.length} صنف
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black text-sky-800">
                          {orderItems.reduce((acc, it) => acc + (it.quantity_requested || 0), 0)} وحدة
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات وشروط التوريد والتسليم:
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="مكان التسليم، شروط التعبئة، الموعد الأقصى للاستلام..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ أمر التوريد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: PRINT A4 PURCHASE ORDER (طباعة أمر التوريد A4) */}
      {/* ============================================================================== */}
      {printingOrder && printingSupplierObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Top Bar for Print Modal */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-sm">معاينة طباعة أمر التوريد (قياس A4)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (A4)</span>
                </button>
                <button
                  onClick={() => setPrintingOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area - Formatted Specifically for A4 Paper */}
            <div id="print-purchase-order-area" className="flex-1 overflow-y-auto p-10 font-cairo bg-white text-slate-900">
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 12mm;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  #print-purchase-order-area, #print-purchase-order-area * {
                    visibility: visible !important;
                  }
                  #print-purchase-order-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                }
              `}</style>

              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{settings.company_name}</h1>
                  <p className="text-xs text-slate-600 mt-1">إدارة المشتريات والمستودعات</p>
                  <div className="mt-2 inline-block bg-slate-900 text-white px-3 py-1 rounded text-sm font-black tracking-wider">
                    أمر توريد بضاعة / PURCHASE ORDER
                  </div>
                </div>
                <div className="text-left">
                  {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-16 object-contain mb-2" />
                  )}
                  <p className="text-xs font-mono font-bold text-slate-700">رقم الأمر: {printingOrder.order_number}</p>
                  <p className="text-xs font-mono text-slate-500">التاريخ: {printingOrder.order_date}</p>
                </div>
              </div>

              {/* Supplier Info Box */}
              <div className="border border-slate-300 rounded-xl p-4 mb-6 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-800 border-b border-slate-200 pb-2 mb-3">
                  بيانات المورد الموجه إليه أمر التوريد:
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold">اسم الشركة / المورد:</span>
                    <span className="font-black text-slate-900 mr-2">{printingSupplierObj.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">جهة الاتصال / المسؤول:</span>
                    <span className="font-bold text-slate-800 mr-2">{printingSupplierObj.contact_person || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                    <span className="font-mono font-bold text-slate-800 mr-2" dir="ltr">{printingSupplierObj.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">الرقم الضريبي / السجل:</span>
                    <span className="font-mono text-slate-800 mr-2">{printingSupplierObj.tax_number || '—'}</span>
                  </div>
                  {printingSupplierObj.address && (
                    <div className="col-span-2">
                      <span className="text-slate-500 font-bold">العنوان:</span>
                      <span className="text-slate-800 mr-2">{printingSupplierObj.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table - Clean bordered layout */}
              <div className="mb-6">
                <table className="w-full text-right border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                      <th className="border border-slate-300 py-2.5 px-3 w-12 text-center">م</th>
                      <th className="border border-slate-300 py-2.5 px-3">كود / باركود</th>
                      <th className="border border-slate-300 py-2.5 px-3">اسم الصنف والمواصفات</th>
                      <th className="border border-slate-300 py-2.5 px-3 text-center">الوحدة</th>
                      <th className="border border-slate-300 py-2.5 px-3 text-center">الكمية المطلوبة</th>
                      <th className="border border-slate-300 py-2.5 px-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(printingOrder.items || []).map((it, idx) => (
                      <tr key={it.id || idx} className="border-b border-slate-300">
                        <td className="border border-slate-300 py-2.5 px-3 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 py-2.5 px-3 font-mono">{it.barcode || '—'}</td>
                        <td className="border border-slate-300 py-2.5 px-3 font-bold">{it.item_name}</td>
                        <td className="border border-slate-300 py-2.5 px-3 text-center">{it.unit}</td>
                        <td className="border border-slate-300 py-2.5 px-3 text-center font-mono font-black text-sm">
                          {it.quantity_requested}
                        </td>
                        <td className="border border-slate-300 py-2.5 px-3 text-slate-600">{it.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black border-t-2 border-slate-400">
                      <td colSpan={4} className="border border-slate-300 py-2.5 px-3 text-right">
                        إجمالي عدد بنود أمر التوريد: {(printingOrder.items || []).length} صنف
                      </td>
                      <td className="border border-slate-300 py-2.5 px-3 text-center font-mono text-sm font-black">
                        {(printingOrder.items || []).reduce((acc, it) => acc + (it.quantity_requested || 0), 0)} وحدة
                      </td>
                      <td className="border border-slate-300"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Order Notes & Terms */}
              {printingOrder.notes && (
                <div className="border border-slate-200 rounded-xl p-3 mb-8 bg-slate-50/50 text-xs">
                  <p className="font-bold text-slate-700 mb-1">شروط وملاحظات التوريد:</p>
                  <p className="text-slate-600 leading-relaxed">{printingOrder.notes}</p>
                </div>
              )}

              {/* Official Signatures Blocks */}
              <div className="grid grid-cols-3 gap-6 pt-10 mt-8 border-t border-slate-300 text-xs text-center">
                <div>
                  <p className="font-bold text-slate-800">مسؤول المشتريات</p>
                  <div className="h-16"></div>
                  <p className="text-slate-400 text-[11px]">التوقيع: ............................</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">اعتماد إدارة المستودعات</p>
                  <div className="h-16"></div>
                  <p className="text-slate-400 text-[11px]">التوقيع: ............................</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">توقيع واستلام المورد</p>
                  <div className="h-16"></div>
                  <p className="text-slate-400 text-[11px]">التاريخ والختم: ............................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: CONVERT PO TO PURCHASE INVOICE (تحويل امر التوريد إلى فاتورة شراء) */}
      {/* ============================================================================== */}
      {convertingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">تحويل أمر التوريد إلى فاتورة شراء رسمية</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    إدخال الأسعار والكميات الفعلية المستلمة وإضافتها تلقائياً إلى رصيد المخزون وحساب المورد
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConvertingOrder(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleExecuteConversion} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Order Details & Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div>
                  <span className="block text-[11px] font-bold text-emerald-800">أمر التوريد الأصلي:</span>
                  <span className="font-mono font-bold text-slate-800">{convertingOrder.order_number}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-emerald-800">المورد:</span>
                  <span className="font-bold text-slate-800">
                    {suppliers.find((s) => s.id === convertingOrder.supplier_id)?.name}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    رقم فاتورة الشراء <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={convertInvoiceNumber}
                    onChange={(e) => setConvertInvoiceNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    تاريخ الاستلام والفاتورة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={convertInvoiceDate}
                    onChange={(e) => setConvertInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Items Grid with Received Quantities & Unit Prices */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>تأكيد الكميات الفعلية والأسعار:</span>
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    سيتم زيادة رصيد المخزون بهذه الكميات فوراً
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">اسم الصنف</th>
                        <th className="py-2.5 px-3 text-center">الوحدة</th>
                        <th className="py-2.5 px-3 text-center">الكمية المطلوبة</th>
                        <th className="py-2.5 px-3 text-center">الكمية الفعلية المستلمة</th>
                        <th className="py-2.5 px-3 text-center">سعر الوحدة ({settings.currency_symbol})</th>
                        <th className="py-2.5 px-3 text-left">الإجمالي ({settings.currency_symbol})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {convertItems.map((it, idx) => (
                        <tr key={it.item_id || idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{it.item_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{it.unit}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {it.quantity_requested}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.quantity_received}
                              onChange={(e) =>
                                handleUpdateConvertItem(idx, 'quantity_received', Number(e.target.value))
                              }
                              className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.unit_price}
                              onChange={(e) =>
                                handleUpdateConvertItem(idx, 'unit_price', Number(e.target.value))
                              }
                              className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-black text-slate-800">
                            {it.total_price.toLocaleString('ar-EG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50/80 font-black text-slate-800 border-t-2 border-emerald-300">
                        <td colSpan={5} className="py-3 px-3 text-right text-emerald-900 text-xs">
                          إجمالي قيمة فاتورة الشراء:
                        </td>
                        <td className="py-3 px-3 text-left font-mono text-base font-black text-emerald-700">
                          {convertGrandTotal.toLocaleString('ar-EG')} {settings.currency_symbol}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment and Treasury Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">طريقة سداد الفاتورة:</label>
                  {mainTreasury && (
                    <button
                      type="button"
                      onClick={() => {
                        setConvertPaymentType('treasury');
                        setConvertTreasuryId(mainTreasury.id);
                        if (cashPaymentMethod) setConvertPaymentMethodId(cashPaymentMethod.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        convertPaymentType === 'treasury' && convertTreasuryId === mainTreasury.id
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>الصرف من الخزينة الرئيسية</span>
                      <span className="font-mono text-[10px] opacity-90">({mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol})</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={convertPaymentType === 'credit'}
                      onChange={() => setConvertPaymentType('credit')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>آجل (تسجيل على حساب المورد - تزيد رصيده المستحق)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={convertPaymentType === 'treasury'}
                      onChange={() => {
                        setConvertPaymentType('treasury');
                        if (mainTreasury) setConvertTreasuryId(mainTreasury.id);
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>سداد فوري من خزينة (خصم نقدي/بنكي مباشر)</span>
                  </label>
                </div>

                {convertPaymentType === 'treasury' && (
                  <div className="space-y-2 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">الخزينة المسحوب منها:</label>
                          {mainTreasury && (
                            <button
                              type="button"
                              onClick={() => {
                                setConvertTreasuryId(mainTreasury.id);
                                if (cashPaymentMethod) setConvertPaymentMethodId(cashPaymentMethod.id);
                              }}
                              className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                            >
                              ★ الخزينة الرئيسية
                            </button>
                          )}
                        </div>
                        <select
                          value={convertTreasuryId}
                          onChange={(e) => setConvertTreasuryId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          {mainTreasury && (
                            <option value={mainTreasury.id} className="font-bold text-amber-900 bg-amber-50">
                              ★ {mainTreasury.name} (الخزينة النقدية الرئيسية للمؤسسة) - الرصيد: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol}
                            </option>
                          )}
                          {treasuries
                            .filter((t) => t.id !== mainTreasury?.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} (رصيدها: {t.balance.toLocaleString('ar-EG')} {settings.currency_symbol})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">طريقة الدفع:</label>
                        <select
                          value={convertPaymentMethodId}
                          onChange={(e) => setConvertPaymentMethodId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {mainTreasury && convertTreasuryId === mainTreasury.id && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>سيتم صرف هذه الفاتورة فورياً وخصمها من الخزينة النقدية الرئيسية للمؤسسة (رصيدها الحالي: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingOrder(null)}
                  disabled={isSubmittingConvert}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConvert}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  {isSubmittingConvert ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>اعتماد وتحويل لفاتورة شراء وإضافة للمخزون</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 4: RECORD SUPPLIER PAYMENT (سداد دفعة للمورد) */}
      {/* ============================================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">سداد دفعة مالية للمورد</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    سيتم خصم المبلغ من الخزينة تلقائياً وتخفيض رصيد المورد المستحق
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المورد المستحق <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentTargetSupplierId}
                  onChange={(e) => setPaymentTargetSupplierId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- اختر المورد --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (المستحق: {(s.current_balance || 0).toLocaleString('ar-EG')} {settings.currency_symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المسدد <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {settings.currency_symbol}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ السداد:</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">الخزينة المسحوب منها:</label>
                    {mainTreasury && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentFormData({
                            ...paymentFormData,
                            treasury_id: mainTreasury.id,
                            payment_method_id: cashPaymentMethod?.id || paymentFormData.payment_method_id
                          });
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                      >
                        ★ الخزينة الرئيسية
                      </button>
                    )}
                  </div>
                  <select
                    value={paymentFormData.treasury_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, treasury_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {mainTreasury && (
                      <option value={mainTreasury.id} className="font-bold text-amber-900 bg-amber-50">
                        ★ {mainTreasury.name} (الخزينة النقدية الرئيسية) - الرصيد: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </option>
                    )}
                    {treasuries
                      .filter((t) => t.id !== mainTreasury?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (رصيدها: {t.balance.toLocaleString('ar-EG')})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع:</label>
                  <select
                    value={paymentFormData.payment_method_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {mainTreasury && paymentFormData.treasury_id === mainTreasury.id && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                  <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>سيتم صرف هذا السداد للمورد نقداً من الخزينة النقدية الرئيسية للمؤسسة (رصيدها الحالي: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol})</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم سند الصرف / الشيك / الإيصال:</label>
                <input
                  type="text"
                  placeholder="سند صرف رقم أو إيصال..."
                  value={paymentFormData.invoice_number}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, invoice_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان والملاحظات:</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول الدفعة..."
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                >
                  تأكيد وسداد الدفعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 5: ADD / EDIT SUPPLIER (إضافة / تعديل مورد) */}
      {/* ============================================================================== */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>
                  <p className="text-xs text-teal-100 mt-0.5">تسجيل بيانات الشركة أو المورد والرصيد الافتتاحي</p>
                </div>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المورد / الشركة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة النور لمستلزمات ومواد الغسيل"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">جهة الاتصال / المسؤول:</label>
                  <input
                    type="text"
                    placeholder="اسم المسؤول"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="010xxxxxxxx"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي / السجل التجاري:</label>
                  <input
                    type="text"
                    placeholder="الرقم الضريبي"
                    value={supplierFormData.tax_number}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, tax_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    placeholder="supplier@company.com"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان:</label>
                <input
                  type="text"
                  placeholder="العنوان التفصيلي للمورد"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {!editingSupplier && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرصيد الافتتاحي (مستحق له قبل بدء البرنامج):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={supplierFormData.opening_balance}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, opening_balance: Number(e.target.value) })
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {settings.currency_symbol}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="supActive"
                  checked={supplierFormData.is_active}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, is_active: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="supActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  حساب المورد نشط
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات عامة:</label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل أو شروط خاصة بالتعامل..."
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-600/20"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 6: DIRECT PURCHASE INVOICE (فاتورة مشتريات مباشرة - إضافة للمخزون) */}
      {/* ============================================================================== */}
      {isDirectInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg">فاتورة مشتريات جديدة (إضافة مباشرة للمخزون)</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    إثبات المشتريات وتحديث أرصدة المخزون وحساب المورد فورياً دون الحاجة لأمر توريد مسبق
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectInvoiceModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveDirectInvoice} className="p-6 overflow-y-auto space-y-5">
              {/* Top Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المورد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={directSupplierId}
                    onChange={(e) => setDirectSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers
                      .filter((s) => s.is_active !== false)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (رصيده: {s.current_balance.toLocaleString('ar-EG')} {settings.currency_symbol})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم فاتورة المشتريات <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={directInvoiceNumber}
                    onChange={(e) => setDirectInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="مثال: INV-2026-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الفاتورة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={directInvoiceDate}
                    onChange={(e) => setDirectInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Barcode & Add Items Box */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-emerald-600" />
                    إضافة أصناف الفاتورة (بالباركود أو البحث)
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    يمكنك كتابة أو مسح الباركود واضغط Enter للإضافة الفورية
                  </span>
                </div>

                {/* Barcode Scanner Input */}
                <div className="relative">
                  <Barcode className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="text"
                    placeholder="امسح الباركود هنا أو اكتب كود الصنف واضغط Enter..."
                    value={directBarcodeInput}
                    onChange={(e) => setDirectBarcodeInput(e.target.value)}
                    onKeyDown={handleDirectBarcodeScan}
                    className="w-full pr-11 pl-4 py-2.5 bg-white border-2 border-emerald-400 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                </div>

                {/* Dropdown Add Item */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر الصنف:</label>
                    <select
                      value={directSelectedItemId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setDirectSelectedItemId(id);
                        const item = inventoryItems.find((it) => it.id === id);
                        if (item) {
                          setDirectItemPrice(item.unit_cost || 0);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="">-- اختر صنفاً لإضافته --</option>
                      {inventoryItems
                        .filter((it) => it.is_active !== false)
                        .map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.item_code}) - الرصيد الحالي: {it.current_stock} {it.unit}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمية المشتراة:</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={directItemQty}
                      onChange={(e) => setDirectItemQty(Math.max(0.01, Number(e.target.value)))}
                      className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      سعر شراء الوحدة ({settings.currency_symbol}):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={directItemPrice}
                      onChange={(e) => setDirectItemPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleAddDirectInvoiceItem()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-98 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة للقائمة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">
                    جدول الأصناف بالفاتورة ({directInvoiceItems.length} صنف)
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    سيتم زيادة الكمية إلى رصيد المخزون فورياً لكل صنف
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">اسم الصنف وكوده</th>
                        <th className="py-2.5 px-3 text-center">الرصيد الحالي</th>
                        <th className="py-2.5 px-3 text-center">الكمية المشتراة</th>
                        <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
                        <th className="py-2.5 px-3 text-left">الإجمالي</th>
                        <th className="py-2.5 px-3 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {directInvoiceItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            لا توجد أصناف في الفاتورة بعد. استخدم مسح الباركود أو القائمة أعلاه لإضافة الأصناف.
                          </td>
                        </tr>
                      ) : (
                        directInvoiceItems.map((it, idx) => {
                          const item = inventoryItems.find((inv) => inv.id === it.item_id);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-800 block">{item?.name || 'صنف'}</span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  كود: {item?.item_code || it.item_id} | الوحدة: {item?.unit || 'وحدة'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                                {item?.current_stock ?? 0}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={it.quantity}
                                  onChange={(e) => handleUpdateDirectItem(idx, 'quantity', Number(e.target.value))}
                                  className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.unit_price}
                                  onChange={(e) => handleUpdateDirectItem(idx, 'unit_price', Number(e.target.value))}
                                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-left font-mono font-black text-slate-800">
                                {it.total_price.toLocaleString('ar-EG')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDirectItem(idx)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {directInvoiceItems.length > 0 && (
                      <tfoot>
                        <tr className="bg-emerald-50/80 font-black text-slate-800 border-t-2 border-emerald-300">
                          <td colSpan={5} className="py-3 px-3 text-right text-emerald-900 text-xs">
                            إجمالي قيمة فاتورة المشتريات:
                          </td>
                          <td className="py-3 px-3 text-left font-mono text-base font-black text-emerald-700">
                            {directGrandTotal.toLocaleString('ar-EG')} {settings.currency_symbol}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Payment and Treasury Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">طريقة سداد الفاتورة:</label>
                  {mainTreasury && (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectPaymentType('treasury');
                        setDirectTreasuryId(mainTreasury.id);
                        if (cashPaymentMethod) setDirectPaymentMethodId(cashPaymentMethod.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        directPaymentType === 'treasury' && directTreasuryId === mainTreasury.id
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>الصرف من الخزينة الرئيسية</span>
                      <span className="font-mono text-[10px] opacity-90">({mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol})</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="directPaymentType"
                      checked={directPaymentType === 'credit'}
                      onChange={() => setDirectPaymentType('credit')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>آجل (تسجيل على حساب المورد - تزيد رصيده المستحق)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="directPaymentType"
                      checked={directPaymentType === 'treasury'}
                      onChange={() => {
                        setDirectPaymentType('treasury');
                        if (mainTreasury) setDirectTreasuryId(mainTreasury.id);
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>سداد فوري من خزينة (خصم نقدي/بنكي مباشر)</span>
                  </label>
                </div>

                {directPaymentType === 'treasury' && (
                  <div className="space-y-2 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">الخزينة المسحوب منها:</label>
                          {mainTreasury && (
                            <button
                              type="button"
                              onClick={() => {
                                setDirectTreasuryId(mainTreasury.id);
                                if (cashPaymentMethod) setDirectPaymentMethodId(cashPaymentMethod.id);
                              }}
                              className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                            >
                              ★ الخزينة الرئيسية
                            </button>
                          )}
                        </div>
                        <select
                          value={directTreasuryId}
                          onChange={(e) => setDirectTreasuryId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          {mainTreasury && (
                            <option value={mainTreasury.id} className="font-bold text-amber-900 bg-amber-50">
                              ★ {mainTreasury.name} (الخزينة النقدية الرئيسية للمؤسسة) - الرصيد: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol}
                            </option>
                          )}
                          {treasuries
                            .filter((t) => t.id !== mainTreasury?.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} (رصيدها: {t.balance.toLocaleString('ar-EG')} {settings.currency_symbol})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">طريقة الدفع:</label>
                        <select
                          value={directPaymentMethodId}
                          onChange={(e) => setDirectPaymentMethodId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {mainTreasury && directTreasuryId === mainTreasury.id && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>سيتم صرف فاتورة الشراء هذه فورياً وخصمها من الخزينة النقدية الرئيسية للمؤسسة (رصيدها الحالي: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الفاتورة:</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات إضافية حول فاتورة الشراء..."
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDirectInvoiceModalOpen(false)}
                  disabled={isSubmittingDirectInvoice}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDirectInvoice || directInvoiceItems.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDirectInvoice ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>حفظ فاتورة الشراء وإضافة الكميات للمخزون فوراً</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

