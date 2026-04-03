const appState = {
  currentPage: "shopPage",
  selectedCustomer: null,
  selectedBillId: null,
  ledgerCustomerId: null,
  currentUser: null
};

const i18n = {
  en: {
    shop: "Shop",
    bills: "Bills",
    ledger: "Ledger",
    settings: "Settings",
    dashboard: "Dashboard",
    customers: "Customers",
    inventory: "Inventory",
    reports: "Reports",
    purchases: "Purchases",
    suppliers: "Suppliers",
    cashbook: "Cashbook",
    expenses: "Expenses",
    add: "Add",
    print: "Print",
    payment: "Payment",
    profile: "Profile",
    pending: "Pending",
    overdue: "Overdue",
    normal: "Normal",
    dueSoon: "Due Soon",
    completeBill: "Complete Bill",
    saveDraft: "Save Draft",
    clear: "Clear",
    whatsapp: "WhatsApp",
    pdf: "PDF"
  },
  ur: {
    shop: "دکان",
    bills: "بل",
    ledger: "لیجر",
    settings: "سیٹنگز",
    dashboard: "ڈیش بورڈ",
    customers: "گاہک",
    inventory: "اسٹاک",
    reports: "رپورٹس",
    purchases: "خریداری",
    suppliers: "سپلائرز",
    cashbook: "کیش بک",
    expenses: "اخراجات",
    add: "شامل کریں",
    print: "پرنٹ",
    payment: "ادائیگی",
    profile: "پروفائل",
    pending: "زیر التوا",
    overdue: "لیٹ",
    normal: "نارمل",
    dueSoon: "جلد واجب",
    completeBill: "بل مکمل کریں",
    saveDraft: "ڈرافٹ محفوظ کریں",
    clear: "صاف کریں",
    whatsapp: "واٹس ایپ",
    pdf: "پی ڈی ایف"
  }
};

let salesChartInstance = null;
let stockChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  Storage.init();
  applyTheme();
  initAuth();
  initNavigation();
  initClock();
  initShopActions();
  initQuickActions();
  initBillsActions();
  initLedgerActions();
  initSettingsActions();
  initBackupImport();

  renderCurrentBillNo();
  renderCart();
  renderSelectedCustomer();
  renderBillsList();
  renderLedgerPage();
  renderSettingsDetail("dashboard");
  applyLanguage();
  applyCommonButtonTranslations();
  updateTotals();
  updateAlertBadge();
});

/* ---------------- I18N / THEME ---------------- */

function getCurrentLanguage() {
  return Storage.getSettings().language || "en";
}

function t(key) {
  const lang = getCurrentLanguage();
  return i18n[lang]?.[key] || key;
}

function applyTheme() {
  const theme = Storage.getSettings().theme || "light";
  document.body.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const settings = Storage.getSettings();
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  Storage.saveSettings(settings);
  applyTheme();
  renderSettingsDetail("theme");
  showToast(`Theme: ${settings.theme}`);
}

function toggleLanguage() {
  const settings = Storage.getSettings();
  settings.language = settings.language === "ur" ? "en" : "ur";
  Storage.saveSettings(settings);
  applyLanguage();
  applyCommonButtonTranslations();
  renderSettingsDetail("theme");
  showToast(`Language: ${settings.language}`);
}

function applyLanguage() {
  const navButtons = document.querySelectorAll(".nav-btn");

  navButtons.forEach(btn => {
    const page = btn.dataset.page;

    if (page === "shopPage") btn.querySelector(".nav-label").textContent = t("shop");
    if (page === "billsPage") btn.querySelector(".nav-label").textContent = t("bills");
    if (page === "ledgerPage") btn.querySelector(".nav-label").textContent = t("ledger");
    if (page === "settingsPage") btn.querySelector(".nav-label").textContent = t("settings");
  });

  const currentPage = appState.currentPage;

  if (currentPage === "shopPage") {
    document.getElementById("pageTitle").textContent = t("shop");
  } else if (currentPage === "billsPage") {
    document.getElementById("pageTitle").textContent = t("bills");
  } else if (currentPage === "ledgerPage") {
    document.getElementById("pageTitle").textContent = t("ledger");
  } else if (currentPage === "settingsPage") {
    document.getElementById("pageTitle").textContent = t("settings");
  }
}

function applyCommonButtonTranslations() {
  const map = [
    ["completeBillBtn", "completeBill"],
    ["saveDraftBtn", "saveDraft"],
    ["printBillBtn", "print"],
    ["pdfBillBtn", "pdf"],
    ["whatsappBillBtn", "whatsapp"]
  ];

  map.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
}

/* ---------------- AUTH ---------------- */

function initAuth() {
  const session = Storage.getSession();

  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);

  if (session) {
    appState.currentUser = session;
    showApp();
  } else {
    showLogin();
  }
}

function handleLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const user = POS.login(username, password);
    appState.currentUser = user;
    showApp();
    showToast(`Welcome ${user.name}`);
  } catch (error) {
    showToast(error.message);
  }
}

function handleLogout() {
  POS.logout();
  appState.currentUser = null;
  showLogin();
  showToast("Logged out");
}

function showLogin() {
  document.getElementById("loginScreen")?.classList.remove("hidden");
  document.getElementById("app")?.classList.add("hidden");
}

function showApp() {
  document.getElementById("loginScreen")?.classList.add("hidden");
  document.getElementById("app")?.classList.remove("hidden");
  renderUserUI();
}

function renderUserUI() {
  const user = POS.getCurrentUser();
  if (!user) return;

  document.getElementById("headerSubTitle").textContent = `${user.name} • ${user.role}`;
}

/* ---------------- NAVIGATION ---------------- */

function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubTitle = document.getElementById("headerSubTitle");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetPage = btn.dataset.page;
      const title = btn.dataset.title || "";
      const subtitle = btn.dataset.subtitle || "";

      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      pages.forEach(page => page.classList.remove("active-page"));
      document.getElementById(targetPage).classList.add("active-page");

      pageTitle.textContent = title;
      pageSubTitle.textContent = subtitle;
      appState.currentPage = targetPage;

      applyLanguage();

      if (targetPage === "billsPage") renderBillsList();
      if (targetPage === "ledgerPage") renderLedgerPage();
      if (targetPage === "settingsPage") renderSettingsDetail("dashboard");
    });
  });
}

function switchToPage(pageId, title = "", subtitle = "") {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  document.getElementById(pageId)?.classList.add("active-page");

  if (title) document.getElementById("pageTitle").textContent = title;
  if (subtitle) document.getElementById("headerSubTitle").textContent = subtitle;

  appState.currentPage = pageId;
  applyLanguage();
}

/* ---------------- CLOCK ---------------- */

function initClock() {
  function updateDateTime() {
    const now = new Date();
    document.getElementById("currentBillDate").textContent = Utils.formatDisplayDate(now);
    document.getElementById("currentBillTime").textContent = Utils.formatTime(now);
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);
}

function renderCurrentBillNo() {
  const counters = Storage.getCounters();
  const settings = Storage.getSettings();
  document.getElementById("currentBillNo").textContent = `${settings.invoicePrefix}${counters.invoice}`;
}

/* ---------------- QUICK / ALERTS / SEARCH ---------------- */

function initQuickActions() {
  document.getElementById("alertsBtn").addEventListener("click", () => {
    switchToPage("settingsPage", t("settings"), "Notifications");
    renderSettingsDetail("notifications");
  });

  document.getElementById("globalSearchBtn").addEventListener("click", openGlobalSearchModal);
}

function updateAlertBadge() {
  const overdueReturns = POS.getOverdueReturns().length;
  const lowStock = POS.getLowStockAlerts().length;
  const total = overdueReturns + lowStock;

  const badge = document.getElementById("alertsBadge");
  if (!badge) return;

  badge.textContent = total;
  badge.style.display = total > 0 ? "grid" : "none";
}

function openGlobalSearchModal() {
  renderGlobalSearchModal("");
}

function renderGlobalSearchModal(query = "") {
  const results = POS.globalSearch(query);

  openSimpleModal("Global Search", `
    <input id="globalSearchInputModal" class="form-input" type="text" placeholder="Search customer, bill, phone, code" value="${query}" />

    <div style="margin-top:12px;">
      <h4>Customers</h4>
      ${
        results.customers.length
          ? results.customers.slice(0, 5).map(c => `
            <div class="cart-item" onclick="openCustomerProfile('${c.id}')">
              <div>
                <h4 style="margin:0 0 4px;">${c.name}</h4>
                <p style="margin:0; color:#64748b;">${c.code} | ${c.phone || "-"}</p>
              </div>
            </div>
          `).join("")
          : "<p style='color:#64748b;'>No customer match</p>"
      }
    </div>

    <div style="margin-top:12px;">
      <h4>Bills</h4>
      ${
        results.orders.length
          ? results.orders.slice(0, 5).map(o => `
            <div class="cart-item" onclick="selectBill('${o.id}'); closeModal(); switchToPage('billsPage','بل','Bills & Orders'); renderBillsList();">
              <div>
                <h4 style="margin:0 0 4px;">${o.billNo}</h4>
                <p style="margin:0; color:#64748b;">${o.customerName} | ${o.date}</p>
              </div>
            </div>
          `).join("")
          : "<p style='color:#64748b;'>No bill match</p>"
      }
    </div>

    <div style="margin-top:12px;">
      <h4>Pending Returns</h4>
      ${
        results.pendingReturns.length
          ? results.pendingReturns.slice(0, 5).map(p => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${p.customerName}</h4>
                <p style="margin:0; color:#64748b;">${p.size}kg | Qty ${p.qty} | Due ${p.dueDate}</p>
              </div>
            </div>
          `).join("")
          : "<p style='color:#64748b;'>No pending return match</p>"
      }
    </div>
  `, false);

  setTimeout(() => {
    const input = document.getElementById("globalSearchInputModal");
    if (input) {
      input.focus();
      input.addEventListener("input", e => renderGlobalSearchModal(e.target.value));
    }
  }, 50);
}

/* ---------------- SHOP ACTIONS ---------------- */

function initShopActions() {
  document.querySelectorAll(".size-btn").forEach(btn => {
    btn.addEventListener("click", () => openSaleTypeModal(btn.dataset.size));
  });

  document.getElementById("customKgBtn").addEventListener("click", openCustomKgModal);
  document.getElementById("returnEmptyBtn").addEventListener("click", openReturnEmptyModal);
  document.getElementById("receivePaymentBtn").addEventListener("click", openReceivePaymentModal);
  document.getElementById("addCustomerBtn").addEventListener("click", openAddCustomerModal);
  document.getElementById("openCustomerSearchBtn").addEventListener("click", openCustomerSearchModal);

  document.getElementById("clearCartBtn").addEventListener("click", () => {
    POS.clearCart();
    renderCart();
    showToast("Cart cleared");
  });

  document.getElementById("saveDraftBtn").addEventListener("click", () => {
    showToast("Draft feature next step");
  });

  document.getElementById("completeBillBtn").addEventListener("click", completeBill);
  document.getElementById("paidAmountInput").addEventListener("input", updateTotals);

  document.getElementById("printBillBtn").addEventListener("click", () => {
    const latest = getLatestOrder();
    if (!latest) return showToast("No saved bill found");
    printInvoice(latest.id, "thermal");
  });

  document.getElementById("pdfBillBtn").addEventListener("click", () => {
    const latest = getLatestOrder();
    if (!latest) return showToast("No saved bill found");
    openInvoicePreview(latest.id);
    showToast("Use browser Print > Save as PDF");
  });

  document.getElementById("whatsappBillBtn").addEventListener("click", () => {
    const latest = getLatestOrder();
    if (!latest) return showToast("No saved bill found");
    shareBillOnWhatsApp(latest.id);
  });
}

/* ---------------- CUSTOMER ---------------- */

function openCustomerSearchModal() {
  renderCustomerSearchModal("");
}

function renderCustomerSearchModal(query = "") {
  const customers = POS.searchCustomers(query);

  openSimpleModal("Select Customer", `
    <input id="modalCustomerSearchInput" class="form-input" type="text" placeholder="Search by code, name, phone" value="${query}" />
    <div id="customerSearchResults" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
      ${
        customers.length
          ? customers.map(customer => `
            <div class="cart-item" style="cursor:pointer;" onclick="selectCustomer('${customer.id}')">
              <div>
                <h4 style="margin:0 0 6px;">${customer.name}</h4>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <span class="status-badge info">${customer.code}</span>
                  <span style="color:#64748b;">${customer.phone || "-"}</span>
                  <span style="color:#64748b;">${customer.area || "-"}</span>
                </div>
              </div>
            </div>
          `).join("")
          : `<div class="empty-list-state"><p>No customers found</p></div>`
      }
    </div>
    <button class="action-btn primary-btn modal-action" onclick="openAddCustomerModal()">+ Add New Customer</button>
  `, false);

  setTimeout(() => {
    const input = document.getElementById("modalCustomerSearchInput");
    if (input) {
      input.focus();
      input.addEventListener("input", e => renderCustomerSearchModal(e.target.value));
    }
  }, 50);
}

function selectCustomer(customerId) {
  const customer = POS.getCustomerById(customerId);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  appState.selectedCustomer = customer;
  appState.ledgerCustomerId = customer.id;

  document.getElementById("customerSearchInput").value = `${customer.name} - ${customer.code}`;
  document.getElementById("ledgerCustomerSearchInput").value = `${customer.name} - ${customer.code}`;

  renderSelectedCustomer();
  renderLedgerPage();
  closeModal();
  showToast(`Customer selected: ${customer.name}`);
}

function openAddCustomerModal() {
  openSimpleModal("Add New Customer", `
    <input id="custName" class="form-input" type="text" placeholder="Customer Name" />
    <input id="custPhone" class="form-input" type="text" placeholder="Phone Number" />
    <input id="custArea" class="form-input" type="text" placeholder="Area" />
    <input id="custIdCard" class="form-input" type="text" placeholder="ID Card Number" />
    <button class="action-btn primary-btn modal-action" onclick="saveCustomer()">Save Customer</button>
  `, false);
}

function saveCustomer() {
  const name = document.getElementById("custName")?.value?.trim();
  const phone = document.getElementById("custPhone")?.value?.trim();
  const area = document.getElementById("custArea")?.value?.trim();
  const idCard = document.getElementById("custIdCard")?.value?.trim();

  if (!name) {
    showToast("Customer name required");
    return;
  }

  const customer = POS.createCustomer({ name, phone, area, idCard });
  POS.addAuditLog("customer_create", `Created customer ${customer.code} - ${customer.name}`);

  appState.selectedCustomer = customer;
  appState.ledgerCustomerId = customer.id;

  document.getElementById("customerSearchInput").value = `${customer.name} - ${customer.code}`;
  document.getElementById("ledgerCustomerSearchInput").value = `${customer.name} - ${customer.code}`;

  renderSelectedCustomer();
  renderLedgerPage();
  closeModal();
  showToast(`Customer created: ${customer.code}`);
}

function openCustomerProfile(customerId = null) {
  const id = customerId || appState.selectedCustomer?.id || appState.ledgerCustomerId;
  if (!id) {
    showToast("Select customer first");
    return;
  }

  const customer = POS.getCustomerById(id);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  const due = POS.getCustomerBalance(customer.id);
  const pending = POS.getCustomerPendingSummary(customer.id);
  const rates = POS.getCustomerRates(customer.id);

  openSimpleModal(`Customer Profile - ${customer.name}`, `
    <div class="card" style="padding:12px;">
      <p><strong>Code:</strong> ${customer.code}</p>
      <p><strong>Name:</strong> ${customer.name}</p>
      <p><strong>Phone:</strong> ${customer.phone || "-"}</p>
      <p><strong>Area:</strong> ${customer.area || "-"}</p>
      <p><strong>ID Card:</strong> ${customer.idCard || "-"}</p>
      <p><strong>Due:</strong> ${due}</p>
      <p><strong>Pending:</strong> 15kg ${pending.pending15}, 35kg ${pending.pending35}, 45kg ${pending.pending45}</p>
    </div>

    <div class="card" style="padding:12px; margin-top:10px;">
      <h4 style="margin-top:0;">Custom Rates</h4>
      <p>15kg Refill: ${rates.refill15}</p>
      <p>35kg Refill: ${rates.refill35}</p>
      <p>45kg Refill: ${rates.refill45}</p>
      <p>15kg Empty: ${rates.empty15}</p>
      <p>35kg Empty: ${rates.empty35}</p>
      <p>45kg Empty: ${rates.empty45}</p>
      <p>KG Rate: ${rates.kgRate}</p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="openEditCustomerModal('${customer.id}')">Edit Info</button>
      <button class="action-btn warning-btn" onclick="openCustomerRatesModal('${customer.id}')">Edit Rates</button>
      <button class="action-btn success-btn" onclick="selectCustomer('${customer.id}')">Select</button>
      <button class="action-btn" onclick="openPendingEmptiesModal()">Pending</button>
      <button class="action-btn" onclick="openReturnedHistoryModal('${customer.id}')">Return History</button>
    </div>
  `, false);
}

function openEditCustomerModal(customerId) {
  const customer = POS.getCustomerById(customerId);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  openSimpleModal(`Edit Customer - ${customer.name}`, `
    <input id="editCustName" class="form-input" type="text" value="${customer.name || ""}" placeholder="Name" />
    <input id="editCustPhone" class="form-input" type="text" value="${customer.phone || ""}" placeholder="Phone" />
    <input id="editCustArea" class="form-input" type="text" value="${customer.area || ""}" placeholder="Area" />
    <input id="editCustIdCard" class="form-input" type="text" value="${customer.idCard || ""}" placeholder="ID Card" />
    <button class="action-btn primary-btn modal-action" onclick="saveEditedCustomer('${customer.id}')">Save Customer</button>
  `, false);
}

function saveEditedCustomer(customerId) {
  const updated = POS.updateCustomerBasicInfo(customerId, {
    name: document.getElementById("editCustName").value.trim(),
    phone: document.getElementById("editCustPhone").value.trim(),
    area: document.getElementById("editCustArea").value.trim(),
    idCard: document.getElementById("editCustIdCard").value.trim()
  });

  POS.addAuditLog("customer_edit", `Edited customer ${updated.code} - ${updated.name}`);

  if (appState.selectedCustomer?.id === customerId) {
    appState.selectedCustomer = updated;
  }

  renderSelectedCustomer();
  renderLedgerPage();
  renderSettingsDetail("customers");
  closeModal();
  showToast("Customer updated");
}

function openCustomerRatesModal(customerId) {
  const customer = POS.getCustomerById(customerId);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  const rates = POS.getCustomerRates(customerId);

  openSimpleModal(`Edit Rates - ${customer.name}`, `
    <input id="rateRefill15" class="form-input" type="number" value="${rates.refill15}" placeholder="15kg Refill" />
    <input id="rateRefill35" class="form-input" type="number" value="${rates.refill35}" placeholder="35kg Refill" />
    <input id="rateRefill45" class="form-input" type="number" value="${rates.refill45}" placeholder="45kg Refill" />
    <input id="rateEmpty15" class="form-input" type="number" value="${rates.empty15}" placeholder="15kg Empty" />
    <input id="rateEmpty35" class="form-input" type="number" value="${rates.empty35}" placeholder="35kg Empty" />
    <input id="rateEmpty45" class="form-input" type="number" value="${rates.empty45}" placeholder="45kg Empty" />
    <input id="rateKg" class="form-input" type="number" value="${rates.kgRate}" placeholder="KG Rate" />
    <button class="action-btn warning-btn modal-action" onclick="saveCustomerRates('${customer.id}')">Save Rates</button>
  `, false);
}

function saveCustomerRates(customerId) {
  try {
    POS.requirePermission("edit_rates", "Only owner can edit customer rates");
  } catch (error) {
    showToast(error.message);
    return;
  }

  POS.updateCustomerRates(customerId, {
    refill15: Utils.toNumber(document.getElementById("rateRefill15").value, 0),
    refill35: Utils.toNumber(document.getElementById("rateRefill35").value, 0),
    refill45: Utils.toNumber(document.getElementById("rateRefill45").value, 0),
    empty15: Utils.toNumber(document.getElementById("rateEmpty15").value, 0),
    empty35: Utils.toNumber(document.getElementById("rateEmpty35").value, 0),
    empty45: Utils.toNumber(document.getElementById("rateEmpty45").value, 0),
    kgRate: Utils.toNumber(document.getElementById("rateKg").value, 0)
  });

  const customer = POS.getCustomerById(customerId);
  POS.addAuditLog("customer_rates", `Updated rates for ${customer?.code || customerId}`);

  renderSelectedCustomer();
  renderLedgerPage();
  renderSettingsDetail("customers");
  closeModal();
  showToast("Customer rates updated");
}

function renderSelectedCustomer() {
  const card = document.getElementById("selectedCustomerCard");

  if (!appState.selectedCustomer) {
    card.className = "customer-card empty-state-card";
    card.innerHTML = `<p>No customer selected</p>`;
    document.getElementById("previousDueAmount").textContent = 0;
    return;
  }

  const customer = POS.getCustomerById(appState.selectedCustomer.id) || appState.selectedCustomer;
  const due = POS.getCustomerBalance(customer.id);
  const pending = POS.getCustomerPendingSummary(customer.id);
  const overdueInfo = POS.getCustomerOverdueInfo(customer.id);

  appState.selectedCustomer = customer;

  card.className = "customer-card";
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
      <div>
        <h3 style="margin:0 0 6px;">${customer.name}</h3>
        <p style="margin:0; color:#64748b;">Code: ${customer.code}</p>
        <p style="margin:6px 0 0; color:#64748b;">Phone: ${customer.phone || "-"}</p>
        <p style="margin:6px 0 0; color:#64748b;">Area: ${customer.area || "-"}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 6px;"><strong>Due:</strong> ${due}</p>
        <p style="margin:0;"><strong>Pending:</strong> 15kg ${pending.pending15}, 35kg ${pending.pending35}, 45kg ${pending.pending45}</p>
      </div>
    </div>

    <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
      ${overdueInfo.hasOverdue ? `<span class="status-badge danger">Overdue ${overdueInfo.overdueCount}</span>` : ""}
      ${overdueInfo.hasDueSoon ? `<span class="status-badge warning">Due Soon ${overdueInfo.dueSoonCount}</span>` : ""}
      ${!overdueInfo.hasOverdue && !overdueInfo.hasDueSoon ? `<span class="status-badge success">Normal</span>` : ""}
    </div>

    <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
      <button class="chip-btn" onclick="openCustomerSearchModal()">Change</button>
      <button class="chip-btn" onclick="openReceivePaymentModal()">Payment</button>
      <button class="chip-btn" onclick="openCustomerProfile('${customer.id}')">Profile</button>
    </div>
  `;

  updateTotals();
}

