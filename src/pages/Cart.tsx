import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { CartItem, useCart } from "../contexts/CartContext";

export default function Cart() {
  const { packs, increaseQuantity, decreaseQuantity, removeFromCart, removePack } = useCart();
  const navigate = useNavigate();

  const deliveryPrice = 500; // Per pack delivery fee

  const calculatePackTotal = (items: CartItem[]) => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  const calculateSubtotal = () => {
    return packs.reduce((acc, pack) => acc + calculatePackTotal(pack.items), 0);
  };

  const calculateTotalDeliveryFee = () => {
    // Get unique restaurant IDs from all packs
    const uniqueRestaurants = new Set(packs.map(pack => pack.restaurantId));
    // Multiply delivery fee by number of unique restaurants
    return uniqueRestaurants.size * deliveryPrice * 0.8;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalDeliveryFee();
  };

  const handleAddNewPack = (restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}?newPack=true`);
  };

  const handleCheckout = () => {
    const orderData = {
      packs: packs.map(pack => ({
        ...pack,
        subtotal: calculatePackTotal(pack.items),
        deliveryFee: deliveryPrice,
        total: calculatePackTotal(pack.items) + deliveryPrice
      })),
      totalAmount: calculateTotal()
    };
    
    navigate('/checkout', { state: { orderData } });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-center">My Cart</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        {packs.map((pack, index) => (
          <div key={pack.id} className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="border-b pb-2 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">{pack.restaurantName}</h2>
                <div className="text-sm text-gray-500">Pack {index + 1}</div>
              </div>
            </div>
            
            {pack.items.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 py-4 border-b last:border-0">
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-gray-600">
                        ₦{(item.price * item.quantity).toLocaleString()}
                        <span className="text-sm text-gray-400 ml-1">
                          (₦{item.price.toLocaleString()} each)
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-1 rounded-md hover:bg-gray-100"
                        onClick={() => decreaseQuantity(pack.id, item.id)}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        className="p-1 rounded-md hover:bg-gray-100"
                        onClick={() => increaseQuantity(pack.id, item.id)}
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 ml-4"
                        onClick={() => removeFromCart(pack.id, item.id)}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => handleAddNewPack(pack.restaurantId)}
              className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Add Another Pack from {pack.restaurantName}
            </button>
          </div>
        ))}

        <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₦{calculateSubtotal().toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee ({new Set(packs.map(pack => pack.restaurantId)).size} {
              new Set(packs.map(pack => pack.restaurantId)).size === 1 ? 'restaurant' : 'restaurants'
            })</span>
            <span>₦{calculateTotalDeliveryFee().toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span>₦{calculateTotal().toLocaleString()}</span>
          </div>
        </div>

        <button
          className="btn-primary w-full mt-4 flex justify-center items-center"
          onClick={handleCheckout}
        >
          Proceed to Checkout (₦{calculateTotal().toLocaleString()})
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
