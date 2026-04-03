const Utils = {
  uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  },
  
  formatDate(date = new Date()) {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  },
  
  formatDisplayDate(date = new Date()) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  },
  
  formatTime(date = new Date()) {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  },
  
  toNumber(value, fallback = 0) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },
  
  deepClone(data) {
    return JSON.parse(JSON.stringify(data));
  },
  
  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  },
  
  getPaymentStatus(total, paid) {
    if (paid <= 0) return "credit";
    if (paid >= total) return "paid";
    return "partial";
  },
  
  getOrderStatus(total, paid) {
    if (paid >= total) return "completed";
    if (paid > 0) return "partial";
    return "credit";
  }
};