import algoliasearch from 'algoliasearch/lite';

// Check if environment variables are defined
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || process.env.REACT_APP_ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.NEXT_PUBLIC_ALGOLIA_ADMIN_KEY || process.env.REACT_APP_ALGOLIA_ADMIN_KEY;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  throw new Error('Algolia credentials are not properly configured in environment variables');
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

const restaurantsIndex = client.initIndex('restaurants');
const menuItemsIndex = client.initIndex('menu_items');

interface SearchableRestaurant {
  objectID: string;
  name: string;
  cuisine: string[];
  address: string;
  rating?: number;
  priceRange?: string;
  [key: string]: any;
}

interface SearchableMenuItem {
  objectID: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  restaurantId: string;
  [key: string]: any;
}

export const searchService = {
  async indexRestaurant(restaurantId: string, data: Omit<SearchableRestaurant, 'objectID'>) {
    await restaurantsIndex.saveObject({
      objectID: restaurantId,
      ...data
    });
  },

  async indexMenuItem(itemId: string, data: Omit<SearchableMenuItem, 'objectID'>) {
    await menuItemsIndex.saveObject({
      objectID: itemId,
      ...data
    });
  },

  async search(query: string, filters?: string[]) {
    const { hits } = await restaurantsIndex.search(query, {
      filters: filters?.join(' AND '),
      hitsPerPage: 20
    });
    return hits as SearchableRestaurant[];
  }
}; 