/* ---------------- POS SALE FLOW ---------------- */

function getDefaultRate(size, type) {
  const customerId = appState.selectedCustomer?.id || null;

  if (type === "refill") {
    return POS.getRateForCustomer({ customerId, size, type: "refill" });
  }

  if (type === "empty") {
    return POS.getRateForCustomer({ customerId, size, type: "empty" });
  }

  if (type === "kg") {
    return POS.getRateForCustomer({ customerId, type: "kg" });
  }

  return 0;
}

function openSaleTypeModal(size) {
  openSimpleModal(`${size}kg Sale Type`, `
    <button class="action-btn primary-btn modal-action" onclick="openRefillModeModal(${size})">Refill / Exchange</button>
    <button class="action-btn warning-btn modal-action" onclick="openNewReturnForm(${size})">New - Return Later</button>
    <button class="action-btn success-btn modal-action" onclick="openNewPaidForm(${size})">New - Paid Cylinder</button>
    <button class="action-btn secondary-btn modal-action" onclick="addEmptyOnlyItem(${size})">Empty Only - Paid</button>
  `, false);
}

function openRefillModeModal(size) {
  openSimpleModal(`${size}kg Refill / Exchange`, `
    <button class="action-btn primary-btn modal-action" onclick="addRefillItem(${size}, 'exchange_now')">Customer gave empty now (Exchange)</button>
    <button class="action-btn secondary-btn modal-action" onclick="addRefillItem(${size}, 'own_cylinder')">Customer own cylinder refill</button>
  `, false);
}

function addRefillItem(size, refillMode = "exchange_now") {
  const stockCheck = POS.checkStockAvailability(size, 1, "refill");
  if (!stockCheck.ok) {
    showToast(stockCheck.message);
    return;
  }

  const rate = getDefaultRate(size, "refill");
  const itemName =
    refillMode === "own_cylinder"
      ? `${size}kg Refill - Own Cylinder`
      : `${size}kg Refill - Exchange`;

  POS.addItemToCart({
    itemType: "refill",
    itemName,
    size,
    qty: 1,
    rate,
    total: rate,
    emptyStatus: "none",
    note: refillMode
  });

  closeModal();
  renderCart();
  showToast(`${size}kg refill added`);
}

function openNewReturnForm(size) {
  if (!appState.selectedCustomer) {
    showToast("Customer required for return-later");
    return;
  }

  openSimpleModal(`${size}kg New - Return Later`, `
    <input id="returnQty" class="form-input" type="number" value="1" placeholder="Quantity" />
    <input id="returnRate" class="form-input" type="number" value="${getDefaultRate(size, "refill")}" placeholder="Gas Rate" />
    <input id="returnDays" class="form-input" type="number" value="${Storage.getSettings().reminderDays}" placeholder="Due Days" />
    <button class="action-btn warning-btn modal-action" onclick="saveNewReturnItem(${size})">Add Item</button>
  `, false);
}

function saveNewReturnItem(size) {
  const qty = Utils.toNumber(document.getElementById("returnQty").value, 1);
  const rate = Utils.toNumber(document.getElementById("returnRate").value, 0);
  const days = Utils.toNumber(document.getElementById("returnDays").value, 15);

  const stockCheck = POS.checkStockAvailability(size, qty, "new_return");
  if (!stockCheck.ok) {
    showToast(stockCheck.message);
    return;
  }

  POS.addItemToCart({
    itemType: "new_return",
    itemName: `${size}kg Filled Cylinder`,
    size,
    qty,
    rate,
    total: qty * rate,
    emptyStatus: "pending",
    dueDays: days,
    dueDate: Utils.addDays(new Date(), days)
  });

  closeModal();
  renderCart();
  showToast(`${size}kg return-later item added`);
}

function openNewPaidForm(size) {
  openSimpleModal(`${size}kg New - Paid Cylinder`, `
    <input id="paidQty" class="form-input" type="number" value="1" placeholder="Quantity" />
    <input id="filledRate" class="form-input" type="number" value="${getDefaultRate(size, "refill")}" placeholder="Filled Gas Rate" />
    <input id="emptyRate" class="form-input" type="number" value="${getDefaultRate(size, "empty")}" placeholder="Empty Cylinder Price" />
    <button class="action-btn success-btn modal-action" onclick="saveNewPaidItem(${size})">Add Item</button>
  `, false);
}

function saveNewPaidItem(size) {
  const qty = Utils.toNumber(document.getElementById("paidQty").value, 1);
  const filledRate = Utils.toNumber(document.getElementById("filledRate").value, 0);
  const emptyRate = Utils.toNumber(document.getElementById("emptyRate").value, 0);

  const stockCheck = POS.checkStockAvailability(size, qty, "new_paid");
  if (!stockCheck.ok) {
    showToast(stockCheck.message);
    return;
  }

  POS.addItemToCart({
    itemType: "new_paid",
    itemName: `${size}kg New Cylinder - Paid`,
    size,
    qty,
    rate: filledRate + emptyRate,
    total: qty * (filledRate + emptyRate),
    emptyStatus: "paid"
  });

  closeModal();
  renderCart();
  showToast(`${size}kg paid cylinder added`);
}

function addEmptyOnlyItem(size) {
  const stockCheck = POS.checkStockAvailability(size, 1, "empty_paid");
  if (!stockCheck.ok) {
    showToast(stockCheck.message);
    return;
  }

  const rate = getDefaultRate(size, "empty");

  POS.addItemToCart({
    itemType: "empty_paid",
    itemName: `${size}kg Empty Cylinder Paid`,
    size,
    qty: 1,
    rate,
    total: rate,
    emptyStatus: "paid"
  });

  closeModal();
  renderCart();
  showToast(`${size}kg empty cylinder added`);
}

function openCustomKgModal() {
  openSimpleModal("Custom Gas by KG", `
    <input id="customKgValue" class="form-input" type="number" placeholder="Enter KG" />
    <input id="customKgRate" class="form-input" type="number" value="${getDefaultRate(null, "kg")}" placeholder="Rate per KG" />
    <button class="action-btn primary-btn modal-action" onclick="addCustomKgItem()">Add Item</button>
  `, false);
}

function addCustomKgItem() {
  const kg = Utils.toNumber(document.getElementById("customKgValue").value, 0);
  const rate = Utils.toNumber(document.getElementById("customKgRate").value, 0);

  if (!kg || !rate) {
    showToast("Enter KG and rate");
    return;
  }

  POS.addItemToCart({
    itemType: "gas_kg",
    itemName: `Gas by KG - ${kg}kg`,
    kg,
    qty: 1,
    rate,
    total: kg * rate,
    emptyStatus: "none"
  });

  closeModal();
  renderCart();
  showToast("Custom KG item added");
}

/* ---------------- CART ---------------- */

function renderCart() {
  const cart = Storage.getCart();
  const cartList = document.getElementById("cartItemsList");

  if (!cart.length) {
    cartList.innerHTML = `
      <div class="empty-list-state">
        <p>No items added yet</p>
      </div>
    `;
    updateTotals();
    return;
  }

  cartList.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div>
        <h4 style="margin:0 0 6px;">${item.itemName}</h4>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <span class="status-badge ${getBadgeClass(item.itemType)}">${item.itemType}</span>
          ${item.size ? `<span style="color:#64748b;">Size: ${item.size}kg</span>` : ""}
          ${item.kg ? `<span style="color:#64748b;">KG: ${item.kg}</span>` : ""}
          <span style="color:#64748b;">Qty: ${item.qty}</span>
          <span style="color:#64748b;">Rate: ${item.rate}</span>
        </div>
      </div>
      <div style="text-align:right;">
        <strong>${item.total}</strong>
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
          <button class="chip-btn" onclick="openEditCartItemModal('${item.id}')">Edit</button>
          <button class="chip-btn" onclick="removeCartItem('${item.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  updateTotals();
}

function openEditCartItemModal(itemId) {
  const cart = Storage.getCart();
  const item = cart.find(i => i.id === itemId);

  if (!item) {
    showToast("Item not found");
    return;
  }

  openSimpleModal(`Edit Item - ${item.itemName}`, `
    <input id="editCartQty" class="form-input" type="number" value="${item.qty || 1}" placeholder="Qty" />
    <input id="editCartRate" class="form-input" type="number" value="${item.rate || 0}" placeholder="Rate" />
    ${item.kg ? `<input id="editCartKg" class="form-input" type="number" value="${item.kg}" placeholder="KG" />` : ""}
    ${item.itemType === "new_return" ? `<input id="editCartDueDays" class="form-input" type="number" value="${item.dueDays || 15}" placeholder="Due Days" />` : ""}
    <input id="editCartNote" class="form-input" type="text" value="${item.note || ""}" placeholder="Note" />
    <button class="action-btn primary-btn modal-action" onclick="saveEditedCartItem('${item.id}')">Save Item</button>
  `, false);
}

function saveEditedCartItem(itemId) {
  try {
    const cart = Storage.getCart();
    const oldItem = cart.find(i => i.id === itemId);
    if (!oldItem) throw new Error("Item not found");

    const qty = Utils.toNumber(document.getElementById("editCartQty")?.value, oldItem.qty || 1);
    const rate = Utils.toNumber(document.getElementById("editCartRate")?.value, oldItem.rate || 0);
    const kg = oldItem.kg ? Utils.toNumber(document.getElementById("editCartKg")?.value, oldItem.kg) : oldItem.kg;
    const dueDays = oldItem.itemType === "new_return"
      ? Utils.toNumber(document.getElementById("editCartDueDays")?.value, oldItem.dueDays || 15)
      : oldItem.dueDays;
    const note = document.getElementById("editCartNote")?.value?.trim() || "";

    if (oldItem.size && ["refill", "new_return", "new_paid"].includes(oldItem.itemType)) {
      const stockCheck = POS.checkStockAvailability(oldItem.size, qty, oldItem.itemType);
      if (!stockCheck.ok) {
        showToast(stockCheck.message);
        return;
      }
    }

    POS.updateCartItem(itemId, {
      qty,
      rate,
      kg,
      dueDays,
      dueDate: oldItem.itemType === "new_return" ? Utils.addDays(new Date(), dueDays) : oldItem.dueDate,
      note
    });

    renderCart();
    closeModal();
    showToast("Cart item updated");
  } catch (error) {
    showToast(error.message);
  }
}

function removeCartItem(id) {
  POS.removeItemFromCart(id);
  renderCart();
  showToast("Item removed");
}

function updateTotals() {
  const paidAmount = Utils.toNumber(document.getElementById("paidAmountInput").value, 0);
  const totals = POS.getCartTotals(appState.selectedCustomer, paidAmount, 0, 0);

  document.getElementById("subtotalAmount").textContent = totals.subtotal;
  document.getElementById("discountAmount").textContent = totals.discount;
  document.getElementById("previousDueAmount").textContent = totals.previousDue;
  document.getElementById("grandTotalAmount").textContent = totals.grandTotal;
  document.getElementById("balanceAmount").textContent = totals.balance;
}

function completeBill() {
  try {
    const paidAmount = Utils.toNumber(document.getElementById("paidAmountInput").value, 0);
    const paymentMethod = document.getElementById("paymentMethodSelect").value;

    const order = POS.saveOrder({
      selectedCustomer: appState.selectedCustomer,
      paidAmount,
      paymentMethod
    });

    POS.addAuditLog("bill_create", `Created bill ${order.billNo}`);

    appState.selectedBillId = order.id;
    document.getElementById("paidAmountInput").value = 0;

    renderCurrentBillNo();
    renderCart();
    renderSelectedCustomer();
    renderBillsList();
    renderLedgerPage();
    renderSettingsDetail("dashboard");
    updateAlertBadge();

    showToast(`Bill saved: ${order.billNo}`);
  } catch (error) {
    showToast(error.message);
  }
}

