import { ReactNode } from "react";

export interface MenuItem {
  orderCount: ReactNode;
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  preparationTime: number;
  allergens: string[];
  spicyLevel: number;
  vegetarian: boolean;
  featured: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
} 