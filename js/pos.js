const POS = {
  /* ---------------- AUTH / USERS / AUDIT ---------------- */

  login(username, password) {
    const users = Storage.getUsers();
    const user = users.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      throw new Error("Invalid username or password");
    }

    if (user.active === false) {
      throw new Error("User account is inactive");
    }

    Storage.saveSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      loginAt: new Date().toISOString()
    });

    this.addAuditLog("login", `User logged in: ${user.username}`);
    return user;
  },

  logout() {
    const session = Storage.getSession();
    if (session) {
      this.addAuditLog("logout", `User logged out: ${session.username}`);
    }
    Storage.clearSession();
  },

  getCurrentUser() {
    return Storage.getSession();
  },

  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const rolePermissions = {
      owner: [
        "sale",
        "payment",
        "print",
        "delete_bill",
        "edit_bill",
        "edit_rates",
        "reset_data",
        "backup_import",
        "backup_export",
        "shop_settings",
        "stock_adjust",
        "view_audit",
        "cashbook",
        "expense",
        "user_manage",
        "password_reset",
        "notification_view"
      ],
      cashier: [
        "sale",
        "payment",
        "print",
        "edit_bill",
        "backup_export",
        "cashbook",
        "expense",
        "notification_view"
      ],
      staff: [
        "sale",
        "print",
        "notification_view"
      ]
    };

    return (rolePermissions[user.role] || []).includes(permission);
  },

  requirePermission(permission, message = "Permission denied") {
    if (!this.hasPermission(permission)) {
      throw new Error(message);
    }
  },

  addAuditLog(action, detail) {
    const logs = Storage.getAuditLog();
    const user = this.getCurrentUser();

    logs.push({
      id: Utils.uid("audit"),
      date: Utils.formatDate(),
      time: Utils.formatTime(),
      action,
      detail,
      user: user?.username || "system",
      role: user?.role || "system"
    });

    Storage.saveAuditLog(logs);
  },

  getAuditLogs() {
    return Storage.getAuditLog().slice().reverse();
  },

  createUser({ username, password, role, name }) {
    const users = Storage.getUsers();

    if (users.some(u => u.username === username)) {
      throw new Error("Username already exists");
    }

    const user = {
      id: Utils.uid("user"),
      username,
      password,
      role,
      name: name || username,
      active: true,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    Storage.saveUsers(users);
    this.addAuditLog("user_create", `Created user ${username} (${role})`);

    return user;
  },

  updateUserPassword({ userId, currentPassword, newPassword }) {
    const users = Storage.getUsers();
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) throw new Error("User not found");

    if (users[index].password !== currentPassword) {
      throw new Error("Current password is incorrect");
    }

    users[index].password = newPassword;
    Storage.saveUsers(users);
    this.addAuditLog("password_change", `Changed password for ${users[index].username}`);

    return true;
  },

  adminResetUserPassword({ userId, newPassword }) {
    const users = Storage.getUsers();
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) throw new Error("User not found");

    users[index].password = newPassword;
    Storage.saveUsers(users);
    this.addAuditLog("password_reset", `Admin reset password for ${users[index].username}`);

    return true;
  },

  toggleUserActive(userId) {
    const users = Storage.getUsers();
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) throw new Error("User not found");

    users[index].active = users[index].active === false ? true : false;
    Storage.saveUsers(users);
    this.addAuditLog("user_toggle", `Toggled user ${users[index].username} active=${users[index].active}`);

    return users[index];
  },

  /* ---------------- CUSTOMERS ---------------- */

  createCustomer(data) {
    const customers = Storage.getCustomers();

    const customer = {
      id: Utils.uid("cust"),
      code: Storage.nextCustomerCode(),
      name: data.name || "Unnamed Customer",
      phone: data.phone || "",
      whatsapp: data.whatsapp || data.phone || "",
      area: data.area || "",
      address: data.address || "",
      idCard: data.idCard || "",
      notes: data.notes || "",
      customRates: data.customRates || null,
      createdAt: new Date().toISOString()
    };

    customers.push(customer);
    Storage.saveCustomers(customers);
    return customer;
  },

  updateCustomerBasicInfo(customerId, data) {
    const customers = Storage.getCustomers();
    const index = customers.findIndex(c => c.id === customerId);

    if (index === -1) throw new Error("Customer not found");

    customers[index] = {
      ...customers[index],
      name: data.name ?? customers[index].name,
      phone: data.phone ?? customers[index].phone,
      whatsapp: data.whatsapp ?? customers[index].whatsapp,
      area: data.area ?? customers[index].area,
      address: data.address ?? customers[index].address,
      idCard: data.idCard ?? customers[index].idCard,
      notes: data.notes ?? customers[index].notes
    };

    Storage.saveCustomers(customers);
    return customers[index];
  },

  getCustomerById(customerId) {
    const customers = Storage.getCustomers();
    return customers.find(c => c.id === customerId) || null;
  },

  searchCustomers(query = "") {
    const customers = Storage.getCustomers();
    const q = query.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.idCard || "").toLowerCase().includes(q) ||
      (c.area || "").toLowerCase().includes(q)
    );
  },

  getFilteredCustomers({ dueOnly = false, pendingOnly = false, overdueOnly = false } = {}) {
    let customers = Storage.getCustomers();

    return customers.filter(customer => {
      const due = this.getCustomerBalance(customer.id);
      const pending = this.getCustomerPendingSummary(customer.id);
      const overdue = this.getCustomerOverdueInfo(customer.id);

      const totalPending = pending.pending15 + pending.pending35 + pending.pending45;

      if (dueOnly && due <= 0) return false;
      if (pendingOnly && totalPending <= 0) return false;
      if (overdueOnly && !overdue.hasOverdue) return false;

      return true;
    });
  },

  /* ---------------- CUSTOMER RATES ---------------- */

  getDefaultRates() {
    return {
      refill15: 3200,
      refill35: 7000,
      refill45: 9000,
      empty15: 4000,
      empty35: 9000,
      empty45: 12000,
      kgRate: 260
    };
  },

  getCustomerRates(customerId = null) {
    const defaults = this.getDefaultRates();

    if (!customerId) return defaults;

    const customer = this.getCustomerById(customerId);
    if (!customer || !customer.customRates) return defaults;

    return {
      ...defaults,
      ...customer.customRates
    };
  },

  getRateForCustomer({ customerId = null, size = null, type = "refill" }) {
    const rates = this.getCustomerRates(customerId);

    if (type === "refill") return rates[`refill${size}`] || 0;
    if (type === "empty") return rates[`empty${size}`] || 0;
    if (type === "kg") return rates.kgRate || 0;

    return 0;
  },

  updateCustomerRates(customerId, ratesData) {
    const customers = Storage.getCustomers();
    const index = customers.findIndex(c => c.id === customerId);

    if (index === -1) throw new Error("Customer not found");

    customers[index].customRates = {
      ...customers[index].customRates,
      ...ratesData
    };

    Storage.saveCustomers(customers);
    return customers[index];
  },

  /* ---------------- POS CART ---------------- */

  addItemToCart(item) {
    const cart = Storage.getCart();

    cart.push({
      id: Utils.uid("item"),
      itemType: item.itemType,
      itemName: item.itemName,
      size: item.size || null,
      qty: Utils.toNumber(item.qty, 1),
      kg: Utils.toNumber(item.kg, 0),
      rate: Utils.toNumber(item.rate, 0),
      total: Utils.toNumber(item.total, 0),
      emptyStatus: item.emptyStatus || "none",
      dueDays: Utils.toNumber(item.dueDays, 0),
      dueDate: item.dueDate || null,
      note: item.note || ""
    });

    Storage.saveCart(cart);
    return cart;
  },

  updateCartItem(itemId, updates) {
    const cart = Storage.getCart();
    const index = cart.findIndex(item => item.id === itemId);

    if (index === -1) throw new Error("Cart item not found");

    cart[index] = {
      ...cart[index],
      ...updates
    };

    cart[index].qty = Utils.toNumber(cart[index].qty, 1);
    cart[index].rate = Utils.toNumber(cart[index].rate, 0);

    if (cart[index].kg) {
      cart[index].total = Utils.toNumber(cart[index].kg, 0) * cart[index].rate;
    } else {
      cart[index].total = cart[index].qty * cart[index].rate;
    }

    Storage.saveCart(cart);
    return cart[index];
  },

  removeItemFromCart(itemId) {
    let cart = Storage.getCart();
    cart = cart.filter(item => item.id !== itemId);
    Storage.saveCart(cart);
    return cart;
  },

  clearCart() {
    Storage.saveCart([]);
    return [];
  },

  getCartTotals(selectedCustomer = null, paidAmount = 0, discount = 0, extraCharges = 0) {
    const cart = Storage.getCart();
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const previousDue = selectedCustomer ? this.getCustomerBalance(selectedCustomer.id) : 0;
    const grandTotal = subtotal - discount + extraCharges + previousDue;
    const balance = grandTotal - paidAmount;

    return {
      subtotal,
      discount,
      extraCharges,
      previousDue,
      grandTotal,
      paid: paidAmount,
      balance
    };
  },

  /* ---------------- LEDGER ---------------- */

  createLedgerEntry({ customerId, type, refId, refNo, debit = 0, credit = 0, note = "" }) {
    const ledger = Storage.getLedger();

    const entry = {
      id: Utils.uid("ledger"),
      customerId,
      type,
      refId,
      refNo,
      date: Utils.formatDate(),
      debit: Utils.toNumber(debit, 0),
      credit: Utils.toNumber(credit, 0),
      note
    };

    ledger.push(entry);
    Storage.saveLedger(ledger);
    return entry;
  },

  getCustomerLedger(customerId) {
    return Storage.getLedger()
      .filter(entry => entry.customerId === customerId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getCustomerBalance(customerId) {
    const ledger = Storage.getLedger();
    const customerEntries = ledger.filter(entry => entry.customerId === customerId);
    return customerEntries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
  },

  receivePayment({ customerId, amount, method = "cash", note = "" }) {
    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error("Customer not found");

    const entry = this.createLedgerEntry({
      customerId,
      type: "payment",
      refId: Utils.uid("pay"),
      refNo: `PAY-${Date.now()}`,
      debit: 0,
      credit: amount,
      note: `${method} payment. ${note}`.trim()
    });

    if (method === "cash") {
      this.addCashbookEntry({
        type: "cash_in",
        amount,
        category: "customer_payment",
        note: `Cash payment from ${customer.name}`,
        refId: entry.id,
        refNo: entry.refNo
      });
    }

    return entry;
  },

  /* ---------------- ORDERS ---------------- */

  saveOrder({ selectedCustomer = null, paidAmount = 0, paymentMethod = "cash", discount = 0, extraCharges = 0, notes = "" }) {
    const cart = Storage.getCart();

    if (!cart.length) {
      throw new Error("Cart is empty");
    }

    const billNo = Storage.nextInvoiceNo();
    const totals = this.getCartTotals(selectedCustomer, paidAmount, discount, extraCharges);

    const order = {
      id: Utils.uid("order"),
      billNo,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || "Walk-in Customer",
      customerCode: selectedCustomer?.code || "",
      date: Utils.formatDate(),
      time: Utils.formatTime(),
      items: Utils.deepClone(cart),
      subtotal: totals.subtotal,
      discount: totals.discount,
      extraCharges: totals.extraCharges,
      previousDue: totals.previousDue,
      grandTotal: totals.grandTotal,
      paid: totals.paid,
      balance: totals.balance,
      paymentMethod,
      paymentStatus: Utils.getPaymentStatus(totals.grandTotal, totals.paid),
      orderStatus: Utils.getOrderStatus(totals.grandTotal, totals.paid),
      isClosed: false,
      closedAt: null,
      closedBy: null,
      notes
    };

    const orders = Storage.getOrders();
    orders.push(order);
    Storage.saveOrders(orders);

    if (selectedCustomer) {
      this.createLedgerEntry({
        customerId: selectedCustomer.id,
        type: "sale",
        refId: order.id,
        refNo: billNo,
        debit: totals.grandTotal,
        credit: 0,
        note: "Sale invoice"
      });

      if (paidAmount > 0) {
        this.createLedgerEntry({
          customerId: selectedCustomer.id,
          type: "payment",
          refId: order.id,
          refNo: billNo,
          debit: 0,
          credit: paidAmount,
          note: "Payment received with bill"
        });
      }
    }

    if (paidAmount > 0 && paymentMethod === "cash") {
      this.addCashbookEntry({
        type: "cash_in",
        amount: paidAmount,
        category: "bill_payment",
        note: `Cash received for bill ${billNo}`,
        refId: order.id,
        refNo: billNo
      });
    }

    this.applyInventoryChanges(cart, order);
    this.createPendingReturns(order, selectedCustomer);
    this.clearCart();

    return order;
  },

  getOrderById(orderId) {
    return Storage.getOrders().find(order => order.id === orderId) || null;
  },

  getCustomerOrders(customerId) {
    return Storage.getOrders().filter(order => order.customerId === customerId);
  },

  closeOrder(orderId) {
    const orders = Storage.getOrders();
    const index = orders.findIndex(order => order.id === orderId);

    if (index === -1) throw new Error("Order not found");

    if (orders[index].isClosed) {
      throw new Error("Order already closed");
    }

    const user = this.getCurrentUser();

    orders[index].isClosed = true;
    orders[index].closedAt = new Date().toISOString();
    orders[index].closedBy = user?.username || "system";

    Storage.saveOrders(orders);
    this.addAuditLog("bill_close", `Closed bill ${orders[index].billNo}`);

    return orders[index];
  },

  loadOrderToCartForEdit(orderId) {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.isClosed) throw new Error("Closed bill cannot be edited");

    this.deleteOrderSafely(orderId);
    Storage.saveCart(Utils.deepClone(order.items));

    return {
      order,
      customer: order.customerId ? this.getCustomerById(order.customerId) : null
    };
  },

  deleteOrderSafely(orderId) {
    const orders = Storage.getOrders();
    const ledger = Storage.getLedger();
    const pendingReturns = Storage.getPendingReturns();
    const inventory = Storage.getInventory();

    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.isClosed) throw new Error("Closed bill cannot be deleted");

    order.items.forEach(item => {
      if (!item.size) return;
      const key = `size${item.size}`;
      if (!inventory[key]) return;

      if (item.itemType === "refill") {
        inventory[key].filled += item.qty;
        inventory[key].empty -= item.qty;

        this.addStockMovement({
          type: "reverse_refill",
          size: item.size,
          qty: item.qty,
          refId: order.id,
          refNo: order.billNo,
          note: "Bill delete reverse refill",
          effect: `filled +${item.qty}, empty -${item.qty}`
        });
      }

      if (item.itemType === "new_return") {
        inventory[key].filled += item.qty;
        inventory[key].outPending -= item.qty;

        this.addStockMovement({
          type: "reverse_new_return",
          size: item.size,
          qty: item.qty,
          refId: order.id,
          refNo: order.billNo,
          note: "Bill delete reverse return-later",
          effect: `filled +${item.qty}, outPending -${item.qty}`
        });
      }

      if (item.itemType === "new_paid") {
        inventory[key].filled += item.qty;
        inventory[key].soldPermanent -= item.qty;

        this.addStockMovement({
          type: "reverse_new_paid",
          size: item.size,
          qty: item.qty,
          refId: order.id,
          refNo: order.billNo,
          note: "Bill delete reverse paid cylinder",
          effect: `filled +${item.qty}, soldPermanent -${item.qty}`
        });
      }

      if (item.itemType === "empty_paid") {
        inventory[key].empty += item.qty;
        inventory[key].soldPermanent -= item.qty;

        this.addStockMovement({
          type: "reverse_empty_paid",
          size: item.size,
          qty: item.qty,
          refId: order.id,
          refNo: order.billNo,
          note: "Bill delete reverse empty sale",
          effect: `empty +${item.qty}, soldPermanent -${item.qty}`
        });
      }
    });

    const newPendingReturns = pendingReturns.filter(p => p.orderId !== orderId);

    const newLedger = ledger.filter(entry => {
      if (entry.refId === orderId) return false;
      if (entry.refNo === order.billNo) return false;
      return true;
    });

    const newOrders = orders.filter(o => o.id !== orderId);

    Storage.saveInventory(inventory);
    Storage.savePendingReturns(newPendingReturns);
    Storage.saveLedger(newLedger);
    Storage.saveOrders(newOrders);

    return true;
  },

  /* ---------------- INVENTORY ---------------- */

  applyInventoryChanges(cart, order = null) {
    const inventory = Storage.getInventory();

    cart.forEach(item => {
      if (!item.size) return;

      const key = `size${item.size}`;
      if (!inventory[key]) return;

      if (item.itemType === "refill") {
        inventory[key].filled -= item.qty;
        inventory[key].empty += item.qty;

        this.addStockMovement({
          type: "sale_refill",
          size: item.size,
          qty: item.qty,
          refId: order?.id || "",
          refNo: order?.billNo || "",
          note: "Refill sale",
          effect: `filled -${item.qty}, empty +${item.qty}`
        });
      }

      if (item.itemType === "new_return") {
        inventory[key].filled -= item.qty;
        inventory[key].outPending += item.qty;

        this.addStockMovement({
          type: "sale_new_return",
          size: item.size,
          qty: item.qty,
          refId: order?.id || "",
          refNo: order?.billNo || "",
          note: "New cylinder return-later sale",
          effect: `filled -${item.qty}, outPending +${item.qty}`
        });
      }

      if (item.itemType === "new_paid") {
        inventory[key].filled -= item.qty;
        inventory[key].soldPermanent += item.qty;

        this.addStockMovement({
          type: "sale_new_paid",
          size: item.size,
          qty: item.qty,
          refId: order?.id || "",
          refNo: order?.billNo || "",
          note: "New cylinder paid sale",
          effect: `filled -${item.qty}, soldPermanent +${item.qty}`
        });
      }

      if (item.itemType === "empty_paid") {
        inventory[key].empty -= item.qty;
        inventory[key].soldPermanent += item.qty;

        this.addStockMovement({
          type: "sale_empty_paid",
          size: item.size,
          qty: item.qty,
          refId: order?.id || "",
          refNo: order?.billNo || "",
          note: "Empty cylinder sold",
          effect: `empty -${item.qty}, soldPermanent +${item.qty}`
        });
      }
    });

    Storage.saveInventory(inventory);
    return inventory;
  },

  getInventorySummary() {
    return Storage.getInventory();
  },

  checkStockAvailability(size, qty, itemType) {
    const inventory = Storage.getInventory();
    const key = `size${size}`;
    const stock = inventory[key];

    if (!stock) return { ok: false, message: "Invalid stock size" };

    if (itemType === "refill" || itemType === "new_return" || itemType === "new_paid") {
      if (stock.filled < qty) {
        return {
          ok: false,
          message: `Not enough filled stock for ${size}kg. Available: ${stock.filled}`
        };
      }
    }

    if (itemType === "empty_paid") {
      if (stock.empty < qty) {
        return {
          ok: false,
          message: `Not enough empty stock for ${size}kg. Available: ${stock.empty}`
        };
      }
    }

    return { ok: true };
  },

  /* ---------------- PENDING RETURNS ---------------- */

  createPendingReturns(order, selectedCustomer) {
    if (!selectedCustomer) return;

    const pendingList = Storage.getPendingReturns();

    order.items.forEach(item => {
      if (item.itemType === "new_return") {
        pendingList.push({
          id: Utils.uid("pending"),
          orderId: order.id,
          billNo: order.billNo,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          size: item.size,
          qty: item.qty,
          issueDate: order.date,
          dueDate: item.dueDate || Utils.addDays(order.date, 15),
          returnDate: null,
          status: "pending",
          note: item.note || ""
        });
      }
    });

    Storage.savePendingReturns(pendingList);
  },

  getCustomerPendingSummary(customerId) {
    const list = Storage.getPendingReturns().filter(
      item => item.customerId === customerId && item.status === "pending"
    );

    return {
      pending15: list.filter(i => i.size === 15).reduce((s, i) => s + i.qty, 0),
      pending35: list.filter(i => i.size === 35).reduce((s, i) => s + i.qty, 0),
      pending45: list.filter(i => i.size === 45).reduce((s, i) => s + i.qty, 0)
    };
  },

  getPendingReturnsByCustomer(customerId) {
    return Storage.getPendingReturns().filter(
      item => item.customerId === customerId && item.status === "pending"
    );
  },

  getPendingReturnById(pendingId) {
    return Storage.getPendingReturns().find(item => item.id === pendingId) || null;
  },

  getReturnedHistoryByCustomer(customerId) {
    return Storage.getPendingReturns().filter(
      item => item.customerId === customerId && item.status === "returned"
    );
  },

  returnEmpty({ customerId, size, qty, note = "" }) {
    const pendingList = Storage.getPendingReturns();
    const inventory = Storage.getInventory();

    let remainingQty = qty;

    const customerPendings = pendingList
      .filter(p => p.customerId === customerId && p.size === size && p.status === "pending");

    for (const pending of customerPendings) {
      if (remainingQty <= 0) break;

      if (pending.qty <= remainingQty) {
        remainingQty -= pending.qty;
        pending.status = "returned";
        pending.returnDate = Utils.formatDate();
      } else {
        pending.qty -= remainingQty;
        remainingQty = 0;
      }
    }

    const key = `size${size}`;
    if (inventory[key]) {
      inventory[key].empty += qty;
      inventory[key].outPending -= qty;
    }

    Storage.savePendingReturns(pendingList);
    Storage.saveInventory(inventory);

    return {
      success: true,
      note
    };
  },

  returnPendingById({ pendingId, qty, note = "" }) {
    const pendingReturns = Storage.getPendingReturns();
    const inventory = Storage.getInventory();

    const index = pendingReturns.findIndex(item => item.id === pendingId);
    if (index === -1) throw new Error("Pending return not found");

    const pending = pendingReturns[index];

    if (pending.status !== "pending") {
      throw new Error("This pending entry is already closed");
    }

    if (qty <= 0) {
      throw new Error("Invalid return quantity");
    }

    if (qty > pending.qty) {
      throw new Error(`Return qty cannot exceed pending qty (${pending.qty})`);
    }

    const key = `size${pending.size}`;
    if (!inventory[key]) {
      throw new Error("Inventory size not found");
    }

    inventory[key].empty += qty;
    inventory[key].outPending -= qty;

    this.addStockMovement({
      type: "return_received",
      size: pending.size,
      qty,
      refId: pending.orderId,
      refNo: pending.billNo,
      note: note || "Empty cylinder returned",
      effect: `empty +${qty}, outPending -${qty}`
    });

    if (qty === pending.qty) {
      pending.status = "returned";
      pending.returnDate = Utils.formatDate();
      pending.returnNote = note || "";
    } else {
      pending.qty -= qty;

      pendingReturns.push({
        ...pending,
        id: Utils.uid("pending_returned"),
        qty,
        status: "returned",
        issueDate: pending.issueDate,
        dueDate: pending.dueDate,
        returnDate: Utils.formatDate(),
        returnNote: note || ""
      });
    }

    Storage.savePendingReturns(pendingReturns);
    Storage.saveInventory(inventory);

    return true;
  },

  getPendingReturnStatus(dueDate) {
    const today = new Date(Utils.formatDate());
    const due = new Date(dueDate);

    const diffMs = due - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Overdue", className: "danger", days: Math.abs(diffDays) };
    }

    if (diffDays <= 3) {
      return { label: "Due Soon", className: "warning", days: diffDays };
    }

    return { label: "Normal", className: "success", days: diffDays };
  },

  getCustomerOverdueInfo(customerId) {
    const today = Utils.formatDate();
    const pending = Storage.getPendingReturns().filter(
      item => item.customerId === customerId && item.status === "pending"
    );

    const overdueItems = pending.filter(item => item.dueDate < today);
    const dueSoonItems = pending.filter(item => {
      const status = this.getPendingReturnStatus(item.dueDate);
      return status.label === "Due Soon";
    });

    return {
      hasOverdue: overdueItems.length > 0,
      hasDueSoon: dueSoonItems.length > 0,
      overdueCount: overdueItems.length,
      dueSoonCount: dueSoonItems.length,
      overdueItems,
      dueSoonItems
    };
  },

  getOverdueReturns() {
    const today = Utils.formatDate();
    return Storage.getPendingReturns().filter(
      item => item.status === "pending" && item.dueDate < today
    );
  },

  getAllPendingReturnsDetailed() {
    return Storage.getPendingReturns()
      .filter(item => item.status === "pending")
      .map(item => ({
        ...item,
        statusInfo: this.getPendingReturnStatus(item.dueDate)
      }))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  },

  /* ---------------- SEARCH ---------------- */

  globalSearch(query = "") {
    const q = query.trim().toLowerCase();

    if (!q) {
      return {
        customers: [],
        orders: [],
        pendingReturns: []
      };
    }

    const customers = Storage.getCustomers().filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.idCard || "").toLowerCase().includes(q) ||
      (c.area || "").toLowerCase().includes(q)
    );

    const orders = Storage.getOrders().filter(o =>
      (o.billNo || "").toLowerCase().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q) ||
      (o.customerCode || "").toLowerCase().includes(q)
    );

    const pendingReturns = Storage.getPendingReturns().filter(p =>
      p.status === "pending" &&
      (
        (p.customerName || "").toLowerCase().includes(q) ||
        (p.billNo || "").toLowerCase().includes(q) ||
        String(p.size).includes(q)
      )
    );

    return {
      customers,
      orders,
      pendingReturns
    };
  },

  /* ---------------- DASHBOARD / ALERTS ---------------- */

  getDashboardStats() {
    const orders = Storage.getOrders();
    const ledger = Storage.getLedger();
    const pendingReturns = Storage.getPendingReturns().filter(p => p.status === "pending");
    const inventory = Storage.getInventory();
    const today = Utils.formatDate();

    const todayOrders = orders.filter(order => order.date === today);
    const todaySales = todayOrders.reduce((sum, order) => sum + order.grandTotal, 0);

    const todayReceived = ledger
      .filter(entry => entry.type === "payment" && entry.date === today)
      .reduce((sum, entry) => sum + entry.credit, 0);

    const totalDue = ledger.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);

    const overdueCount = pendingReturns.filter(item => item.dueDate < today).length;

    return {
      totalOrders: orders.length,
      todaySales,
      todayReceived,
      totalDue,
      pendingReturnsCount: pendingReturns.length,
      overdueCount,
      inventory
    };
  },

  getLowStockAlerts() {
    const inventory = Storage.getInventory();
    const alerts = [];

    Object.entries(inventory).forEach(([key, stock]) => {
      const size = key.replace("size", "");

      if (stock.filled <= 3) {
        alerts.push(`${size}kg filled stock low (${stock.filled})`);
      }

      if (stock.empty <= 2) {
        alerts.push(`${size}kg empty stock low (${stock.empty})`);
      }
    });

    return alerts;
  },

  /* ---------------- STOCK MOVEMENTS ---------------- */

  addStockMovement({
    date = Utils.formatDate(),
    type,
    size,
    qty,
    refId = "",
    refNo = "",
    note = "",
    effect = ""
  }) {
    const movements = Storage.getStockMovements();

    movements.push({
      id: Utils.uid("move"),
      date,
      type,
      size,
      qty,
      refId,
      refNo,
      note,
      effect
    });

    Storage.saveStockMovements(movements);
  },

  getStockMovements() {
    return Storage.getStockMovements().slice().reverse();
  },

  getTodayStockMovements() {
    const today = Utils.formatDate();
    return Storage.getStockMovements().filter(item => item.date === today);
  },

  /* ---------------- CASHBOOK / EXPENSES ---------------- */

  addCashbookEntry({
    type,
    amount,
    category = "",
    note = "",
    refId = "",
    refNo = "",
    date = Utils.formatDate()
  }) {
    const entries = Storage.getCashbook();

    entries.push({
      id: Utils.uid("cash"),
      date,
      time: Utils.formatTime(),
      type,
      amount: Utils.toNumber(amount, 0),
      category,
      note,
      refId,
      refNo
    });

    Storage.saveCashbook(entries);
  },

  getCashbookEntries() {
    return Storage.getCashbook().slice().reverse();
  },

  getCashbookBalance() {
    const entries = Storage.getCashbook();

    return entries.reduce((sum, entry) => {
      if (entry.type === "cash_in" || entry.type === "opening") return sum + entry.amount;
      if (entry.type === "cash_out") return sum - entry.amount;
      return sum;
    }, 0);
  },

  addExpense({
    amount,
    category,
    note = "",
    date = Utils.formatDate()
  }) {
    const expenses = Storage.getExpenses();

    const expense = {
      id: Utils.uid("exp"),
      date,
      time: Utils.formatTime(),
      amount: Utils.toNumber(amount, 0),
      category,
      note
    };

    expenses.push(expense);
    Storage.saveExpenses(expenses);

    this.addCashbookEntry({
      type: "cash_out",
      amount,
      category,
      note: `Expense: ${note || category}`,
      refId: expense.id,
      refNo: expense.id
    });

    this.addAuditLog("expense_add", `Added expense ${category} amount ${amount}`);

    return expense;
  },

  getExpenses() {
    return Storage.getExpenses().slice().reverse();
  },

  getTodayExpenses() {
    const today = Utils.formatDate();
    return Storage.getExpenses().filter(exp => exp.date === today);
  },

  /* ---------------- SUPPLIERS ---------------- */

  createSupplier(data) {
    const suppliers = Storage.getSuppliers();

    const supplier = {
      id: Utils.uid("sup"),
      code: Storage.nextSupplierCode(),
      name: data.name || "Unnamed Supplier",
      phone: data.phone || "",
      address: data.address || "",
      note: data.note || "",
      createdAt: new Date().toISOString()
    };

    suppliers.push(supplier);
    Storage.saveSuppliers(suppliers);
    this.addAuditLog("supplier_create", `Created supplier ${supplier.code} - ${supplier.name}`);

    return supplier;
  },

  getSupplierById(supplierId) {
    return Storage.getSuppliers().find(s => s.id === supplierId) || null;
  },

  searchSuppliers(query = "") {
    const suppliers = Storage.getSuppliers();
    const q = query.trim().toLowerCase();

    if (!q) return suppliers;

    return suppliers.filter(s =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q)
    );
  },

  createSupplierLedgerEntry({
    supplierId,
    type,
    refId,
    refNo,
    debit = 0,
    credit = 0,
    note = ""
  }) {
    const ledger = Storage.getSupplierLedger();

    const entry = {
      id: Utils.uid("supp_ledger"),
      supplierId,
      type,
      refId,
      refNo,
      date: Utils.formatDate(),
      debit: Utils.toNumber(debit, 0),
      credit: Utils.toNumber(credit, 0),
      note
    };

    ledger.push(entry);
    Storage.saveSupplierLedger(ledger);
    return entry;
  },

  getSupplierLedgerEntries(supplierId) {
    return Storage.getSupplierLedger()
      .filter(entry => entry.supplierId === supplierId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getSupplierBalance(supplierId) {
    const entries = Storage.getSupplierLedger().filter(entry => entry.supplierId === supplierId);
    return entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
  },

  paySupplier({ supplierId, amount, method = "cash", note = "" }) {
    const supplier = this.getSupplierById(supplierId);
    if (!supplier) throw new Error("Supplier not found");

    const entry = this.createSupplierLedgerEntry({
      supplierId,
      type: "payment",
      refId: Utils.uid("supp_pay"),
      refNo: `SPAY-${Date.now()}`,
      debit: 0,
      credit: amount,
      note: `${method} payment. ${note}`.trim()
    });

    if (method === "cash") {
      this.addCashbookEntry({
        type: "cash_out",
        amount,
        category: "supplier_payment",
        note: `Cash paid to supplier ${supplier.name}`,
        refId: entry.id,
        refNo: entry.refNo
      });
    }

    this.addAuditLog("supplier_payment", `Paid supplier ${supplier.code} amount ${amount}`);
    return entry;
  },

  /* ---------------- PURCHASE CART ---------------- */

  addItemToPurchaseCart(item) {
    const cart = Storage.getPurchaseCart();

    cart.push({
      id: Utils.uid("purchase_item"),
      size: Utils.toNumber(item.size, 0),
      stockType: item.stockType || "filled",
      qty: Utils.toNumber(item.qty, 0),
      rate: Utils.toNumber(item.rate, 0),
      total: Utils.toNumber(item.qty, 0) * Utils.toNumber(item.rate, 0),
      note: item.note || ""
    });

    Storage.savePurchaseCart(cart);
    return cart;
  },

  getPurchaseCart() {
    return Storage.getPurchaseCart();
  },

  removePurchaseCartItem(itemId) {
    const cart = Storage.getPurchaseCart().filter(item => item.id !== itemId);
    Storage.savePurchaseCart(cart);
    return cart;
  },

  clearPurchaseCart() {
    Storage.savePurchaseCart([]);
    return [];
  },

  updatePurchaseCartItem(itemId, updates) {
    const cart = Storage.getPurchaseCart();
    const index = cart.findIndex(item => item.id === itemId);

    if (index === -1) throw new Error("Purchase item not found");

    cart[index] = {
      ...cart[index],
      ...updates
    };

    cart[index].qty = Utils.toNumber(cart[index].qty, 0);
    cart[index].rate = Utils.toNumber(cart[index].rate, 0);
    cart[index].total = cart[index].qty * cart[index].rate;

    Storage.savePurchaseCart(cart);
    return cart[index];
  },

  getPurchaseCartTotal() {
    return Storage.getPurchaseCart().reduce((sum, item) => sum + item.total, 0);
  },

  /* ---------------- PURCHASES ---------------- */

  createPurchase({
    supplierId = null,
    items = [],
    paid = 0,
    paymentMethod = "cash",
    note = ""
  }) {
    if (!items.length) {
      throw new Error("Purchase items required");
    }

    const purchaseNo = Storage.nextPurchaseNo();
    const supplier = supplierId ? this.getSupplierById(supplierId) : null;
    const purchases = Storage.getPurchases();

    const total = items.reduce((sum, item) => sum + item.total, 0);
    const balance = total - paid;

    const purchase = {
      id: Utils.uid("purchase"),
      purchaseNo,
      supplierId: supplier?.id || null,
      supplierName: supplier?.name || "Walk-in Supplier",
      supplierCode: supplier?.code || "",
      date: Utils.formatDate(),
      time: Utils.formatTime(),
      items: Utils.deepClone(items),
      total,
      paid,
      balance,
      paymentMethod,
      note
    };

    purchases.push(purchase);
    Storage.savePurchases(purchases);

    this.applyPurchaseInventory(items, purchase);

    if (supplier) {
      this.createSupplierLedgerEntry({
        supplierId: supplier.id,
        type: "purchase",
        refId: purchase.id,
        refNo: purchase.purchaseNo,
        debit: total,
        credit: 0,
        note: "Stock purchase"
      });

      if (paid > 0) {
        this.createSupplierLedgerEntry({
          supplierId: supplier.id,
          type: "payment",
          refId: purchase.id,
          refNo: purchase.purchaseNo,
          debit: 0,
          credit: paid,
          note: "Supplier payment"
        });
      }
    }

    if (paid > 0 && paymentMethod === "cash") {
      this.addCashbookEntry({
        type: "cash_out",
        amount: paid,
        category: "supplier_payment",
        note: `Cash paid for purchase ${purchaseNo}`,
        refId: purchase.id,
        refNo: purchaseNo
      });
    }

    this.recalculateAverageCosts();
    this.addAuditLog("purchase_create", `Created purchase ${purchaseNo}`);
    return purchase;
  },

  applyPurchaseInventory(items, purchase = null) {
    const inventory = Storage.getInventory();

    items.forEach(item => {
      if (!item.size) return;

      const key = `size${item.size}`;
      if (!inventory[key]) return;

      if (item.stockType === "filled") {
        inventory[key].filled += item.qty;

        this.addStockMovement({
          type: "purchase_filled",
          size: item.size,
          qty: item.qty,
          refId: purchase?.id || "",
          refNo: purchase?.purchaseNo || "",
          note: "Filled stock purchase",
          effect: `filled +${item.qty}`
        });
      }

      if (item.stockType === "empty") {
        inventory[key].empty += item.qty;

        this.addStockMovement({
          type: "purchase_empty",
          size: item.size,
          qty: item.qty,
          refId: purchase?.id || "",
          refNo: purchase?.purchaseNo || "",
          note: "Empty stock purchase",
          effect: `empty +${item.qty}`
        });
      }
    });

    Storage.saveInventory(inventory);
    return inventory;
  },

  reversePurchaseInventory(items, purchase = null) {
    const inventory = Storage.getInventory();

    items.forEach(item => {
      if (!item.size) return;

      const key = `size${item.size}`;
      if (!inventory[key]) return;

      if (item.stockType === "filled") {
        inventory[key].filled -= item.qty;

        this.addStockMovement({
          type: "reverse_purchase_filled",
          size: item.size,
          qty: item.qty,
          refId: purchase?.id || "",
          refNo: purchase?.purchaseNo || "",
          note: "Reverse filled stock purchase",
          effect: `filled -${item.qty}`
        });
      }

      if (item.stockType === "empty") {
        inventory[key].empty -= item.qty;

        this.addStockMovement({
          type: "reverse_purchase_empty",
          size: item.size,
          qty: item.qty,
          refId: purchase?.id || "",
          refNo: purchase?.purchaseNo || "",
          note: "Reverse empty stock purchase",
          effect: `empty -${item.qty}`
        });
      }
    });

    Storage.saveInventory(inventory);
    return inventory;
  },

  deletePurchaseSafely(purchaseId) {
    const purchases = Storage.getPurchases();
    const supplierLedger = Storage.getSupplierLedger();
    const cashbook = Storage.getCashbook();

    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) throw new Error("Purchase not found");

    this.reversePurchaseInventory(purchase.items, purchase);

    const newSupplierLedger = supplierLedger.filter(entry => {
      if (entry.refId === purchase.id) return false;
      if (entry.refNo === purchase.purchaseNo) return false;
      return true;
    });

    const newCashbook = cashbook.filter(entry => {
      if (entry.refId === purchase.id) return false;
      if (entry.refNo === purchase.purchaseNo) return false;
      return true;
    });

    const newPurchases = purchases.filter(p => p.id !== purchaseId);

    Storage.savePurchases(newPurchases);
    Storage.saveSupplierLedger(newSupplierLedger);
    Storage.saveCashbook(newCashbook);

    this.recalculateAverageCosts();
    this.addAuditLog("purchase_delete", `Deleted purchase ${purchase.purchaseNo}`);

    return true;
  },

  loadPurchaseForEdit(purchaseId) {
    const purchase = Storage.getPurchases().find(p => p.id === purchaseId);
    if (!purchase) throw new Error("Purchase not found");

    this.deletePurchaseSafely(purchaseId);

    return {
      purchase,
      supplier: purchase.supplierId ? this.getSupplierById(purchase.supplierId) : null
    };
  },

  /* ---------------- COSTS / PROFIT ---------------- */

  recalculateAverageCosts() {
    const purchases = Storage.getPurchases();
    const costs = {
      filled15: 0,
      filled35: 0,
      filled45: 0,
      empty15: 0,
      empty35: 0,
      empty45: 0
    };

    const grouped = {
      filled15: { totalQty: 0, totalCost: 0 },
      filled35: { totalQty: 0, totalCost: 0 },
      filled45: { totalQty: 0, totalCost: 0 },
      empty15: { totalQty: 0, totalCost: 0 },
      empty35: { totalQty: 0, totalCost: 0 },
      empty45: { totalQty: 0, totalCost: 0 }
    };

    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        const key = `${item.stockType}${item.size}`;
        if (!grouped[key]) return;

        grouped[key].totalQty += item.qty;
        grouped[key].totalCost += item.total;
      });
    });

    Object.keys(grouped).forEach(key => {
      if (grouped[key].totalQty > 0) {
        costs[key] = grouped[key].totalCost / grouped[key].totalQty;
      }
    });

    Storage.saveCosts(costs);
    return costs;
  },

  getAverageCosts() {
    return Storage.getCosts();
  },

  getAverageCostForSaleItem(item) {
    const costs = this.getAverageCosts();

    if (!item.size) return 0;

    if (item.itemType === "refill" || item.itemType === "new_return" || item.itemType === "new_paid") {
      return costs[`filled${item.size}`] || 0;
    }

    if (item.itemType === "empty_paid") {
      return costs[`empty${item.size}`] || 0;
    }

    return 0;
  },

  getOrderProfit(order) {
    let salesAmount = 0;
    let estimatedCost = 0;

    order.items.forEach(item => {
      salesAmount += item.total;

      const unitCost = this.getAverageCostForSaleItem(item);
      const qtyBase = item.qty || 0;

      estimatedCost += unitCost * qtyBase;
    });

    return {
      salesAmount,
      estimatedCost,
      grossProfit: salesAmount - estimatedCost
    };
  },

  getAllOrdersProfitSummary() {
    const orders = Storage.getOrders();

    let totalSales = 0;
    let totalCost = 0;

    orders.forEach(order => {
      const profit = this.getOrderProfit(order);
      totalSales += profit.salesAmount;
      totalCost += profit.estimatedCost;
    });

    return {
      totalSales,
      totalCost,
      grossProfit: totalSales - totalCost
    };
  },

  getNetProfitSummary(fromDate = null, toDate = null) {
    let orders = Storage.getOrders();
    let expenses = Storage.getExpenses();

    if (fromDate && toDate) {
      orders = orders.filter(order => order.date >= fromDate && order.date <= toDate);
      expenses = expenses.filter(exp => exp.date >= fromDate && exp.date <= toDate);
    }

    let totalSales = 0;
    let totalCost = 0;

    orders.forEach(order => {
      const profit = this.getOrderProfit(order);
      totalSales += profit.salesAmount;
      totalCost += profit.estimatedCost;
    });

    const grossProfit = totalSales - totalCost;
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    return {
      totalSales,
      totalCost,
      grossProfit,
      totalExpenses,
      netProfit
    };
  },

  getStockValuation() {
    const inventory = Storage.getInventory();
    const costs = this.getAverageCosts();

    const filled15Value = inventory.size15.filled * (costs.filled15 || 0);
    const filled35Value = inventory.size35.filled * (costs.filled35 || 0);
    const filled45Value = inventory.size45.filled * (costs.filled45 || 0);

    const empty15Value = inventory.size15.empty * (costs.empty15 || 0);
    const empty35Value = inventory.size35.empty * (costs.empty35 || 0);
    const empty45Value = inventory.size45.empty * (costs.empty45 || 0);

    return {
      filled15Value,
      filled35Value,
      filled45Value,
      empty15Value,
      empty35Value,
      empty45Value,
      totalFilledValue: filled15Value + filled35Value + filled45Value,
      totalEmptyValue: empty15Value + empty35Value + empty45Value,
      totalStockValue:
        filled15Value + filled35Value + filled45Value +
        empty15Value + empty35Value + empty45Value
    };
  },

  /* ---------------- REPORTS ---------------- */

  getReportsSummary() {
    const orders = Storage.getOrders();
    const ledger = Storage.getLedger();
    const pendingReturns = Storage.getPendingReturns();

    const totalSales = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalPaidInBills = orders.reduce((sum, order) => sum + order.paid, 0);
    const totalLedgerPayments = ledger.reduce((sum, entry) => sum + entry.credit, 0);
    const totalDue = ledger.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);

    const totalPending15 = pendingReturns
      .filter(item => item.status === "pending" && item.size === 15)
      .reduce((sum, item) => sum + item.qty, 0);

    const totalPending35 = pendingReturns
      .filter(item => item.status === "pending" && item.size === 35)
      .reduce((sum, item) => sum + item.qty, 0);

    const totalPending45 = pendingReturns
      .filter(item => item.status === "pending" && item.size === 45)
      .reduce((sum, item) => sum + item.qty, 0);

    return {
      totalSales,
      totalPaidInBills,
      totalLedgerPayments,
      totalDue,
      totalPending15,
      totalPending35,
      totalPending45
    };
  },

  getDailyClosingReport(date = Utils.formatDate()) {
    const orders = Storage.getOrders().filter(order => order.date === date);
    const ledgerPayments = Storage.getLedger().filter(entry => entry.type === "payment" && entry.date === date);
    const stockMovements = Storage.getStockMovements().filter(move => move.date === date);
    const cashbook = Storage.getCashbook().filter(entry => entry.date === date);

    const totalSales = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalPaidInBills = orders.reduce((sum, order) => sum + order.paid, 0);
    const extraPayments = ledgerPayments.reduce((sum, entry) => sum + entry.credit, 0);

    const creditSales = orders
      .filter(order => order.balance > 0)
      .reduce((sum, order) => sum + order.balance, 0);

    const cashIn = cashbook
      .filter(entry => entry.type === "cash_in" || entry.type === "opening")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const cashOut = cashbook
      .filter(entry => entry.type === "cash_out")
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      date,
      totalBills: orders.length,
      totalSales,
      totalPaidInBills,
      extraPayments,
      totalReceived: extraPayments,
      creditSales,
      stockMovements,
      cashIn,
      cashOut,
      cashBalance: cashIn - cashOut
    };
  },

  getDateRangeReport(fromDate, toDate) {
    const orders = Storage.getOrders().filter(order => order.date >= fromDate && order.date <= toDate);
    const ledger = Storage.getLedger().filter(entry => entry.date >= fromDate && entry.date <= toDate);
    const expenses = Storage.getExpenses().filter(exp => exp.date >= fromDate && exp.date <= toDate);
    const cashbook = Storage.getCashbook().filter(entry => entry.date >= fromDate && entry.date <= toDate);
    const stockMovements = Storage.getStockMovements().filter(move => move.date >= fromDate && move.date <= toDate);
    const purchases = Storage.getPurchases().filter(p => p.date >= fromDate && p.date <= toDate);
    const purchaseTotal = purchases.reduce((sum, p) => sum + p.total, 0);
    const purchasePaid = purchases.reduce((sum, p) => sum + p.paid, 0);

    const sales = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const billPaid = orders.reduce((sum, order) => sum + order.paid, 0);
    const payments = ledger.reduce((sum, entry) => sum + entry.credit, 0);
    const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const cashIn = cashbook
      .filter(entry => entry.type === "cash_in" || entry.type === "opening")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const cashOut = cashbook
      .filter(entry => entry.type === "cash_out")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const profit = this.getNetProfitSummary(fromDate, toDate);
    const purchaseSummary = this.getPurchaseSummary(fromDate, toDate);

    return {
      fromDate,
      toDate,
      totalBills: orders.length,
      sales,
      billPaid,
      payments,
      expensesTotal,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      stockMovementsCount: stockMovements.length,
      grossProfit: profit.grossProfit,
      netProfit: profit.netProfit,
      estimatedCost: profit.totalCost,
      purchaseTotal: purchaseSummary.totalPurchases,
      purchasePaid: purchaseSummary.totalPaid,
      purchaseBalance: purchaseSummary.totalBalance
    };
  },

  getPurchaseSummary(fromDate = null, toDate = null) {
    let purchases = Storage.getPurchases();

    if (fromDate && toDate) {
      purchases = purchases.filter(p => p.date >= fromDate && p.date <= toDate);
    }

    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaid = purchases.reduce((sum, p) => sum + p.paid, 0);
    const totalBalance = purchases.reduce((sum, p) => sum + p.balance, 0);

    const bySupplier = {};

    purchases.forEach(p => {
      const key = p.supplierName || "Walk-in Supplier";

      if (!bySupplier[key]) {
        bySupplier[key] = {
          supplierName: key,
          total: 0,
          paid: 0,
          balance: 0,
          count: 0
        };
      }

      bySupplier[key].total += p.total;
      bySupplier[key].paid += p.paid;
      bySupplier[key].balance += p.balance;
      bySupplier[key].count += 1;
    });

    return {
      totalPurchases,
      totalPaid,
      totalBalance,
      bySupplier: Object.values(bySupplier)
    };
  },

  getSupplierDueReport() {
    const suppliers = Storage.getSuppliers();

    return suppliers.map(supplier => ({
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      phone: supplier.phone,
      balance: this.getSupplierBalance(supplier.id)
    })).sort((a, b) => b.balance - a.balance);
  },

  getSupplierDateRangeSummary(supplierId, fromDate, toDate) {
    const purchases = Storage.getPurchases().filter(p =>
      p.supplierId === supplierId && p.date >= fromDate && p.date <= toDate
    );

    const ledger = Storage.getSupplierLedger().filter(entry =>
      entry.supplierId === supplierId && entry.date >= fromDate && entry.date <= toDate
    );

    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaid = ledger.reduce((sum, entry) => sum + entry.credit, 0);
    const totalDebit = ledger.reduce((sum, entry) => sum + entry.debit, 0);
    const balance = totalDebit - totalPaid;

    return {
      totalPurchases,
      totalPaid,
      balance,
      purchases,
      ledger
    };
  },

  /* ---------------- BILL / RECEIPT / SHARE ---------------- */

  getOrderEmptySummaryText(order) {
    const pendingItems = order.items.filter(item => item.itemType === "new_return");
    const paidItems = order.items.filter(item => item.itemType === "new_paid" || item.itemType === "empty_paid");

    if (pendingItems.length) {
      const lines = pendingItems.map(item => `${item.size}kg x${item.qty} return due ${item.dueDate || "-"}`);
      return { type: "pending", text: lines.join(", ") };
    }

    if (paidItems.length) {
      return { type: "paid", text: "Cylinder/empty paid, no return required" };
    }

    return { type: "none", text: "No empty cylinder pending" };
  },

  generateBillText(orderId) {
    const order = this.getOrderById(orderId);
    if (!order) return "Bill not found";

    const settings = Storage.getSettings();
    const emptyInfo = this.getOrderEmptySummaryText(order);

    const itemsText = order.items.map(item => {
      let line = `- ${item.itemName}`;
      if (item.qty) line += ` x${item.qty}`;
      if (item.kg) line += ` (${item.kg}kg)`;
      if (item.note === "own_cylinder") line += ` [Own Cylinder]`;
      if (item.note === "exchange_now") line += ` [Exchange]`;
      line += ` = ${item.total}`;
      return line;
    }).join("\n");

    return `
*${settings.shopName || "Gas Shop"}*
Bill No: ${order.billNo}
Date: ${order.date} ${order.time || ""}

Customer: ${order.customerName || "Walk-in Customer"}
${order.customerCode ? `Code: ${order.customerCode}` : ""}

Items:
${itemsText}

Subtotal: ${order.subtotal}
Previous Due: ${order.previousDue}
Grand Total: ${order.grandTotal}
Paid: ${order.paid}
Balance: ${order.balance}
Payment: ${order.paymentMethod}

Empty Status: ${emptyInfo.text}

Thank you
    `.trim();
  },

  generateInvoiceHTML(orderId, printMode = "thermal") {
    const order = this.getOrderById(orderId);
    if (!order) return "<p>Bill not found</p>";

    const settings = Storage.getSettings();
    const emptyInfo = this.getOrderEmptySummaryText(order);

    const rows = order.items.map(item => `
      <tr>
        <td>
          <div style="font-weight:700;">${item.itemName}</div>
          <div style="font-size:12px; color:#555;">
            ${item.size ? `Size: ${item.size}kg` : ""}
            ${item.kg ? ` | KG: ${item.kg}` : ""}
            ${item.emptyStatus === "pending" ? ` | Return Due: ${item.dueDate}` : ""}
            ${item.note === "own_cylinder" ? ` | Own Cylinder` : ""}
            ${item.note === "exchange_now" ? ` | Exchange` : ""}
          </div>
        </td>
        <td style="text-align:center;">${item.qty}</td>
        <td style="text-align:right;">${item.rate}</td>
        <td style="text-align:right;">${item.total}</td>
      </tr>
    `).join("");

    const widthStyle = printMode === "thermal" ? "width: 320px;" : "width: 800px;";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${order.billNo}</title>
        <style>
          body { font-family: Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 20px; }
          .invoice { ${widthStyle} margin: 0 auto; border: 1px solid #ddd; padding: 16px; }
          .center { text-align: center; }
          .head-title { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
          .muted { color: #555; font-size: 13px; }
          .divider { border-top: 1px dashed #999; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { padding: 8px 4px; border-bottom: 1px dashed #ccc; vertical-align: top; }
          th { text-align: left; font-size: 12px; }
          .totals { margin-top: 10px; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .grand { font-size: 16px; font-weight: bold; }
          .note-box { margin-top: 12px; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; font-size: 13px; }
          .footer { text-align: center; margin-top: 14px; font-size: 12px; color: #555; }
          @media print {
            body { padding: 0; }
            .invoice { border: none; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="center">
            <div class="head-title">${settings.shopName || "Gas Shop"}</div>
            <div class="muted">${settings.address || ""}</div>
            <div class="muted">${settings.phone || ""}</div>
          </div>

          <div class="divider"></div>

          <div><strong>Bill No:</strong> ${order.billNo}</div>
          <div><strong>Date:</strong> ${order.date} ${order.time || ""}</div>
          <div><strong>Customer:</strong> ${order.customerName || "Walk-in Customer"}</div>
          ${order.customerCode ? `<div><strong>Code:</strong> ${order.customerCode}</div>` : ""}

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><strong>${order.subtotal}</strong></div>
            <div class="totals-row"><span>Previous Due</span><strong>${order.previousDue}</strong></div>
            <div class="totals-row grand"><span>Grand Total</span><strong>${order.grandTotal}</strong></div>
            <div class="totals-row"><span>Paid</span><strong>${order.paid}</strong></div>
            <div class="totals-row"><span>Balance</span><strong>${order.balance}</strong></div>
            <div class="totals-row"><span>Payment Method</span><strong>${order.paymentMethod}</strong></div>
          </div>

          <div class="note-box">
            <strong>Empty Status:</strong><br>
            ${emptyInfo.text}
          </div>

          <div class="footer">Thank you for your business</div>
        </div>
      </body>
      </html>
    `;
  },

  generatePaymentReceiptText(customerId, amount, method = "cash") {
    const customer = this.getCustomerById(customerId);
    const settings = Storage.getSettings();
    const currentBalance = this.getCustomerBalance(customerId);

    return `
*${settings.shopName || "Gas Shop"}*
Payment Receipt

Customer: ${customer?.name || "-"}
Code: ${customer?.code || "-"}
Date: ${Utils.formatDate()} ${Utils.formatTime()}

Amount Received: ${amount}
Method: ${method}
Remaining Balance: ${currentBalance}

Thank you
    `.trim();
  },

  generatePaymentReceiptHTML(customerId, amount, method = "cash") {
    const customer = this.getCustomerById(customerId);
    const settings = Storage.getSettings();
    const currentBalance = this.getCustomerBalance(customerId);

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .receipt { width: 320px; margin: 0 auto; border: 1px solid #ddd; padding: 16px; }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #999; margin: 12px 0; }
        .row { display:flex; justify-content:space-between; margin:6px 0; }
        @media print { .receipt { border:none; width:100%; } body { padding:0; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="center">
          <h2 style="margin:0;">${settings.shopName || "Gas Shop"}</h2>
          <p style="margin:4px 0;">Payment Receipt</p>
        </div>
        <div class="divider"></div>
        <p><strong>Customer:</strong> ${customer?.name || "-"}</p>
        <p><strong>Code:</strong> ${customer?.code || "-"}</p>
        <p><strong>Date:</strong> ${Utils.formatDate()} ${Utils.formatTime()}</p>
        <div class="divider"></div>
        <div class="row"><span>Amount Received</span><strong>${amount}</strong></div>
        <div class="row"><span>Method</span><strong>${method}</strong></div>
        <div class="row"><span>Remaining Balance</span><strong>${currentBalance}</strong></div>
        <div class="divider"></div>
        <div class="center"><small>Thank you</small></div>
      </div>
    </body>
    </html>
    `;
  },

  generateSupplierPaymentReceiptText(supplierId, amount, method = "cash") {
    const supplier = this.getSupplierById(supplierId);
    const settings = Storage.getSettings();
    const balance = this.getSupplierBalance(supplierId);

    return `
*${settings.shopName || "Gas Shop"}*
Supplier Payment Receipt

Supplier: ${supplier?.name || "-"}
Code: ${supplier?.code || "-"}
Date: ${Utils.formatDate()} ${Utils.formatTime()}

Amount Paid: ${amount}
Method: ${method}
Remaining Supplier Balance: ${balance}

Thank you
    `.trim();
  },

  generateSupplierPaymentReceiptHTML(supplierId, amount, method = "cash") {
    const supplier = this.getSupplierById(supplierId);
    const settings = Storage.getSettings();
    const balance = this.getSupplierBalance(supplierId);

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Supplier Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .receipt { width: 320px; margin: 0 auto; border: 1px solid #ddd; padding: 16px; }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #999; margin: 12px 0; }
        .row { display:flex; justify-content:space-between; margin:6px 0; }
        @media print { .receipt { border:none; width:100%; } body { padding:0; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="center">
          <h2 style="margin:0;">${settings.shopName || "Gas Shop"}</h2>
          <p style="margin:4px 0;">Supplier Payment Receipt</p>
        </div>
        <div class="divider"></div>
        <p><strong>Supplier:</strong> ${supplier?.name || "-"}</p>
        <p><strong>Code:</strong> ${supplier?.code || "-"}</p>
        <p><strong>Date:</strong> ${Utils.formatDate()} ${Utils.formatTime()}</p>
        <div class="divider"></div>
        <div class="row"><span>Amount Paid</span><strong>${amount}</strong></div>
        <div class="row"><span>Method</span><strong>${method}</strong></div>
        <div class="row"><span>Balance</span><strong>${balance}</strong></div>
        <div class="divider"></div>
        <div class="center"><small>Thank you</small></div>
      </div>
    </body>
    </html>
    `;
  }
};