/* ---------------- RETURNS ---------------- */

function openReturnEmptyModal() {
  const customerId = appState.selectedCustomer?.id || appState.ledgerCustomerId;
  if (!customerId) {
    showToast("Select customer first");
    return;
  }

  const pendings = POS.getPendingReturnsByCustomer(customerId);

  openSimpleModal("Return Empty Cylinder", `
    ${
      pendings.length
        ? pendings.map(item => {
            const statusInfo = POS.getPendingReturnStatus(item.dueDate);
            return `
              <div class="cart-item" style="margin-bottom:8px;">
                <div>
                  <h4 style="margin:0 0 4px;">${item.size}kg Cylinder</h4>
                  <p style="margin:0; color:#64748b;">Pending Qty: ${item.qty}</p>
                  <p style="margin:4px 0 0; color:#64748b;">Issue: ${item.issueDate} | Due: ${item.dueDate}</p>
                </div>
                <div style="text-align:right;">
                  <span class="status-badge ${statusInfo.className}">${statusInfo.label}</span>
                  <div style="margin-top:8px;">
                    <button class="chip-btn" onclick="openExactReturnModal('${item.id}')">Return</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="empty-list-state"><p>No pending empties for this customer</p></div>`
    }
  `);
}

function openExactReturnModal(pendingId) {
  const pending = POS.getPendingReturnById(pendingId);
  if (!pending) {
    showToast("Pending entry not found");
    return;
  }

  openSimpleModal(`Return ${pending.size}kg Cylinder`, `
    <p><strong>Customer:</strong> ${pending.customerName}</p>
    <p><strong>Pending Qty:</strong> ${pending.qty}</p>
    <p><strong>Due Date:</strong> ${pending.dueDate}</p>
    <input id="exactReturnQty" class="form-input" type="number" value="${pending.qty}" placeholder="Return Qty" />
    <input id="exactReturnNote" class="form-input" type="text" placeholder="Note (optional)" />
    <button class="action-btn warning-btn modal-action" onclick="saveExactReturn('${pending.id}')">Save Return</button>
  `, false);
}

function saveExactReturn(pendingId) {
  try {
    const qty = Utils.toNumber(document.getElementById("exactReturnQty").value, 0);
    const note = document.getElementById("exactReturnNote").value.trim();

    POS.returnPendingById({ pendingId, qty, note });

    renderSelectedCustomer();
    renderLedgerPage();
    renderBillsList();
    renderSettingsDetail("inventory");
    closeModal();
    updateAlertBadge();
    showToast("Exact return saved");
  } catch (error) {
    showToast(error.message);
  }
}

function openPendingEmptiesModal() {
  const customerId = appState.ledgerCustomerId || appState.selectedCustomer?.id;
  if (!customerId) {
    showToast("Select customer first");
    return;
  }

  const pendings = POS.getPendingReturnsByCustomer(customerId);

  openSimpleModal("Pending Empty Cylinders", `
    ${
      pendings.length
        ? pendings.map(item => {
            const statusInfo = POS.getPendingReturnStatus(item.dueDate);
            return `
              <div class="cart-item">
                <div>
                  <h4 style="margin:0 0 4px;">${item.size}kg Cylinder</h4>
                  <p style="margin:0; color:#64748b;">Qty: ${item.qty} | Due: ${item.dueDate}</p>
                  <p style="margin:4px 0 0; color:#64748b;">Bill: ${item.billNo}</p>
                </div>
                <div style="text-align:right;">
                  <span class="status-badge ${statusInfo.className}">${statusInfo.label}</span>
                  <div style="margin-top:8px;">
                    <button class="chip-btn" onclick="openExactReturnModal('${item.id}')">Return</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="empty-list-state"><p>No pending empties</p></div>`
    }
  `);
}

function openReturnedHistoryModal(customerId = null) {
  const id = customerId || appState.selectedCustomer?.id || appState.ledgerCustomerId;
  if (!id) {
    showToast("Select customer first");
    return;
  }

  const history = POS.getReturnedHistoryByCustomer(id);

  openSimpleModal("Returned Cylinder History", `
    ${
      history.length
        ? history.map(item => `
          <div class="cart-item">
            <div>
              <h4 style="margin:0 0 4px;">${item.size}kg Cylinder</h4>
              <p style="margin:0; color:#64748b;">Returned Qty: ${item.qty}</p>
              <p style="margin:4px 0 0; color:#64748b;">Returned On: ${item.returnDate || "-"}</p>
              <p style="margin:4px 0 0; color:#64748b;">Bill: ${item.billNo || "-"}</p>
            </div>
          </div>
        `).join("")
        : `<div class="empty-list-state"><p>No returned history found</p></div>`
    }
  `);
}

/* ---------------- PAYMENTS ---------------- */

function openReceivePaymentModal() {
  const customer = appState.currentPage === "ledgerPage"
    ? POS.getCustomerById(appState.ledgerCustomerId)
    : appState.selectedCustomer;

  if (!customer) {
    showToast("Select customer first");
    return;
  }

  openSimpleModal("Receive Payment", `
    <p><strong>Customer:</strong> ${customer.name}</p>
    <p><strong>Current Due:</strong> ${POS.getCustomerBalance(customer.id)}</p>
    <input id="paymentAmountInput" class="form-input" type="number" placeholder="Amount Received" />
    <select id="paymentMethodInput" class="form-select">
      <option value="cash">Cash</option>
      <option value="bank">Bank</option>
      <option value="easypaisa">EasyPaisa</option>
      <option value="jazzcash">JazzCash</option>
    </select>
    <button class="action-btn success-btn modal-action" onclick="saveCustomerPayment('${customer.id}')">Save Payment</button>
  `, false);
}

function saveCustomerPayment(customerId) {
  const amount = Utils.toNumber(document.getElementById("paymentAmountInput").value, 0);
  const method = document.getElementById("paymentMethodInput").value;

  if (!amount) {
    showToast("Enter payment amount");
    return;
  }

  POS.receivePayment({ customerId, amount, method });
  POS.addAuditLog("payment_received", `Payment received from ${customerId} amount ${amount}`);

  closeModal();

  openSimpleModal("Payment Saved", `
    <p>Payment received successfully.</p>
    <p><strong>Amount:</strong> ${amount}</p>
    <p><strong>Method:</strong> ${method}</p>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="printPaymentReceipt('${customerId}', ${amount}, '${method}')">Print Receipt</button>
      <button class="action-btn success-btn" onclick="sharePaymentReceiptOnWhatsApp('${customerId}', ${amount}, '${method}')">WhatsApp</button>
    </div>
  `, false);

  renderSelectedCustomer();
  renderLedgerPage();
  renderBillsList();
  renderSettingsDetail("dashboard");
  updateAlertBadge();
  showToast("Payment saved");
}

/* ---------------- BILLS PAGE ---------------- */

function initBillsActions() {
  document.getElementById("billSearchInput")?.addEventListener("input", renderBillsList);
  document.getElementById("billDateFrom")?.addEventListener("change", renderBillsList);
  document.getElementById("billDateTo")?.addEventListener("change", renderBillsList);
  document.getElementById("billStatusFilter")?.addEventListener("change", renderBillsList);
  document.getElementById("emptyStatusFilter")?.addEventListener("change", renderBillsList);
  document.getElementById("billSizeFilter")?.addEventListener("change", renderBillsList);

  document.getElementById("billOpenBtn")?.addEventListener("click", () => {
    if (!appState.selectedBillId) return showToast("Select bill first");
    openInvoicePreview(appState.selectedBillId);
  });

  document.getElementById("billPrintBtn")?.addEventListener("click", () => {
    if (!appState.selectedBillId) return showToast("Select bill first");
    printInvoice(appState.selectedBillId, "thermal");
  });

  document.getElementById("billPdfBtn")?.addEventListener("click", () => {
    if (!appState.selectedBillId) return showToast("Select bill first");
    openInvoicePreview(appState.selectedBillId);
    showToast("Use browser Print > Save as PDF");
  });

  document.getElementById("billWhatsappBtn")?.addEventListener("click", () => {
    if (!appState.selectedBillId) return showToast("Select bill first");
    shareBillOnWhatsApp(appState.selectedBillId);
  });

  document.getElementById("billMarkPaidBtn")?.addEventListener("click", openBillPaymentModal);
  document.getElementById("billCloseBtn")?.addEventListener("click", closeSelectedBill);
  document.getElementById("billDeleteBtn")?.addEventListener("click", openDeleteBillModal);
  document.getElementById("billEditBtn")?.addEventListener("click", openEditBillModal);
}

function renderBillsList() {
  const billsList = document.getElementById("billsList");
  if (!billsList) return;

  const search = (document.getElementById("billSearchInput")?.value || "").toLowerCase();
  const status = document.getElementById("billStatusFilter")?.value || "";
  const dateFrom = document.getElementById("billDateFrom")?.value || "";
  const dateTo = document.getElementById("billDateTo")?.value || "";
  const emptyStatus = document.getElementById("emptyStatusFilter")?.value || "";
  const sizeFilter = document.getElementById("billSizeFilter")?.value || "";

  let orders = Storage.getOrders().slice().reverse();

  orders = orders.filter(order => {
    const matchesSearch =
      !search ||
      order.billNo.toLowerCase().includes(search) ||
      (order.customerName || "").toLowerCase().includes(search) ||
      (order.customerCode || "").toLowerCase().includes(search);

    const matchesStatus = !status || order.orderStatus === status || order.paymentStatus === status;
    const matchesFrom = !dateFrom || order.date >= dateFrom;
    const matchesTo = !dateTo || order.date <= dateTo;

    let orderEmptyStatus = "none";
    if (order.items.some(i => i.itemType === "new_return")) orderEmptyStatus = "pending";
    if (order.items.some(i => i.itemType === "new_paid" || i.itemType === "empty_paid")) orderEmptyStatus = "paid";

    const matchesEmpty = !emptyStatus || orderEmptyStatus === emptyStatus;
    const matchesSize =
      !sizeFilter ||
      order.items.some(item => String(item.size || "") === String(sizeFilter));

    return matchesSearch && matchesStatus && matchesFrom && matchesTo && matchesEmpty && matchesSize;
  });

  if (!orders.length) {
    billsList.innerHTML = `<div class="empty-list-state"><p>No bills found</p></div>`;
    renderBillPreview(null);
    return;
  }

  billsList.innerHTML = orders.map(order => {
    const hasPending = order.items.some(i => i.itemType === "new_return");
    const hasPaidCylinder = order.items.some(i => i.itemType === "new_paid" || i.itemType === "empty_paid");

    const emptyBadge = hasPending
      ? `<span class="status-badge warning">return pending</span>`
      : hasPaidCylinder
      ? `<span class="status-badge success">paid empty</span>`
      : `<span class="status-badge info">no empty</span>`;

    const closedBadge = order.isClosed
      ? `<span class="status-badge secondary">closed</span>`
      : "";

    return `
      <div class="bill-list-item" onclick="selectBill('${order.id}')">
        <div class="bill-main">
          <h4>${order.billNo}</h4>
          <p>${order.customerName} - ${order.date}</p>
          <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
            <span class="status-badge ${getOrderBadgeClass(order.paymentStatus)}">${order.paymentStatus}</span>
            ${emptyBadge}
            ${closedBadge}
          </div>
        </div>
        <div class="bill-meta">
          <strong>${order.grandTotal}</strong>
        </div>
      </div>
    `;
  }).join("");

  if (!appState.selectedBillId && orders[0]) {
    appState.selectedBillId = orders[0].id;
  }

  renderBillPreview(appState.selectedBillId);
}

function selectBill(orderId) {
  appState.selectedBillId = orderId;
  renderBillPreview(orderId);
}

function renderBillPreview(orderId) {
  const panel = document.getElementById("billPreviewPanel");
  if (!panel) return;

  const order = orderId ? POS.getOrderById(orderId) : null;

  if (!order) {
    panel.innerHTML = `<p>Select a bill to preview</p>`;
    return;
  }

  const emptyText = order.items.some(i => i.itemType === "new_return")
    ? "Return Pending"
    : order.items.some(i => i.itemType === "new_paid" || i.itemType === "empty_paid")
    ? "Paid No Return"
    : "No Empty";

  panel.innerHTML = `
    <p><strong>Bill No:</strong> ${order.billNo}</p>
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p><strong>Date:</strong> ${order.date}</p>
    <p><strong>Total:</strong> ${order.grandTotal}</p>
    <p><strong>Paid:</strong> ${order.paid}</p>
    <p><strong>Balance:</strong> ${order.customerId ? POS.getCustomerBalance(order.customerId) : order.balance}</p>
    <p><strong>Empty:</strong> ${emptyText}</p>
    <p><strong>Status:</strong> ${order.isClosed ? "Closed" : "Open"}</p>
  `;
}

function openSelectedBillDetail() {
  const order = POS.getOrderById(appState.selectedBillId);
  if (!order) {
    showToast("Select bill first");
    return;
  }

  const emptyInfo = POS.getOrderEmptySummaryText(order);
  const profit = POS.getOrderProfit(order);

  openSimpleModal(`Bill ${order.billNo}`, `
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p><strong>Date:</strong> ${order.date} ${order.time}</p>

    <div style="display:flex; flex-direction:column; gap:8px; margin:10px 0;">
      ${order.items.map(item => `
        <div class="cart-item">
          <div>
            <h4 style="margin:0 0 4px;">${item.itemName}</h4>
            <p style="margin:0; color:#64748b;">
              Qty: ${item.qty}
              ${item.size ? `| Size: ${item.size}kg` : ""}
              ${item.kg ? `| KG: ${item.kg}` : ""}
              | Rate: ${item.rate}
            </p>
            ${item.emptyStatus === "pending" ? `<p style="margin:4px 0 0; color:#92400e;">Return Due: ${item.dueDate}</p>` : ""}
          </div>
          <strong>${item.total}</strong>
        </div>
      `).join("")}
    </div>

    <p><strong>Subtotal:</strong> ${order.subtotal}</p>
    <p><strong>Previous Due:</strong> ${order.previousDue}</p>
    <p><strong>Grand Total:</strong> ${order.grandTotal}</p>
    <p><strong>Paid:</strong> ${order.paid}</p>
    <p><strong>Balance:</strong> ${order.balance}</p>
    <p><strong>Payment:</strong> ${order.paymentMethod}</p>

    ${POS.hasPermission("view_audit") ? `
      <p><strong>Estimated Cost:</strong> ${profit.estimatedCost.toFixed(2)}</p>
      <p><strong>Gross Profit:</strong> ${profit.grossProfit.toFixed(2)}</p>
    ` : ""}

    <div class="card" style="padding:10px; margin-top:10px;">
      <p><strong>Empty Status:</strong></p>
      <p style="margin:0;">${emptyInfo.text}</p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="printInvoice('${order.id}','thermal')">Print</button>
      <button class="action-btn success-btn" onclick="shareBillOnWhatsApp('${order.id}')">WhatsApp</button>
      <button class="action-btn" onclick="copyBillText('${order.id}')">Copy Text</button>
      <button class="action-btn" onclick="appState.selectedBillId='${order.id}'; openEditBillModal()">Edit</button>
      <button class="action-btn warning-btn" onclick="appState.selectedBillId='${order.id}'; openDeleteBillModal()">Delete</button>
    </div>
  `, false);
}

function openBillPaymentModal() {
  const order = POS.getOrderById(appState.selectedBillId);
  if (!order || !order.customerId) {
    showToast("Bill customer not found");
    return;
  }

  openSimpleModal("Mark Bill Payment", `
    <p><strong>Bill:</strong> ${order.billNo}</p>
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p><strong>Current Balance:</strong> ${order.balance}</p>
    <input id="billPaymentAmount" class="form-input" type="number" placeholder="Enter payment amount" />
    <select id="billPaymentMethod" class="form-select">
      <option value="cash">Cash</option>
      <option value="bank">Bank</option>
      <option value="easypaisa">EasyPaisa</option>
      <option value="jazzcash">JazzCash</option>
    </select>
    <button class="action-btn success-btn modal-action" onclick="saveBillPayment('${order.customerId}')">Save Payment</button>
  `, false);
}

function saveBillPayment(customerId) {
  const amount = Utils.toNumber(document.getElementById("billPaymentAmount").value, 0);
  const method = document.getElementById("billPaymentMethod").value;

  if (!amount) {
    showToast("Enter payment amount");
    return;
  }

  POS.receivePayment({ customerId, amount, method });

  renderBillsList();
  renderLedgerPage();
  renderSelectedCustomer();
  renderSettingsDetail("dashboard");
  updateAlertBadge();
  closeModal();
  showToast("Bill payment saved");
}

function closeSelectedBill() {
  const order = POS.getOrderById(appState.selectedBillId);
  if (!order) {
    showToast("Select bill first");
    return;
  }

  try {
    POS.closeOrder(order.id);
    renderBillsList();
    renderBillPreview(order.id);
    showToast(`Bill closed: ${order.billNo}`);
  } catch (error) {
    showToast(error.message);
  }
}

