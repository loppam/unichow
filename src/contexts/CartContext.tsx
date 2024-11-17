import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  packId: string;
  restaurantId: string;
  restaurantName: string;
}

interface Pack {
  id: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
}

interface CartContextType {
  packs: Pack[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'packId'>, packId?: string) => void;
  createNewPack: (restaurantId: string, restaurantName: string) => string;
  removeFromCart: (packId: string, itemId: string) => void;
  increaseQuantity: (packId: string, itemId: string) => void;
  decreaseQuantity: (packId: string, itemId: string) => void;
  removePack: (packId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [packs, setPacks] = useState<Pack[]>([]);

  const createNewPack = (restaurantId: string, restaurantName: string) => {
    const newPackId = crypto.randomUUID();
    setPacks(prev => [...prev, {
      id: newPackId,
      restaurantId,
      restaurantName,
      items: []
    }]);
    return newPackId;
  };

  const addToCart = (item: Omit<CartItem, 'quantity' | 'packId'>, packId?: string) => {
    setPacks(prevPacks => {
      // If packId is provided, add to specific pack
      if (packId) {
        return prevPacks.map(pack => {
          if (pack.id === packId) {
            const existingItem = pack.items.find(i => i.id === item.id);
            if (existingItem) {
              return {
                ...pack,
                items: pack.items.map(i =>
                  i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                )
              };
            }
            return {
              ...pack,
              items: [...pack.items, { ...item, quantity: 1, packId }]
            };
          }
          return pack;
        });
      }

      // If no packId, create new pack
      const newPackId = crypto.randomUUID();
      const newPack: Pack = {
        id: newPackId,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        items: [{ ...item, quantity: 1, packId: newPackId }]
      };
      return [...prevPacks, newPack];
    });
  };

  const removeFromCart = (packId: string, itemId: string) => {
    setPacks(prevPacks => {
      const updatedPacks = prevPacks.map(pack => 
        pack.id === packId
          ? {
              ...pack,
              items: pack.items.filter(item => item.id !== itemId)
            }
          : pack
      );
      return updatedPacks;
    });
  };

  const increaseQuantity = (packId: string, itemId: string) => {
    setPacks(prevPacks => {
      const updatedPacks = prevPacks.map(pack => 
        pack.id === packId
          ? {
              ...pack,
              items: pack.items.map(item =>
                item.id === itemId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            }
          : pack
      );
      return updatedPacks;
    });
  };

  const decreaseQuantity = (packId: string, itemId: string) => {
    setPacks(prevPacks => {
      const updatedPacks = prevPacks.map(pack => 
        pack.id === packId
          ? {
              ...pack,
              items: pack.items.map(item =>
                item.id === itemId && item.quantity > 1
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              )
            }
          : pack
      );
      return updatedPacks;
    });
  };

  const removePack = (packId: string) => {
    setPacks(prevPacks => prevPacks.filter(pack => pack.id !== packId));
  };

  const clearCart = () => {
    setPacks([]);
  };

  return (
    <CartContext.Provider
      value={{
        packs,
        addToCart,
        createNewPack,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        removePack,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 