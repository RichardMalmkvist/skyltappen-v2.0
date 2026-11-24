export function purchaserFromAccount(user) {
  return {
    purchaserName: user ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name || "" : "",
    purchaserPhone: user?.phone || "",
    purchaserEmail: user?.email || "",
  };
}

export function syncPurchaserAccount(orderer, user, previousUser) {
  const next = purchaserFromAccount(user);
  if (!user || user.id !== previousUser?.id) return { ...orderer, ...next };
  const previous = purchaserFromAccount(previousUser);
  const result = { ...orderer };
  Object.keys(next).forEach(key => {
    if (!result[key] || result[key] === previous[key]) result[key] = next[key];
  });
  return result;
}
