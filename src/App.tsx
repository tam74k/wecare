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
  Advertisement,
  SystemNotification
} from './types/database';
import * as api from './services/api';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { EmployeesView } from './components/EmployeesView';
import { PermissionsView } from './components/PermissionsView';
import { CustomersView } from './components/CustomersView';
import { PackagesView } from './components/PackagesView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { CalendarView } from './components/CalendarView';
import { FinanceView } from './components/FinanceView';
import { InventoryView } from './components/InventoryView';
import { SuppliersView } from './components/SuppliersView';
import { ReportsView } from './components/ReportsView';
import { AdvertisementsView } from './components/AdvertisementsView';
import { StoreManagementView } from './components/StoreManagementView';
import { LoginView } from './components/LoginView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { WorkerAppView } from './components/WorkerAppView';
import { InstallPromptModal } from './components/InstallPromptModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
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
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
  };

  // System States (Directly fetched, ZERO localStorage / sessionStorage)
  const [settings, setSettings] = useState<Settings>({
    id: '',
    company_name: '',
    logo_url: '',
    country: '',
    currency_symbol: '',
    currency_code: '',
    dial_code: ''
  });
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packagePricing, setPackagePricing] = useState<PackagePricing[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Fetch all live data on mount
  const refreshAllData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [
        sData,
        aData,
        eData,
        attData,
        cData,
        vData,
        catData,
        pkgData,
        prcData,
        subData,
        visData,
        tData,
        pmData,
        ttData,
        iData,
        itData,
        eqData,
        supData,
        supTxData,
        poData,
        adData,
        notifData
      ] = await Promise.all([
        api.getSettings(),
        api.getCoverageAreas(),
        api.getEmployees(),
        api.getAttendance(todayStr),
        api.getCustomers(),
        api.getVehicles(),
        api.getPackageCategories(),
        api.getPackages(),
        api.getPackagePricing(),
        api.getSubscriptions(),
        api.getVisits(),
        api.getTreasuries(),
        api.getPaymentMethods(),
        api.getTreasuryTransactions(),
        api.getInventoryItems(),
        api.getInventoryTransactions(),
        api.getEquipment(),
        api.getSuppliers(),
        api.getSupplierTransactions(),
        api.getPurchaseOrders(),
        api.getAdvertisements(),
        api.getNotifications()
      ]);

      setSettings(sData);
      setCoverageAreas(aData);
      setEmployees(eData);
      setAttendance(attData);
      setCustomers(cData);
      setVehicles(vData);
      setCategories(catData);
      setPackages(pkgData);
      setPackagePricing(prcData);
      setSubscriptions(subData);
      setVisits(visData);
      setTreasuries(tData);
      setPaymentMethods(pmData);
      setTreasuryTransactions(ttData);
      setInventoryItems(iData);
      setInventoryTransactions(itData);
      setEquipment(eqData);
      setSuppliers(supData);
      setSupplierTransactions(supTxData);
      setPurchaseOrders(poData);
      setAdvertisements(adData);
      setNotifications(notifData);
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

  // Handlers for Subscriptions
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
    setActiveTab('subscriptions');
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
    const todayStr = new Date().toISOString().split('T')[0];
    const newAtt = await api.getAttendance(todayStr);
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

  const handleCreateTreasuryTx = async (tx: Omit<TreasuryTransaction, 'id' | 'created_at'>) => {
    const created = await api.createTreasuryTransaction(tx);
    await refreshAllData();
    return created;
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

  const handleUpdatePackage = async (id: string, updates: Partial<Package>) => {
    await api.updatePackage(id, updates);
    const updatedPkgs = await api.getPackages();
    setPackages(updatedPkgs);
  };

  const handleUpdateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    await api.updateInventoryItem(id, updates);
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
          onLoginSuccess={handleLoginSuccess}
          onCreateCustomer={handleCreateCustomer}
          onCreateVehicle={handleCreateVehicle}
        />
        <InstallPromptModal />
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
          onCreateSubscription={async (s) => {
            const created = await api.createSubscription(s);
            await refreshAllData();
            return created;
          }}
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
        <InstallPromptModal />
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
        <InstallPromptModal />
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
              onCreateSubscription={async (s) => {
                const created = await api.createSubscription(s);
                await refreshAllData();
                return created;
              }}
              onCreateCustomer={handleCreateCustomer}
              onCreateVehicle={handleCreateVehicle}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsView
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
              onCreateSubscription={async (s) => {
                const created = await api.createSubscription(s);
                await refreshAllData();
                return created;
              }}
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
              onRescheduleVisit={handleRescheduleVisit}
              onUpdateVisitStatus={handleUpdateVisitStatus}
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
              onCreatePackage={handleCreatePackage}
              onUpdatePackage={handleUpdatePackage}
              onSavePricing={handleSavePricing}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceView
              treasuries={treasuries}
              paymentMethods={paymentMethods}
              transactions={treasuryTransactions}
              settings={settings}
              onCreatePaymentMethod={handleCreatePaymentMethod}
              onCreateTransaction={handleCreateTreasuryTx}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              items={inventoryItems}
              transactions={inventoryTransactions}
              equipment={equipment}
              employees={employees}
              settings={settings}
              onCreateItem={handleCreateInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onCreateTransaction={handleCreateInventoryTx}
              onCreateEquipment={handleCreateEquipment}
              onUpdateEquipment={handleUpdateEquipment}
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
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              attendance={attendance}
              onCreateEmployee={handleCreateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onMarkAttendance={handleMarkAttendance}
              onNavigateToPermissions={() => setActiveTab('permissions')}
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

      {/* PWA Install Prompt Modal */}
      <InstallPromptModal />
    </div>
  );
};
