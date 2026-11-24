import { getOrderCustomer } from "./orderCustomer";
import { getCatalogArticles, getCatalogCategories } from "./catalogStore";

const filled = (...values) => values.find(value => value !== null && value !== undefined && String(value).trim() !== "") || "";

export function planningCustomer(order = {}) {
  return getOrderCustomer(order);
}

export function planningObject(order = {}) {
  return filled(order.orderDetails?.managementObject, order.managementObject);
}

export function planningArticleGroups(order = {}) {
  const articles = getCatalogArticles() || [];
  const categories = getCatalogCategories() || [];
  const names = new Set();
  const items = order.cart || order.items || [];
  for (const item of items) {
    const article = articles.find(product =>
      (item.productId != null && String(product.id) === String(item.productId)) ||
      (item.articleNumber != null && String(product.articleNumber) === String(item.articleNumber)) ||
      (item.id != null && String(product.id) === String(item.id))
    );
    const categoryId = filled(item.categoryId, article?.categoryId, item.category);
    const category = categories.find(group => String(group.id) === String(categoryId));
    const name = filled(category?.title, category?.name, item.categoryTitle, item.categoryName,
      item.productGroupName, article?.categoryName, categoryId);
    if (name) names.add(String(name));
  }
  return [...names].join(", ") || "–";
}
