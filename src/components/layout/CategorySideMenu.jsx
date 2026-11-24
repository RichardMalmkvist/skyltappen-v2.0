import { getPublicRootCategories, getPublicCategoryById } from "../../data/categoryAdmin";

// Share the homepage category navigation's presentation on catalog and product pages.
export default function CategorySideMenu({ activeCategoryId, onSelectCategory }) {
  const categories = getPublicRootCategories();
  const activeId=getPublicCategoryById(activeCategoryId)?.parentId||activeCategoryId;

  return (
    <aside className="jsf-public-sidebar jsf-home-category-sidebar" aria-label="Produktkategorier">
      <h2>Produktkategorier</h2>
      <div className="jsf-home-sidebar-rule" />
      <nav className="jsf-home-sidebar-links">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={category.id === activeId ? "jsf-category-active" : ""}
            aria-current={category.id === activeId ? "page" : undefined}
            onClick={() => onSelectCategory(category)}
          >
            <span>{category.title}</span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
