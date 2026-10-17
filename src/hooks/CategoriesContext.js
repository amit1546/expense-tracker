import { createContext, useContext } from 'react';
import { DEFAULT_CATEGORIES, lookup } from '../lib/categories.js';

// categories: the current list (in display order); getCategory(id): the entry for an id, or the fallback one
export const CategoriesContext = createContext({
  categories: DEFAULT_CATEGORIES,
  getCategory: lookup(DEFAULT_CATEGORIES).get,
});

export const useCategories = () => useContext(CategoriesContext);
