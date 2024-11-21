export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  customOptions?: string[];
  createdAt: string;
  updatedAt: string;
  preparationTime: number;
  orderCount?: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
} 