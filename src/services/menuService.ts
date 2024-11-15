import { db, storage } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { MenuItem, MenuCategory } from '../types/menu';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const menuService = {
  async addMenuItem(restaurantId: string, data: {
    name: string;
    description: string;
    price: number;
    category: string;
    image?: File;
  }) {
    const menuRef = doc(collection(db, `restaurants/${restaurantId}/menu`));
    const timestamp = new Date().toISOString();

    // Create menu item first
    await setDoc(menuRef, {
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Handle image upload if provided
    if (data.image) {
      const imageRef = ref(storage, `restaurants/${restaurantId}/menu/${menuRef.id}`);
      await uploadBytes(imageRef, data.image);
      const imageUrl = await getDownloadURL(imageRef);

      await updateDoc(menuRef, {
        imageUrl,
        updatedAt: new Date().toISOString()
      });
    }

    return menuRef.id;
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
  },

  async updateMenuItems(restaurantId: string, updates: Array<{
    id: string;
    data: Partial<MenuItem>;
  }>) {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    updates.forEach(({ id, data }) => {
      const ref = doc(db, `restaurants/${restaurantId}/menu/${id}`);
      batch.update(ref, {
        ...data,
        updatedAt: timestamp
      });
    });

    await batch.commit();
  }
}; 