function openDeleteBillModal() {
  try {
    POS.requirePermission("delete_bill", "Only owner can delete bills");
  } catch (error) {
    showToast(error.message);
    return;
  }

  const order = POS.getOrderById(appState.selectedBillId);
  if (!order) {
    showToast("Select bill first");
    return;
  }

  openSimpleModal("Delete Bill", `
    <p><strong>Bill:</strong> ${order.billNo}</p>
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p>This will reverse:</p>
    <p>• Inventory</p>
    <p>• Ledger entries</p>
    <p>• Pending returns</p>
    <p style="color:#b91c1c;"><strong>This action cannot be undone.</strong></p>
    <button class="action-btn warning-btn modal-action" onclick="deleteSelectedBill()">Delete Bill</button>
  `, false);
}

function deleteSelectedBill() {
  try {
    const orderId = appState.selectedBillId;
    if (!orderId) {
      showToast("No bill selected");
      return;
    }

    POS.deleteOrderSafely(orderId);
    POS.addAuditLog("bill_delete", `Deleted bill ${orderId}`);

    appState.selectedBillId = null;

    renderBillsList();
    renderSelectedCustomer();
    renderLedgerPage();
    renderSettingsDetail("dashboard");

    closeModal();
    updateAlertBadge();
    showToast("Bill deleted and reversed");
  } catch (error) {
    showToast(error.message);
  }
}

function openEditBillModal() {
  try {
    POS.requirePermission("edit_bill", "You cannot edit bills");
  } catch (error) {
    showToast(error.message);
    return;
  }

  const order = POS.getOrderById(appState.selectedBillId);
  if (!order) {
    showToast("Select bill first");
    return;
  }

  openSimpleModal("Edit Bill", `
    <p><strong>Bill:</strong> ${order.billNo}</p>
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p>This will:</p>
    <p>• Reverse current bill</p>
    <p>• Put items back in cart</p>
    <p>• Let you edit and save again</p>
    <p style="color:#92400e;"><strong>Use carefully.</strong></p>
    <button class="action-btn warning-btn modal-action" onclick="startBillEdit()">Start Editing</button>
  `, false);
}

function startBillEdit() {
  try {
    const orderId = appState.selectedBillId;
    if (!orderId) {
      showToast("No bill selected");
      return;
    }

    const result = POS.loadOrderToCartForEdit(orderId);
    POS.addAuditLog("bill_edit_start", `Started editing bill ${result.order.billNo}`);

    appState.selectedBillId = null;
    appState.selectedCustomer = result.customer || null;
    appState.ledgerCustomerId = result.customer?.id || null;

    if (result.customer) {
      document.getElementById("customerSearchInput").value = `${result.customer.name} - ${result.customer.code}`;
      document.getElementById("ledgerCustomerSearchInput").value = `${result.customer.name} - ${result.customer.code}`;
    } else {
      document.getElementById("customerSearchInput").value = "";
    }

    renderCart();
    renderSelectedCustomer();
    renderBillsList();
    renderLedgerPage();
    renderSettingsDetail("dashboard");
    closeModal();
    showToast("Bill loaded into cart for editing");

    switchToPage("shopPage", "دکان", "Gas Shop POS");
  } catch (error) {
    showToast(error.message);
  }
}

/* ---------------- PRINT / SHARE ---------------- */

function getLatestOrder() {
  const orders = Storage.getOrders();
  if (!orders.length) return null;
  return orders[orders.length - 1];
}

