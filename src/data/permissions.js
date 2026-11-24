// Shared policy for navigation and server checks. Unknown roles have no rights.
const ROLE_PAGES = {
  admin: ['dashboard', 'statistics', 'approvalOrders', 'orders', 'badgeProduction', 'planning', 'articles', 'symbols', 'articleGroups', 'projects', 'users', 'drawings', 'settings'],
  personal: ['dashboard', 'orders', 'planning', 'articles', 'projects', 'drawings'],
  bestallare: ['dashboard', 'orders', 'projects', 'drawings'],
};
function canOpenPage(role, page) { return (ROLE_PAGES[role] || []).includes(page); }
function canEdit(role) { return role === 'admin'; }
function canChangeStatus(role) { return role === 'admin' || role === 'personal'; }
function canRead(role) { return Object.prototype.hasOwnProperty.call(ROLE_PAGES, role); }
module.exports = { ROLE_PAGES, canOpenPage, canEdit, canChangeStatus, canRead };
