import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  FileText,
  Send,
  Printer,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  X,
  Check,
  Building2,
  Phone,
  Calendar,
  Layers,
  DollarSign,
  Wallet,
  ArrowRight,
  Package,
  MessageCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';
import {
  PriceQuotationRequest,
  PriceQuotationItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  InventoryItem,
  Treasury,
  PaymentMethod,
  Settings
} from '../types/database';
import {
  sendEvolutionWhatsAppRfq,
  sendEvolutionWhatsAppPo,
  generateWhatsAppChatLink,
  formatRfqWhatsAppMessage,
  formatPoWhatsAppMessage
} from '../services/whatsappService';

interface PurchasesViewProps {
  rfqs: PriceQuotationRequest[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  settings: Settings;
  onCreateRfq: (rfq: Omit<PriceQuotationRequest, 'id' | 'created_at'>) => Promise<PriceQuotationRequest>;
  onUpdateRfq: (rfq: PriceQuotationRequest) => Promise<PriceQuotationRequest>;
  onDeleteRfq: (id: string) => Promise<boolean>;
  onCreatePurchaseOrder: (order: Omit<PurchaseOrder, 'id' | 'created_at'>) => Promise<PurchaseOrder>;
  onUpdatePurchaseOrder: (order: PurchaseOrder) => Promise<PurchaseOrder>;
  onDeletePurchaseOrder: (id: string) => Promise<boolean>;
  onConvertPurchaseOrderToInvoice: (params: any) => Promise<any>;
  onCreatePurchaseInvoice?: (params: any) => Promise<any>;
  onRefreshData?: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  rfqs,
  purchaseOrders,
  suppliers,
  inventoryItems,
  treasuries,
  paymentMethods,
  settings,
  onCreateRfq,
  onUpdateRfq,
  onDeleteRfq,
  onCreatePurchaseOrder,
  onUpdatePurchaseOrder,
  onDeletePurchaseOrder,
  onConvertPurchaseOrderToInvoice,
  onCreatePurchaseInvoice,
  onRefreshData
}) => {
  // Main view tab
  const [activeTab, setActiveTab] = useState<'rfqs' | 'orders' | 'invoices'>('rfqs');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading and sending state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Modals state
  // -------------------------------------------------------------
  // 1. Create RFQ Modal
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [rfqDate, setRfqDate] = useState(new Date().toISOString().split('T')[0]);
  const [rfqNotes, setRfqNotes] = useState('');
  const [rfqItems, setRfqItems] = useState<Array<{
    item_id: string;
    item_name: string;
    unit: string;
    pieces_per_unit: number;
    quantity: number;
    notes?: string;
  }>>([]);

  // RFQ item picker state
  const [rfqSelectedItemId, setRfqSelectedItemId] = useState('');
  const [rfqItemQty, setRfqItemQty] = useState<number>(1);
  const [rfqItemUnit, setRfqItemUnit] = useState<string>('كرتونة');
  const [rfqPiecesPerUnit, setRfqPiecesPerUnit] = useState<number>(1);
  const [rfqItemNotes, setRfqItemNotes] = useState<string>('');

  // 2. Print / PDF Preview Modal for RFQ
  const [printingRfq, setPrintingRfq] = useState<PriceQuotationRequest | null>(null);

  // 3. Price RFQ & Convert to PO Modal
  const [pricingRfq, setPricingRfq] = useState<PriceQuotationRequest | null>(null);
  const [pricingItems, setPricingItems] = useState<Array<{
    item_id: string;
    item_name: string;
    unit: string;
    pieces_per_unit: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    is_included: boolean; // allow excluding items
    notes?: string;
  }>>([]);
  const [pricingNotes, setPricingNotes] = useState('');

  // 4. Print / PDF Preview Modal for PO
  const [printingPo, setPrintingPo] = useState<PurchaseOrder | null>(null);

  // 5. Convert PO to Purchase Invoice Modal
  const [convertingPo, setConvertingPo] = useState<PurchaseOrder | null>(null);
  const [convertInvoiceNumber, setConvertInvoiceNumber] = useState('');
  const [convertInvoiceDate, setConvertInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [convertPaymentType, setConvertPaymentType] = useState<'credit' | 'treasury'>('credit');
  const [convertTreasuryId, setConvertTreasuryId] = useState('');
  const [convertPaymentMethodId, setConvertPaymentMethodId] = useState('');
  const [convertNotes, setConvertNotes] = useState('');
  const [convertItems, setConvertItems] = useState<Array<{
    item_id: string;
    item_name: string;
    unit: string;
    pieces_per_unit: number;
    quantity_requested: number;
    quantity_received: number;
    unit_price: number;
    total_price: number;
    is_received: boolean; // allow canceling items supplier couldn't provide
    notes?: string;
  }>>([]);

  // 6. Direct Purchase Invoice Modal
  const [isDirectInvoiceOpen, setIsDirectInvoiceOpen] = useState(false);
  const [directSupplierId, setDirectSupplierId] = useState('');
  const [directInvoiceNumber, setDirectInvoiceNumber] = useState('');
  const [directInvoiceDate, setDirectInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [directPaymentType, setDirectPaymentType] = useState<'credit' | 'treasury'>('credit');
  const [directTreasuryId, setDirectTreasuryId] = useState('');
  const [directPaymentMethodId, setDirectPaymentMethodId] = useState('');
  const [directNotes, setDirectNotes] = useState('');
  const [directItems, setDirectItems] = useState<Array<{
    item_id: string;
    item_name: string;
    unit: string;
    pieces_per_unit: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>>([]);
  const [directSelectedItemId, setDirectSelectedItemId] = useState('');
  const [directItemQty, setDirectItemQty] = useState<number>(1);
  const [directItemPrice, setDirectItemPrice] = useState<number>(0);
  const [directItemUnit, setDirectItemUnit] = useState<string>('كرتونة');
  const [directPiecesPerUnit, setDirectPiecesPerUnit] = useState<number>(1);

  // Active Treasuries
  const mainTreasury = useMemo(() => {
    return treasuries.find(t => (t as any).is_main || t.name.includes('الرئيسية')) || treasuries[0];
  }, [treasuries]);

  // Currency
  const currencySymbol = settings.currency_symbol || 'ج.م';

  // Stats calculation
  const stats = useMemo(() => {
    const totalRfqs = rfqs.length;
    const pendingRfqs = rfqs.filter(r => r.status === 'draft' || r.status === 'sent').length;
    const totalPos = purchaseOrders.filter(o => o.status !== 'cancelled').length;
    const pendingPos = purchaseOrders.filter(o => o.status === 'pending').length;
    const convertedInvoices = purchaseOrders.filter(o => o.status === 'converted');
    const totalPurchasesAmount = convertedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    return {
      totalRfqs,
      pendingRfqs,
      totalPos,
      pendingPos,
      totalInvoicesCount: convertedInvoices.length,
      totalPurchasesAmount
    };
  }, [rfqs, purchaseOrders]);

  // Filtered RFQs
  const filteredRfqs = useMemo(() => {
    return rfqs.filter(r => {
      const matchSearch =
        r.rfq_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSupplier = supplierFilter === 'all' || r.supplier_id === supplierFilter;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchSupplier && matchStatus;
    });
  }, [rfqs, searchQuery, supplierFilter, statusFilter]);

  // Filtered POs
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(o => {
      if (activeTab === 'orders' && o.status === 'converted') return false; // Show only open POs under orders tab
      if (activeTab === 'invoices' && o.status !== 'converted') return false; // Show only converted under invoices tab

      const supp = suppliers.find(s => s.id === o.supplier_id);
      const matchSearch =
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.converted_invoice_number && o.converted_invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (supp && supp.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSupplier = supplierFilter === 'all' || o.supplier_id === supplierFilter;
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchSupplier && matchStatus;
    });
  }, [purchaseOrders, suppliers, searchQuery, supplierFilter, statusFilter, activeTab]);

  // -------------------------------------------------------------
  // RFQ Creation Handlers
  // -------------------------------------------------------------
  const handleOpenCreateRfq = () => {
    setSelectedSupplierIds(suppliers.length > 0 ? [suppliers[0].id] : []);
    setRfqDate(new Date().toISOString().split('T')[0]);
    setRfqNotes('');
    setRfqItems([]);
    if (inventoryItems.length > 0) {
      const first = inventoryItems[0];
      setRfqSelectedItemId(first.id);
      setRfqItemUnit(first.purchase_unit || first.unit || 'كرتونة');
      setRfqPiecesPerUnit(first.pieces_per_unit || 1);
    }
    setRfqItemQty(1);
    setRfqItemNotes('');
    setIsCreateRfqOpen(true);
  };

  const handleSelectInventoryItemForRfq = (itemId: string) => {
    setRfqSelectedItemId(itemId);
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setRfqItemUnit(item.purchase_unit || item.unit || 'كرتونة');
      setRfqPiecesPerUnit(item.pieces_per_unit || 1);
    }
  };

  const handleAddRfqItem = () => {
    if (!rfqSelectedItemId) {
      alert('يرجى اختيار صنف من المخزون');
      return;
    }
    const item = inventoryItems.find(i => i.id === rfqSelectedItemId);
    if (!item) return;

    if (rfqItemQty <= 0) {
      alert('يرجى إدخال كمية صحيحة أكبر من صفر');
      return;
    }

    const exists = rfqItems.find(it => it.item_id === item.id);
    if (exists) {
      setRfqItems(rfqItems.map(it => it.item_id === item.id ? {
        ...it,
        quantity: it.quantity + rfqItemQty,
        unit: rfqItemUnit || it.unit,
        pieces_per_unit: rfqPiecesPerUnit || it.pieces_per_unit,
        notes: rfqItemNotes || it.notes
      } : it));
    } else {
      setRfqItems([...rfqItems, {
        item_id: item.id,
        item_name: item.name,
        unit: rfqItemUnit || item.purchase_unit || item.unit || 'كرتونة',
        pieces_per_unit: rfqPiecesPerUnit || item.pieces_per_unit || 1,
        quantity: rfqItemQty,
        notes: rfqItemNotes
      }]);
    }

    setRfqItemQty(1);
    setRfqItemNotes('');
  };

  const handleRemoveRfqItem = (itemId: string) => {
    setRfqItems(rfqItems.filter(it => it.item_id !== itemId));
  };

  const handleSaveRfqs = async () => {
    if (selectedSupplierIds.length === 0) {
      alert('يرجى اختيار مورد واحد على الأقل');
      return;
    }
    if (rfqItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل لطلب عرض السعر');
      return;
    }

    try {
      setIsSubmitting(true);
      const timestamp = Date.now().toString().slice(-4);

      for (let i = 0; i < selectedSupplierIds.length; i++) {
        const suppId = selectedSupplierIds[i];
        const supp = suppliers.find(s => s.id === suppId);
        if (!supp) continue;

        const rfqNum = `RFQ-${timestamp}-${(i + 1).toString().padStart(2, '0')}`;
        await onCreateRfq({
          rfq_number: rfqNum,
          supplier_id: supp.id,
          supplier_name: supp.name,
          supplier_phone: supp.phone,
          rfq_date: rfqDate,
          date: rfqDate,
          status: 'draft',
          items: rfqItems.map(it => ({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            item_id: it.item_id,
            item_name: it.item_name,
            unit: it.unit,
            pieces_per_unit: it.pieces_per_unit,
            quantity: it.quantity,
            quantity_requested: it.quantity,
            notes: it.notes
          })),
          notes: rfqNotes
        });
      }

      alert(`تم إنشاء طلب عرض السعر بنجاح لعدد (${selectedSupplierIds.length}) مورد!`);
      setIsCreateRfqOpen(false);
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء حفظ طلب عرض السعر: ' + (e.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // WhatsApp Sending Handlers
  // -------------------------------------------------------------
  const handleSendRfqWhatsApp = async (rfq: PriceQuotationRequest) => {
    if (!rfq.supplier_phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المورد!');
      return;
    }

    setIsSendingWhatsApp(rfq.id);
    try {
      const rfqDateVal = rfq.rfq_date || rfq.date || '';
      const rfqSupplierName = rfq.supplier_name || 'السادة المورد';
      const result = await sendEvolutionWhatsAppRfq(
        {
          supplierName: rfqSupplierName,
          phone: rfq.supplier_phone,
          rfqNumber: rfq.rfq_number,
          rfqDate: rfqDateVal,
          items: rfq.items.map(it => ({
            itemName: it.item_name,
            unit: it.unit,
            quantity: it.quantity_requested || it.quantity || 0,
            notes: it.notes
          })),
          notes: rfq.notes
        },
        settings
      );

      if (result.success) {
        alert('تم إرسال طلب عرض السعر للمورد بنجاح عبر Evolution API!');
        if (rfq.status === 'draft') {
          await onUpdateRfq({ ...rfq, status: 'sent' });
        }
      } else {
        const msgText = formatRfqWhatsAppMessage(
          {
            supplierName: rfqSupplierName,
            phone: rfq.supplier_phone,
            rfqNumber: rfq.rfq_number,
            rfqDate: rfqDateVal,
            items: rfq.items.map(it => ({
              itemName: it.item_name,
              unit: it.unit,
              quantity: it.quantity_requested || it.quantity || 0,
              notes: it.notes
            })),
            notes: rfq.notes
          },
          settings.company_name || 'وي كير'
        );
        const directLink = generateWhatsAppChatLink(rfq.supplier_phone, msgText, settings.dial_code || '20');

        if (confirm(`تعذر الإرسال التلقائي عبر السيرفر (${result.error || 'خطأ اتصال'}). هل ترغب في فتح المحادثة مباشرة عبر تطبيق واتساب؟`)) {
          window.open(directLink, '_blank');
          if (rfq.status === 'draft') {
            await onUpdateRfq({ ...rfq, status: 'sent' });
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الإرسال: ' + (err.message || ''));
    } finally {
      setIsSendingWhatsApp(null);
    }
  };

  const handleSendPoWhatsApp = async (po: PurchaseOrder) => {
    const supp = suppliers.find(s => s.id === po.supplier_id);
    if (!supp?.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المورد!');
      return;
    }

    setIsSendingWhatsApp(po.id);
    try {
      const result = await sendEvolutionWhatsAppPo(
        {
          supplierName: supp.name,
          phone: supp.phone,
          poNumber: po.order_number,
          poDate: po.order_date,
          items: (po.items || []).map(it => ({
            itemName: it.item_name,
            unit: it.unit,
            quantity: it.quantity_requested || 0,
            unitPrice: it.unit_price || 0,
            totalPrice: it.total_price || 0
          })),
          totalAmount: po.total_amount || 0,
          currencySymbol,
          notes: po.notes
        },
        settings
      );

      if (result.success) {
        alert('تم إرسال أمر التوريد للمورد بنجاح عبر Evolution API!');
      } else {
        const msgText = formatPoWhatsAppMessage(
          {
            supplierName: supp.name,
            phone: supp.phone,
            poNumber: po.order_number,
            poDate: po.order_date,
            items: (po.items || []).map(it => ({
              itemName: it.item_name,
              unit: it.unit,
              quantity: it.quantity_requested || 0,
              unitPrice: it.unit_price || 0,
              totalPrice: it.total_price || 0
            })),
            totalAmount: po.total_amount || 0,
            currencySymbol,
            notes: po.notes
          },
          settings.company_name || 'وي كير'
        );
        const directLink = generateWhatsAppChatLink(supp.phone, msgText, settings.dial_code || '20');

        if (confirm(`تعذر الإرسال المباشر (${result.error || 'خطأ اتصال'}). هل ترغب في فتحه عبر تطبيق واتساب؟`)) {
          window.open(directLink, '_blank');
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ: ' + (err.message || ''));
    } finally {
      setIsSendingWhatsApp(null);
    }
  };

  // -------------------------------------------------------------
  // Price RFQ & Convert to Purchase Order (PO)
  // -------------------------------------------------------------
  const handleOpenPricingModal = (rfq: PriceQuotationRequest) => {
    setPricingRfq(rfq);
    setPricingNotes(rfq.notes || '');
    setPricingItems(rfq.items.map(it => {
      const itemId = it.item_id || it.id || '';
      const qty = it.quantity_requested || it.quantity || 1;
      const uPrice = it.unit_price || 0;
      return {
        item_id: itemId,
        item_name: it.item_name,
        unit: it.unit,
        pieces_per_unit: it.pieces_per_unit || 1,
        quantity: qty,
        unit_price: uPrice,
        total_price: qty * uPrice,
        is_included: true,
        notes: it.notes
      };
    }));
  };

  const handleUpdatePricingItem = (itemId: string, field: 'unit_price' | 'quantity' | 'is_included', val: any) => {
    setPricingItems(prev => prev.map(it => {
      if (it.item_id !== itemId) return it;
      const updated = { ...it, [field]: val };
      if (field === 'unit_price' || field === 'quantity') {
        updated.total_price = Number((Number(updated.quantity) * Number(updated.unit_price)).toFixed(2));
      }
      return updated;
    }));
  };

  const handleSavePricesAndConvertToPo = async () => {
    if (!pricingRfq) return;

    const includedItems = pricingItems.filter(it => it.is_included);
    if (includedItems.length === 0) {
      alert('يجب الإبقاء على صنف واحد على الأقل معتمد للتوريد!');
      return;
    }

    const hasInvalidPrices = includedItems.some(it => Number(it.unit_price) <= 0);
    if (hasInvalidPrices) {
      if (!confirm('توجد أصناف بسعر صفر، هل أنت متأكد من المتابعة واعتماد أمر التوريد؟')) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const totalAmount = includedItems.reduce((acc, it) => acc + (it.total_price || 0), 0);
      const poNumber = `PO-${pricingRfq.rfq_number.replace('RFQ-', '')}`;
      const now = new Date().toISOString();

      // 1. Create Purchase Order
      const newPo = await onCreatePurchaseOrder({
        order_number: poNumber,
        supplier_id: pricingRfq.supplier_id,
        order_date: now.split('T')[0],
        status: 'pending',
        items: includedItems.map(it => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          item_id: it.item_id,
          item_name: it.item_name,
          unit: it.unit,
          quantity_requested: it.quantity,
          quantity_received: 0,
          unit_price: it.unit_price,
          total_price: it.total_price,
          pieces_per_unit: it.pieces_per_unit,
          total_pieces: it.quantity * it.pieces_per_unit,
          notes: it.notes
        })),
        total_amount: totalAmount,
        notes: pricingNotes || `أمر توريد محول من عرض سعر رقم: ${pricingRfq.rfq_number}`,
        rfq_id: pricingRfq.id,
        rfq_number: pricingRfq.rfq_number,
        created_by: 'مسؤول المشتريات'
      });

      // 2. Update RFQ status to converted
      await onUpdateRfq({
        ...pricingRfq,
        status: 'converted',
        total_amount: totalAmount,
        converted_po_id: newPo.id,
        converted_po_number: newPo.order_number,
        converted_at: now,
        items: pricingItems.map(it => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          item_id: it.item_id,
          item_name: it.item_name,
          unit: it.unit,
          pieces_per_unit: it.pieces_per_unit,
          quantity: it.quantity,
          quantity_requested: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          notes: it.notes
        }))
      });

      alert(`تم تحويل عرض السعر بنجاح إلى أمر توريد رقم (${newPo.order_number})!`);
      setPricingRfq(null);
      setActiveTab('orders');
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء تحويل عرض السعر لأمر توريد: ' + (e.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Convert PO to Purchase Invoice Handlers
  // -------------------------------------------------------------
  const handleOpenConvertPoModal = (po: PurchaseOrder) => {
    setConvertingPo(po);
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    setConvertInvoiceNumber(invoiceNum);
    setConvertInvoiceDate(new Date().toISOString().split('T')[0]);
    setConvertPaymentType('credit');
    setConvertTreasuryId(mainTreasury?.id || treasuries[0]?.id || '');
    setConvertPaymentMethodId(paymentMethods[0]?.id || '');
    setConvertNotes('');
    setConvertItems((po.items || []).map(it => ({
      item_id: it.item_id,
      item_name: it.item_name,
      unit: it.unit,
      pieces_per_unit: it.pieces_per_unit || 1,
      quantity_requested: it.quantity_requested,
      quantity_received: it.quantity_requested,
      unit_price: it.unit_price || 0,
      total_price: it.total_price || 0,
      is_received: true,
      notes: it.notes
    })));
  };

  const handleUpdateConvertItem = (itemId: string, field: 'quantity_received' | 'unit_price' | 'is_received', val: any) => {
    setConvertItems(prev => prev.map(it => {
      if (it.item_id !== itemId) return it;
      const updated = { ...it, [field]: val };
      if (field === 'quantity_received' || field === 'unit_price') {
        updated.total_price = Number((Number(updated.quantity_received) * Number(updated.unit_price)).toFixed(2));
      }
      return updated;
    }));
  };

  const handleExecuteConvertToInvoice = async () => {
    if (!convertingPo) return;
    if (!convertInvoiceNumber.trim()) {
      alert('يرجى إدخال رقم فاتورة الشراء!');
      return;
    }

    const receivedItems = convertItems.filter(it => it.is_received && Number(it.quantity_received) > 0);
    if (receivedItems.length === 0) {
      alert('يجب أن تحتوي الفاتورة على صنف مستلم واحد على الأقل!');
      return;
    }

    const totalAmount = receivedItems.reduce((acc, it) => acc + (it.total_price || 0), 0);

    try {
      setIsSubmitting(true);
      await onConvertPurchaseOrderToInvoice({
        orderId: convertingPo.id,
        supplierId: convertingPo.supplier_id,
        orderNumber: convertingPo.order_number,
        invoiceNumber: convertInvoiceNumber.trim(),
        invoiceDate: convertInvoiceDate,
        items: receivedItems.map(it => ({
          item_id: it.item_id,
          item_name: it.item_name,
          unit: it.unit,
          pieces_per_unit: it.pieces_per_unit,
          quantity_requested: it.quantity_requested,
          quantity_received: Number(it.quantity_received),
          unit_price: Number(it.unit_price),
          total_price: Number(it.total_price),
          notes: it.notes
        })),
        totalAmount,
        paymentType: convertPaymentType,
        treasuryId: convertPaymentType === 'treasury' ? convertTreasuryId : null,
        paymentMethodId: convertPaymentType === 'treasury' ? convertPaymentMethodId : null,
        notes: convertNotes || `فاتورة شراء محولة من أمر توريد رقم: ${convertingPo.order_number}`,
        createdBy: 'مسؤول المشتريات'
      });

      alert('تم تحويل أمر التوريد إلى فاتورة شراء بنجاح وزيادة كميات المخزون بالقطع الفعلية!');
      setConvertingPo(null);
      setActiveTab('invoices');
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء إصدار فاتورة الشراء: ' + (e.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Direct Purchase Invoice Handlers
  // -------------------------------------------------------------
  const handleOpenDirectInvoiceModal = () => {
    setDirectSupplierId(suppliers[0]?.id || '');
    setDirectInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setDirectInvoiceDate(new Date().toISOString().split('T')[0]);
    setDirectPaymentType('credit');
    setDirectTreasuryId(mainTreasury?.id || treasuries[0]?.id || '');
    setDirectPaymentMethodId(paymentMethods[0]?.id || '');
    setDirectNotes('');
    setDirectItems([]);
    if (inventoryItems.length > 0) {
      const first = inventoryItems[0];
      setDirectSelectedItemId(first.id);
      setDirectItemPrice(first.unit_cost || 0);
      setDirectItemUnit(first.purchase_unit || first.unit || 'كرتونة');
      setDirectPiecesPerUnit(first.pieces_per_unit || 1);
    }
    setDirectItemQty(1);
    setIsDirectInvoiceOpen(true);
  };

  const handleSelectDirectInventoryItem = (itemId: string) => {
    setDirectSelectedItemId(itemId);
    const it = inventoryItems.find(i => i.id === itemId);
    if (it) {
      setDirectItemPrice(it.unit_cost || 0);
      setDirectItemUnit(it.purchase_unit || it.unit || 'كرتونة');
      setDirectPiecesPerUnit(it.pieces_per_unit || 1);
    }
  };

  const handleAddDirectItem = () => {
    if (!directSelectedItemId) return;
    const it = inventoryItems.find(i => i.id === directSelectedItemId);
    if (!it) return;

    if (directItemQty <= 0) {
      alert('الكمية يجب أن تكون أكبر من صفر');
      return;
    }

    const totalPrice = Number((directItemQty * directItemPrice).toFixed(2));
    setDirectItems(prev => [
      ...prev,
      {
        item_id: it.id,
        item_name: it.name,
        unit: directItemUnit || it.purchase_unit || it.unit || 'كرتونة',
        pieces_per_unit: directPiecesPerUnit || it.pieces_per_unit || 1,
        quantity: directItemQty,
        unit_price: directItemPrice,
        total_price: totalPrice
      }
    ]);

    setDirectItemQty(1);
  };

  const handleSaveDirectInvoice = async () => {
    if (!directSupplierId) {
      alert('يرجى تحديد المورد!');
      return;
    }
    if (!directInvoiceNumber.trim()) {
      alert('يرجى كتابة رقم الفاتورة!');
      return;
    }
    if (directItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل!');
      return;
    }

    try {
      setIsSubmitting(true);
      const totalAmount = directItems.reduce((acc, it) => acc + (it.total_price || 0), 0);

      if (onCreatePurchaseInvoice) {
        await onCreatePurchaseInvoice({
          supplierId: directSupplierId,
          invoiceNumber: directInvoiceNumber.trim(),
          invoiceDate: directInvoiceDate,
          items: directItems,
          totalAmount,
          paymentType: directPaymentType,
          treasuryId: directPaymentType === 'treasury' ? directTreasuryId : null,
          paymentMethodId: directPaymentType === 'treasury' ? directPaymentMethodId : null,
          notes: directNotes,
          createdBy: 'مسؤول المشتريات'
        });
      }

      alert('تم إنشاء فاتورة الشراء بنجاح وتحديث أرصدة المخزون بالقطع!');
      setIsDirectInvoiceOpen(false);
      setActiveTab('invoices');
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ: ' + (e.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper print function
  const triggerPrint = (areaId: string) => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-teal-900 p-6 rounded-3xl text-white shadow-xl shadow-sky-950/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-teal-500/20 backdrop-blur-md rounded-2xl ring-1 ring-teal-400/30 text-teal-300">
              <ShoppingCart className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">إدارة المشتروات ودورة التوريد</h1>
          </div>
          <p className="text-teal-100/80 text-sm max-w-xl">
            دورة مشتريات إلكترونية متكاملة: طلبات عروض الأسعار مع الإرسال للموردين عبر واتساب، تحويلها لأوامر توريد، واعتماد فواتير الشراء مع معالجة وتحويل وحدات الكرتونة للقطع بالمخزون.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full md:w-auto">
          <button
            onClick={handleOpenCreateRfq}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/30 transition-all active:scale-95 cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>طلب عرض سعر جديد (RFQ)</span>
          </button>

          <button
            onClick={handleOpenDirectInvoiceModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer text-sm border border-white/10"
          >
            <Receipt className="w-4 h-4" />
            <span>فاتورة شراء مباشرة</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">طلبات عروض الأسعار</div>
            <div className="text-xl font-black text-slate-800">{stats.totalRfqs} <span className="text-xs font-medium text-amber-600">({stats.pendingRfqs} نشط)</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">أوامر التوريد المفتوحة</div>
            <div className="text-xl font-black text-slate-800">{stats.pendingPos} <span className="text-xs font-medium text-slate-400">أمر توريد</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">فواتير الشراء المنفذة</div>
            <div className="text-xl font-black text-slate-800">{stats.totalInvoicesCount} <span className="text-xs font-medium text-slate-400">فاتورة</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">إجمالي المشتريات</div>
            <div className="text-xl font-black text-slate-800">{stats.totalPurchasesAmount.toLocaleString()} <span className="text-xs font-medium text-slate-500">{currencySymbol}</span></div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Main Tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('rfqs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rfqs'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. طلبات عروض الأسعار ({rfqs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>2. أوامر التوريد المعتمدة ({stats.pendingPos})</span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>3. فواتير الشراء والتوريدات ({stats.totalInvoicesCount})</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-400">
            {activeTab === 'rfqs' && 'المرحلة 1: إعداد العروض وإرسالها للموردين'}
            {activeTab === 'orders' && 'المرحلة 2: اعتماد الأسعار وإصدار أوامر التوريد'}
            {activeTab === 'invoices' && 'المرحلة 3: استلام البضائع وزيادة المخزون'}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بالرقم أو اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          <div>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">جميع الموردين</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">جميع الحالات</option>
              {activeTab === 'rfqs' && (
                <>
                  <option value="draft">مسودة</option>
                  <option value="sent">تم الإرسال للمورد</option>
                  <option value="converted">تم التحويل لأمر توريد</option>
                </>
              )}
              {activeTab === 'orders' && (
                <>
                  <option value="pending">قيد الانتظار والتجهيز</option>
                  <option value="cancelled">ملغي</option>
                </>
              )}
              {activeTab === 'invoices' && (
                <option value="converted">فاتورة شراء مكتملة</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: RFQ LIST (طلبات عروض الأسعار) */}
      {/* ============================================================== */}
      {activeTab === 'rfqs' && (
        <div className="space-y-4">
          {filteredRfqs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">لا توجد طلبات عروض أسعار حالياً</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                يمكنك إنشاء طلب عرض سعر جديد واختيار مورد أو عدة موردين مع الأصناف والكميات وإرساله مباشرة عبر واتساب للموردين.
              </p>
              <button
                onClick={handleOpenCreateRfq}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء طلب عرض سعر الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRfqs.map((rfq) => {
                const isSent = rfq.status === 'sent';
                const isConverted = rfq.status === 'converted';

                return (
                  <div
                    key={rfq.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 hover:border-amber-400 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg inline-block mb-1 font-mono">
                            {rfq.rfq_number}
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            {rfq.supplier_name}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {rfq.status === 'draft' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> مسودة
                            </span>
                          )}
                          {rfq.status === 'sent' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 flex items-center gap-1">
                              <Send className="w-3 h-3" /> تم الإرسال
                            </span>
                          )}
                          {rfq.status === 'converted' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> تم التوريد ({rfq.converted_po_number})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>تاريخ الطلب: <strong>{rfq.rfq_date || rfq.date}</strong></span>
                        </div>
                        {rfq.supplier_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{rfq.supplier_phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>عدد الأصناف المطلوبة: <strong>{rfq.items.length}</strong> صنف</span>
                        </div>
                      </div>

                      {/* Items brief */}
                      <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 max-h-24 overflow-y-auto">
                        {rfq.items.map((it, idx) => {
                          const itemQty = it.quantity_requested || it.quantity || 0;
                          return (
                            <div key={idx} className="flex items-center justify-between text-slate-700">
                              <span className="truncate max-w-[160px]">• {it.item_name}</span>
                              <span className="font-bold text-slate-900 font-mono">
                                {itemQty} {it.unit}
                                {it.pieces_per_unit && it.pieces_per_unit > 1 && (
                                  <span className="text-[10px] text-teal-600 mr-1">({itemQty * it.pieces_per_unit} قطعة)</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {rfq.notes && (
                        <p className="mt-2 text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg">
                          {rfq.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      {/* Print / PDF Button */}
                      <button
                        onClick={() => setPrintingRfq(rfq)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="معاينة وطباعة A4 / حفظ PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة / PDF</span>
                      </button>

                      {/* Send WhatsApp (Evolution API) */}
                      {!isConverted && (
                        <button
                          onClick={() => handleSendRfqWhatsApp(rfq)}
                          disabled={isSendingWhatsApp === rfq.id}
                          className="flex-1 py-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          title="إرسال عبر Evolution API"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{isSendingWhatsApp === rfq.id ? 'جارٍ الإرسال...' : 'واتساب'}</span>
                        </button>
                      )}

                      {/* Price & Convert to PO */}
                      {!isConverted && (
                        <button
                          onClick={() => handleOpenPricingModal(rfq)}
                          className="w-full py-2 px-3 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>تسجيل الأسعار وتحويل لأمر توريد</span>
                        </button>
                      )}

                      {isConverted && (
                        <div className="w-full py-1.5 px-2 bg-emerald-50 text-emerald-700 text-center text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم التحويل لأمر توريد #{rfq.converted_po_number}</span>
                        </div>
                      )}

                      {/* Delete */}
                      {!isConverted && (
                        <button
                          onClick={async () => {
                            if (confirm(`هل أنت متأكد من حذف طلب عرض السعر رقم (${rfq.rfq_number})؟`)) {
                              await onDeleteRfq(rfq.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mr-auto"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PURCHASE ORDERS (أوامر التوريد المعتمدة) */}
      {/* ============================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
              <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">لا توجد أوامر توريد مفتوحة</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                أوامر التوريد يتم توليدها بعد تسجيل وتأكيد أسعار عروض الأسعار من الموردين، ويمكن تحويلها لفواتير شراء فور استلام البضاعة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((po) => {
                const supp = suppliers.find(s => s.id === po.supplier_id);

                return (
                  <div
                    key={po.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 hover:border-sky-400 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg inline-block mb-1 font-mono">
                            {po.order_number}
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            {supp?.name || 'مورد غير محدد'}
                          </h3>
                        </div>

                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> قيد التوريد
                        </span>
                      </div>

                      {/* Meta info */}
                      <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>تاريخ الأمر: <strong>{po.order_date}</strong></span>
                        </div>
                        {po.rfq_number && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>محول من عرض سعر: <strong className="font-mono text-amber-700">{po.rfq_number}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 font-bold">إجمالي الأمر المعتمد:</span>
                          <span className="text-sm font-black text-sky-700 font-mono">
                            {Number(po.total_amount).toLocaleString()} {currencySymbol}
                          </span>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5 max-h-32 overflow-y-auto">
                        {(po.items || []).map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-700 text-[11px] border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                            <div>
                              <span className="font-bold">{it.item_name}</span>
                              <div className="text-[10px] text-slate-400">
                                {it.quantity_requested} {it.unit} × {it.unit_price} {currencySymbol}
                                {it.pieces_per_unit && it.pieces_per_unit > 1 && (
                                  <span className="text-teal-600 mr-1">(= {it.quantity_requested * it.pieces_per_unit} قطعة)</span>
                                )}
                              </div>
                            </div>
                            <span className="font-black text-slate-900 font-mono">{it.total_price} {currencySymbol}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setPrintingPo(po)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="طباعة أمر توريد A4"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة A4</span>
                      </button>

                      <button
                        onClick={() => handleSendPoWhatsApp(po)}
                        disabled={isSendingWhatsApp === po.id}
                        className="flex-1 py-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        title="إرسال أمر التوريد عبر واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </button>

                      <button
                        onClick={() => handleOpenConvertPoModal(po)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>استلام البضاعة وإصدار فاتورة شراء</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: INVOICES (فواتير الشراء والتوريدات المنفذة) */}
      {/* ============================================================== */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
                  <th className="py-3 px-4">رقم الفاتورة</th>
                  <th className="py-3 px-4">تاريخ الشراء</th>
                  <th className="py-3 px-4">المورد</th>
                  <th className="py-3 px-4">أمر التوريد الأصلي</th>
                  <th className="py-3 px-4">عدد الأصناف</th>
                  <th className="py-3 px-4">المبلغ الإجمالي</th>
                  <th className="py-3 px-4">حالة المخزون</th>
                  <th className="py-3 px-4 text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      لا توجد فواتير شراء مطابقة لبحثك
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((inv) => {
                    const supp = suppliers.find(s => s.id === inv.supplier_id);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                          {inv.converted_invoice_number || inv.order_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">
                          {inv.converted_at?.split('T')[0] || inv.order_date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {supp?.name || 'مورد'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {inv.order_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-bold">
                          {inv.items?.length || 0} أصناف
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-700">
                          {Number(inv.total_amount).toLocaleString()} {currencySymbol}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> تم إضافة المخزون بالقطع
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setPrintingPo(inv)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="عرض الفاتورة"
                          >
                            <Eye className="w-4 h-4" />
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
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREATE RFQ (طلب عرض سعر جديد لمورد أو عدة موردين) */}
      {/* ============================================================== */}
      {isCreateRfqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h2 className="text-base font-bold">إنشاء طلب عرض سعر جديد (RFQ)</h2>
              </div>
              <button
                onClick={() => setIsCreateRfqOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Suppliers Selection (Can select multiple suppliers) */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                <label className="block text-xs font-bold text-amber-900">
                  تحديد الموردين المطلوب الحصول على عرض سعر منهم (يمكن تحديد أكثر من مورد):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                  {suppliers.map(s => {
                    const isSelected = selectedSupplierIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-amber-100/80 border-amber-400 text-amber-900 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSupplierIds([...selectedSupplierIds, s.id]);
                            } else {
                              setSelectedSupplierIds(selectedSupplierIds.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedSupplierIds.length > 1 && (
                  <p className="text-[11px] text-amber-800 font-medium">
                    ✨ سيقوم النظام تلقائياً بإنشاء طلب عرض سعر مستقل لكل مورد من الموردين المحددين ({selectedSupplierIds.length} مورد).
                  </p>
                )}
              </div>

              {/* Date & General Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ طلب عرض السعر</label>
                  <input
                    type="date"
                    value={rfqDate}
                    onChange={(e) => setRfqDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات عامة لطلب السعر</label>
                  <input
                    type="text"
                    placeholder="مثل: شروط التسليم أو الدفع أو أي تفاصيل..."
                    value={rfqNotes}
                    onChange={(e) => setRfqNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Add Items Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-teal-600" />
                  إضافة السلع المطلوب الحصول على عرض سعر لها
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الصنف من المخزون</label>
                    <select
                      value={rfqSelectedItemId}
                      onChange={(e) => handleSelectInventoryItemForRfq(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.current_stock} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">وحدة الشراء (مثلاً كرتونة)</label>
                    <input
                      type="text"
                      value={rfqItemUnit}
                      onChange={(e) => setRfqItemUnit(e.target.value)}
                      placeholder="كرتونة / دستة"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">عدد القطع في الوحدة</label>
                    <input
                      type="number"
                      min={1}
                      value={rfqPiecesPerUnit}
                      onChange={(e) => setRfqPiecesPerUnit(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="مثلاً 20"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">العدد المطلوب</label>
                    <input
                      type="number"
                      min={1}
                      value={rfqItemQty}
                      onChange={(e) => setRfqItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ملاحظة على الصنف (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مواصفات أو جودة معينة..."
                      value={rfqItemNotes}
                      onChange={(e) => setRfqItemNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddRfqItem}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة للطلب</span>
                    </button>
                  </div>
                </div>

                {/* Added Items Table */}
                <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">الصنف</th>
                        <th className="py-2 px-3">الوحدة</th>
                        <th className="py-2 px-3">قطع/الوحدة</th>
                        <th className="py-2 px-3">الكمية</th>
                        <th className="py-2 px-3">ملاحظات</th>
                        <th className="py-2 px-3 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rfqItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400">
                            لم يتم إضافة أصناف بعد
                          </td>
                        </tr>
                      ) : (
                        rfqItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{it.item_name}</td>
                            <td className="py-2 px-3 text-slate-600">{it.unit}</td>
                            <td className="py-2 px-3 text-teal-600 font-mono">{it.pieces_per_unit || 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900 font-mono">{it.quantity}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{it.notes || '-'}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRfqItem(it.item_id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreateRfqOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRfqs}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'جارٍ الحفظ...' : `حفظ طلب عرض السعر (${selectedSupplierIds.length} مورد)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PRINT / PDF PREVIEW FOR RFQ (شكل عرض السعر المطلوب) */}
      {/* ============================================================== */}
      {printingRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Top Toolbar */}
            <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Printer className="w-4 h-4 text-amber-400" />
                <span>معاينة طباعة طلب عرض السعر / حفظ PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerPrint('rfq-print-area')}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة A4 / حفظ كـ PDF</span>
                </button>
                <button
                  onClick={() => setPrintingRfq(null)}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Area Formatted per Specification */}
            <div id="rfq-print-area" className="p-8 sm:p-12 overflow-y-auto flex-1 font-cairo bg-white text-slate-900">
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 15mm;
                  }
                  body * {
                    visibility: hidden;
                  }
                  #rfq-print-area, #rfq-print-area * {
                    visibility: visible !important;
                  }
                  #rfq-print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>

              {/* Header: Company Name & Logo */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {settings.company_name || 'شركة وي كير'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة المشتريات والتوريد والعقود
                  </p>
                  <div className="mt-2 inline-block bg-amber-500 text-white px-3 py-0.5 rounded text-xs font-black">
                    طلب عرض سعر / REQUEST FOR QUOTATION
                  </div>
                </div>

                <div className="text-left">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="h-16 object-contain mb-1" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
                      WC
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Info & RFQ Meta */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-500 font-bold">السادة / </span>
                    <strong className="text-slate-900 text-sm">{printingRfq.supplier_name}</strong>
                  </div>
                  {printingRfq.supplier_phone && (
                    <div>
                      <span className="text-slate-500 font-bold">رقم الهاتف / واتساب: </span>
                      <span className="font-mono">{printingRfq.supplier_phone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <div>
                    <span className="text-slate-500 font-bold">رقم طلب السعر: </span>
                    <strong className="font-mono text-amber-700 text-sm">{printingRfq.rfq_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">تاريخ الطلب: </span>
                    <span className="font-mono font-bold text-slate-800">{printingRfq.rfq_date || printingRfq.date}</span>
                  </div>
                </div>
              </div>

              {/* RFQ Greeting Note */}
              <p className="text-xs text-slate-700 leading-relaxed mb-4">
                تحية طيبة وبعد،، نرجو من سيادتكم التكرم بتعبئة أفضل أسعار التوريد للأصناف الموضحة بالجدول أدناه وإعادة إرسالها إلينا لاعتماد أمر التوريد:
              </p>

              {/* Table per User Spec:
                  الاصناف المطلوبة - الوحدة - العدد المطلوب - ثم عمودين فارغين سعر الوحدة - السعر الاجمالي وبالاسفل مجموع كلي
              */}
              <div className="border border-slate-800 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3 border-l border-slate-700 w-10 text-center">م</th>
                      <th className="py-2.5 px-3 border-l border-slate-700">الأصناف المطلوبة</th>
                      <th className="py-2.5 px-3 border-l border-slate-700 w-24 text-center">الوحدة</th>
                      <th className="py-2.5 px-3 border-l border-slate-700 w-24 text-center">العدد المطلوب</th>
                      <th className="py-2.5 px-3 border-l border-slate-700 w-32 text-center bg-slate-800">سعر الوحدة (للمورد)</th>
                      <th className="py-2.5 px-3 w-36 text-center bg-slate-800">السعر الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {printingRfq.items.map((it, idx) => (
                      <tr key={idx} className="h-10">
                        <td className="py-2 px-3 border-l border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 border-l border-slate-300 font-bold">
                          {it.item_name}
                          {it.notes && <span className="block text-[10px] text-slate-500 font-normal">({it.notes})</span>}
                        </td>
                        <td className="py-2 px-3 border-l border-slate-300 text-center">{it.unit}</td>
                        <td className="py-2 px-3 border-l border-slate-300 text-center font-black font-mono text-sm">{it.quantity_requested || it.quantity || 0}</td>
                        <td className="py-2 px-3 border-l border-slate-300 text-center bg-slate-50/50 font-mono font-bold">
                          {it.unit_price ? `${it.unit_price} ${currencySymbol}` : ''}
                        </td>
                        <td className="py-2 px-3 text-center bg-slate-50/50 font-mono font-bold">
                          {it.total_price ? `${it.total_price} ${currencySymbol}` : ''}
                        </td>
                      </tr>
                    ))}
                    {/* Blank rows for print look */}
                    {[...Array(Math.max(0, 3 - printingRfq.items.length))].map((_, i) => (
                      <tr key={`blank-${i}`} className="h-10">
                        <td className="border-l border-slate-300"></td>
                        <td className="border-l border-slate-300"></td>
                        <td className="border-l border-slate-300"></td>
                        <td className="border-l border-slate-300"></td>
                        <td className="border-l border-slate-300 bg-slate-50/50"></td>
                        <td className="bg-slate-50/50"></td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Bottom: Empty Grand Total for supplier to complete */}
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-800 font-black">
                      <td colSpan={4} className="py-3 px-4 text-left border-l border-slate-300 text-sm">
                        المجموع الكلي النهائي (شاملاً الضرائب والتوصيل):
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-center font-mono text-base bg-amber-50 text-slate-900 border-t-2 border-slate-800">
                        {printingRfq.total_amount ? `${printingRfq.total_amount} ${currencySymbol}` : '______________________'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures & Conditions */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-slate-700 mb-1">شروط وملاحظات التوريد:</div>
                  <ul className="list-disc list-inside text-slate-500 space-y-0.5 text-[11px]">
                    <li>الأسعار شاملة التوصيل لمستودعات الشركة.</li>
                    <li>صلاحية الأسعار الموضحة: 15 يوماً من تاريخ الرد.</li>
                    <li>مدة التوريد المتوقعة فور إصدار أمر التوريد: ______ يوم.</li>
                  </ul>
                </div>

                <div className="text-center space-y-12">
                  <div className="font-bold text-slate-800">ختم وتوقيع المورد بالعرض:</div>
                  <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PRICE RFQ & CONVERT TO PURCHASE ORDER (PO) */}
      {/* ============================================================== */}
      {pricingRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-sky-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-200" />
                  تسجيل أسعار المورد وتحويل إلى أمر توريد (Purchase Order)
                </h2>
                <p className="text-xs text-teal-100 mt-0.5 font-mono">
                  عرض سعر: {pricingRfq.rfq_number} - المورد: {pricingRfq.supplier_name}
                </p>
              </div>
              <button
                onClick={() => setPricingRfq(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-sky-50 p-3.5 rounded-2xl border border-sky-100 text-xs text-sky-900 leading-relaxed">
                💡 <strong>تعليمات الاعتماد:</strong> أدخل أسعار الوحدة التي وافى بها المورد. يمكنك إلغاء تفعيل أي صنف قررت عدم شرائه من هذا المورد ليتم حذفه من أمر التوريد.
              </div>

              {/* Items Pricing Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-12">شراء؟</th>
                      <th className="py-2.5 px-3">الصنف</th>
                      <th className="py-2.5 px-3">الوحدة</th>
                      <th className="py-2.5 px-3 w-24">الكمية</th>
                      <th className="py-2.5 px-3 w-32">سعر الوحدة ({currencySymbol})</th>
                      <th className="py-2.5 px-3 w-32">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pricingItems.map((it) => (
                      <tr key={it.item_id} className={!it.is_included ? 'bg-slate-50 opacity-40 line-through' : 'hover:bg-slate-50/50'}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={it.is_included}
                            onChange={(e) => handleUpdatePricingItem(it.item_id, 'is_included', e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {it.item_name}
                          {it.pieces_per_unit > 1 && (
                            <span className="block text-[10px] text-teal-600 font-normal">
                              ({it.pieces_per_unit} قطعة في الكرتونة)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{it.unit}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={1}
                            disabled={!it.is_included}
                            value={it.quantity}
                            onChange={(e) => handleUpdatePricingItem(it.item_id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            disabled={!it.is_included}
                            value={it.unit_price}
                            onChange={(e) => handleUpdatePricingItem(it.item_id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-black text-teal-700"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-black font-mono text-slate-900">
                          {it.is_included ? `${it.total_price.toLocaleString()} ${currencySymbol}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-200">
                      <td colSpan={5} className="py-3 px-4 text-left">
                        إجمالي أمر التوريد المعتمد:
                      </td>
                      <td className="py-3 px-4 text-teal-700 font-mono text-sm">
                        {pricingItems
                          .filter(it => it.is_included)
                          .reduce((sum, it) => sum + (it.total_price || 0), 0)
                          .toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Additional PO Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات أو شروط أمر التوريد</label>
                <textarea
                  rows={2}
                  value={pricingNotes}
                  onChange={(e) => setPricingNotes(e.target.value)}
                  placeholder="مثل: موعد التسليم المتفق عليه، طريقة الشحن، أو مكان الاستلام..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPricingRfq(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePricesAndConvertToPo}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'جارٍ الاعتماد...' : 'اعتماد وإنشاء أمر التوريد (PO)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: PRINT / PDF PREVIEW FOR PURCHASE ORDER (PO) */}
      {/* ============================================================== */}
      {printingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Top Toolbar */}
            <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Printer className="w-4 h-4 text-sky-400" />
                <span>طباعة أمر التوريد A4 / حفظ PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerPrint('po-print-area')}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة A4 / حفظ كـ PDF</span>
                </button>
                <button
                  onClick={() => setPrintingPo(null)}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="po-print-area" className="p-8 sm:p-12 overflow-y-auto flex-1 font-cairo bg-white text-slate-900">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {settings.company_name || 'شركة وي كير'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة المشتروات والتوريد
                  </p>
                  <div className="mt-2 inline-block bg-sky-700 text-white px-3 py-0.5 rounded text-xs font-black">
                    أمر توريد رسمي / PURCHASE ORDER
                  </div>
                </div>

                <div className="text-left">
                  {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-16 object-contain mb-1" />
                  )}
                </div>
              </div>

              {/* PO Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-500 font-bold">المورد المعتمد: </span>
                    <strong className="text-slate-900 text-sm">
                      {suppliers.find(s => s.id === printingPo.supplier_id)?.name || 'مورد'}
                    </strong>
                  </div>
                  {suppliers.find(s => s.id === printingPo.supplier_id)?.phone && (
                    <div>
                      <span className="text-slate-500 font-bold">الهاتف: </span>
                      <span className="font-mono">{suppliers.find(s => s.id === printingPo.supplier_id)?.phone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <div>
                    <span className="text-slate-500 font-bold">رقم أمر التوريد: </span>
                    <strong className="font-mono text-sky-700 text-sm">{printingPo.order_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">تاريخ الطلب: </span>
                    <span className="font-mono font-bold text-slate-800">{printingPo.order_date}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3 border-l border-slate-700 w-10 text-center">م</th>
                      <th className="py-2.5 px-3 border-l border-slate-700">الصنف المعتمد</th>
                      <th className="py-2.5 px-3 border-l border-slate-700 text-center">الوحدة</th>
                      <th className="py-2.5 px-3 border-l border-slate-700 text-center">الكمية المطلوبة</th>
                      <th className="py-2.5 px-3 border-l border-slate-700 text-center">سعر الوحدة</th>
                      <th className="py-2.5 px-3 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {(printingPo.items || []).map((it, idx) => (
                      <tr key={idx} className="h-10">
                        <td className="py-2 px-3 border-l border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 border-l border-slate-300 font-bold">{it.item_name}</td>
                        <td className="py-2 px-3 border-l border-slate-300 text-center">{it.unit}</td>
                        <td className="py-2 px-3 border-l border-slate-300 text-center font-mono font-black">{it.quantity_requested}</td>
                        <td className="py-2 px-3 border-l border-slate-300 text-center font-mono font-bold">{it.unit_price} {currencySymbol}</td>
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-900">{it.total_price} {currencySymbol}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-800 font-black">
                      <td colSpan={5} className="py-3 px-4 text-left border-l border-slate-300 text-sm">
                        إجمالي أمر التوريد:
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-base text-sky-800">
                        {Number(printingPo.total_amount).toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-200 text-xs">
                <div className="text-center space-y-12">
                  <div className="font-bold text-slate-700">اعتماد إدارة المشتريات:</div>
                  <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
                </div>

                <div className="text-center space-y-12">
                  <div className="font-bold text-slate-700">توقيع وختم استلام المورد:</div>
                  <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CONVERT PO TO PURCHASE INVOICE */}
      {/* ============================================================== */}
      {convertingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-200" />
                  تحويل أمر التوريد إلى فاتورة شراء رسمية
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                  أمر توريد: {convertingPo.order_number}
                </p>
              </div>
              <button
                onClick={() => setConvertingPo(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                📦 <strong>معالجة التوريد والمخزون:</strong> يمكنك إلغاء أي صنف لم يوفره المورد، أو تعديل الكمية المستلمة فعلياً. سيقوم النظام تلقائياً بتحويل وحدات الشراء (كراتين) إلى عدد القطع الفعلي وزيادة رصيد المخزون بدقة!
              </div>

              {/* Invoice Number, Date & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم فاتورة الشراء <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={convertInvoiceNumber}
                    onChange={(e) => setConvertInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={convertInvoiceDate}
                    onChange={(e) => setConvertInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد</label>
                  <select
                    value={convertPaymentType}
                    onChange={(e) => setConvertPaymentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="credit">آجل (تسجيل دين على حساب المورد)</option>
                    <option value="treasury">سداد فوري من الخزينة</option>
                  </select>
                </div>

                {convertPaymentType === 'treasury' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">خزينة الصرف</label>
                      <select
                        value={convertTreasuryId}
                        onChange={(e) => setConvertTreasuryId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        {treasuries.map(t => (
                          <option key={t.id} value={t.id}>{t.name} (رصيد: {t.balance} {currencySymbol})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">وسيلة الدفع</label>
                      <select
                        value={convertPaymentMethodId}
                        onChange={(e) => setConvertPaymentMethodId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        {paymentMethods.map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Items Table with Quantity and Cancellation */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-12">استلام؟</th>
                      <th className="py-2.5 px-3">الصنف</th>
                      <th className="py-2.5 px-3">الوحدة</th>
                      <th className="py-2.5 px-3 w-24">المطلوب</th>
                      <th className="py-2.5 px-3 w-28">المستلم فعلياً</th>
                      <th className="py-2.5 px-3 w-28">الزيادة بالمخزون</th>
                      <th className="py-2.5 px-3 w-28">سعر الوحدة</th>
                      <th className="py-2.5 px-3 w-28">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {convertItems.map((it) => {
                      const piecesMultiplier = it.pieces_per_unit || 1;
                      const totalPiecesToAdd = it.is_received ? (Number(it.quantity_received) || 0) * piecesMultiplier : 0;

                      return (
                        <tr key={it.item_id} className={!it.is_received ? 'bg-rose-50/50 opacity-40 line-through' : 'hover:bg-slate-50/50'}>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={it.is_received}
                              onChange={(e) => handleUpdateConvertItem(it.item_id, 'is_received', e.target.checked)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {it.item_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{it.unit}</td>
                          <td className="py-2.5 px-3 font-mono">{it.quantity_requested}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              disabled={!it.is_received}
                              value={it.quantity_received}
                              onChange={(e) => handleUpdateConvertItem(it.item_id, 'quantity_received', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                            +{totalPiecesToAdd} قطعة
                          </td>
                          <td className="py-2.5 px-3 font-mono">{it.unit_price} {currencySymbol}</td>
                          <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                            {it.is_received ? `${it.total_price.toLocaleString()} ${currencySymbol}` : 'ملغي'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-200">
                      <td colSpan={7} className="py-3 px-4 text-left">
                        إجمالي فاتورة الشراء المستحقة:
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-mono text-sm">
                        {convertItems
                          .filter(it => it.is_received)
                          .reduce((sum, it) => sum + (it.total_price || 0), 0)
                          .toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setConvertingPo(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteConvertToInvoice}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد الاستلام وزيادة المخزون بالقطع'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: DIRECT PURCHASE INVOICE */}
      {/* ============================================================== */}
      {isDirectInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-sky-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-200" />
                <h2 className="text-base font-bold">تسجيل فاتورة شراء مباشرة للمخزون</h2>
              </div>
              <button
                onClick={() => setIsDirectInvoiceOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المورد</label>
                  <select
                    value={directSupplierId}
                    onChange={(e) => setDirectSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={directInvoiceNumber}
                    onChange={(e) => setDirectInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={directInvoiceDate}
                    onChange={(e) => setDirectInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد</label>
                  <select
                    value={directPaymentType}
                    onChange={(e) => setDirectPaymentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="credit">آجل (على الحساب)</option>
                    <option value="treasury">نقدي فوري من الخزينة</option>
                  </select>
                </div>

                {directPaymentType === 'treasury' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">خزينة الصرف</label>
                      <select
                        value={directTreasuryId}
                        onChange={(e) => setDirectTreasuryId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        {treasuries.map(t => (
                          <option key={t.id} value={t.id}>{t.name} (رصيد: {t.balance} {currencySymbol})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                      <select
                        value={directPaymentMethodId}
                        onChange={(e) => setDirectPaymentMethodId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        {paymentMethods.map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Add Item Row */}
              <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-2">
                <span className="text-xs font-bold text-teal-900">إضافة صنف للفاتورة:</span>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={directSelectedItemId}
                      onChange={(e) => handleSelectDirectInventoryItem(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      min={1}
                      placeholder="الكمية"
                      value={directItemQty}
                      onChange={(e) => setDirectItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="سعر الوحدة"
                      value={directItemPrice}
                      onChange={(e) => setDirectItemPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-teal-700"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddDirectItem}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                    >
                      + إضافة
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="py-2 px-3">الصنف</th>
                      <th className="py-2 px-3">الوحدة</th>
                      <th className="py-2 px-3">الكمية</th>
                      <th className="py-2 px-3">السعر</th>
                      <th className="py-2 px-3">الإجمالي</th>
                      <th className="py-2 px-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {directItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold">{it.item_name}</td>
                        <td className="py-2 px-3">{it.unit}</td>
                        <td className="py-2 px-3 font-mono font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 font-mono">{it.unit_price} {currencySymbol}</td>
                        <td className="py-2 px-3 font-mono font-black">{it.total_price} {currencySymbol}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDirectItems(directItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={4} className="py-2.5 px-3 text-left">الإجمالي:</td>
                      <td colSpan={2} className="py-2.5 px-3 font-mono text-teal-700 text-sm">
                        {directItems.reduce((acc, it) => acc + (it.total_price || 0), 0).toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDirectInvoiceOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveDirectInvoice}
                disabled={isSubmitting}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الفاتورة وزيادة المخزون'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
