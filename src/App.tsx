import React, { useState, useEffect } from 'react';
import {
  Settings,
  CoverageArea,
  Employee,
  EmployeePermission,
  Attendance,
  Customer,
  Vehicle,
  PackageCategory,
  Package,
  PackagePricing,
  Subscription,
  Visit,
  Treasury,
  PaymentMethod,
  TreasuryTransaction,
  InventoryItem,
  InventoryTransaction,
  Equipment,
  SubscriptionStatus,
  VisitStatus,
  AuthUser,
  Supplier,
  SupplierTransaction,
  PurchaseOrder,
  PriceQuotationRequest,
  Advertisement,
  SystemNotification,
  Expense,
  ExpenseCategory,
  SalaryPayment
} from './types/database';
import {
  Star,
  MessageSquare,
  Calendar,
  User,
  Car,
  MapPin,
  Building,
  Phone,
  ExternalLink,
  X,
  CheckCircle2,
  Package as PackageIcon,
  Clock,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import * as api from './services/api';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { EmployeesView } from './components/EmployeesView';
import { AttendanceView } from './components/AttendanceView';
import { PermissionsView } from './components/PermissionsView';
import { CustomersView } from './components/CustomersView';
import { PackagesView } from './components/PackagesView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { CalendarView } from './components/CalendarView';
import { VisitsView } from './components/VisitsView';
import { FinanceView } from './components/FinanceView';
import { ExpensesView } from './components/ExpensesView';
import { InventoryView } from './components/InventoryView';
import { PurchasesView } from './components/PurchasesView';
import { SuppliersView } from './components/SuppliersView';
import { ReportsView } from './components/ReportsView';
import { AdvertisementsView } from './components/AdvertisementsView';
import { StoreManagementView } from './components/StoreManagementView';
import { LoginView } from './components/LoginView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { WorkerAppView } from './components/WorkerAppView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  // Stale-While-Revalidate Snapshot Cache (تحميل فوري في 0 ميلي ثانية عند إعادة التحميل)
  const cachedData = React.useMemo(() => {
    try {
      const saved = sessionStorage.getItem('wecare_cached_initial_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const [isLoading, setIsLoading] = useState(!cachedData);
  const [openCreateSubModal, setOpenCreateSubModal] = useState(false);

  // Current Authenticated User Session (Persistent on device via localStorage)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedLocal = localStorage.getItem('wecare_auth_user');
      if (savedLocal) return JSON.parse(savedLocal);
      const savedSession = sessionStorage.getItem('wecare_auth_user');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('wecare_auth_user', JSON.stringify(user));
      sessionStorage.setItem('wecare_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    await refreshAllData();
    if (user.role === 'worker') {
      setActiveTab('calendar');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('wecare_auth_user');
      sessionStorage.removeItem('wecare_auth_user');
      sessionStorage.removeItem('wecare_cached_initial_data');
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
  };

  // System States (Initial state filled from cache for instant render, updated live in background)
  const [settings, setSettings] = useState<Settings>(cachedData?.settings || {
    id: '',
    company_name: '',
    logo_url: '',
    country: '',
    currency_symbol: '',
    currency_code: '',
    dial_code: ''
  });
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>(cachedData?.coverageAreas || []);
  const [employees, setEmployees] = useState<Employee[]>(cachedData?.employees || []);
  const [attendance, setAttendance] = useState<Attendance[]>(cachedData?.attendance || []);
  const [customers, setCustomers] = useState<Customer[]>(cachedData?.customers || []);
  const [vehicles, setVehicles] = useState<Vehicle[]>(cachedData?.vehicles || []);
  const [categories, setCategories] = useState<PackageCategory[]>(cachedData?.categories || []);
  const [packages, setPackages] = useState<Package[]>(cachedData?.packages || []);
  const [packagePricing, setPackagePricing] = useState<PackagePricing[]>(cachedData?.packagePricing || []);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(cachedData?.subscriptions || []);
  const [visits, setVisits] = useState<Visit[]>(cachedData?.visits || []);
  const [treasuries, setTreasuries] = useState<Treasury[]>(cachedData?.treasuries || []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(cachedData?.paymentMethods || []);
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(cachedData?.treasuryTransactions || []);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(cachedData?.inventoryItems || []);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(cachedData?.inventoryTransactions || []);
  const [equipment, setEquipment] = useState<Equipment[]>(cachedData?.equipment || []);
  const [suppliers, setSuppliers] = useState<Supplier[]>(cachedData?.suppliers || []);
  const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>(cachedData?.supplierTransactions || []);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(cachedData?.purchaseOrders || []);
  const [priceQuotationRequests, setPriceQuotationRequests] = useState<PriceQuotationRequest[]>(cachedData?.priceQuotationRequests || []);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>(cachedData?.advertisements || []);
  const [notifications, setNotifications] = useState<SystemNotification[]>(cachedData?.notifications || []);
  const [expenses, setExpenses] = useState<Expense[]>(cachedData?.expenses || []);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(cachedData?.expenseCategories || []);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(cachedData?.salaryPayments || []);

  // Fetch all live data on mount using single fast endpoint
  const refreshAllData = async () => {
    try {
      const data = await api.getInitialData();
      if (data.settings) setSettings(data.settings);
      setCoverageAreas(data.coverageAreas);
      setEmployees(data.employees);
      setAttendance(data.attendance);
      setCustomers(data.customers);
      setVehicles(data.vehicles);
      setCategories(data.categories);
      setPackages(data.packages);
      setPackagePricing(data.packagePricing);
      setSubscriptions(data.subscriptions);
      setVisits(data.visits);
      setTreasuries(data.treasuries);
      setPaymentMethods(data.paymentMethods);
      setTreasuryTransactions(data.treasuryTransactions);
      setInventoryItems(data.inventoryItems);
      setInventoryTransactions(data.inventoryTransactions);
      setEquipment(data.equipment);
      setSuppliers(data.suppliers);
      setSupplierTransactions(data.supplierTransactions);
      setPurchaseOrders(data.purchaseOrders);
      setPriceQuotationRequests(data.priceQuotationRequests);
      setAdvertisements(data.advertisements);
      setNotifications(data.notifications);
      setExpenseCategories(data.expenseCategories);
      setExpenses(data.expenses);
      setSalaryPayments(data.salaryPayments);

      // حفظ نسخة محدثة في sessionStorage للتحميل الفوري
      try {
        sessionStorage.setItem('wecare_cached_initial_data', JSON.stringify(data));
      } catch {}
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'برنامج الغسيل المتنقل';
    refreshAllData();

    // Check notifications periodically (every 30 seconds)
    const interval = setInterval(async () => {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch (e) {}
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkNotificationAsRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAllNotificationsAsRead = async () => {
    await api.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Helper to determine subscription subcategory type
  const getSubCategoryType = (sub: Subscription): 'cars' | 'buildings' | 'public' => {
    if (sub.vehicle_id) return 'cars';

    const pkg = packages.find((p) => p.id === sub.package_id);
    const cat = categories.find((c) => c.id === pkg?.category_id);
    const catName = (cat?.name || '').toLowerCase();
    const pkgName = (pkg?.name || '').toLowerCase();

    if (
      catName.includes('عمارات') ||
      catName.includes('عمارة') ||
      catName.includes('مباني') ||
      pkgName.includes('عمارة') ||
      pkgName.includes('عمارات') ||
      (pkg as any)?.is_building === 1
    ) {
      return 'buildings';
    }
    if (
      catName.includes('خدمات عامة') ||
      catName.includes('خدمة عامة') ||
      catName.includes('عامة') ||
      catName.includes('خدمات') ||
      catName.includes('خدمة') ||
      pkgName.includes('خدمات عامة') ||
      pkgName.includes('خدمة عامة') ||
      pkgName.includes('خدمات') ||
      pkgName.includes('خدمة')
    ) {
      return 'public';
    }
    return 'cars';
  };

  // State for Viewing Rating & Subscription Details Modal from Notification
  const [activeRatingNotificationModal, setActiveRatingNotificationModal] = useState<{
    notification: SystemNotification;
    visit?: Visit;
    subscription?: Subscription;
    customer?: Customer;
    vehicle?: Vehicle;
    worker?: Employee;
    packageItem?: Package;
    area?: CoverageArea;
  } | null>(null);

  // Handle clicking on an notification in the Admin Header
  const handleNavigateNotification = (notif: SystemNotification) => {
    // 1. Rating Notification (مثلا إشعار بتقييم عميل)
    if (notif.type === 'rating' || notif.rating) {
      const visit = visits.find((v) => v.id === notif.reference_id);
      const sub = subscriptions.find(
        (s) => s.id === (visit?.subscription_id || notif.reference_id) || s.customer_id === notif.customer_id
      );
      const cust = customers.find(
        (c) => c.id === (notif.customer_id || sub?.customer_id || visit?.customer_id)
      );
      const veh = vehicles.find((v) => v.id === sub?.vehicle_id);
      const worker = employees.find(
        (e) => e.id === (visit?.assigned_worker_id || (visit as any)?.worker_id)
      );
      const pkg = packages.find((p) => p.id === sub?.package_id);
      const area = coverageAreas.find((a) => a.id === (cust?.area_id || sub?.area_id));

      // Switch active tab to the appropriate subscription tab or visits
      if (sub) {
        const subType = getSubCategoryType(sub);
        if (subType === 'buildings') setActiveTab('subscriptions_buildings');
        else if (subType === 'public') setActiveTab('subscriptions_public');
        else setActiveTab('subscriptions_cars');
      } else {
        setActiveTab('visits');
      }

      // Open the comprehensive Rating & Subscription Details Modal
      setActiveRatingNotificationModal({
        notification: notif,
        visit,
        subscription: sub,
        customer: cust,
        vehicle: veh,
        worker,
        packageItem: pkg,
        area
      });
      return;
    }

    // 2. Store Order Notification
    if (notif.type === 'order' || notif.title.includes('طلب')) {
      setActiveTab('store');
      return;
    }

    // 3. Subscription Notification (e.g. cancellation or new subscription)
    if (notif.title.includes('اشتراك') || notif.reference_id) {
      const sub = subscriptions.find((s) => s.id === notif.reference_id);
      if (sub) {
        const subType = getSubCategoryType(sub);
        if (subType === 'buildings') setActiveTab('subscriptions_buildings');
        else if (subType === 'public') setActiveTab('subscriptions_public');
        else setActiveTab('subscriptions_cars');
        return;
      }
    }

    // 4. Customer Notification
    if (notif.customer_id) {
      setActiveTab('customers');
      return;
    }

    // 5. Visit Notification
    if (notif.reference_id && visits.some((v) => v.id === notif.reference_id)) {
      setActiveTab('visits');
      return;
    }
  };

  // Handlers for Subscriptions
  const handleCreateSubscription = async (s: Parameters<typeof api.createSubscription>[0]) => {
    const created = await api.createSubscription(s);
    setSubscriptions((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    await refreshAllData();
    return created;
  };

  const handleApproveSubscription = async (id: string) => {
    await api.updateSubscriptionStatus(id, 'active');
    await refreshAllData();
  };

  const handleRejectSubscription = async (id: string) => {
    await api.updateSubscriptionStatus(id, 'cancelled');
    await refreshAllData();
  };

  const handleRenewSubscription = async (id: string) => {
    await api.renewSubscription(id);
    await refreshAllData();
  };

  const handleRestoreSubscription = async (id: string) => {
    await api.restoreArchivedSubscription(id);
    await refreshAllData();
  };

  const handlePauseSubscription = async (id: string) => {
    await api.updateSubscriptionStatus(id, 'paused');
    await refreshAllData();
  };

  const handleResumeSubscription = async (id: string) => {
    await api.updateSubscriptionStatus(id, 'active');
    await refreshAllData();
  };

  const handleDeleteSubscription = async (id: string) => {
    await api.deleteSubscription(id);
    await refreshAllData();
  };

  const handlePaySubscription = async (id: string, paymentMethodId: string, amount: number) => {
    await api.paySubscription(id, paymentMethodId, amount);
    await refreshAllData();
  };

  const handleOpenCreateSubscription = () => {
    setActiveTab('subscriptions_cars');
    setOpenCreateSubModal(true);
  };

  const handleCheckArchival = async () => {
    const count = await api.checkAndArchiveExpiredSubscriptions();
    await refreshAllData();
    return count;
  };

  // Handlers for Visits
  const handleRescheduleVisit = async (visitId: string, newDate: string, newTimeFrom?: string, newTimeTo?: string) => {
    await api.rescheduleVisit(visitId, newDate, newTimeFrom, newTimeTo);
    await refreshAllData();
  };

  const handleUpdateVisitStatus = async (visitId: string, status: VisitStatus, notes?: string) => {
    await api.updateVisitStatus(visitId, status, notes);
    await refreshAllData();
  };

  const handleUpdateSubscription = async (id: string, updates: Partial<Subscription>, regenerateVisits?: boolean) => {
    await api.updateSubscription(id, updates, regenerateVisits);
    await refreshAllData();
  };

  const handleUpdateVisit = async (visitId: string, updates: Partial<Visit>) => {
    await api.updateVisit(visitId, updates);
    await refreshAllData();
  };

  const handleCreateVisit = async (visit: Omit<Visit, 'id'> & { id?: string }) => {
    const created = await api.createVisit(visit);
    await refreshAllData();
    return created;
  };

  const handleDeleteVisit = async (id: string) => {
    await api.deleteVisit(id);
    await refreshAllData();
  };

  // Handlers for Settings & Areas
  const handleSaveSettings = async (newSettings: Partial<Settings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  };

  const handleCreateArea = async (area: Omit<CoverageArea, 'id' | 'created_at'>) => {
    await api.createCoverageArea(area);
    await refreshAllData();
  };

  const handleDeleteArea = async (id: string) => {
    await api.deleteCoverageArea(id);
    await refreshAllData();
  };

  // Handlers for Employees
  const handleCreateEmployee = async (emp: Omit<Employee, 'id' | 'created_at'>) => {
    const created = await api.createEmployee(emp);
    await refreshAllData();
    return created;
  };

  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>) => {
    const updated = await api.updateEmployee(id, updates);
    await refreshAllData();
    return updated;
  };

  const handleDeleteEmployee = async (id: string) => {
    await api.deleteEmployee(id);
    await refreshAllData();
  };

  const handleResetEmployeePassword = async (id: string, newPass: string) => {
    await api.resetEmployeePassword(id, newPass);
    await refreshAllData();
  };

  const handleSavePermissions = async (empId: string, permissions: Omit<EmployeePermission, 'id' | 'employee_id'>[]) => {
    await api.saveEmployeePermissions(empId, permissions);
  };

  const handleMarkAttendance = async (att: Omit<Attendance, 'id' | 'created_at'>) => {
    await api.markAttendance(att);
    const newAtt = await api.getAttendance();
    setAttendance(newAtt);
  };

  // Handlers for Customers & Vehicles
  const handleCreateCustomer = async (cust: Omit<Customer, 'id' | 'created_at'>) => {
    const created = await api.createCustomer(cust);
    await refreshAllData();
    return created;
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    await api.updateCustomer(id, updates);
    await refreshAllData();
  };

  const handleDeleteCustomer = async (id: string) => {
    await api.deleteCustomer(id);
    await refreshAllData();
  };

  const handleResetPassword = async (id: string, newPass: string) => {
    await api.resetCustomerPassword(id, newPass);
  };

  const handleCreateVehicle = async (veh: Omit<Vehicle, 'id' | 'created_at'>) => {
    const created = await api.createVehicle(veh);
    await refreshAllData();
    return created;
  };

  const handleUpdateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    const updated = await api.updateVehicle(id, updates);
    await refreshAllData();
    return updated;
  };

  const handleDeleteVehicle = async (id: string) => {
    await api.deleteVehicle(id);
    await refreshAllData();
  };

  // Handlers for Packages & Pricing
  const handleCreateCategory = async (cat: Omit<PackageCategory, 'id' | 'created_at'>) => {
    const created = await api.createPackageCategory(cat);
    const updatedCats = await api.getPackageCategories();
    setCategories(updatedCats);
    return created;
  };

  const handleCreatePackage = async (pkg: Omit<Package, 'id' | 'created_at'>) => {
    const created = await api.createPackage(pkg);
    const updatedPkgs = await api.getPackages();
    setPackages(updatedPkgs);
    return created;
  };

  const handleSavePricing = async (packageId: string, areaId: string, price: number) => {
    await api.savePackagePricing(packageId, areaId, price);
    const updated = await api.getPackagePricing();
    setPackagePricing(updated);
  };

  // Handlers for Finance
  const handleCreatePaymentMethod = async (name: string) => {
    const created = await api.createPaymentMethod(name);
    await refreshAllData();
    return created;
  };

  const handleUpdatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    const updated = await api.updatePaymentMethod(id, updates);
    await refreshAllData();
    return updated;
  };

  const handleDeletePaymentMethod = async (id: string) => {
    const res = await api.deletePaymentMethod(id);
    await refreshAllData();
    return res;
  };

  const handleDeleteTreasury = async (id: string) => {
    const res = await api.deleteTreasury(id);
    await refreshAllData();
    return res;
  };

  const handleDeleteTreasuryTx = async (id: string) => {
    const res = await api.deleteTreasuryTransaction(id);
    await refreshAllData();
    return res;
  };

  const handleCreateTreasuryTx = async (tx: Omit<TreasuryTransaction, 'id' | 'created_at'>) => {
    const created = await api.createTreasuryTransaction(tx);
    await refreshAllData();
    return created;
  };

  // Handlers for Expenses & Expense Categories
  const handleCreateExpense = async (exp: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await api.createExpense(exp);
    await refreshAllData();
    return created;
  };

  const handleUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = await api.updateExpense(id, updates);
    await refreshAllData();
    return updated;
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await api.deleteExpense(id);
    await refreshAllData();
    return res;
  };

  const handleCreateExpenseCategory = async (cat: Omit<ExpenseCategory, 'id' | 'created_at'>) => {
    const created = await api.createExpenseCategory(cat);
    await refreshAllData();
    return created;
  };

  const handleUpdateExpenseCategory = async (cat: ExpenseCategory) => {
    const updated = await api.updateExpenseCategory(cat);
    await refreshAllData();
    return updated;
  };

  const handleDeleteExpenseCategory = async (id: string) => {
    const res = await api.deleteExpenseCategory(id);
    await refreshAllData();
    return res;
  };

  // Handlers for Salary Payments
  const handleCreateSalaryPayment = async (payment: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await api.createSalaryPayment(payment);
    await refreshAllData();
    return created;
  };

  const handleUpdateSalaryPayment = async (id: string, updates: Partial<SalaryPayment>) => {
    const updated = await api.updateSalaryPayment(id, updates);
    await refreshAllData();
    return updated;
  };

  const handleDeleteSalaryPayment = async (id: string) => {
    const res = await api.deleteSalaryPayment(id);
    await refreshAllData();
    return res;
  };

  // Handlers for Inventory & Equipment
  const handleCreateInventoryItem = async (item: Omit<InventoryItem, 'id' | 'created_at'>) => {
    const created = await api.createInventoryItem(item);
    await refreshAllData();
    return created;
  };

  const handleCreateInventoryTx = async (tx: Omit<InventoryTransaction, 'id' | 'created_at'>) => {
    const created = await api.createInventoryTransaction(tx);
    await refreshAllData();
    return created;
  };

  const handleUpdateCategory = async (id: string, updates: Partial<PackageCategory>) => {
    await api.updatePackageCategory(id, updates);
    const updatedCats = await api.getPackageCategories();
    setCategories(updatedCats);
  };

  const handleDeleteCategory = async (id: string) => {
    await api.deletePackageCategory(id);
    const updatedCats = await api.getPackageCategories();
    setCategories(updatedCats);
  };

  const handleUpdatePackage = async (id: string, updates: Partial<Package>) => {
    await api.updatePackage(id, updates);
    const updatedPkgs = await api.getPackages();
    setPackages(updatedPkgs);
  };

  const handleUpdateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    await api.updateInventoryItem(id, updates);
    await refreshAllData();
  };

  const handleDeleteInventoryItem = async (id: string) => {
    await api.deleteInventoryItem(id);
    await refreshAllData();
  };

  const handleCreateEquipment = async (eq: Omit<Equipment, 'id' | 'created_at'>) => {
    const created = await api.createEquipment(eq);
    await refreshAllData();
    return created;
  };

  const handleUpdateEquipment = async (id: string, updates: Partial<Equipment>) => {
    await api.updateEquipment(id, updates);
    await refreshAllData();
  };

  // Handlers for Suppliers
  const handleCreateSupplier = async (sup: Omit<Supplier, 'id' | 'current_balance' | 'created_at'>) => {
    const created = await api.createSupplier(sup);
    await refreshAllData();
    return created;
  };

  const handleUpdateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const updated = await api.updateSupplier(id, updates);
    await refreshAllData();
    return updated;
  };

  const handleDeleteSupplier = async (id: string) => {
    const res = await api.deleteSupplier(id);
    await refreshAllData();
    return res;
  };

  const handleCreateSupplierTransaction = async (tx: Omit<SupplierTransaction, 'id' | 'created_at'>) => {
    const created = await api.createSupplierTransaction(tx);
    await refreshAllData();
    return created;
  };

  const handleDeleteSupplierTransaction = async (id: string) => {
    const res = await api.deleteSupplierTransaction(id);
    await refreshAllData();
    return res;
  };

  const handleCreatePurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'created_at'>) => {
    const created = await api.createPurchaseOrder(order);
    await refreshAllData();
    return created;
  };

  const handleUpdatePurchaseOrder = async (order: PurchaseOrder) => {
    const updated = await api.updatePurchaseOrder(order);
    await refreshAllData();
    return updated;
  };

  const handleDeletePurchaseOrder = async (id: string) => {
    const res = await api.deletePurchaseOrder(id);
    await refreshAllData();
    return res;
  };

  const handleConvertPurchaseOrderToInvoice = async (params: any) => {
    const res = await api.convertPurchaseOrderToInvoice(params);
    await refreshAllData();
    return res;
  };

  const handleCreatePurchaseInvoice = async (params: any) => {
    const res = await api.createPurchaseInvoice(params);
    await refreshAllData();
    return res;
  };

  const handleCreatePriceQuotationRequest = async (rfq: Omit<PriceQuotationRequest, 'id' | 'created_at'>) => {
    const created = await api.createPriceQuotationRequest(rfq);
    await refreshAllData();
    return created;
  };

  const handleUpdatePriceQuotationRequest = async (rfq: PriceQuotationRequest) => {
    const updated = await api.updatePriceQuotationRequest(rfq);
    await refreshAllData();
    return updated;
  };

  const handleDeletePriceQuotationRequest = async (id: string) => {
    const res = await api.deletePriceQuotationRequest(id);
    await refreshAllData();
    return res;
  };

  const handleCreateAdvertisement = async (ad: Omit<Advertisement, 'id' | 'created_at'>) => {
    const created = await api.createAdvertisement(ad);
    await refreshAllData();
    return created;
  };

  const handleUpdateAdvertisement = async (ad: Advertisement) => {
    const updated = await api.updateAdvertisement(ad);
    await refreshAllData();
    return updated;
  };

  const handleDeleteAdvertisement = async (id: string) => {
    const res = await api.deleteAdvertisement(id);
    await refreshAllData();
    return res;
  };

  const pendingCount = subscriptions.filter((s) => s.status === 'pending').length;
  const pendingCarsCount = subscriptions.filter((s) => s.status === 'pending' && getSubCategoryType(s) === 'cars').length;
  const pendingBuildingsCount = subscriptions.filter((s) => s.status === 'pending' && getSubCategoryType(s) === 'buildings').length;
  const pendingPublicCount = subscriptions.filter((s) => s.status === 'pending' && getSubCategoryType(s) === 'public').length;
  const pendingOrdersCount = notifications.filter((n) => n.type === 'order' && !n.is_read).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-cairo">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-bold text-slate-700">جاري تحميل بيانات النظام...</p>
      </div>
    );
  }

  // 1. Not Authenticated -> Show Login / Register Screen
  if (!currentUser) {
    return (
      <>
        <LoginView
          settings={settings}
          coverageAreas={coverageAreas}
          vehicles={vehicles}
          customers={customers}
          onLoginSuccess={handleLoginSuccess}
          onCreateCustomer={handleCreateCustomer}
          onCreateVehicle={handleCreateVehicle}
        />
      </>
    );
  }

  // 2. Customer Logged In -> Dedicated Customer Portal
  if (currentUser.role === 'customer') {
    return (
      <>
        <CustomerPortalView
          currentUser={currentUser}
          settings={settings}
          customers={customers}
          vehicles={vehicles}
          subscriptions={subscriptions}
          visits={visits}
          packages={packages}
          categories={categories}
          coverageAreas={coverageAreas}
          employees={employees}
          pricing={packagePricing}
          paymentMethods={paymentMethods}
          advertisements={advertisements}
          onLogout={handleLogout}
          onCreateVehicle={handleCreateVehicle}
          onUpdateVehicle={handleUpdateVehicle}
          onDeleteVehicle={handleDeleteVehicle}
          onCreateSubscription={handleCreateSubscription}
          onCancelSubscription={async (subId: string, reason?: string) => {
            await api.cancelSubscription(subId, reason, 'العميل');
            await refreshAllData();
          }}
          onRateVisit={async (visitId, rating, comment) => {
            await api.updateVisit(visitId, { rating, rating_comment: comment });

            const cust = customers.find((c) => c.id === currentUser.customer_id || c.id === currentUser.id) || currentUser.customer_data;
            const targetVisit = visits.find((v) => v.id === visitId);
            const targetSub = subscriptions.find((s) => s.id === targetVisit?.subscription_id);
            const targetVeh = vehicles.find((v) => v.id === targetSub?.vehicle_id);

            const notifMsg = `قام العميل ${cust?.full_name || 'عميل'} بتقييم غسلة سيارته ${targetVeh ? `(${targetVeh.vehicle_type} - ${targetVeh.plate_number})` : ''} بتاريخ ${targetVisit?.scheduled_date || ''} بـ ${rating} من 5 نجوم${comment ? `.\nالتعليق: "${comment}"` : ''}`;

            await api.createNotification({
              title: `تقييم جديد (${rating} نجوم) لغسلة مكتملة`,
              message: notifMsg,
              type: 'rating',
              reference_id: visitId,
              customer_id: cust?.id,
              rating: rating,
              rating_comment: comment,
              is_read: false
            });

            await refreshAllData();
          }}
        />
      </>
    );
  }

  // 3. Worker Logged In -> Dedicated Mobile Application for Worker
  if (currentUser.role === 'worker') {
    return (
      <>
        <WorkerAppView
          currentUser={currentUser}
          settings={settings}
          visits={visits}
          customers={customers}
          vehicles={vehicles}
          subscriptions={subscriptions}
          coverageAreas={coverageAreas}
          packages={packages}
          onLogout={handleLogout}
          onRefreshData={refreshAllData}
        />
      </>
    );
  }

  // 4. Staff / Admin Logged In -> System Dashboard with Role-based Permissions
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-cairo selection:bg-teal-500 selection:text-white" dir="rtl">
      {/* 1. Fixed Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        pendingCarsCount={pendingCarsCount}
        pendingBuildingsCount={pendingBuildingsCount}
        pendingPublicCount={pendingPublicCount}
        pendingOrdersCount={pendingOrdersCount}
        settings={settings}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Workspace (Padded right by 72 to accommodate fixed sidebar) */}
      <div className="flex-1 mr-72 min-h-screen flex flex-col bg-[#f8fafc]">
        {/* Sticky Header */}
        <Header
          settings={settings}
          onOpenSettings={() => setActiveTab('settings')}
          currentUser={currentUser}
          notifications={notifications}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onNavigateNotification={handleNavigateNotification}
          onLogout={handleLogout}
        />

        {/* View Content Area */}
        <main className="flex-1 p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              subscriptions={subscriptions}
              customers={customers}
              packages={packages}
              coverageAreas={coverageAreas}
              visits={visits}
              attendance={attendance}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              employees={employees}
              settings={settings}
              onApproveSubscription={handleApproveSubscription}
              onRejectSubscription={handleRejectSubscription}
              onRenewSubscription={handleRenewSubscription}
              onNavigate={(tab) => setActiveTab(tab)}
              onPaySubscription={handlePaySubscription}
              vehicles={vehicles}
              categories={categories}
              pricing={packagePricing}
              onCreateSubscription={handleCreateSubscription}
              onCreateCustomer={handleCreateCustomer}
              onCreateVehicle={handleCreateVehicle}
              onUpdateCustomer={handleUpdateCustomer}
              onRefreshData={refreshAllData}
            />
          )}

          {(activeTab === 'subscriptions' || activeTab === 'subscriptions_cars') && (
            <SubscriptionsView
              subscriptionType="cars"
              subscriptions={subscriptions}
              customers={customers}
              vehicles={vehicles}
              packages={packages}
              categories={categories}
              coverageAreas={coverageAreas}
              pricing={packagePricing}
              employees={employees}
              settings={settings}
              visits={visits}
              autoOpenCreateModal={openCreateSubModal}
              onResetAutoOpen={() => setOpenCreateSubModal(false)}
              onCreateSubscription={handleCreateSubscription}
              onUpdateSubscription={handleUpdateSubscription}
              onUpdateVisit={handleUpdateVisit}
              onCreateVisit={handleCreateVisit}
              onDeleteVisit={handleDeleteVisit}
              onCreateCustomer={handleCreateCustomer}
              onCreateVehicle={handleCreateVehicle}
              onApproveSubscription={handleApproveSubscription}
              onRejectSubscription={handleRejectSubscription}
              onRestoreSubscription={handleRestoreSubscription}
              onRenewSubscription={handleRenewSubscription}
              onArchiveCheck={handleCheckArchival}
              onPauseSubscription={handlePauseSubscription}
              onResumeSubscription={handleResumeSubscription}
              onDeleteSubscription={handleDeleteSubscription}
              paymentMethods={paymentMethods}
              onPaySubscription={handlePaySubscription}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'subscriptions_buildings' && (
            <SubscriptionsView
              subscriptionType="buildings"
              subscriptions={subscriptions}
              customers={customers}
              vehicles={vehicles}
              packages={packages}
              categories={categories}
              coverageAreas={coverageAreas}
              pricing={packagePricing}
              employees={employees}
              settings={settings}
              visits={visits}
              autoOpenCreateModal={openCreateSubModal}
              onResetAutoOpen={() => setOpenCreateSubModal(false)}
              onCreateSubscription={handleCreateSubscription}
              onUpdateSubscription={handleUpdateSubscription}
              onUpdateVisit={handleUpdateVisit}
              onCreateVisit={handleCreateVisit}
              onDeleteVisit={handleDeleteVisit}
              onCreateCustomer={handleCreateCustomer}
              onCreateVehicle={handleCreateVehicle}
              onApproveSubscription={handleApproveSubscription}
              onRejectSubscription={handleRejectSubscription}
              onRestoreSubscription={handleRestoreSubscription}
              onRenewSubscription={handleRenewSubscription}
              onArchiveCheck={handleCheckArchival}
              onPauseSubscription={handlePauseSubscription}
              onResumeSubscription={handleResumeSubscription}
              onDeleteSubscription={handleDeleteSubscription}
              paymentMethods={paymentMethods}
              onPaySubscription={handlePaySubscription}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'subscriptions_public' && (
            <SubscriptionsView
              subscriptionType="public"
              subscriptions={subscriptions}
              customers={customers}
              vehicles={vehicles}
              packages={packages}
              categories={categories}
              coverageAreas={coverageAreas}
              pricing={packagePricing}
              employees={employees}
              settings={settings}
              visits={visits}
              autoOpenCreateModal={openCreateSubModal}
              onResetAutoOpen={() => setOpenCreateSubModal(false)}
              onCreateSubscription={handleCreateSubscription}
              onUpdateSubscription={handleUpdateSubscription}
              onUpdateVisit={handleUpdateVisit}
              onCreateVisit={handleCreateVisit}
              onDeleteVisit={handleDeleteVisit}
              onCreateCustomer={handleCreateCustomer}
              onCreateVehicle={handleCreateVehicle}
              onApproveSubscription={handleApproveSubscription}
              onRejectSubscription={handleRejectSubscription}
              onRestoreSubscription={handleRestoreSubscription}
              onRenewSubscription={handleRenewSubscription}
              onArchiveCheck={handleCheckArchival}
              onPauseSubscription={handlePauseSubscription}
              onResumeSubscription={handleResumeSubscription}
              onDeleteSubscription={handleDeleteSubscription}
              paymentMethods={paymentMethods}
              onPaySubscription={handlePaySubscription}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              visits={visits}
              customers={customers}
              subscriptions={subscriptions}
              employees={employees}
              coverageAreas={coverageAreas}
              packages={packages}
              vehicles={vehicles}
              settings={settings}
              onRescheduleVisit={handleRescheduleVisit}
              onUpdateVisitStatus={handleUpdateVisitStatus}
            />
          )}

          {activeTab === 'visits' && (
            <VisitsView
              visits={visits}
              subscriptions={subscriptions}
              customers={customers}
              vehicles={vehicles}
              packages={packages}
              categories={categories}
              employees={employees}
              coverageAreas={coverageAreas}
              settings={settings}
              onUpdateVisit={handleUpdateVisit}
              onDeleteVisit={handleDeleteVisit}
              onRescheduleVisit={handleRescheduleVisit}
              onUpdateVisitStatus={handleUpdateVisitStatus}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              vehicles={vehicles}
              coverageAreas={coverageAreas}
              onCreateCustomer={handleCreateCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onResetPassword={handleResetPassword}
              onCreateVehicle={handleCreateVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'packages' && (
            <PackagesView
              packages={packages}
              categories={categories}
              coverageAreas={coverageAreas}
              pricing={packagePricing}
              settings={settings}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onCreatePackage={handleCreatePackage}
              onUpdatePackage={handleUpdatePackage}
              onSavePricing={handleSavePricing}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceView
              currentUser={currentUser}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              transactions={treasuryTransactions}
              settings={settings}
              onCreatePaymentMethod={handleCreatePaymentMethod}
              onUpdatePaymentMethod={handleUpdatePaymentMethod}
              onDeletePaymentMethod={handleDeletePaymentMethod}
              onDeleteTreasury={handleDeleteTreasury}
              onCreateTransaction={handleCreateTreasuryTx}
              onDeleteTransaction={handleDeleteTreasuryTx}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              categories={expenseCategories}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              settings={settings}
              onCreateExpense={handleCreateExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateCategory={handleCreateExpenseCategory}
              onUpdateCategory={handleUpdateExpenseCategory}
              onDeleteCategory={handleDeleteExpenseCategory}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              items={inventoryItems}
              transactions={inventoryTransactions}
              equipment={equipment}
              employees={employees}
              suppliers={suppliers}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              settings={settings}
              onCreateItem={handleCreateInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
              onCreateTransaction={handleCreateInventoryTx}
              onCreateEquipment={handleCreateEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onCreatePurchaseInvoice={handleCreatePurchaseInvoice}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              rfqs={priceQuotationRequests}
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              inventoryItems={inventoryItems}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              settings={settings}
              onCreateRfq={handleCreatePriceQuotationRequest}
              onUpdateRfq={handleUpdatePriceQuotationRequest}
              onDeleteRfq={handleDeletePriceQuotationRequest}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              onDeletePurchaseOrder={handleDeletePurchaseOrder}
              onConvertPurchaseOrderToInvoice={handleConvertPurchaseOrderToInvoice}
              onCreatePurchaseInvoice={handleCreatePurchaseInvoice}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              transactions={supplierTransactions}
              purchaseOrders={purchaseOrders}
              inventoryItems={inventoryItems}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              settings={settings}
              onCreateSupplier={handleCreateSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onCreateTransaction={handleCreateSupplierTransaction}
              onDeleteTransaction={handleDeleteSupplierTransaction}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              onDeletePurchaseOrder={handleDeletePurchaseOrder}
              onConvertPurchaseOrderToInvoice={handleConvertPurchaseOrderToInvoice}
              onCreatePurchaseInvoice={handleCreatePurchaseInvoice}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              attendance={attendance}
              visits={visits}
              customers={customers}
              subscriptions={subscriptions}
              coverageAreas={coverageAreas}
              vehicles={vehicles}
              settings={settings}
              salaryPayments={salaryPayments}
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              onCreateEmployee={handleCreateEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onMarkAttendance={handleMarkAttendance}
              onNavigateToPermissions={() => setActiveTab('permissions')}
              onCreateSalaryPayment={handleCreateSalaryPayment}
              onUpdateSalaryPayment={handleUpdateSalaryPayment}
              onDeleteSalaryPayment={handleDeleteSalaryPayment}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceView
              employees={employees}
              attendance={attendance}
              settings={settings}
              onMarkAttendance={handleMarkAttendance}
              onNavigateToSalaries={() => {
                setActiveTab('employees');
              }}
            />
          )}

          {activeTab === 'permissions' && (
            <PermissionsView
              employees={employees}
              customers={customers}
              coverageAreas={coverageAreas}
              vehicles={vehicles}
              subscriptions={subscriptions}
              onSavePermissions={handleSavePermissions}
              onCreateEmployee={handleCreateEmployee}
              onResetPassword={handleResetEmployeePassword}
              onResetCustomerPassword={async (id, newPass) => {
                await api.resetCustomerPassword(id, newPass);
                await refreshAllData();
              }}
              onUpdateCustomer={handleUpdateCustomer}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              subscriptions={subscriptions}
              visits={visits}
              customers={customers}
              employees={employees}
              coverageAreas={coverageAreas}
              packages={packages}
              inventoryItems={inventoryItems}
              settings={settings}
              vehicles={vehicles}
            />
          )}

          {activeTab === 'advertisements' && (
            <AdvertisementsView
              advertisements={advertisements}
              settings={settings}
              onCreateAdvertisement={handleCreateAdvertisement}
              onUpdateAdvertisement={handleUpdateAdvertisement}
              onDeleteAdvertisement={handleDeleteAdvertisement}
            />
          )}

          {activeTab === 'store' && (
            <StoreManagementView
              settings={settings}
              onUpdateSettings={async (newSettings) => {
                const updated = await api.updateSettings(newSettings);
                setSettings(updated);
                return updated;
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              coverageAreas={coverageAreas}
              onSaveSettings={handleSaveSettings}
              onCreateArea={handleCreateArea}
              onDeleteArea={handleDeleteArea}
            />
          )}
        </main>
      </div>

      {/* Comprehensive Rating & Subscription Notification Details Modal */}
      {activeRatingNotificationModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setActiveRatingNotificationModal(null)}
          dir="rtl"
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md shrink-0">
                  <Star className="w-5 h-5 fill-amber-950" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    تفاصيل تقييم العميل والاشتراك
                  </h3>
                  <p className="text-xs text-teal-200/80">
                    {activeRatingNotificationModal.notification.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRatingNotificationModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Rating Card */}
              <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-100/40 to-yellow-50 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900">تقييم العميل الممنوح:</span>
                  <div className="flex items-center gap-1.5" dir="ltr">
                    {Array.from({ length: 5 }, (_, i) => i + 1).map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= (activeRatingNotificationModal.notification.rating || 5)
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="font-mono font-black text-amber-800 text-xs">
                      {activeRatingNotificationModal.notification.rating || 5}/5
                    </span>
                  </div>
                </div>

                {/* Rating Comment */}
                {(activeRatingNotificationModal.notification.rating_comment ||
                  activeRatingNotificationModal.visit?.rating_comment) && (
                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200/70 text-xs text-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 block">
                      ملاحظة ورأي العميل:
                    </span>
                    <p className="font-medium leading-relaxed whitespace-pre-line text-slate-700">
                      "{activeRatingNotificationModal.notification.rating_comment || activeRatingNotificationModal.visit?.rating_comment}"
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Info Card */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>بيانات العميل</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">اسم العميل:</span>
                    <span className="font-bold text-slate-800">
                      {activeRatingNotificationModal.customer?.full_name || 'عميل مسجل'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">رقم الهاتف:</span>
                    <span className="font-bold text-slate-800 font-mono" dir="ltr">
                      {activeRatingNotificationModal.customer?.phone || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">المنطقة والحي:</span>
                    <span className="font-bold text-slate-800">
                      {activeRatingNotificationModal.area?.name || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">العمارة / المجموعة:</span>
                    <span className="font-bold text-slate-800">
                      عمارة {activeRatingNotificationModal.customer?.building_number || '-'} {activeRatingNotificationModal.customer?.block_number ? `(مجموعة ${activeRatingNotificationModal.customer.block_number})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscription & Vehicle Card */}
              {activeRatingNotificationModal.subscription && (
                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-black text-teal-900 flex items-center gap-1.5 border-b border-teal-200/60 pb-2">
                    <PackageIcon className="w-3.5 h-3.5 text-teal-700" />
                    <span>تفاصيل الاشتراك والباقة</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">الباقة:</span>
                      <span className="font-bold text-teal-900">
                        {activeRatingNotificationModal.packageItem?.name || 'باقة الغسيل'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">حالة الاشتراك:</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeRatingNotificationModal.subscription.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {activeRatingNotificationModal.subscription.status === 'active' ? 'نشط' : activeRatingNotificationModal.subscription.status}
                      </span>
                    </div>
                    {activeRatingNotificationModal.vehicle && (
                      <>
                        <div>
                          <span className="text-[10px] text-slate-400 block">نوع السيارة:</span>
                          <span className="font-bold text-slate-800">
                            {activeRatingNotificationModal.vehicle.vehicle_type} ({activeRatingNotificationModal.vehicle.color || ''})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">رقم اللوحة:</span>
                          <span className="font-bold text-teal-800 font-mono">
                            {activeRatingNotificationModal.vehicle.plate_number}
                          </span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 block">مدة الاشتراك:</span>
                      <span className="font-medium text-slate-700 text-[11px]">
                        من {activeRatingNotificationModal.subscription.start_date} إلى {activeRatingNotificationModal.subscription.end_date}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Visit Details */}
              {activeRatingNotificationModal.visit && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">تاريخ الزيارة المقيمة:</span>
                    <span className="font-bold text-slate-800">
                      {activeRatingNotificationModal.visit.scheduled_date}
                      {activeRatingNotificationModal.visit.day_of_week ? ` (${activeRatingNotificationModal.visit.day_of_week})` : ''}
                    </span>
                  </div>
                  {activeRatingNotificationModal.worker && (
                    <div>
                      <span className="text-[10px] text-slate-400 block">الفني المنفذ:</span>
                      <span className="font-bold text-teal-800">
                        {activeRatingNotificationModal.worker.full_name}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveRatingNotificationModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
              {activeRatingNotificationModal.customer && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('customers');
                    setActiveRatingNotificationModal(null);
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>ملف العميل</span>
                </button>
              )}
              {activeRatingNotificationModal.subscription && (
                <button
                  type="button"
                  onClick={() => {
                    const subType = getSubCategoryType(activeRatingNotificationModal.subscription!);
                    if (subType === 'buildings') {
                      setActiveTab('subscriptions_buildings');
                    } else if (subType === 'public') {
                      setActiveTab('subscriptions_public');
                    } else {
                      setActiveTab('subscriptions_cars');
                    }
                    setActiveRatingNotificationModal(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <PackageIcon className="w-3.5 h-3.5" />
                  <span>اشتراك العميل</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
