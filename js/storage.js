const DB_KEYS = {
  CUSTOMERS: "gasShop_customers",
  ORDERS: "gasShop_orders",
  LEDGER: "gasShop_ledger",
  INVENTORY: "gasShop_inventory",
  SETTINGS: "gasShop_settings",
  PENDING_RETURNS: "gasShop_pendingReturns",
  CURRENT_CART: "gasShop_currentCart",
  COUNTERS: "gasShop_counters",
  STOCK_MOVEMENTS: "gasShop_stockMovements",
  USERS: "gasShop_users",
  SESSION: "gasShop_session",
  AUDIT_LOG: "gasShop_auditLog",
  CASHBOOK: "gasShop_cashbook",
  EXPENSES: "gasShop_expenses",
  SUPPLIERS: "gasShop_suppliers",
  PURCHASES: "gasShop_purchases",
  SUPPLIER_LEDGER: "gasShop_supplierLedger",
  COSTS: "gasShop_costs",
  CURRENT_PURCHASE_CART: "gasShop_currentPurchaseCart"
};

const DefaultData = {
  settings: {
    shopName: "Al Madina Gas Shop",
    ownerName: "",
    phone: "",
    address: "",
    invoicePrefix: "INV-",
    customerPrefix: "CUST-",
    reminderDays: 15,
    currency: "PKR",
    theme: "light",
    language: "en"
  },

  inventory: {
    size15: { filled: 20, empty: 8, outPending: 0, soldPermanent: 0, damaged: 0 },
    size35: { filled: 12, empty: 5, outPending: 0, soldPermanent: 0, damaged: 0 },
    size45: { filled: 7, empty: 3, outPending: 0, soldPermanent: 0, damaged: 0 }
  },

  counters: {
    customer: 1,
    invoice: 1001,
    receipt: 1,
    purchase: 1,
    supplier: 1
  },

  users: [
    {
      id: "user_owner",
      username: "owner",
      password: "1234",
      role: "owner",
      name: "Owner",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "user_cashier",
      username: "cashier",
      password: "1234",
      role: "cashier",
      name: "Cashier",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "user_staff",
      username: "staff",
      password: "1234",
      role: "staff",
      name: "Staff",
      active: true,
      createdAt: new Date().toISOString()
    }
  ],

  costs: {
    filled15: 0,
    filled35: 0,
    filled45: 0,
    empty15: 0,
    empty35: 0,
    empty45: 0
  }
};

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Storage get error:", error);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage set error:", error);
    }
  },

  init() {
    if (!this.get(DB_KEYS.SETTINGS)) {
      this.set(DB_KEYS.SETTINGS, DefaultData.settings);
    }

    if (!this.get(DB_KEYS.INVENTORY)) {
      this.set(DB_KEYS.INVENTORY, DefaultData.inventory);
    }

    if (!this.get(DB_KEYS.COUNTERS)) {
      this.set(DB_KEYS.COUNTERS, DefaultData.counters);
    }

    if (!this.get(DB_KEYS.CUSTOMERS)) {
      this.set(DB_KEYS.CUSTOMERS, []);
    }

    if (!this.get(DB_KEYS.ORDERS)) {
      this.set(DB_KEYS.ORDERS, []);
    }

    if (!this.get(DB_KEYS.LEDGER)) {
      this.set(DB_KEYS.LEDGER, []);
    }

    if (!this.get(DB_KEYS.PENDING_RETURNS)) {
      this.set(DB_KEYS.PENDING_RETURNS, []);
    }

    if (!this.get(DB_KEYS.CURRENT_CART)) {
      this.set(DB_KEYS.CURRENT_CART, []);
    }

    if (!this.get(DB_KEYS.STOCK_MOVEMENTS)) {
      this.set(DB_KEYS.STOCK_MOVEMENTS, []);
    }

    if (!this.get(DB_KEYS.USERS)) {
      this.set(DB_KEYS.USERS, DefaultData.users);
    }

    if (!this.get(DB_KEYS.AUDIT_LOG)) {
      this.set(DB_KEYS.AUDIT_LOG, []);
    }

    if (!this.get(DB_KEYS.SESSION)) {
      this.set(DB_KEYS.SESSION, null);
    }

    if (!this.get(DB_KEYS.CASHBOOK)) {
      this.set(DB_KEYS.CASHBOOK, []);
    }

    if (!this.get(DB_KEYS.EXPENSES)) {
      this.set(DB_KEYS.EXPENSES, []);
    }

    if (!this.get(DB_KEYS.SUPPLIERS)) {
      this.set(DB_KEYS.SUPPLIERS, []);
    }

    if (!this.get(DB_KEYS.PURCHASES)) {
      this.set(DB_KEYS.PURCHASES, []);
    }

    if (!this.get(DB_KEYS.SUPPLIER_LEDGER)) {
      this.set(DB_KEYS.SUPPLIER_LEDGER, []);
    }

    if (!this.get(DB_KEYS.COSTS)) {
      this.set(DB_KEYS.COSTS, DefaultData.costs);
    }

    if (!this.get(DB_KEYS.CURRENT_PURCHASE_CART)) {
      this.set(DB_KEYS.CURRENT_PURCHASE_CART, []);
    }
  },

  resetAll() {
    Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));
    this.init();
  },

  getCustomers() {
    return this.get(DB_KEYS.CUSTOMERS, []);
  },

  saveCustomers(customers) {
    this.set(DB_KEYS.CUSTOMERS, customers);
  },

  getOrders() {
    return this.get(DB_KEYS.ORDERS, []);
  },

  saveOrders(orders) {
    this.set(DB_KEYS.ORDERS, orders);
  },

  getLedger() {
    return this.get(DB_KEYS.LEDGER, []);
  },

  saveLedger(entries) {
    this.set(DB_KEYS.LEDGER, entries);
  },

  getInventory() {
    return this.get(DB_KEYS.INVENTORY, DefaultData.inventory);
  },

  saveInventory(inventory) {
    this.set(DB_KEYS.INVENTORY, inventory);
  },

  getSettings() {
    return this.get(DB_KEYS.SETTINGS, DefaultData.settings);
  },

  saveSettings(settings) {
    this.set(DB_KEYS.SETTINGS, settings);
  },

  getPendingReturns() {
    return this.get(DB_KEYS.PENDING_RETURNS, []);
  },

  savePendingReturns(list) {
    this.set(DB_KEYS.PENDING_RETURNS, list);
  },

  getCart() {
    return this.get(DB_KEYS.CURRENT_CART, []);
  },

  saveCart(cart) {
    this.set(DB_KEYS.CURRENT_CART, cart);
  },

  getCounters() {
    return this.get(DB_KEYS.COUNTERS, DefaultData.counters);
  },

  saveCounters(counters) {
    this.set(DB_KEYS.COUNTERS, counters);
  },

  getStockMovements() {
    return this.get(DB_KEYS.STOCK_MOVEMENTS, []);
  },

  saveStockMovements(movements) {
    this.set(DB_KEYS.STOCK_MOVEMENTS, movements);
  },

  getUsers() {
    return this.get(DB_KEYS.USERS, []);
  },

  saveUsers(users) {
    this.set(DB_KEYS.USERS, users);
  },

  getSession() {
    return this.get(DB_KEYS.SESSION, null);
  },

  saveSession(session) {
    this.set(DB_KEYS.SESSION, session);
  },

  clearSession() {
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  getAuditLog() {
    return this.get(DB_KEYS.AUDIT_LOG, []);
  },

  saveAuditLog(logs) {
    this.set(DB_KEYS.AUDIT_LOG, logs);
  },

  getCashbook() {
    return this.get(DB_KEYS.CASHBOOK, []);
  },

  saveCashbook(entries) {
    this.set(DB_KEYS.CASHBOOK, entries);
  },

  getExpenses() {
    return this.get(DB_KEYS.EXPENSES, []);
  },

  saveExpenses(expenses) {
    this.set(DB_KEYS.EXPENSES, expenses);
  },

  getSuppliers() {
    return this.get(DB_KEYS.SUPPLIERS, []);
  },

  saveSuppliers(suppliers) {
    this.set(DB_KEYS.SUPPLIERS, suppliers);
  },

  getPurchases() {
    return this.get(DB_KEYS.PURCHASES, []);
  },

  savePurchases(purchases) {
    this.set(DB_KEYS.PURCHASES, purchases);
  },

  getSupplierLedger() {
    return this.get(DB_KEYS.SUPPLIER_LEDGER, []);
  },

  saveSupplierLedger(entries) {
    this.set(DB_KEYS.SUPPLIER_LEDGER, entries);
  },

  getCosts() {
    return this.get(DB_KEYS.COSTS, DefaultData.costs);
  },

  saveCosts(costs) {
    this.set(DB_KEYS.COSTS, costs);
  },

  getPurchaseCart() {
    return this.get(DB_KEYS.CURRENT_PURCHASE_CART, []);
  },

  savePurchaseCart(cart) {
    this.set(DB_KEYS.CURRENT_PURCHASE_CART, cart);
  },

  nextCustomerCode() {
    const counters = this.getCounters();
    const settings = this.getSettings();
    const code = `${settings.customerPrefix}${String(counters.customer).padStart(4, "0")}`;
    counters.customer += 1;
    this.saveCounters(counters);
    return code;
  },

  nextInvoiceNo() {
    const counters = this.getCounters();
    const settings = this.getSettings();
    const billNo = `${settings.invoicePrefix}${counters.invoice}`;
    counters.invoice += 1;
    this.saveCounters(counters);
    return billNo;
  },

  nextSupplierCode() {
    const counters = this.getCounters();
    const code = `SUP-${String(counters.supplier).padStart(4, "0")}`;
    counters.supplier += 1;
    this.saveCounters(counters);
    return code;
  },

  nextPurchaseNo() {
    const counters = this.getCounters();
    const code = `PUR-${String(counters.purchase).padStart(4, "0")}`;
    counters.purchase += 1;
    this.saveCounters(counters);
    return code;
  }
};