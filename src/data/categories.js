import seedCatalog from './generated/catalog.seed.json';

// Endast migrerings-/offlinefallback. Aktuella grupper hämtas via catalogStore/categoryAdmin.
export const MENU_CATEGORIES = seedCatalog.categories || [];
