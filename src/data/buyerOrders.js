const {isBadgeOrder,isBadgeItem}=require('./badgeProduction');
// Legacy mixed orders are hidden too; their badge details must not leak through totals or documents.
function buyerOrderVisible(order){return !isBadgeOrder(order)&&!(order.cart||[]).some(isBadgeItem);}
module.exports={buyerOrderVisible};
