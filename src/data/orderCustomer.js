// Prefer the customer's business/unit over the contact person's name.
// Keep older orders compatible with both the legacy and current data models.
export function getOrderCustomer(order = {}) {
  return String(order.orderDetails?.customer || order.orderer?.customer || order.orderer?.company || order.delivery?.company || order.customer || "").trim();
}
