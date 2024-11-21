import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { MenuItem, MenuCategory } from "../types/menu";
import { menuService } from "../services/menuService";
import { Plus, Edit2, Trash2 } from "lucide-react";
import MenuItemModal from "../components/menu/MenuItemModal";
import CategoryModal from "../components/menu/CategoryModal";
import RestaurantLayout from "../components/RestaurantLayout";
export default function RestaurantMenu() {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(
    null
  );

  useEffect(() => {
    loadMenuData();
  }, [user]);

  const loadMenuData = async () => {
    if (!user) return;
    try {
      const [menuItems, menuCategories] = await Promise.all([
        menuService.getMenuItems(user.uid),
        menuService.getCategories(user.uid),
      ]);
      setItems(menuItems);
      setCategories(menuCategories);
    } catch (err) {
      setError("Failed to load menu data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (item: Partial<MenuItem>) => {
    if (!user) return;
    try {
      if (selectedItem) {
        await menuService.updateMenuItem(user.uid, selectedItem.id, item);
      } else {
        await menuService.addMenuItem(
          user.uid,
          item as {
            name: string;
            description: string;
            price: number;
            category: string;
            image?: File;
          }
        );
      }
      await loadMenuData();
      setIsItemModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      setError("Failed to save menu item");
      console.error(err);
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!user || !window.confirm("Are you sure you want to delete this item?"))
      return;
    try {
      await menuService.deleteMenuItem(user.uid, item.id);
      await loadMenuData();
    } catch (err) {
      setError("Failed to delete menu item");
      console.error(err);
    }
  };

  const handleSaveCategory = async (category: MenuCategory) => {
    if (!user) return;
    try {
      await menuService.updateCategory(user.uid, category);
      await loadMenuData();
      setIsCategoryModalOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      setError("Failed to save category");
      console.error(err);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!user) return;
    try {
      await menuService.updateMenuItem(user.uid, item.id, {
        isAvailable: !item.isAvailable,
      });
      await loadMenuData();
    } catch (err) {
      setError("Failed to update item availability");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <RestaurantLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg">{error}</div>
        )}

        {/* Categories Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Categories</h2>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border p-4 rounded-lg flex justify-between items-center"
              >
                <span>{category.name}</span>
                <button
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsCategoryModalOpen(true);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Menu Items</h2>
            <button
              onClick={() => {
                setSelectedItem(null);
                setIsItemModalOpen(true);
              }}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-2 py-1 text-xs rounded ${
                            item.isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        {item.description}
                      </p>
                      <p className="text-lg font-medium mt-2">
                        ₦{item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsItemModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <MenuItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveItem}
        item={selectedItem}
        categories={categories}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        onSave={handleSaveCategory}
        category={selectedCategory}
      />
    </RestaurantLayout>
  );
}
