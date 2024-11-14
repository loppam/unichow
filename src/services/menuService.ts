import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, addDoc } from 'firebase/firestore';
import { MenuItem, MenuCategory } from '../types/menu';

export const menuService = {
  async addMenuItem(restaurantId: string, item: Omit<MenuItem, 'id'>): Promise<void> {
    const menuRef = collection(db, `restaurants/${restaurantId}/menu`);
    await addDoc(menuRef, {
      ...item,
      createdAt: new Date().toISOString()
    });
  },

  async updateMenuItem(restaurantId: string, itemId: string, updates: Partial<MenuItem>): Promise<void> {
    const itemRef = doc(db, `restaurants/${restaurantId}/menu/${itemId}`);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  async deleteMenuItem(restaurantId: string, itemId: string) {
    await deleteDoc(doc(db, `restaurants/${restaurantId}/menu/${itemId}`));
  },

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    const menuRef = collection(db, `restaurants/${restaurantId}/menu`);
    const snapshot = await getDocs(menuRef);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as MenuItem));
  },

  async updateCategory(restaurantId: string, category: MenuCategory) {
    const categoryRef = doc(db, `restaurants/${restaurantId}/categories/${category.id}`);
    await setDoc(categoryRef, category);
  },

  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    const categoriesRef = collection(db, `restaurants/${restaurantId}/categories`);
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map(doc => doc.data() as MenuCategory);
  }
}; 