import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { CartItem, useCart } from "../contexts/CartContext";
import { toast } from "react-hot-toast";
import { orderService } from "../services/orderService";
import { useAuth } from "../contexts/AuthContext";
import { Address } from "../types/order";
import { customerService } from "../services/customerService";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { adminSettingsService } from "../services/adminSettingsService";
import { usePaystackPayment } from "react-paystack";
import PaymentBreakdown from "../components/PaymentBreakdown";
import { notificationService } from "../services/notificationService";

interface DeliveryFormData {
  address: string;
  additionalInstructions?: string;
}

interface DeliverySettings {
  deliveryRadius: number;
  freeDeliveryThreshold: number;
  baseDeliveryFee: number;
}

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const RIDER_ACCOUNT_CODE = import.meta.env.VITE_RIDER_ACCOUNT_CODE;

export default function Cart() {
  const {
    packs,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryFormData>({
    address: "",
    additionalInstructions: "",
  });
  const [addressError, setAddressError] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [deliverySettings, setDeliverySettings] = useState({
    freeDeliveryThreshold: 5000,
    baseDeliveryFee: 500,
  });
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"cart" | "payment">("cart");
  const initializePayment = usePaystackPayment({
    publicKey: PAYSTACK_PUBLIC_KEY,
    email: "",
    amount: 0,
    metadata: {
      custom_fields: [],
    },
    split: {
      type: "percentage",
      bearer_type: "account",
      subaccounts: [],
    },
  });
  const [restaurantData, setRestaurantData] = useState<any>(null);

  const calculatePackTotal = (items: CartItem[]) => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  const calculateSubtotal = () => {
    return packs.reduce((acc, pack) => acc + calculatePackTotal(pack.items), 0);
  };

  const calculateDeliveryFee = () => {
    const subtotal = calculateSubtotal();

    // Return 0 if cart is empty
    if (packs.length === 0) {
      return 0;
    }

    // Apply free delivery if subtotal meets threshold
    if (subtotal >= deliverySettings.freeDeliveryThreshold) {
      return 0;
    }

    return deliverySettings.baseDeliveryFee;
  };

  const calculateServiceFee = (subtotal = calculateSubtotal()) => {
    return subtotal * 0.1; // 10% of subtotal
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDeliveryFee() + calculateServiceFee();
  };

  // Load saved addresses
  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return;
      setIsInitializing(true);

      try {
        // Load saved addresses
        const addresses = await customerService.getSavedAddresses(user.uid);
        setSavedAddresses(addresses);

        // If no delivery address is set yet, get the initial address
        if (!deliveryAddress.address) {
          const initialAddress = await customerService.getInitialAddress(
            user.uid
          );
          if (initialAddress) {
            setDeliveryAddress(initialAddress);
          }
        }
      } catch (error) {
        console.error("Error loading addresses:", error);
        toast.error("Failed to load addresses");
      } finally {
        setIsInitializing(false);
      }
    };

    loadAddresses();
  }, [user]);

  // Handle saved address selection

  // Handle saving new address
  const handleSaveAddress = async () => {
    if (!user) return;

    // Validate address before saving
    if (!deliveryAddress.address.trim()) {
      toast.error("Please enter a delivery address before saving");
      return;
    }

    try {
      await customerService.saveAddress(user.uid, deliveryAddress);
      const addresses = await customerService.getSavedAddresses(user.uid);
      setSavedAddresses(addresses);
      toast.success("Address saved successfully");
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  const handleAddNewPack = (restaurantId: string) => {
    if (packs.length > 0 && packs[0].restaurantId !== restaurantId) {
      alert(
        "You can only order from one restaurant at a time. Please complete or clear your current order first."
      );
      return;
    }
    navigate(`/restaurant/${restaurantId}?newPack=true`);
  };

  const handlePaystackSuccess = async (reference: PaystackResponse) => {
    try {
      // Create order with pack structure
      const newOrder = {
        customerId: user!.uid,
        restaurantId: packs[0].restaurantId,
        packs: packs.map((pack) => ({
          id: pack.id,
          restaurantName: pack.restaurantName,
          items: pack.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || "",
          })),
        })),
        customerName:
          userData?.firstName || userData?.lastName
            ? `${userData?.firstName || ""} ${userData?.lastName || ""}`
            : "Anonymous",
        customerPhone: userData?.phone || "",
        deliveryAddress: {
          address: deliveryAddress.address,
          additionalInstructions: deliveryAddress.additionalInstructions || "",
        },
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        deliveryFee: calculateDeliveryFee(),
        serviceFee: calculateServiceFee(),
        status: "pending" as const,
        paymentMethod: "card" as const,
        paymentStatus: "completed" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentReference: reference,
      };

      // Create the order in the database
      const orderId = await orderService.createOrder(user!.uid, newOrder);

      // Clear cart and redirect
      clearCart();
      navigate(`/orders`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    }
  };

  const handlePaystackClose = () => {
    console.log("Payment modal closed");
    toast.error("Payment cancelled. Please try again.");
    setPaymentStep("cart"); // Reset to cart step
  };

  const validateAddress = () => {
    if (!deliveryAddress.address.trim()) {
      setError("Please enter a delivery address");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    if (!deliveryAddress.address) {
      toast.error("Please enter a delivery address");
      return;
    }

    try {
      // Fetch restaurant data if not already loaded
      if (!restaurantData) {
        const restaurantDoc = await getDoc(
          doc(db, "restaurants", packs[0].restaurantId)
        );
        if (restaurantDoc.exists()) {
          setRestaurantData(restaurantDoc.data());
        }
      }

      setPaymentStep("payment");
    } catch (error) {
      console.error("Error preparing payment:", error);
      toast.error("Failed to initialize payment");
    }
  };

  const renderAddressForm = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h2 className="font-semibold mb-4">Delivery Address</h2>

      {addressError && (
        <div className="text-red-500 text-sm mb-4">{addressError}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Address *
          </label>
          <input
            type="text"
            value={deliveryAddress.address}
            onChange={(e) =>
              setDeliveryAddress((prev) => ({
                ...prev,
                address: e.target.value,
              }))
            }
            className="w-full p-2 border rounded-md"
            placeholder="Enter your full delivery address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Instructions
          </label>
          <textarea
            value={deliveryAddress.additionalInstructions}
            onChange={(e) =>
              setDeliveryAddress((prev) => ({
                ...prev,
                additionalInstructions: e.target.value,
              }))
            }
            className="w-full p-2 border rounded-md"
            placeholder="Apartment number, delivery instructions, etc."
            rows={2}
          />
        </div>

        {/* Save Address Checkbox */}
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            id="saveAddress"
            className="rounded border-gray-300"
            disabled={!deliveryAddress.address.trim()}
            onChange={(e) => {
              if (e.target.checked) {
                handleSaveAddress();
              }
            }}
          />
          <label htmlFor="saveAddress" className="ml-2 text-sm text-gray-600">
            Save this address for future orders
          </label>
        </div>
      </div>
    </div>
  );

  // Move the fetchDeliverySettings to a separate function
  const fetchDeliverySettings = async () => {
    try {
      const settings = await adminSettingsService.getSettings();
      if (settings?.delivery) {
        setDeliverySettings({
          freeDeliveryThreshold: settings.delivery.freeDeliveryThreshold,
          baseDeliveryFee: settings.delivery.baseDeliveryFee,
        });
      }
    } catch (error) {
      console.error("Error fetching delivery settings:", error);
    }
  };

  // Add useEffect to fetch settings on mount and route changes
  useEffect(() => {
    fetchDeliverySettings();
  }, [location.pathname]);

  const getPaystackConfig = (restaurantData: any) => {
    if (!user || !restaurantData) {
      throw new Error("Missing required payment information");
    }

    const total = calculateTotal();
    const amount = Math.round(total * 100); // Convert to kobo/cents

    // Validate amount
    if (amount < 100) {
      throw new Error("Order amount is too small");
    }

    const baseConfig = {
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email || "",
      amount,
      currency: "NGN",
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value:
              userData?.firstName || userData?.lastName
                ? `${userData?.firstName || ""} ${userData?.lastName || ""}`
                : "Anonymous",
          },
        ],
      },
      onSuccess: handlePaystackSuccess,
      onClose: handlePaystackClose,
    };

    // Only add split if restaurant has valid payment info
    if (restaurantData?.paymentInfo?.paystackSubaccountCode) {
      const deliveryFeePercentage = Math.max(
        1,
        Math.floor((calculateDeliveryFee() / total) * 100)
      );
      const restaurantShare = 90 - deliveryFeePercentage;

      return {
        ...baseConfig,
        split: {
          type: "percentage",
          bearer_type: "account",
          subaccounts: [
            {
              subaccount: restaurantData.paymentInfo.paystackSubaccountCode,
              share: restaurantShare,
            },
          ],
        },
      };
    }

    return baseConfig;
  };

  useEffect(() => {
    if (
      restaurantData &&
      !restaurantData?.paymentInfo?.paystackSubaccountCode
    ) {
      toast.error("Restaurant payment information is missing");
    }
  }, [restaurantData]);

  // Add useEffect to fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Initializing payment...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-center">
          {paymentStep === "cart" ? "My Cart" : "Payment"}
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        {paymentStep === "cart" ? (
          <>
            {packs.map((pack, index) => (
              <div
                key={pack.id}
                className="bg-white rounded-lg shadow-sm p-4 mb-4"
              >
                <div className="border-b pb-2 mb-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-semibold">{pack.restaurantName}</h2>
                    <div className="text-sm text-gray-500">
                      Pack {index + 1}
                    </div>
                  </div>
                </div>

                {pack.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 py-4 border-b last:border-0"
                  >
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

            {renderAddressForm()}

            <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₦{calculateSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₦{calculateDeliveryFee().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee (10%)</span>
                <span>₦{calculateServiceFee().toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>₦{calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={packs.length === 0 || isInitializing}
              className="w-full py-3 rounded-lg border border-black transition-colors bg-primary text-zinc-900 hover:bg-primary/90 disabled:opacity-50"
            >
              {isInitializing ? "Processing..." : "Proceed to Payment"}
            </button>
          </>
        ) : restaurantData ? (
          <PaymentBreakdown
            subtotal={calculateSubtotal()}
            deliveryFee={calculateDeliveryFee()}
            serviceFee={calculateServiceFee()}
            total={calculateTotal()}
            paystackConfig={getPaystackConfig(restaurantData)}
            onBack={() => setPaymentStep("cart")}
            restaurantId={packs[0].restaurantId}
          />
        ) : (
          <div className="text-center py-4">
            <p>Loading payment details...</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
