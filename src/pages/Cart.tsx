import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Minus, Plus, Trash2, MapPin, X } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { CartItem, useCart } from "../contexts/CartContext";
import { toast } from "react-hot-toast";
import { orderService } from "../services/orderService";
import { useAuth } from "../contexts/AuthContext";
import { Address, Order } from "../types/order";
import { customerService } from "../services/customerService";
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { adminSettingsService } from "../services/adminSettingsService";
import { usePaystackPayment } from "react-paystack";
import PaymentBreakdown from "../components/PaymentBreakdown";
import { walletService } from "../services/walletService";
import WalletPaymentOption from "../components/WalletPaymentOption";
import { Wallet } from "../types/wallet";
import { Rider } from "../types/rider";
import { useAddress } from "../contexts/AddressContext";
import { LOCATIONS } from "../constants/locations";
import { riderService } from "../services/riderService";

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

interface RestaurantData {
  id: string;
  restaurantName: string;
  paymentInfo: {
    paystackSubaccountCode: string;
    isVerified: boolean;
  };
  status: "pending" | "approved" | "rejected" | "suspended";
}

interface UserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

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
  const { currentAddress, setCurrentAddress } = useAddress();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [deliverySettings, setDeliverySettings] = useState({
    freeDeliveryThreshold: 5000,
    baseDeliveryFee: 500,
  });
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
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(
    null
  );
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "wallet">(
    "paystack"
  );
  const [processing, setProcessing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    hostelName: "",
    location: LOCATIONS[0],
  });

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
        if (!currentAddress.address) {
          const initialAddress = await customerService.getInitialAddress(
            user.uid
          );
          if (initialAddress) {
            setCurrentAddress(initialAddress);
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
  }, [user, currentAddress.address, setCurrentAddress]);

  // Handle saved address selection
  const handleAddNewPack = (restaurantId: string) => {
    if (packs.length > 0 && packs[0].restaurantId !== restaurantId) {
      alert(
        "You can only order from one restaurant at a time. Please complete or clear your current order first."
      );
      return;
    }
    navigate(`/restaurant/${restaurantId}?newPack=true`);
  };

  const generateDeliveryCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handlePaystackSuccess = async (reference: { reference: string }) => {
    try {
      if (!user) return;

      const paymentRef = reference as unknown as PaystackResponse;
      const newOrder = {
        customerId: user.uid,
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
          address: currentAddress.address,
          additionalInstructions: currentAddress.additionalInstructions || "",
        },
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        deliveryFee: calculateDeliveryFee(),
        serviceFee: calculateServiceFee(),
        deliveryConfirmationCode: generateDeliveryCode(),
        paymentMethod: "paystack",
        paymentStatus: "completed",
        paymentReference: paymentRef.reference,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        riderId: null,
        assignedAt: null,
      };

      const orderId = await orderService.createOrder(user.uid, newOrder);

      // Add rider assignment after order creation
      try {
        await riderService.assignRiderToOrder(orderId);
      } catch (error) {
        console.error("Failed to assign rider:", error);
        // Don't block the order confirmation, just log the error
      }

      clearCart();

      // Show confirmation modal with delivery code
      const confirmedOrderData = {
        ...newOrder,
        id: orderId,
        customerAddress: currentAddress.address,
        items: packs.flatMap((pack) => pack.items),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        restaurantName: packs[0].restaurantName,
        packs: packs.map((pack) => ({
          ...pack,
          restaurantId: pack.restaurantId,
          restaurantAddress: "",
        })),
      } as unknown as Order;

      setConfirmedOrder(confirmedOrderData);
      setShowConfirmationModal(true);

      // Wait 10 seconds then navigate to orders page
      setTimeout(() => {
        setShowConfirmationModal(false);
        navigate("/orders", {
          state: {
            showConfirmation: true,
            order: confirmedOrderData,
          },
        });
      }, 3000);

      toast.success("Order placed successfully!");
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    }
  };

  const handlePaystackClose = () => {
    console.log("Payment modal closed");
    toast.error("Payment cancelled. Please try again.");
    setPaymentStep("cart");
  };

  const checkRiderAvailability = async () => {
    const ridersRef = collection(db, "riders");
    const q = query(
      ridersRef,
      where("status", "in", ["approved", "available"]),
      where("isVerified", "==", true)
    );

    const ridersSnapshot = await getDocs(q);
    const availableRiders = ridersSnapshot.docs
      .map((doc) => ({
        ...(doc.data() as Rider),
      }))
      .sort(
        (a, b) =>
          (a.assignedOrders?.length || 0) - (b.assignedOrders?.length || 0)
      );

    if (availableRiders.length === 0) {
      console.log("rider didnt dey or did it?", availableRiders);
      throw new Error(
        "No riders available at the moment. Please try again later."
      );
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    if (!currentAddress.address) {
      toast.error("Please enter a delivery address");
      return;
    }

    try {
      setIsInitializing(true);

      // Fetch restaurant data first
      if (!restaurantData) {
        const restaurantDoc = await getDoc(
          doc(db, "restaurants", packs[0].restaurantId)
        );
        if (!restaurantDoc.exists()) throw new Error("Restaurant not found");
        const data = restaurantDoc.data() as RestaurantData;
        if (!data.paymentInfo?.paystackSubaccountCode) {
          throw new Error("Restaurant payment information is missing");
        }
        setRestaurantData(data);
      }

      await checkRiderAvailability();
      // Initialize Paystack payment
      const config = getPaystackConfig(restaurantData!);
      initializePayment({
        ...config,
        onSuccess: handlePaystackSuccess,
        onClose: handlePaystackClose,
      });
    } catch (error) {
      console.error("Error preparing payment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize payment"
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const renderAddressSection = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Delivery Address</h2>
        <button
          onClick={() => setShowAddressModal(true)}
          className="text-green-800 text-sm"
        >
          Change
        </button>
      </div>

      {currentAddress.address ? (
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 mt-1" />
          <div>
            <p className="font-medium">{currentAddress.address}</p>
            {currentAddress.additionalInstructions && (
              <p className="text-sm text-gray-500">
                {currentAddress.additionalInstructions}
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddressModal(true)}
          className="w-full p-3 border border-dashed rounded-lg text-gray-500"
        >
          Select delivery address
        </button>
      )}
    </div>
  );

  const handleSaveNewAddress = async () => {
    if (!user) {
      toast.error("Please login to save address");
      return;
    }

    if (!newAddress.hostelName.trim()) {
      toast.error("Please enter a hostel/location name");
      return;
    }

    try {
      const formattedAddress = {
        address: `${newAddress.hostelName}, ${newAddress.location}`,
        additionalInstructions: "",
      };

      await customerService.saveAddress(user.uid, formattedAddress);
      const addresses = await customerService.getSavedAddresses(user.uid);
      setSavedAddresses(addresses);
      setCurrentAddress(formattedAddress);
      setShowAddressModal(false);
      setNewAddress({ hostelName: "", location: LOCATIONS[0] });
      toast.success("Address saved successfully");
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

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

  const getPaystackConfig = (restaurantData: RestaurantData) => {
    if (!user || !restaurantData) {
      throw new Error("Missing required payment information");
    }

    const total = calculateTotal();
    const deliveryFee = calculateDeliveryFee();
    const serviceFee = calculateServiceFee(); // 10% of subtotal
    const amount = Math.round(total * 100);

    // Calculate percentages for split
    const platformShare = Math.floor((serviceFee / total) * 100); // Platform gets service fee
    const deliveryShare = Math.floor((deliveryFee / total) * 100); // Rider gets delivery fee
    const restaurantShare = 100 - platformShare - deliveryShare; // Restaurant gets the rest

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
    };

    return {
      ...baseConfig,
      amount,
      split: {
        type: "percentage",
        bearer_type: "account", // Platform bears transaction fees
        subaccounts: [
          {
            subaccount: restaurantData.paymentInfo.paystackSubaccountCode,
            share: restaurantShare,
          },
        ],
      },
    };
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
          setUserData(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const loadWallet = useCallback(async () => {
    try {
      const walletData = await walletService.getWallet(user!.uid);
      setWallet(walletData);
    } catch (error) {
      console.error("Error loading wallet:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      loadWallet();
    }
  }, [user, loadWallet]);

  const handleWalletPayment = async () => {
    if (!user || !wallet) return;

    try {
      setProcessing(true);
      const total = calculateTotal();

      // Check wallet balance
      if (wallet.balance < total) {
        toast.error("Insufficient wallet balance");
        return;
      }

      // Create order first
      const newOrder = {
        customerId: user.uid,
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
          address: currentAddress.address,
          additionalInstructions: currentAddress.additionalInstructions || "",
        },
        total,
        subtotal: calculateSubtotal(),
        deliveryFee: calculateDeliveryFee(),
        serviceFee: calculateServiceFee(),
        deliveryConfirmationCode: generateDeliveryCode(),
        paymentMethod: "wallet",
        paymentStatus: "completed",
        riderId: null,
        assignedAt: null,
      };

      const orderId = await orderService.createOrder(user.uid, newOrder);

      // Deduct from wallet after order creation
      const newBalance = wallet.balance - total;
      await updateDoc(doc(db, "wallets", user.uid), {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // Add rider assignment after order creation
      try {
        await riderService.assignRiderToOrder(orderId);
      } catch (error) {
        console.error("Failed to assign rider:", error);
      }

      clearCart();

      // Show confirmation modal with delivery code
      const confirmedOrderData = {
        ...newOrder,
        id: orderId,
        customerAddress: currentAddress.address,
        items: packs.flatMap((pack) => pack.items),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        restaurantName: packs[0].restaurantName,
        packs: packs.map((pack) => ({
          ...pack,
          restaurantId: pack.restaurantId,
          restaurantAddress: "",
        })),
      } as unknown as Order;

      setConfirmedOrder(confirmedOrderData);
      setShowConfirmationModal(true);

      // Wait 10 seconds then navigate to orders page
      setTimeout(() => {
        setShowConfirmationModal(false);
        navigate("/orders", {
          state: {
            showConfirmation: true,
            order: confirmedOrderData,
          },
        });
      }, 10000);

      toast.success("Order placed successfully!");
    } catch (error) {
      console.error("Error processing wallet payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

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

            {renderAddressSection()}

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

            <div className="payment-methods space-y-4">
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paystack"
                    checked={paymentMethod === "paystack"}
                    onChange={() => setPaymentMethod("paystack")}
                    className="form-radio"
                  />
                  <span>Pay with Card</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === "wallet"}
                    onChange={() => setPaymentMethod("wallet")}
                    disabled={!wallet || wallet.balance < calculateTotal()}
                    className="form-radio"
                  />
                  <span>
                    Pay with Wallet (Balance: ₦
                    {wallet?.balance.toLocaleString() || 0})
                  </span>
                </label>
                {wallet && wallet.balance < calculateTotal() && (
                  <div className="text-sm text-red-600">
                    Insufficient wallet balance. Please fund your wallet or
                    choose another payment method.
                  </div>
                )}
              </div>

              {paymentMethod === "wallet" ? (
                <button
                  onClick={handleWalletPayment}
                  disabled={
                    processing || !wallet || wallet.balance < calculateTotal()
                  }
                  className="w-full py-3 rounded-lg border border-black transition-colors bg-primary text-zinc-900 hover:bg-primary/90 disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Pay with Wallet"}
                </button>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={packs.length === 0 || isInitializing}
                  className="w-full py-3 rounded-lg border border-black transition-colors bg-primary text-zinc-900 hover:bg-primary/90 disabled:opacity-50"
                >
                  {isInitializing ? "Processing..." : "Proceed to Payment"}
                </button>
              )}
            </div>
          </>
        ) : restaurantData ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-4">Payment Method</h2>
              <div className="space-y-2">
                <button
                  className={`w-full p-4 rounded-lg border ${
                    paymentMethod === "paystack"
                      ? "border-gray-800 bg-gray-50"
                      : "border-gray-200"
                  } flex items-center`}
                  onClick={() => setPaymentMethod("paystack")}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-gray-800 mr-3 flex items-center justify-center">
                    {paymentMethod === "paystack" && (
                      <div className="w-3 h-3 rounded-full bg-gray-800" />
                    )}
                  </div>
                  <span>Card Payment</span>
                </button>

                <WalletPaymentOption
                  wallet={wallet}
                  paymentMethod={paymentMethod}
                  calculateTotal={calculateTotal}
                  onSelect={setPaymentMethod}
                  variant="button"
                />
              </div>
            </div>

            <PaymentBreakdown
              subtotal={calculateSubtotal()}
              deliveryFee={calculateDeliveryFee()}
              serviceFee={calculateServiceFee()}
              total={calculateTotal()}
              restaurantId={packs[0].restaurantId}
              paystackConfig={getPaystackConfig(restaurantData)}
              onBack={() => setPaymentStep("cart")}
            />

            {paymentMethod === "wallet" && (
              <button
                onClick={handleWalletPayment}
                disabled={
                  processing || !wallet || wallet.balance < calculateTotal()
                }
                className="w-full py-3 px-4 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {processing ? "Processing..." : "Pay with Wallet"}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p>Loading payment details...</p>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="bg-white rounded-t-xl fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-auto">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Delivery Address</h3>
                <button onClick={() => setShowAddressModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {savedAddresses.map((address, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentAddress(address);
                    setShowAddressModal(false);
                  }}
                  className="w-full p-4 text-left border rounded-lg flex items-start space-x-3 hover:bg-gray-50"
                >
                  <MapPin className="w-5 h-5 mt-1" />
                  <span className="font-medium">{address.address}</span>
                </button>
              ))}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Add New Address</h4>
                <input
                  type="text"
                  placeholder="Hostel/Location Name"
                  value={newAddress.hostelName}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, hostelName: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <select
                  value={newAddress.location}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, location: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="" disabled>
                    Select Landmark
                  </option>
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveNewAddress}
                  className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-900"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