function printInvoice(orderId, mode = "thermal") {
  const html = POS.generateInvoiceHTML(orderId, mode);
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    showToast("Popup blocked. Allow popups.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}

function shareBillOnWhatsApp(orderId) {
  const text = POS.generateBillText(orderId);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function openInvoicePreview(orderId) {
  const html = POS.generateInvoiceHTML(orderId, "thermal");
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    showToast("Popup blocked. Allow popups.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function copyBillText(orderId) {
  const text = POS.generateBillText(orderId);

  navigator.clipboard.writeText(text)
    .then(() => showToast("Bill text copied"))
    .catch(() => showToast("Copy failed"));
}

function printPaymentReceipt(customerId, amount, method) {
  const html = POS.generatePaymentReceiptHTML(customerId, amount, method);
  const win = window.open("", "_blank", "width=700,height=600");

  if (!win) {
    showToast("Popup blocked");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

function sharePaymentReceiptOnWhatsApp(customerId, amount, method) {
  const text = POS.generatePaymentReceiptText(customerId, amount, method);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function printSupplierPaymentReceipt(supplierId, amount, method) {
  const html = POS.generateSupplierPaymentReceiptHTML(supplierId, amount, method);
  const win = window.open("", "_blank", "width=700,height=600");

  if (!win) {
    showToast("Popup blocked");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

function shareSupplierPaymentReceiptOnWhatsApp(supplierId, amount, method) {
  const text = POS.generateSupplierPaymentReceiptText(supplierId, amount, method);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/* ---------------- LEDGER PAGE ---------------- */

function initLedgerActions() {
  document.getElementById("ledgerCustomerSearchInput")?.addEventListener("input", handleLedgerCustomerSearch);

  document.getElementById("ledgerAddPaymentBtn")?.addEventListener("click", openReceivePaymentModal);
  document.getElementById("ledgerStatementBtn")?.addEventListener("click", openLedgerStatementModal);
  document.getElementById("ledgerPdfBtn")?.addEventListener("click", () => showToast("Ledger PDF next step"));
  document.getElementById("ledgerWhatsappBtn")?.addEventListener("click", () => showToast("Ledger WhatsApp next step"));
  document.getElementById("ledgerPendingBtn")?.addEventListener("click", openPendingEmptiesModal);
}

function handleLedgerCustomerSearch(e) {
  const value = e.target.value.trim();
  if (!value) {
    renderLedgerPage();
    return;
  }

  const matches = POS.searchCustomers(value);
  if (matches.length === 1) {
    appState.ledgerCustomerId = matches[0].id;
    appState.selectedCustomer = matches[0];
    renderSelectedCustomer();
    renderLedgerPage();
  }
}

function renderLedgerPage() {
  const summary = document.getElementById("ledgerCustomerSummary");
  const list = document.getElementById("ledgerEntriesList");

  if (!summary || !list) return;

  let customer = null;

  if (appState.ledgerCustomerId) {
    customer = POS.getCustomerById(appState.ledgerCustomerId);
  } else if (appState.selectedCustomer) {
    customer = POS.getCustomerById(appState.selectedCustomer.id);
    appState.ledgerCustomerId = customer?.id || null;
  }

  if (!customer) {
    summary.innerHTML = `<p>Select customer to view ledger</p>`;
    list.innerHTML = `<div class="empty-list-state"><p>No ledger entries</p></div>`;
    return;
  }

  const due = POS.getCustomerBalance(customer.id);
  const pending = POS.getCustomerPendingSummary(customer.id);
  const overdueInfo = POS.getCustomerOverdueInfo(customer.id);
  const entries = POS.getCustomerLedger(customer.id);

  summary.innerHTML = `
    <h3>${customer.name} - ${customer.code}</h3>
    <p>Phone: ${customer.phone || "-"}</p>
    <p>Area: ${customer.area || "-"}</p>
    <p>Due: ${due}</p>
    <p>Pending: 15kg ${pending.pending15}, 35kg ${pending.pending35}, 45kg ${pending.pending45}</p>

    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
      ${overdueInfo.hasOverdue ? `<span class="status-badge danger">Overdue ${overdueInfo.overdueCount}</span>` : ""}
      ${overdueInfo.hasDueSoon ? `<span class="status-badge warning">Due Soon ${overdueInfo.dueSoonCount}</span>` : ""}
      ${!overdueInfo.hasOverdue && !overdueInfo.hasDueSoon ? `<span class="status-badge success">Normal</span>` : ""}
    </div>
  `;

  if (!entries.length) {
    list.innerHTML = `<div class="empty-list-state"><p>No ledger entries</p></div>`;
    return;
  }

  let runningBalance = 0;
  list.innerHTML = entries.map(entry => {
    runningBalance += entry.debit - entry.credit;

    return `
      <div class="ledger-entry">
        <div class="ledger-entry-left">
          <h4>${formatLedgerType(entry.type)} - ${entry.refNo || ""}</h4>
          <p>${entry.date}</p>
          <p style="margin:4px 0 0; color:#64748b;">${entry.note || ""}</p>
        </div>
        <div class="ledger-entry-right" style="text-align:right;">
          <div>${entry.debit ? `<span class="debit-amount">Dr ${entry.debit}</span>` : ""}</div>
          <div>${entry.credit ? `<span class="credit-amount">Cr ${entry.credit}</span>` : ""}</div>
          <small style="color:#64748b;">Bal ${runningBalance}</small>
        </div>
      </div>
    `;
  }).join("");
}

function openLedgerStatementModal() {
  const customerId = appState.ledgerCustomerId || appState.selectedCustomer?.id;
  if (!customerId) {
    showToast("Select customer first");
    return;
  }

  const customer = POS.getCustomerById(customerId);
  const entries = POS.getCustomerLedger(customerId);
  const due = POS.getCustomerBalance(customerId);

  const totalSales = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalPayments = entries.reduce((sum, e) => sum + e.credit, 0);

  openSimpleModal("Customer Statement", `
    <p><strong>Customer:</strong> ${customer.name}</p>
    <p><strong>Code:</strong> ${customer.code}</p>
    <p><strong>Total Sales:</strong> ${totalSales}</p>
    <p><strong>Total Payments:</strong> ${totalPayments}</p>
    <p><strong>Current Balance:</strong> ${due}</p>
  `);
}

/* ---------------- SETTINGS ---------------- */

function initSettingsActions() {
  document.querySelectorAll(".settings-card").forEach(card => {
    card.addEventListener("click", () => {
      const page = card.dataset.settingsPage;
      renderSettingsDetail(page);
    });
  });
}

function renderSettingsDetail(page) {
  const container = document.getElementById("settingsDetailContent");
  if (!container) return;

  if (page === "dashboard") return renderDashboardView(container);
  if (page === "inventory") return renderInventoryView(container);
  if (page === "reminders") return renderRemindersView(container);
  if (page === "customers") return renderCustomersView(container);
  if (page === "rates") return renderRatesView(container);
  if (page === "shop") return renderShopSettingsView(container);
  if (page === "reports") return renderReportsView(container);
  if (page === "backup") return renderBackupView(container);
  if (page === "theme") return renderThemeView(container);
  if (page === "billdesign") return renderBillDesignView(container);
  if (page === "audit") return renderAuditView(container);
  if (page === "cashbook") return renderCashbookView(container);
  if (page === "expenses") return renderExpensesView(container);
  if (page === "suppliers") return renderSuppliersView(container);
  if (page === "purchases") return renderPurchasesView(container);
  if (page === "users") return renderUsersView(container);
  if (page === "notifications") return renderNotificationsView(container);
  if (page === "checklist") return renderProductionChecklist(container);

  container.innerHTML = `<p>Coming soon</p>`;
}

/* ---------------- DASHBOARD ---------------- */

function renderDashboardView(container) {
  const stats = POS.getDashboardStats();
  const lowStockAlerts = POS.getLowStockAlerts();
  const profit = POS.getNetProfitSummary();
  const valuation = POS.getStockValuation();

  container.innerHTML = `
    <h3>Dashboard</h3>

    <div class="settings-grid" style="margin-top:12px;">
      <div class="settings-card" style="min-height:80px;"><span>Today Sales</span><strong>${stats.todaySales}</strong></div>
      <div class="settings-card" style="min-height:80px;"><span>Today Received</span><strong>${stats.todayReceived}</strong></div>
      <div class="settings-card" style="min-height:80px;"><span>Total Due</span><strong>${stats.totalDue}</strong></div>
      <div class="settings-card" style="min-height:80px;"><span>Pending Returns</span><strong>${stats.pendingReturnsCount}</strong></div>
      <div class="settings-card" style="min-height:80px;"><span>Overdue</span><strong>${stats.overdueCount}</strong></div>
      <div class="settings-card" style="min-height:80px;"><span>Net Profit</span><strong>${profit.netProfit.toFixed(2)}</strong></div>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Quick Actions</h4>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px;">
        <button class="action-btn" onclick="renderSettingsDetail('inventory')">Inventory</button>
        <button class="action-btn" onclick="renderSettingsDetail('reports')">Reports</button>
        <button class="action-btn" onclick="renderSettingsDetail('cashbook')">Cashbook</button>
        <button class="action-btn" onclick="renderSettingsDetail('purchases')">Purchases</button>
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Stock Valuation</h4>
      <p>Filled Value: ${valuation.totalFilledValue.toFixed(2)}</p>
      <p>Empty Value: ${valuation.totalEmptyValue.toFixed(2)}</p>
      <p><strong>Total Stock Value: ${valuation.totalStockValue.toFixed(2)}</strong></p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Low Stock Alerts</h4>
      ${
        lowStockAlerts.length
          ? lowStockAlerts.map(alert => `<p>• ${alert}</p>`).join("")
          : "<p>No low stock alerts</p>"
      }
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Sales Trend</h4>
      <canvas id="salesTrendChart" height="140"></canvas>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Stock Overview</h4>
      <canvas id="stockOverviewChart" height="140"></canvas>
    </div>
  `;

  setTimeout(() => {
    renderDashboardCharts();
  }, 100);
}

function getSalesChartData() {
  const orders = Storage.getOrders();
  const dailyMap = {};

  orders.forEach(order => {
    if (!dailyMap[order.date]) dailyMap[order.date] = 0;
    dailyMap[order.date] += order.grandTotal;
  });

  const labels = Object.keys(dailyMap).sort();
  const values = labels.map(date => dailyMap[date]);

  return { labels, values };
}

function getStockChartData() {
  const inventory = Storage.getInventory();

  return {
    labels: ["15kg", "35kg", "45kg"],
    filled: [inventory.size15.filled, inventory.size35.filled, inventory.size45.filled],
    empty: [inventory.size15.empty, inventory.size35.empty, inventory.size45.empty]
  };
}

function renderDashboardCharts() {
  const salesCanvas = document.getElementById("salesTrendChart");
  const stockCanvas = document.getElementById("stockOverviewChart");

  if (salesChartInstance) salesChartInstance.destroy();
  if (stockChartInstance) stockChartInstance.destroy();

  if (salesCanvas) {
    const salesData = getSalesChartData();

    salesChartInstance = new Chart(salesCanvas, {
      type: "line",
      data: {
        labels: salesData.labels,
        datasets: [{
          label: "Sales",
          data: salesData.values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.15)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  }

  if (stockCanvas) {
    const stockData = getStockChartData();

    stockChartInstance = new Chart(stockCanvas, {
      type: "bar",
      data: {
        labels: stockData.labels,
        datasets: [
          { label: "Filled", data: stockData.filled, backgroundColor: "#16a34a" },
          { label: "Empty", data: stockData.empty, backgroundColor: "#f59e0b" }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  }
}

/* ---------------- INVENTORY ---------------- */

function renderInventoryView(container) {
  const inventory = POS.getInventorySummary();
  const valuation = POS.getStockValuation();

  container.innerHTML = `
    <h3>Inventory</h3>

    <div class="card" style="margin-top:14px;">
      <h4>15kg</h4>
      <p>Filled: ${inventory.size15.filled}</p>
      <p>Empty: ${inventory.size15.empty}</p>
      <p>Out Pending: ${inventory.size15.outPending}</p>
      <p>Sold Permanent: ${inventory.size15.soldPermanent}</p>
      <p>Damaged: ${inventory.size15.damaged}</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>35kg</h4>
      <p>Filled: ${inventory.size35.filled}</p>
      <p>Empty: ${inventory.size35.empty}</p>
      <p>Out Pending: ${inventory.size35.outPending}</p>
      <p>Sold Permanent: ${inventory.size35.soldPermanent}</p>
      <p>Damaged: ${inventory.size35.damaged}</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>45kg</h4>
      <p>Filled: ${inventory.size45.filled}</p>
      <p>Empty: ${inventory.size45.empty}</p>
      <p>Out Pending: ${inventory.size45.outPending}</p>
      <p>Sold Permanent: ${inventory.size45.soldPermanent}</p>
      <p>Damaged: ${inventory.size45.damaged}</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Stock Valuation</h4>
      <p>Filled Value: ${valuation.totalFilledValue.toFixed(2)}</p>
      <p>Empty Value: ${valuation.totalEmptyValue.toFixed(2)}</p>
      <p><strong>Total Stock Value: ${valuation.totalStockValue.toFixed(2)}</strong></p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:14px;">
      <button class="action-btn" onclick="openInventoryAdjustModal()">Adjust Stock</button>
      <button class="action-btn" onclick="openStockMovementsModal()">Stock History</button>
    </div>
  `;
}

function openInventoryAdjustModal() {
  try {
    POS.requirePermission("stock_adjust", "Only owner can adjust stock");
  } catch (error) {
    showToast(error.message);
    return;
  }

  openSimpleModal("Adjust Inventory", `
    <select id="adjustSize" class="form-select">
      <option value="15">15kg</option>
      <option value="35">35kg</option>
      <option value="45">45kg</option>
    </select>

    <select id="adjustField" class="form-select">
      <option value="filled">Filled</option>
      <option value="empty">Empty</option>
      <option value="outPending">Out Pending</option>
      <option value="soldPermanent">Sold Permanent</option>
      <option value="damaged">Damaged</option>
    </select>

    <input id="adjustValue" class="form-input" type="number" placeholder="Enter new value" />
    <button class="action-btn primary-btn modal-action" onclick="saveInventoryAdjustment()">Save Adjustment</button>
  `, false);
}

function saveInventoryAdjustment() {
  try {
    POS.requirePermission("stock_adjust", "Only owner can adjust stock");
  } catch (error) {
    showToast(error.message);
    return;
  }

  const size = document.getElementById("adjustSize").value;
  const field = document.getElementById("adjustField").value;
  const value = Utils.toNumber(document.getElementById("adjustValue").value, 0);

  const inventory = Storage.getInventory();
  const key = `size${size}`;

  if (!inventory[key]) {
    showToast("Invalid size");
    return;
  }

  const oldValue = inventory[key][field];
  inventory[key][field] = value;
  Storage.saveInventory(inventory);

  POS.addStockMovement({
    type: "manual_adjustment",
    size: Number(size),
    qty: value,
    refId: "",
    refNo: "",
    note: `Manual adjust ${field} from ${oldValue} to ${value}`,
    effect: `${field}: ${oldValue} -> ${value}`
  });

  POS.addAuditLog("inventory_adjust", `Adjusted ${field} for ${size}kg to ${value}`);

  renderSettingsDetail("inventory");
  closeModal();
  updateAlertBadge();
  showToast("Inventory updated");
}

/* ---------------- REMINDERS ---------------- */

function renderRemindersView(container) {
  const pendingList = POS.getAllPendingReturnsDetailed();
  const settings = Storage.getSettings();

  container.innerHTML = `
    <h3>Reminder Settings</h3>

    <div class="card" style="margin-top:14px;">
      <label>Default Return Days</label>
      <input id="reminderDaysInput" class="form-input" type="number" value="${settings.reminderDays}" />
      <button class="action-btn primary-btn" style="margin-top:10px;" onclick="saveReminderSettings()">Save Reminder Days</button>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Pending Return List</h4>
      ${
        pendingList.length
          ? pendingList.map(item => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${item.customerName} - ${item.size}kg</h4>
                <p style="margin:0; color:#64748b;">Qty: ${item.qty} | Due: ${item.dueDate}</p>
                <p style="margin:4px 0 0; color:#64748b;">Bill: ${item.billNo}</p>
              </div>
              <span class="status-badge ${item.statusInfo.className}">
                ${item.statusInfo.label}
              </span>
            </div>
          `).join("")
          : "<p>No pending returns</p>"
      }
    </div>
  `;
}

function saveReminderSettings() {
  const value = Utils.toNumber(document.getElementById("reminderDaysInput").value, 15);
  const settings = Storage.getSettings();
  settings.reminderDays = value;
  Storage.saveSettings(settings);
  renderSettingsDetail("reminders");
  showToast("Reminder days saved");
}

/* ---------------- CUSTOMERS ---------------- */

function renderCustomersView(container, filterType = "all") {
  let customers = [];

  if (filterType === "due") {
    customers = POS.getFilteredCustomers({ dueOnly: true });
  } else if (filterType === "pending") {
    customers = POS.getFilteredCustomers({ pendingOnly: true });
  } else if (filterType === "overdue") {
    customers = POS.getFilteredCustomers({ overdueOnly: true });
  } else {
    customers = Storage.getCustomers();
  }

  container.innerHTML = `
    <h3>Customers</h3>

    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
      <button class="chip-btn" onclick="renderSettingsDetail('customers')">All</button>
      <button class="chip-btn" onclick="renderFilteredCustomersView('due')">Due Only</button>
      <button class="chip-btn" onclick="renderFilteredCustomersView('pending')">Pending Only</button>
      <button class="chip-btn" onclick="renderFilteredCustomersView('overdue')">Overdue Only</button>
    </div>

    <div class="card" style="margin-top:14px;">
      ${
        customers.length
          ? customers.map(customer => {
              const due = POS.getCustomerBalance(customer.id);
              const pending = POS.getCustomerPendingSummary(customer.id);
              const overdueInfo = POS.getCustomerOverdueInfo(customer.id);

              return `
                <div class="cart-item" onclick="openCustomerProfile('${customer.id}')">
                  <div>
                    <h4 style="margin:0 0 4px;">${customer.name}</h4>
                    <p style="margin:0; color:#64748b;">${customer.code} | ${customer.phone || "-"}</p>
                    <p style="margin:4px 0 0; color:#64748b;">
                      Due: ${due} | P: 15kg ${pending.pending15}, 35kg ${pending.pending35}, 45kg ${pending.pending45}
                    </p>
                    <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
                      ${
                        overdueInfo.hasOverdue
                          ? `<span class="status-badge danger">Overdue ${overdueInfo.overdueCount}</span>`
                          : ""
                      }
                      ${
                        overdueInfo.hasDueSoon
                          ? `<span class="status-badge warning">Due Soon ${overdueInfo.dueSoonCount}</span>`
                          : ""
                      }
                      ${
                        !overdueInfo.hasOverdue && !overdueInfo.hasDueSoon
                          ? `<span class="status-badge success">Normal</span>`
                          : ""
                      }
                    </div>
                  </div>
                </div>
              `;
            }).join("")
          : "<p>No customers available</p>"
      }
    </div>
  `;
}

function renderFilteredCustomersView(type) {
  const container = document.getElementById("settingsDetailContent");
  renderCustomersView(container, type);
}

function openCustomerProfile(customerId = null) {
  const id = customerId || appState.selectedCustomer?.id || appState.ledgerCustomerId;
  if (!id) {
    showToast("Select customer first");
    return;
  }

  const customer = POS.getCustomerById(id);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  const due = POS.getCustomerBalance(customer.id);
  const pending = POS.getCustomerPendingSummary(customer.id);
  const rates = POS.getCustomerRates(customer.id);

  openSimpleModal(`Customer Profile - ${customer.name}`, `
    <div class="card" style="padding:12px;">
      <p><strong>Code:</strong> ${customer.code}</p>
      <p><strong>Name:</strong> ${customer.name}</p>
      <p><strong>Phone:</strong> ${customer.phone || "-"}</p>
      <p><strong>Area:</strong> ${customer.area || "-"}</p>
      <p><strong>ID Card:</strong> ${customer.idCard || "-"}</p>
      <p><strong>Due:</strong> ${due}</p>
      <p><strong>Pending:</strong> 15kg ${pending.pending15}, 35kg ${pending.pending35}, 45kg ${pending.pending45}</p>
    </div>

    <div class="card" style="padding:12px; margin-top:10px;">
      <h4 style="margin-top:0;">Custom Rates</h4>
      <p>15kg Refill: ${rates.refill15}</p>
      <p>35kg Refill: ${rates.refill35}</p>
      <p>45kg Refill: ${rates.refill45}</p>
      <p>15kg Empty: ${rates.empty15}</p>
      <p>35kg Empty: ${rates.empty35}</p>
      <p>45kg Empty: ${rates.empty45}</p>
      <p>KG Rate: ${rates.kgRate}</p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="openEditCustomerModal('${customer.id}')">Edit Info</button>
      <button class="action-btn warning-btn" onclick="openCustomerRatesModal('${customer.id}')">Edit Rates</button>
      <button class="action-btn success-btn" onclick="selectCustomer('${customer.id}')">Select</button>
      <button class="action-btn" onclick="openPendingEmptiesModal()">Pending</button>
      <button class="action-btn" onclick="openReturnedHistoryModal('${customer.id}')">Return History</button>
    </div>
  `, false);
}

function openEditCustomerModal(customerId) {
  const customer = POS.getCustomerById(customerId);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  openSimpleModal(`Edit Customer - ${customer.name}`, `
    <input id="editCustName" class="form-input" type="text" value="${customer.name || ""}" placeholder="Name" />
    <input id="editCustPhone" class="form-input" type="text" value="${customer.phone || ""}" placeholder="Phone" />
    <input id="editCustArea" class="form-input" type="text" value="${customer.area || ""}" placeholder="Area" />
    <input id="editCustIdCard" class="form-input" type="text" value="${customer.idCard || ""}" placeholder="ID Card" />
    <button class="action-btn primary-btn modal-action" onclick="saveEditedCustomer('${customer.id}')">Save Customer</button>
  `, false);
}

function saveEditedCustomer(customerId) {
  const updated = POS.updateCustomerBasicInfo(customerId, {
    name: document.getElementById("editCustName").value.trim(),
    phone: document.getElementById("editCustPhone").value.trim(),
    area: document.getElementById("editCustArea").value.trim(),
    idCard: document.getElementById("editCustIdCard").value.trim()
  });

  POS.addAuditLog("customer_edit", `Edited customer ${updated.code} - ${updated.name}`);

  if (appState.selectedCustomer?.id === customerId) {
    appState.selectedCustomer = updated;
  }

  if (appState.ledgerCustomerId === customerId) {
    appState.ledgerCustomerId = customerId;
  }

  renderSelectedCustomer();
  renderLedgerPage();
  renderSettingsDetail("customers");
  closeModal();
  showToast("Customer updated");
}

function openCustomerRatesModal(customerId) {
  const customer = POS.getCustomerById(customerId);
  if (!customer) {
    showToast("Customer not found");
    return;
  }

  const rates = POS.getCustomerRates(customerId);

  openSimpleModal(`Edit Rates - ${customer.name}`, `
    <input id="rateRefill15" class="form-input" type="number" value="${rates.refill15}" placeholder="15kg Refill" />
    <input id="rateRefill35" class="form-input" type="number" value="${rates.refill35}" placeholder="35kg Refill" />
    <input id="rateRefill45" class="form-input" type="number" value="${rates.refill45}" placeholder="45kg Refill" />
    <input id="rateEmpty15" class="form-input" type="number" value="${rates.empty15}" placeholder="15kg Empty" />
    <input id="rateEmpty35" class="form-input" type="number" value="${rates.empty35}" placeholder="35kg Empty" />
    <input id="rateEmpty45" class="form-input" type="number" value="${rates.empty45}" placeholder="45kg Empty" />
    <input id="rateKg" class="form-input" type="number" value="${rates.kgRate}" placeholder="KG Rate" />
    <button class="action-btn warning-btn modal-action" onclick="saveCustomerRates('${customer.id}')">Save Rates</button>
  `, false);
}

function saveCustomerRates(customerId) {
  try {
    POS.requirePermission("edit_rates", "Only owner can edit customer rates");
  } catch (error) {
    showToast(error.message);
    return;
  }

  POS.updateCustomerRates(customerId, {
    refill15: Utils.toNumber(document.getElementById("rateRefill15").value, 0),
    refill35: Utils.toNumber(document.getElementById("rateRefill35").value, 0),
    refill45: Utils.toNumber(document.getElementById("rateRefill45").value, 0),
    empty15: Utils.toNumber(document.getElementById("rateEmpty15").value, 0),
    empty35: Utils.toNumber(document.getElementById("rateEmpty35").value, 0),
    empty45: Utils.toNumber(document.getElementById("rateEmpty45").value, 0),
    kgRate: Utils.toNumber(document.getElementById("rateKg").value, 0)
  });

  const customer = POS.getCustomerById(customerId);
  POS.addAuditLog("customer_rates", `Updated rates for ${customer?.code || customerId}`);

  renderSelectedCustomer();
  renderLedgerPage();
  renderSettingsDetail("customers");
  closeModal();
  showToast("Customer rates updated");
}

function openReturnedHistoryModal(customerId = null) {
  const id = customerId || appState.selectedCustomer?.id || appState.ledgerCustomerId;
  if (!id) {
    showToast("Select customer first");
    return;
  }

  const history = POS.getReturnedHistoryByCustomer(id);

  openSimpleModal("Returned Cylinder History", `
    ${
      history.length
        ? history.map(item => `
          <div class="cart-item">
            <div>
              <h4 style="margin:0 0 4px;">${item.size}kg Cylinder</h4>
              <p style="margin:0; color:#64748b;">Returned Qty: ${item.qty}</p>
              <p style="margin:4px 0 0; color:#64748b;">Returned On: ${item.returnDate || "-"}</p>
              <p style="margin:4px 0 0; color:#64748b;">Bill: ${item.billNo || "-"}</p>
            </div>
          </div>
        `).join("")
        : `<div class="empty-list-state"><p>No returned history found</p></div>`
    }
  `);
}

/* ---------------- RATES ---------------- */

function renderRatesView(container) {
  container.innerHTML = `
    <h3>Products & Rates</h3>
    <div class="card" style="margin-top:14px;">
      <p>15kg Refill: 3200</p>
      <p>15kg Empty: 4000</p>
      <hr>
      <p>35kg Refill: 7000</p>
      <p>35kg Empty: 9000</p>
      <hr>
      <p>45kg Refill: 9000</p>
      <p>45kg Empty: 12000</p>
      <hr>
      <p>Custom KG: 260</p>
      <button class="action-btn" style="margin-top:10px;" onclick="showToast('Rates editor next step')">Edit Rates</button>
    </div>
  `;
}

/* ---------------- SHOP SETTINGS ---------------- */

function renderShopSettingsView(container) {
  const settings = Storage.getSettings();

  container.innerHTML = `
    <h3>Shop Settings</h3>
    <div class="card" style="margin-top:14px;">
      <label>Shop Name</label>
      <input id="shopNameInput" class="form-input" type="text" value="${settings.shopName}" />

      <label style="margin-top:10px; display:block;">Invoice Prefix</label>
      <input id="invoicePrefixInput" class="form-input" type="text" value="${settings.invoicePrefix}" />

      <label style="margin-top:10px; display:block;">Customer Prefix</label>
      <input id="customerPrefixInput" class="form-input" type="text" value="${settings.customerPrefix}" />

      <button class="action-btn primary-btn" style="margin-top:10px;" onclick="saveShopSettings()">Save Settings</button>
    </div>
  `;
}

function saveShopSettings() {
  try {
    POS.requirePermission("shop_settings", "Only owner can change shop settings");
  } catch (error) {
    showToast(error.message);
    return;
  }

  const settings = Storage.getSettings();
  settings.shopName = document.getElementById("shopNameInput").value.trim() || settings.shopName;
  settings.invoicePrefix = document.getElementById("invoicePrefixInput").value.trim() || settings.invoicePrefix;
  settings.customerPrefix = document.getElementById("customerPrefixInput").value.trim() || settings.customerPrefix;

  Storage.saveSettings(settings);
  renderCurrentBillNo();
  showToast("Shop settings saved");
}

/* ---------------- REPORTS ---------------- */

function renderReportsView(container) {
  const summary = POS.getReportsSummary();
  const closing = POS.getDailyClosingReport();
  const profit = POS.getNetProfitSummary();
  const purchaseSummary = POS.getPurchaseSummary();
  const costs = POS.getAverageCosts();

  container.innerHTML = `
    <h3>Reports</h3>

    <div class="card" style="margin-top:14px;">
      <h4>Business Summary</h4>
      <p>Total Sales: ${summary.totalSales}</p>
      <p>Total Due: ${summary.totalDue}</p>
      <p>Pending 15kg: ${summary.totalPending15}</p>
      <p>Pending 35kg: ${summary.totalPending35}</p>
      <p>Pending 45kg: ${summary.totalPending45}</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Average Costs</h4>
      <p>15kg Filled Cost: ${costs.filled15.toFixed(2)}</p>
      <p>35kg Filled Cost: ${costs.filled35.toFixed(2)}</p>
      <p>45kg Filled Cost: ${costs.filled45.toFixed(2)}</p>
      <p>15kg Empty Cost: ${costs.empty15.toFixed(2)}</p>
      <p>35kg Empty Cost: ${costs.empty35.toFixed(2)}</p>
      <p>45kg Empty Cost: ${costs.empty45.toFixed(2)}</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Profit Summary</h4>
      <p>Total Sales: ${profit.totalSales.toFixed(2)}</p>
      <p>Estimated Cost: ${profit.totalCost.toFixed(2)}</p>
      <p>Gross Profit: ${profit.grossProfit.toFixed(2)}</p>
      <p>Total Expenses: ${profit.totalExpenses.toFixed(2)}</p>
      <p><strong>Net Profit: ${profit.netProfit.toFixed(2)}</strong></p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Purchase Summary</h4>
      <p>Total Purchases: ${purchaseSummary.totalPurchases.toFixed(2)}</p>
      <p>Total Paid: ${purchaseSummary.totalPaid.toFixed(2)}</p>
      <p>Total Supplier Balance: ${purchaseSummary.totalBalance.toFixed(2)}</p>
      <button class="action-btn" style="margin-top:10px;" onclick="openSupplierDueReportModal()">Supplier Due Report</button>
      <button class="action-btn" style="margin-top:10px;" onclick="openPurchaseSummaryModal()">Purchase Summary</button>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Date Range Report</h4>
      <input id="reportFromDate" class="form-input" type="date" />
      <input id="reportToDate" class="form-input" type="date" style="margin-top:10px;" />
      <button class="action-btn" style="margin-top:10px;" onclick="openDateRangeReport()">Generate Report</button>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Daily Closing - ${closing.date}</h4>
      <p>Total Bills: ${closing.totalBills}</p>
      <p>Total Sales: ${closing.totalSales}</p>
      <p>Credit Sales: ${closing.creditSales}</p>
      <button class="action-btn" style="margin-top:10px;" onclick="openDailyClosingModal()">Open Daily Closing</button>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Export Data</h4>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px;">
        <button class="action-btn" onclick="exportCustomersCSV()">Customers CSV</button>
        <button class="action-btn" onclick="exportBillsCSV()">Bills CSV</button>
        <button class="action-btn" onclick="exportPurchasesCSV()">Purchases CSV</button>
        <button class="action-btn" onclick="exportExpensesCSV()">Expenses CSV</button>
        <button class="action-btn" onclick="exportSupplierDueCSV()">Supplier Due CSV</button>
      </div>
    </div>
  `;
}

function openDateRangeReport() {
  const fromDate = document.getElementById("reportFromDate").value;
  const toDate = document.getElementById("reportToDate").value;

  if (!fromDate || !toDate) {
    showToast("Select from and to dates");
    return;
  }

  const report = POS.getDateRangeReport(fromDate, toDate);

  openSimpleModal(`Report ${fromDate} to ${toDate}`, `
    <p><strong>Total Bills:</strong> ${report.totalBills}</p>
    <p><strong>Total Sales:</strong> ${report.sales.toFixed(2)}</p>
    <p><strong>Bill Paid:</strong> ${report.billPaid.toFixed(2)}</p>
    <p><strong>Ledger Payments:</strong> ${report.payments.toFixed(2)}</p>
    <p><strong>Expenses:</strong> ${report.expensesTotal.toFixed(2)}</p>
    <p><strong>Cash In:</strong> ${report.cashIn.toFixed(2)}</p>
    <p><strong>Cash Out:</strong> ${report.cashOut.toFixed(2)}</p>
    <p><strong>Net Cash:</strong> ${report.netCash.toFixed(2)}</p>
    <hr>
    <p><strong>Purchase Total:</strong> ${report.purchaseTotal.toFixed(2)}</p>
    <p><strong>Supplier Paid:</strong> ${report.purchasePaid.toFixed(2)}</p>
    <p><strong>Supplier Balance:</strong> ${report.purchaseBalance.toFixed(2)}</p>
    <hr>
    <p><strong>Estimated Cost:</strong> ${report.estimatedCost.toFixed(2)}</p>
    <p><strong>Gross Profit:</strong> ${report.grossProfit.toFixed(2)}</p>
    <p><strong>Net Profit:</strong> ${report.netProfit.toFixed(2)}</p>
    <p><strong>Stock Movements:</strong> ${report.stockMovementsCount}</p>
  `);
}

function openPurchaseSummaryModal() {
  const summary = POS.getPurchaseSummary();

  openSimpleModal("Purchase Summary", `
    <p><strong>Total Purchases:</strong> ${summary.totalPurchases.toFixed(2)}</p>
    <p><strong>Total Paid:</strong> ${summary.totalPaid.toFixed(2)}</p>
    <p><strong>Total Balance:</strong> ${summary.totalBalance.toFixed(2)}</p>

    <div class="card" style="padding:10px; margin-top:10px;">
      <h4 style="margin-top:0;">By Supplier</h4>
      ${
        summary.bySupplier.length
          ? summary.bySupplier.map(item => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${item.supplierName}</h4>
                <p style="margin:0; color:#64748b;">Purchases: ${item.count}</p>
              </div>
              <div style="text-align:right;">
                <p style="margin:0;">Total ${item.total.toFixed(2)}</p>
                <p style="margin:4px 0 0;">Bal ${item.balance.toFixed(2)}</p>
              </div>
            </div>
          `).join("")
          : "<p>No purchase data</p>"
      }
    </div>
  `);
}

function openSupplierDueReportModal() {
  const report = POS.getSupplierDueReport();

  openSimpleModal("Supplier Due Report", `
    ${
      report.length
        ? report.map(item => `
          <div class="cart-item" onclick="openSupplierProfile('${item.supplierId}')">
            <div>
              <h4 style="margin:0 0 4px;">${item.supplierName}</h4>
              <p style="margin:0; color:#64748b;">${item.supplierCode} | ${item.phone || "-"}</p>
            </div>
            <div style="text-align:right;">
              <strong>${item.balance.toFixed(2)}</strong>
            </div>
          </div>
        `).join("")
        : "<p>No suppliers found</p>"
    }
  `);
}

function openDailyClosingModal() {
  const closing = POS.getDailyClosingReport();

  openSimpleModal(`Daily Closing - ${closing.date}`, `
    <p><strong>Total Bills:</strong> ${closing.totalBills}</p>
    <p><strong>Total Sales:</strong> ${closing.totalSales}</p>
    <p><strong>Paid in Bills:</strong> ${closing.totalPaidInBills}</p>
    <p><strong>Extra Payments:</strong> ${closing.extraPayments}</p>
    <p><strong>Credit Sales:</strong> ${closing.creditSales}</p>
    <p><strong>Cash In:</strong> ${closing.cashIn}</p>
    <p><strong>Cash Out:</strong> ${closing.cashOut}</p>
    <p><strong>Cash Balance:</strong> ${closing.cashBalance}</p>

    <div class="card" style="padding:10px; margin-top:10px;">
      <h4 style="margin-top:0;">Stock Movements</h4>
      ${
        closing.stockMovements.length
          ? closing.stockMovements.map(move => `
            <p>• ${move.type} - ${move.size || "-"}kg - Qty ${move.qty}</p>
          `).join("")
          : "<p>No stock movement today</p>"
      }
    </div>
  `);
}

function openStockMovementsModal() {
  const movements = POS.getStockMovements();

  openSimpleModal("Stock Movement History", `
    ${
      movements.length
        ? movements.map(move => `
          <div class="cart-item">
            <div>
              <h4 style="margin:0 0 4px;">${move.type}</h4>
              <p style="margin:0; color:#64748b;">Date: ${move.date}</p>
              <p style="margin:4px 0 0; color:#64748b;">Size: ${move.size || "-"}kg | Qty: ${move.qty}</p>
              <p style="margin:4px 0 0; color:#64748b;">Ref: ${move.refNo || "-"}</p>
              <p style="margin:4px 0 0; color:#64748b;">${move.effect || "-"}</p>
            </div>
          </div>
        `).join("")
        : `<div class="empty-list-state"><p>No stock movements found</p></div>`
    }
  `);
}

/* ---------------- BACKUP ---------------- */

function renderBackupView(container) {
  container.innerHTML = `
    <h3>Backup & Restore</h3>
    <div class="card" style="margin-top:14px;">
      <button class="action-btn" onclick="exportBackup()">Export Backup</button>
      <button class="action-btn" style="margin-top:10px;" onclick="triggerBackupImport()">Import Backup</button>
      <button class="action-btn warning-btn" style="margin-top:10px;" onclick="confirmResetData()">Reset All Data</button>
    </div>
  `;
}

function exportBackup() {
  const backup = {
    customers: Storage.getCustomers(),
    orders: Storage.getOrders(),
    ledger: Storage.getLedger(),
    inventory: Storage.getInventory(),
    settings: Storage.getSettings(),
    pendingReturns: Storage.getPendingReturns(),
    counters: Storage.getCounters(),
    stockMovements: Storage.getStockMovements(),
    users: Storage.getUsers(),
    auditLog: Storage.getAuditLog(),
    cashbook: Storage.getCashbook(),
    expenses: Storage.getExpenses(),
    suppliers: Storage.getSuppliers(),
    purchases: Storage.getPurchases(),
    supplierLedger: Storage.getSupplierLedger(),
    costs: Storage.getCosts()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gas-shop-backup-${Utils.formatDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  POS.addAuditLog("backup_export", "Exported backup file");
  showToast("Backup exported");
}

function triggerBackupImport() {
  try {
    POS.requirePermission("backup_import", "Only owner can import backup");
  } catch (error) {
    showToast(error.message);
    return;
  }

  const input = document.getElementById("backupImportInput");
  if (input) {
    input.value = "";
    input.click();
  }
}

function initBackupImport() {
  const input = document.getElementById("backupImportInput");
  if (!input) return;

  input.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.customers || !data.orders || !data.ledger || !data.inventory || !data.settings) {
          throw new Error("Invalid backup file");
        }

        Storage.saveCustomers(data.customers || []);
        Storage.saveOrders(data.orders || []);
        Storage.saveLedger(data.ledger || []);
        Storage.saveInventory(data.inventory || DefaultData.inventory);
        Storage.saveSettings(data.settings || DefaultData.settings);
        Storage.savePendingReturns(data.pendingReturns || []);
        Storage.saveCounters(data.counters || DefaultData.counters);
        Storage.saveStockMovements(data.stockMovements || []);
        Storage.saveUsers(data.users || DefaultData.users);
        Storage.saveAuditLog(data.auditLog || []);
        Storage.saveCashbook(data.cashbook || []);
        Storage.saveExpenses(data.expenses || []);
        Storage.saveSuppliers(data.suppliers || []);
        Storage.savePurchases(data.purchases || []);
        Storage.saveSupplierLedger(data.supplierLedger || []);
        Storage.saveCosts(data.costs || DefaultData.costs);

        appState.selectedCustomer = null;
        appState.selectedBillId = null;
        appState.ledgerCustomerId = null;

        document.getElementById("customerSearchInput").value = "";
        document.getElementById("ledgerCustomerSearchInput").value = "";
        document.getElementById("paidAmountInput").value = 0;

        renderCurrentBillNo();
        renderCart();
        renderSelectedCustomer();
        renderBillsList();
        renderLedgerPage();
        renderSettingsDetail("dashboard");
        updateTotals();
        updateAlertBadge();

        POS.addAuditLog("backup_import", "Imported backup file");
        showToast("Backup imported successfully");
      } catch (error) {
        showToast(error.message || "Import failed");
      }
    };

    reader.readAsText(file);
  });
}

function confirmResetData() {
  try {
    POS.requirePermission("reset_data", "Only owner can reset data");
  } catch (error) {
    showToast(error.message);
    return;
  }

  openSimpleModal("Reset All Data", `
    <p>This will delete all customers, bills, ledger, inventory changes and pending returns.</p>
    <button class="action-btn warning-btn modal-action" onclick="resetAllData()">Confirm Reset</button>
  `, false);
}

function resetAllData() {
  Storage.resetAll();
  appState.selectedCustomer = null;
  appState.selectedBillId = null;
  appState.ledgerCustomerId = null;

  document.getElementById("customerSearchInput").value = "";
  document.getElementById("ledgerCustomerSearchInput").value = "";
  document.getElementById("paidAmountInput").value = 0;

  renderCurrentBillNo();
  renderCart();
  renderSelectedCustomer();
  renderBillsList();
  renderLedgerPage();
  renderSettingsDetail("dashboard");
  closeModal();
  updateTotals();
  updateAlertBadge();

  showToast("All data reset");
}

/* ---------------- THEME / LANGUAGE ---------------- */

function renderThemeView(container) {
  const settings = Storage.getSettings();

  container.innerHTML = `
    <h3>Theme & Language</h3>
    <div class="card" style="margin-top:14px;">
      <p><strong>Theme:</strong> ${settings.theme}</p>
      <button class="action-btn" onclick="toggleTheme()">Toggle Theme</button>
    </div>

    <div class="card" style="margin-top:14px;">
      <p><strong>Language:</strong> ${settings.language}</p>
      <button class="action-btn" onclick="toggleLanguage()">Toggle Language</button>
    </div>
  `;
}

/* ---------------- BILL DESIGN ---------------- */

function renderBillDesignView(container) {
  container.innerHTML = `
    <h3>Bill Design</h3>
    <div class="card" style="margin-top:14px;">
      <p>Thermal print layout and A4 design are available through invoice preview and browser print.</p>
      <button class="action-btn" onclick="showToast('Use Print / PDF from bill page')">Open Bill Design</button>
    </div>
  `;
}

/* ---------------- CASHBOOK ---------------- */

function renderCashbookView(container) {
  const entries = POS.getCashbookEntries();
  const balance = POS.getCashbookBalance();

  container.innerHTML = `
    <h3>Cashbook</h3>

    <div class="card" style="margin-top:14px;">
      <p><strong>Current Cash Balance:</strong> ${balance}</p>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
        <button class="action-btn" onclick="openOpeningCashModal()">Opening Cash</button>
        <button class="action-btn warning-btn" onclick="openExpenseModal()">Add Expense</button>
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Cashbook Entries</h4>
      ${
        entries.length
          ? entries.map(entry => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${entry.type}</h4>
                <p style="margin:0; color:#64748b;">${entry.date} ${entry.time}</p>
                <p style="margin:4px 0 0; color:#64748b;">${entry.category || "-"}</p>
                <p style="margin:4px 0 0; color:#64748b;">${entry.note || "-"}</p>
              </div>
              <div style="text-align:right;">
                <strong>${entry.amount}</strong>
              </div>
            </div>
          `).join("")
          : "<p>No cashbook entries found</p>"
      }
    </div>
  `;
}

function openOpeningCashModal() {
  try {
    POS.requirePermission("cashbook", "No permission for cashbook");
  } catch (error) {
    showToast(error.message);
    return;
  }

  openSimpleModal("Add Opening Cash", `
    <input id="openingCashAmount" class="form-input" type="number" placeholder="Opening cash amount" />
    <input id="openingCashNote" class="form-input" type="text" placeholder="Note" />
    <button class="action-btn primary-btn modal-action" onclick="saveOpeningCash()">Save Opening Cash</button>
  `, false);
}

function saveOpeningCash() {
  const amount = Utils.toNumber(document.getElementById("openingCashAmount").value, 0);
  const note = document.getElementById("openingCashNote").value.trim();

  if (!amount) {
    showToast("Enter opening cash amount");
    return;
  }

  POS.addCashbookEntry({
    type: "opening",
    amount,
    category: "opening_cash",
    note
  });

  POS.addAuditLog("opening_cash", `Added opening cash ${amount}`);

  renderSettingsDetail("cashbook");
  closeModal();
  showToast("Opening cash saved");
}

/* ---------------- EXPENSES ---------------- */

function renderExpensesView(container) {
  const expenses = POS.getExpenses();
  const todayExpenses = POS.getTodayExpenses().reduce((sum, exp) => sum + exp.amount, 0);

  container.innerHTML = `
    <h3>Expenses</h3>

    <div class="card" style="margin-top:14px;">
      <p><strong>Today's Expense:</strong> ${todayExpenses}</p>
      <button class="action-btn warning-btn" style="margin-top:10px;" onclick="openExpenseModal()">Add Expense</button>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Expense List</h4>
      ${
        expenses.length
          ? expenses.map(exp => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${exp.category}</h4>
                <p style="margin:0; color:#64748b;">${exp.date} ${exp.time}</p>
                <p style="margin:4px 0 0; color:#64748b;">${exp.note || "-"}</p>
              </div>
              <div style="text-align:right;">
                <strong>${exp.amount}</strong>
              </div>
            </div>
          `).join("")
          : "<p>No expenses found</p>"
      }
    </div>
  `;
}

function openExpenseModal() {
  try {
    POS.requirePermission("expense", "No permission for expenses");
  } catch (error) {
    showToast(error.message);
    return;
  }

  openSimpleModal("Add Expense", `
    <select id="expenseCategory" class="form-select">
      <option value="transport">Transport</option>
      <option value="labor">Labor</option>
      <option value="repair">Repair</option>
      <option value="tea">Tea</option>
      <option value="rent">Rent</option>
      <option value="fuel">Fuel</option>
      <option value="misc">Miscellaneous</option>
    </select>
    <input id="expenseAmount" class="form-input" type="number" placeholder="Expense amount" />
    <input id="expenseNote" class="form-input" type="text" placeholder="Expense note" />
    <button class="action-btn warning-btn modal-action" onclick="saveExpense()">Save Expense</button>
  `, false);
}

function saveExpense() {
  const amount = Utils.toNumber(document.getElementById("expenseAmount").value, 0);
  const category = document.getElementById("expenseCategory").value;
  const note = document.getElementById("expenseNote").value.trim();

  if (!amount) {
    showToast("Enter expense amount");
    return;
  }

  POS.addExpense({
    amount,
    category,
    note
  });

  renderSettingsDetail("expenses");
  showToast("Expense saved");
  closeModal();
}

/* ---------------- SUPPLIERS ---------------- */

function renderSuppliersView(container) {
  const suppliers = Storage.getSuppliers();

  container.innerHTML = `
    <h3>Suppliers</h3>

    <div class="card" style="margin-top:14px;">
      <button class="action-btn primary-btn" onclick="openAddSupplierModal()">Add Supplier</button>
    </div>

    <div class="card" style="margin-top:14px;">
      ${
        suppliers.length
          ? suppliers.map(supplier => `
            <div class="cart-item" onclick="openSupplierProfile('${supplier.id}')">
              <div>
                <h4 style="margin:0 0 4px;">${supplier.name}</h4>
                <p style="margin:0; color:#64748b;">${supplier.code} | ${supplier.phone || "-"}</p>
                <p style="margin:4px 0 0; color:#64748b;">Balance: ${POS.getSupplierBalance(supplier.id)}</p>
              </div>
            </div>
          `).join("")
          : "<p>No suppliers found</p>"
      }
    </div>
  `;
}

function openAddSupplierModal() {
  openSimpleModal("Add Supplier", `
    <input id="supplierName" class="form-input" type="text" placeholder="Supplier name" />
    <input id="supplierPhone" class="form-input" type="text" placeholder="Phone" />
    <input id="supplierAddress" class="form-input" type="text" placeholder="Address" />
    <input id="supplierNote" class="form-input" type="text" placeholder="Note" />
    <button class="action-btn primary-btn modal-action" onclick="saveSupplier()">Save Supplier</button>
  `, false);
}

function saveSupplier() {
  const name = document.getElementById("supplierName").value.trim();
  const phone = document.getElementById("supplierPhone").value.trim();
  const address = document.getElementById("supplierAddress").value.trim();
  const note = document.getElementById("supplierNote").value.trim();

  if (!name) {
    showToast("Supplier name required");
    return;
  }

  POS.createSupplier({ name, phone, address, note });
  renderSettingsDetail("suppliers");
  closeModal();
  showToast("Supplier added");
}

function openSupplierProfile(supplierId) {
  const supplier = POS.getSupplierById(supplierId);
  if (!supplier) {
    showToast("Supplier not found");
    return;
  }

  const balance = POS.getSupplierBalance(supplierId);
  const ledger = POS.getSupplierLedgerEntries(supplierId);

  openSimpleModal(`Supplier - ${supplier.name}`, `
    <p><strong>Code:</strong> ${supplier.code}</p>
    <p><strong>Phone:</strong> ${supplier.phone || "-"}</p>
    <p><strong>Address:</strong> ${supplier.address || "-"}</p>
    <p><strong>Balance:</strong> ${balance}</p>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="openSupplierPaymentModal('${supplier.id}')">Pay Supplier</button>
      <button class="action-btn" onclick="openSupplierLedgerModal('${supplier.id}')">Ledger</button>
      <button class="action-btn" onclick="openSupplierDateRangeModal('${supplier.id}')">Report</button>
    </div>

    <div class="card" style="padding:10px; margin-top:12px;">
      <h4 style="margin-top:0;">Recent Ledger</h4>
      ${
        ledger.length
          ? ledger.slice(-5).reverse().map(entry => `
            <p>${entry.date} - ${entry.type} - Dr ${entry.debit} Cr ${entry.credit}</p>
          `).join("")
          : "<p>No ledger entries</p>"
      }
    </div>
  `, false);
}

function openSupplierPaymentModal(supplierId) {
  const supplier = POS.getSupplierById(supplierId);
  if (!supplier) return;

  openSimpleModal(`Pay Supplier - ${supplier.name}`, `
    <input id="supplierPaymentAmount" class="form-input" type="number" placeholder="Amount" />
    <select id="supplierPaymentMethod" class="form-select">
      <option value="cash">Cash</option>
      <option value="bank">Bank</option>
      <option value="easypaisa">EasyPaisa</option>
      <option value="jazzcash">JazzCash</option>
    </select>
    <input id="supplierPaymentNote" class="form-input" type="text" placeholder="Note" />
    <button class="action-btn warning-btn modal-action" onclick="saveSupplierPayment('${supplier.id}')">Save Payment</button>
  `, false);
}

function saveSupplierPayment(supplierId) {
  const amount = Utils.toNumber(document.getElementById("supplierPaymentAmount").value, 0);
  const method = document.getElementById("supplierPaymentMethod").value;
  const note = document.getElementById("supplierPaymentNote").value.trim();

  if (!amount) {
    showToast("Enter amount");
    return;
  }

  POS.paySupplier({ supplierId, amount, method, note });
  closeModal();

  openSimpleModal("Supplier Payment Saved", `
    <p><strong>Amount:</strong> ${amount}</p>
    <p><strong>Method:</strong> ${method}</p>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="printSupplierPaymentReceipt('${supplierId}', ${amount}, '${method}')">Print Receipt</button>
      <button class="action-btn success-btn" onclick="shareSupplierPaymentReceiptOnWhatsApp('${supplierId}', ${amount}, '${method}')">WhatsApp</button>
    </div>
  `, false);

  showToast("Supplier payment saved");
}

function openSupplierLedgerModal(supplierId) {
  const supplier = POS.getSupplierById(supplierId);
  const entries = POS.getSupplierLedgerEntries(supplierId);

  openSimpleModal(`Supplier Ledger - ${supplier.name}`, `
    ${
      entries.length
        ? entries.map(entry => `
          <div class="cart-item">
            <div>
              <h4 style="margin:0 0 4px;">${entry.type}</h4>
              <p style="margin:0; color:#64748b;">${entry.date} | ${entry.refNo || "-"}</p>
              <p style="margin:4px 0 0; color:#64748b;">${entry.note || "-"}</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;">Dr ${entry.debit}</p>
              <p style="margin:4px 0 0;">Cr ${entry.credit}</p>
            </div>
          </div>
        `).join("")
        : "<p>No supplier ledger entries</p>"
    }
  `);
}

function openSupplierDateRangeModal(supplierId) {
  const supplier = POS.getSupplierById(supplierId);
  if (!supplier) return;

  openSimpleModal(`Supplier Report - ${supplier.name}`, `
    <input id="supplierReportFrom" class="form-input" type="date" />
    <input id="supplierReportTo" class="form-input" type="date" style="margin-top:10px;" />
    <button class="action-btn" style="margin-top:10px;" onclick="generateSupplierDateRangeReport('${supplier.id}')">Generate</button>
  `, false);
}

function generateSupplierDateRangeReport(supplierId) {
  const fromDate = document.getElementById("supplierReportFrom").value;
  const toDate = document.getElementById("supplierReportTo").value;

  if (!fromDate || !toDate) {
    showToast("Select from and to dates");
    return;
  }

  const supplier = POS.getSupplierById(supplierId);
  const report = POS.getSupplierDateRangeSummary(supplierId, fromDate, toDate);

  openSimpleModal(`Supplier Report - ${supplier.name}`, `
    <p><strong>From:</strong> ${fromDate}</p>
    <p><strong>To:</strong> ${toDate}</p>
    <p><strong>Total Purchases:</strong> ${report.totalPurchases.toFixed(2)}</p>
    <p><strong>Total Paid:</strong> ${report.totalPaid.toFixed(2)}</p>
    <p><strong>Balance:</strong> ${report.balance.toFixed(2)}</p>

    <div class="card" style="padding:10px; margin-top:10px;">
      <h4 style="margin-top:0;">Purchases</h4>
      ${
        report.purchases.length
          ? report.purchases.map(p => `<p>${p.purchaseNo} - ${p.date} - ${p.total}</p>`).join("")
          : "<p>No purchases in range</p>"
      }
    </div>
  `);
}

/* ---------------- PURCHASES ---------------- */

function renderPurchasesView(container) {
  const purchases = Storage.getPurchases().slice().reverse();

  container.innerHTML = `
    <h3>Purchases</h3>

    <div class="card" style="margin-top:14px;">
      <button class="action-btn primary-btn" onclick="openCreatePurchaseModal()">Create Purchase</button>
    </div>

    <div class="card" style="margin-top:14px;">
      ${
        purchases.length
          ? purchases.map(purchase => `
            <div class="cart-item" onclick="openPurchaseDetail('${purchase.id}')">
              <div>
                <h4 style="margin:0 0 4px;">${purchase.purchaseNo}</h4>
                <p style="margin:0; color:#64748b;">${purchase.supplierName} | ${purchase.date}</p>
                <p style="margin:4px 0 0; color:#64748b;">Total: ${purchase.total} | Paid: ${purchase.paid} | Balance: ${purchase.balance}</p>
              </div>
            </div>
          `).join("")
          : "<p>No purchases found</p>"
      }
    </div>
  `;
}

function openCreatePurchaseModal() {
  openCreatePurchaseModalPrefilled(null);
}

function openCreatePurchaseModalPrefilled(purchase = null) {
  if (purchase?.items?.length) {
    Storage.savePurchaseCart(purchase.items);
  }

  const suppliers = Storage.getSuppliers();
  renderPurchaseCartModal(suppliers, purchase);
}

function renderPurchaseCartModal(suppliers, purchase = null) {
  const cart = POS.getPurchaseCart();
  const cartTotal = POS.getPurchaseCartTotal();

  openSimpleModal(purchase ? "Edit Purchase" : "Create Purchase", `
    <select id="purchaseSupplierId" class="form-select">
      <option value="">Select Supplier</option>
      ${
        suppliers.map(s => `
          <option value="${s.id}" ${purchase?.supplierId === s.id ? "selected" : ""}>
            ${s.name} (${s.code})
          </option>
        `).join("")
      }
    </select>

    <div class="card" style="padding:10px; margin-top:10px;">
      <h4 style="margin-top:0;">Add Purchase Item</h4>
      <select id="purchaseSize" class="form-select">
        <option value="15">15kg</option>
        <option value="35">35kg</option>
        <option value="45">45kg</option>
      </select>
      <select id="purchaseStockType" class="form-select" style="margin-top:8px;">
        <option value="filled">Filled Stock</option>
        <option value="empty">Empty Stock</option>
      </select>
      <input id="purchaseQty" class="form-input" type="number" placeholder="Quantity" style="margin-top:8px;" />
      <input id="purchaseRate" class="form-input" type="number" placeholder="Rate per item" style="margin-top:8px;" />
      <input id="purchaseItemNote" class="form-input" type="text" placeholder="Item note" style="margin-top:8px;" />
      <button class="action-btn primary-btn" style="margin-top:10px;" onclick="addPurchaseItemToCart()">Add Item</button>
    </div>

    <div class="card" style="padding:10px; margin-top:10px;">
      <h4 style="margin-top:0;">Purchase Items</h4>
      ${
        cart.length
          ? cart.map(item => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${item.size}kg - ${item.stockType}</h4>
                <p style="margin:0; color:#64748b;">Qty: ${item.qty} | Rate: ${item.rate}</p>
                <p style="margin:4px 0 0; color:#64748b;">Total: ${item.total}</p>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="chip-btn" onclick="openEditPurchaseCartItemModal('${item.id}')">Edit</button>
                <button class="chip-btn" onclick="removePurchaseCartItem('${item.id}')">Delete</button>
              </div>
            </div>
          `).join("")
          : "<p>No purchase items added</p>"
      }
      <p style="margin-top:10px;"><strong>Total:</strong> ${cartTotal}</p>
    </div>

    <input id="purchasePaid" class="form-input" type="number" placeholder="Paid amount" value="${purchase?.paid || ""}" />
    <select id="purchasePaymentMethod" class="form-select" style="margin-top:8px;">
      <option value="cash" ${purchase?.paymentMethod === "cash" ? "selected" : ""}>Cash</option>
      <option value="bank" ${purchase?.paymentMethod === "bank" ? "selected" : ""}>Bank</option>
      <option value="easypaisa" ${purchase?.paymentMethod === "easypaisa" ? "selected" : ""}>EasyPaisa</option>
      <option value="jazzcash" ${purchase?.paymentMethod === "jazzcash" ? "selected" : ""}>JazzCash</option>
    </select>
    <input id="purchaseNote" class="form-input" type="text" placeholder="Purchase note" value="${purchase?.note || ""}" style="margin-top:8px;" />

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="clearPurchaseCart()">Clear Cart</button>
      <button class="action-btn primary-btn" onclick="savePurchase()">Save Purchase</button>
    </div>
  `, false);
}

function addPurchaseItemToCart() {
  const size = Utils.toNumber(document.getElementById("purchaseSize").value, 0);
  const stockType = document.getElementById("purchaseStockType").value;
  const qty = Utils.toNumber(document.getElementById("purchaseQty").value, 0);
  const rate = Utils.toNumber(document.getElementById("purchaseRate").value, 0);
  const note = document.getElementById("purchaseItemNote").value.trim();

  if (!size || !qty || !rate) {
    showToast("Size, qty and rate required");
    return;
  }

  POS.addItemToPurchaseCart({ size, stockType, qty, rate, note });
  openCreatePurchaseModal();
}

function removePurchaseCartItem(itemId) {
  POS.removePurchaseCartItem(itemId);
  openCreatePurchaseModal();
}

function clearPurchaseCart() {
  POS.clearPurchaseCart();
  openCreatePurchaseModal();
}

function openEditPurchaseCartItemModal(itemId) {
  const item = POS.getPurchaseCart().find(i => i.id === itemId);
  if (!item) {
    showToast("Purchase item not found");
    return;
  }

  openSimpleModal(`Edit Purchase Item`, `
    <select id="editPurchaseSize" class="form-select">
      <option value="15" ${item.size == 15 ? "selected" : ""}>15kg</option>
      <option value="35" ${item.size == 35 ? "selected" : ""}>35kg</option>
      <option value="45" ${item.size == 45 ? "selected" : ""}>45kg</option>
    </select>
    <select id="editPurchaseStockType" class="form-select">
      <option value="filled" ${item.stockType === "filled" ? "selected" : ""}>Filled Stock</option>
      <option value="empty" ${item.stockType === "empty" ? "selected" : ""}>Empty Stock</option>
    </select>
    <input id="editPurchaseQty" class="form-input" type="number" value="${item.qty}" placeholder="Qty" />
    <input id="editPurchaseRate" class="form-input" type="number" value="${item.rate}" placeholder="Rate" />
    <input id="editPurchaseNote" class="form-input" type="text" value="${item.note || ""}" placeholder="Note" />
    <button class="action-btn primary-btn modal-action" onclick="saveEditedPurchaseCartItem('${item.id}')">Save Item</button>
  `, false);
}

function saveEditedPurchaseCartItem(itemId) {
  try {
    POS.updatePurchaseCartItem(itemId, {
      size: Utils.toNumber(document.getElementById("editPurchaseSize").value, 0),
      stockType: document.getElementById("editPurchaseStockType").value,
      qty: Utils.toNumber(document.getElementById("editPurchaseQty").value, 0),
      rate: Utils.toNumber(document.getElementById("editPurchaseRate").value, 0),
      note: document.getElementById("editPurchaseNote").value.trim()
    });

    openCreatePurchaseModal();
    showToast("Purchase item updated");
  } catch (error) {
    showToast(error.message);
  }
}

function savePurchase() {
  const supplierId = document.getElementById("purchaseSupplierId").value || null;
  const paid = Utils.toNumber(document.getElementById("purchasePaid").value, 0);
  const paymentMethod = document.getElementById("purchasePaymentMethod").value;
  const note = document.getElementById("purchaseNote").value.trim();

  const items = POS.getPurchaseCart();

  if (!items.length) {
    showToast("Add at least one purchase item");
    return;
  }

  try {
    POS.createPurchase({
      supplierId,
      items,
      paid,
      paymentMethod,
      note
    });

    POS.clearPurchaseCart();
    renderSettingsDetail("purchases");
    renderSettingsDetail("inventory");
    closeModal();
    showToast("Purchase saved");
  } catch (error) {
    showToast(error.message);
  }
}

function openPurchaseDetail(purchaseId) {
  const purchase = Storage.getPurchases().find(p => p.id === purchaseId);
  if (!purchase) {
    showToast("Purchase not found");
    return;
  }

  openSimpleModal(`Purchase ${purchase.purchaseNo}`, `
    <p><strong>Supplier:</strong> ${purchase.supplierName}</p>
    <p><strong>Date:</strong> ${purchase.date} ${purchase.time}</p>

    <div class="card" style="padding:10px; margin-top:10px;">
      ${
        purchase.items.map(item => `
          <p>${item.size}kg | ${item.stockType} | Qty ${item.qty} | Rate ${item.rate} | Total ${item.total}</p>
        `).join("")
      }
    </div>

    <p><strong>Total:</strong> ${purchase.total}</p>
    <p><strong>Paid:</strong> ${purchase.paid}</p>
    <p><strong>Balance:</strong> ${purchase.balance}</p>
    <p><strong>Payment Method:</strong> ${purchase.paymentMethod}</p>
    <p><strong>Note:</strong> ${purchase.note || "-"}</p>

    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:10px;">
      <button class="action-btn" onclick="openEditPurchaseModal('${purchase.id}')">Edit</button>
      <button class="action-btn warning-btn" onclick="openDeletePurchaseModal('${purchase.id}')">Delete</button>
    </div>
  `, false);
}

function openEditPurchaseModal(purchaseId) {
  const purchase = Storage.getPurchases().find(p => p.id === purchaseId);
  if (!purchase) {
    showToast("Purchase not found");
    return;
  }

  openSimpleModal("Edit Purchase", `
    <p><strong>Purchase:</strong> ${purchase.purchaseNo}</p>
    <p>This will reverse the purchase and open it again for editing.</p>
    <button class="action-btn warning-btn modal-action" onclick="startPurchaseEdit('${purchase.id}')">Start Edit</button>
  `, false);
}

function startPurchaseEdit(purchaseId) {
  try {
    const result = POS.loadPurchaseForEdit(purchaseId);
    closeModal();
    openCreatePurchaseModalPrefilled(result.purchase);
    showToast("Purchase loaded for editing");
  } catch (error) {
    showToast(error.message);
  }
}

function openDeletePurchaseModal(purchaseId) {
  const purchase = Storage.getPurchases().find(p => p.id === purchaseId);
  if (!purchase) {
    showToast("Purchase not found");
    return;
  }

  openSimpleModal("Delete Purchase", `
    <p><strong>Purchase:</strong> ${purchase.purchaseNo}</p>
    <p><strong>Supplier:</strong> ${purchase.supplierName}</p>
    <p>This will reverse stock, supplier ledger, cashbook and costs.</p>
    <p style="color:#b91c1c;"><strong>This action cannot be undone.</strong></p>
    <button class="action-btn warning-btn modal-action" onclick="deletePurchase('${purchase.id}')">Delete Purchase</button>
  `, false);
}

function deletePurchase(purchaseId) {
  try {
    POS.deletePurchaseSafely(purchaseId);
    renderSettingsDetail("purchases");
    renderSettingsDetail("inventory");
    closeModal();
    showToast("Purchase deleted");
  } catch (error) {
    showToast(error.message);
  }
}

/* ---------------- USERS ---------------- */

function renderUsersView(container) {
  try {
    POS.requirePermission("user_manage", "Only owner can manage users");
  } catch (error) {
    container.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  const users = Storage.getUsers();

  container.innerHTML = `
    <h3>Users</h3>

    <div class="card" style="margin-top:14px;">
      <button class="action-btn primary-btn" onclick="openAddUserModal()">Add User</button>
      <button class="action-btn" style="margin-top:10px;" onclick="openChangeMyPasswordModal()">Change My Password</button>
    </div>

    <div class="card" style="margin-top:14px;">
      ${
        users.length
          ? users.map(user => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${user.name}</h4>
                <p style="margin:0; color:#64748b;">${user.username} | ${user.role}</p>
                <p style="margin:4px 0 0; color:#64748b;">
                  Status: ${user.active === false ? "Inactive" : "Active"}
                </p>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="chip-btn" onclick="openResetUserPasswordModal('${user.id}')">Reset PW</button>
                <button class="chip-btn" onclick="toggleUserStatus('${user.id}')">
                  ${user.active === false ? "Activate" : "Disable"}
                </button>
              </div>
            </div>
          `).join("")
          : "<p>No users found</p>"
      }
    </div>
  `;
}

function openAddUserModal() {
  openSimpleModal("Add User", `
    <input id="newUserName" class="form-input" type="text" placeholder="Full name" />
    <input id="newUsername" class="form-input" type="text" placeholder="Username" />
    <input id="newUserPassword" class="form-input" type="password" placeholder="Password" />
    <select id="newUserRole" class="form-select">
      <option value="staff">Staff</option>
      <option value="cashier">Cashier</option>
      <option value="owner">Owner</option>
    </select>
    <button class="action-btn primary-btn modal-action" onclick="saveNewUser()">Save User</button>
  `, false);
}

function saveNewUser() {
  try {
    POS.requirePermission("user_manage", "Only owner can add users");
  } catch (error) {
    showToast(error.message);
    return;
  }

  const name = document.getElementById("newUserName").value.trim();
  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();
  const role = document.getElementById("newUserRole").value;

  if (!username || !password) {
    showToast("Username and password required");
    return;
  }

  POS.createUser({ username, password, role, name });
  renderSettingsDetail("users");
  closeModal();
  showToast("User created");
}

function openChangeMyPasswordModal() {
  const session = POS.getCurrentUser();
  if (!session) {
    showToast("Not logged in");
    return;
  }

  openSimpleModal("Change My Password", `
    <input id="currentPasswordInput" class="form-input" type="password" placeholder="Current password" />
    <input id="newPasswordInput" class="form-input" type="password" placeholder="New password" />
    <button class="action-btn primary-btn modal-action" onclick="saveMyPasswordChange()">Save Password</button>
  `, false);
}

function saveMyPasswordChange() {
  const session = POS.getCurrentUser();
  if (!session) {
    showToast("Not logged in");
    return;
  }

  const currentPassword = document.getElementById("currentPasswordInput").value.trim();
  const newPassword = document.getElementById("newPasswordInput").value.trim();

  if (!currentPassword || !newPassword) {
    showToast("Enter both passwords");
    return;
  }

  try {
    POS.updateUserPassword({
      userId: session.userId,
      currentPassword,
      newPassword
    });

    closeModal();
    showToast("Password changed");
  } catch (error) {
    showToast(error.message);
  }
}

function openResetUserPasswordModal(userId) {
  try {
    POS.requirePermission("password_reset", "Only owner can reset passwords");
  } catch (error) {
    showToast(error.message);
    return;
  }

  openSimpleModal("Reset User Password", `
    <input id="resetUserPasswordInput" class="form-input" type="password" placeholder="New password" />
    <button class="action-btn warning-btn modal-action" onclick="saveResetUserPassword('${userId}')">Reset Password</button>
  `, false);
}

function saveResetUserPassword(userId) {
  const newPassword = document.getElementById("resetUserPasswordInput").value.trim();

  if (!newPassword) {
    showToast("Enter new password");
    return;
  }

  try {
    POS.adminResetUserPassword({ userId, newPassword });
    renderSettingsDetail("users");
    closeModal();
    showToast("Password reset");
  } catch (error) {
    showToast(error.message);
  }
}

function toggleUserStatus(userId) {
  try {
    POS.requirePermission("user_manage", "Only owner can manage users");
  } catch (error) {
    showToast(error.message);
    return;
  }

  try {
    const updated = POS.toggleUserActive(userId);
    renderSettingsDetail("users");
    showToast(`User ${updated.active === false ? "disabled" : "activated"}`);
  } catch (error) {
    showToast(error.message);
  }
}

/* ---------------- NOTIFICATIONS ---------------- */

function renderNotificationsView(container) {
  try {
    POS.requirePermission("notification_view", "No permission to view notifications");
  } catch (error) {
    container.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  const lowStockAlerts = POS.getLowStockAlerts();
  const overdueReturns = POS.getOverdueReturns();
  const pendingReturns = POS.getAllPendingReturnsDetailed();
  const customers = Storage.getCustomers();

  const highDueCustomers = customers
    .map(c => ({
      ...c,
      due: POS.getCustomerBalance(c.id)
    }))
    .filter(c => c.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 10);

  container.innerHTML = `
    <h3>Notifications</h3>

    <div class="card" style="margin-top:14px;">
      <h4>Overdue Returns</h4>
      ${
        overdueReturns.length
          ? overdueReturns.map(item => `
            <p>• ${item.customerName} - ${item.size}kg - Qty ${item.qty} - Due ${item.dueDate}</p>
          `).join("")
          : "<p>No overdue returns</p>"
      }
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Due Soon Returns</h4>
      ${
        pendingReturns.filter(item => item.statusInfo.label === "Due Soon").length
          ? pendingReturns
              .filter(item => item.statusInfo.label === "Due Soon")
              .map(item => `<p>• ${item.customerName} - ${item.size}kg - Due ${item.dueDate}</p>`)
              .join("")
          : "<p>No due soon returns</p>"
      }
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Low Stock Alerts</h4>
      ${
        lowStockAlerts.length
          ? lowStockAlerts.map(alert => `<p>• ${alert}</p>`).join("")
          : "<p>No low stock alerts</p>"
      }
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>High Due Customers</h4>
      ${
        highDueCustomers.length
          ? highDueCustomers.map(c => `<p>• ${c.name} (${c.code}) - Due ${c.due}</p>`).join("")
          : "<p>No due customers</p>"
      }
    </div>
  `;
}

/* ---------------- AUDIT ---------------- */

function renderAuditView(container) {
  try {
    POS.requirePermission("view_audit", "Only owner can view audit log");
  } catch (error) {
    container.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  const logs = POS.getAuditLogs();

  container.innerHTML = `
    <h3>Audit Log</h3>
    <div class="card" style="margin-top:14px;">
      ${
        logs.length
          ? logs.map(log => `
            <div class="cart-item">
              <div>
                <h4 style="margin:0 0 4px;">${log.action}</h4>
                <p style="margin:0; color:#64748b;">${log.date} ${log.time}</p>
                <p style="margin:4px 0 0; color:#64748b;">User: ${log.user} (${log.role})</p>
                <p style="margin:4px 0 0; color:#64748b;">${log.detail}</p>
              </div>
            </div>
          `).join("")
          : "<p>No audit logs found</p>"
      }
    </div>
  `;
}

/* ---------------- CHECKLIST ---------------- */

function renderProductionChecklist(container) {
  container.innerHTML = `
    <h3>Production Checklist</h3>

    <div class="card" style="margin-top:14px;">
      <p>✅ Shop settings configured</p>
      <p>✅ Customer and invoice prefixes checked</p>
      <p>✅ Owner password changed from default</p>
      <p>✅ Backup exported and tested</p>
      <p>✅ Print layout tested</p>
      <p>✅ Purchase costs entered</p>
      <p>✅ Supplier balances verified</p>
      <p>✅ Reminder days configured</p>
      <p>✅ Stock opening balances checked</p>
      <p>✅ User permissions reviewed</p>
      <p>✅ Dark/light mode tested</p>
      <p>✅ CSV export tested</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <h4>Security Notes</h4>
      <p>• Change default passwords immediately</p>
      <p>• Export backup regularly</p>
      <p>• Restrict reset/delete permissions to owner only</p>
      <p>• Test restore from backup before live use</p>
    </div>
  `;
}

/* ---------------- DASHBOARD CHARTS ---------------- */

function getSalesChartData() {
  const orders = Storage.getOrders();
  const dailyMap = {};

  orders.forEach(order => {
    if (!dailyMap[order.date]) dailyMap[order.date] = 0;
    dailyMap[order.date] += order.grandTotal;
  });

  const labels = Object.keys(dailyMap).sort();
  const values = labels.map(date => dailyMap[date]);

  return { labels, values };
}

function getStockChartData() {
  const inventory = Storage.getInventory();

  return {
    labels: ["15kg", "35kg", "45kg"],
    filled: [inventory.size15.filled, inventory.size35.filled, inventory.size45.filled],
    empty: [inventory.size15.empty, inventory.size35.empty, inventory.size45.empty]
  };
}



function renderDashboardCharts() {
  const salesCanvas = document.getElementById("salesTrendChart");
  const stockCanvas = document.getElementById("stockOverviewChart");

  if (salesChartInstance) salesChartInstance.destroy();
  if (stockChartInstance) stockChartInstance.destroy();

  if (salesCanvas) {
    const salesData = getSalesChartData();

    salesChartInstance = new Chart(salesCanvas, {
      type: "line",
      data: {
        labels: salesData.labels,
        datasets: [{
          label: "Sales",
          data: salesData.values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.15)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  }

  if (stockCanvas) {
    const stockData = getStockChartData();

    stockChartInstance = new Chart(stockCanvas, {
      type: "bar",
      data: {
        labels: stockData.labels,
        datasets: [
          {
            label: "Filled",
            data: stockData.filled,
            backgroundColor: "#16a34a"
          },
          {
            label: "Empty",
            data: stockData.empty,
            backgroundColor: "#f59e0b"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  }
}

/* ---------------- EXPORT CSV ---------------- */

function exportCSV(filename, rows) {
  if (!rows.length) {
    showToast("No data to export");
    return;
  }

  const csvContent = rows.map(row =>
    row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function exportCustomersCSV() {
  const customers = Storage.getCustomers();

  const rows = [
    ["Code", "Name", "Phone", "Area", "ID Card", "Due"]
  ];

  customers.forEach(c => {
    rows.push([
      c.code,
      c.name,
      c.phone,
      c.area,
      c.idCard,
      POS.getCustomerBalance(c.id)
    ]);
  });

  exportCSV("customers.csv", rows);
}

function exportBillsCSV() {
  const orders = Storage.getOrders();

  const rows = [
    ["Bill No", "Date", "Customer", "Total", "Paid", "Balance", "Payment Method", "Closed"]
  ];

  orders.forEach(o => {
    rows.push([
      o.billNo,
      o.date,
      o.customerName,
      o.grandTotal,
      o.paid,
      o.balance,
      o.paymentMethod,
      o.isClosed ? "Yes" : "No"
    ]);
  });

  exportCSV("bills.csv", rows);
}

function exportPurchasesCSV() {
  const purchases = Storage.getPurchases();

  const rows = [
    ["Purchase No", "Date", "Supplier", "Total", "Paid", "Balance", "Payment Method"]
  ];

  purchases.forEach(p => {
    rows.push([
      p.purchaseNo,
      p.date,
      p.supplierName,
      p.total,
      p.paid,
      p.balance,
      p.paymentMethod
    ]);
  });

  exportCSV("purchases.csv", rows);
}

function exportExpensesCSV() {
  const expenses = Storage.getExpenses();

  const rows = [
    ["Date", "Time", "Category", "Amount", "Note"]
  ];

  expenses.forEach(e => {
    rows.push([
      e.date,
      e.time,
      e.category,
      e.amount,
      e.note
    ]);
  });

  exportCSV("expenses.csv", rows);
}

function exportSupplierDueCSV() {
  const report = POS.getSupplierDueReport();

  const rows = [
    ["Supplier Code", "Supplier Name", "Phone", "Balance"]
  ];

  report.forEach(item => {
    rows.push([
      item.supplierCode,
      item.supplierName,
      item.phone,
      item.balance
    ]);
  });

  exportCSV("supplier-due-report.csv", rows);
}

/* ---------------- PRINT / SHARE HELPERS ---------------- */

function printInvoice(orderId, mode = "thermal") {
  const html = POS.generateInvoiceHTML(orderId, mode);
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    showToast("Popup blocked. Allow popups.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}

function shareBillOnWhatsApp(orderId) {
  const text = POS.generateBillText(orderId);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function downloadInvoiceHTML(orderId, mode = "thermal") {
  const html = POS.generateInvoiceHTML(orderId, mode);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${orderId}-invoice.html`;
  a.click();

  URL.revokeObjectURL(url);
  showToast("Invoice HTML downloaded");
}

function openInvoicePreview(orderId) {
  const html = POS.generateInvoiceHTML(orderId, "thermal");
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    showToast("Popup blocked. Allow popups.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function copyBillText(orderId) {
  const text = POS.generateBillText(orderId);

  navigator.clipboard.writeText(text)
    .then(() => showToast("Bill text copied"))
    .catch(() => showToast("Copy failed"));
}

function printPaymentReceipt(customerId, amount, method) {
  const html = POS.generatePaymentReceiptHTML(customerId, amount, method);
  const win = window.open("", "_blank", "width=700,height=600");

  if (!win) {
    showToast("Popup blocked");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

function sharePaymentReceiptOnWhatsApp(customerId, amount, method) {
  const text = POS.generatePaymentReceiptText(customerId, amount, method);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function printSupplierPaymentReceipt(supplierId, amount, method) {
  const html = POS.generateSupplierPaymentReceiptHTML(supplierId, amount, method);
  const win = window.open("", "_blank", "width=700,height=600");

  if (!win) {
    showToast("Popup blocked");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

function shareSupplierPaymentReceiptOnWhatsApp(supplierId, amount, method) {
  const text = POS.generateSupplierPaymentReceiptText(supplierId, amount, method);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/* ---------------- ALERTS / BADGE ---------------- */

function updateAlertBadge() {
  const overdueReturns = POS.getOverdueReturns().length;
  const lowStock = POS.getLowStockAlerts().length;
  const total = overdueReturns + lowStock;

  const badge = document.getElementById("alertsBadge");
  if (!badge) return;

  badge.textContent = total;
  badge.style.display = total > 0 ? "grid" : "none";
}

/* ---------------- COMMON MODAL / TOAST ---------------- */

function openSimpleModal(title, bodyHtml, showFooter = true) {
  const modalRoot = document.getElementById("modalRoot");

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="handleOverlayClick(event)">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${showFooter ? `
          <div class="modal-footer">
            <button class="action-btn secondary-btn" onclick="closeModal()">Cancel</button>
            <button class="action-btn primary-btn" onclick="closeModal()">OK</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function handleOverlayClick(event) {
  if (event.target.classList.contains("modal-overlay")) {
    closeModal();
  }
}

function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

function showToast(message) {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2400);
}

/* ---------------- PWA ---------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(err => console.log("SW registration failed", err));
  });
}
/* --- ADD THESE HELPER FUNCTIONS TO THE BOTTOM OF app.js --- */

// Fix for Cart Badges
function getBadgeClass(type) {
  const map = {
    refill: "info",
    new_return: "warning",
    new_paid: "success",
    empty_paid: "secondary",
    gas_kg: "primary"
  };
  return map[type] || "info";
}

// Fix for Bill Status Badges (The error you saw)
function getOrderBadgeClass(status) {
  const map = {
    paid: "success",
    partial: "warning",
    credit: "danger"
  };
  return map[status] || "info";
}

// Fix for Ledger Entry Labels
function formatLedgerType(type) {
  const map = {
    sale: "Sale Bill",
    payment: "Payment Received",
    purchase: "Stock Purchase",
    opening: "Opening Balance"
  };
  return map[type] || type;
}