export const ORDER_DETAIL_KEYS = [
  "customerReference",
  "projectName",
  "projectCode",
  "managementObject",
  "targetPoint",
  "property",
  "building",
  "floor",
  "room",
  "priority",
  "requestedCompletionDate",
  "requestedExecutionNote",
];

export function getOrderDetails(order = {}) {
  const nested = order?.orderDetails && typeof order.orderDetails === "object"
    ? order.orderDetails
    : {};

  return ORDER_DETAIL_KEYS.reduce((result, key) => {
    const value = nested[key] ?? order?.[key] ?? "";
    result[key] = value == null ? "" : value;
    return result;
  }, {});
}
