import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { RestaurantData } from "../../types/restaurant";
import { Rider } from "../../types/rider";
import { menuService } from "../../services/menuService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface OnboardingModalProps {
  userType: "restaurant" | "rider";
  userData: RestaurantData | Rider;
  onClose: () => void;
}

interface Step {
  title: string;
  completed: boolean;
  path: string;
  missingItems?: string[];
}

export default function OnboardingModal({
  userType,
  userData,
  onClose,
}: OnboardingModalProps) {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    if (userType === "restaurant") {
      const restaurantData = userData as RestaurantData;

      // Check profile completeness
      const missingProfileItems: string[] = [];
      if (!restaurantData.restaurantName)
        missingProfileItems.push("Restaurant name");
      if (!restaurantData.address) missingProfileItems.push("Address");
      if (!restaurantData.phone) missingProfileItems.push("Phone number");
      if (
        !restaurantData.cuisineTypes ||
        restaurantData.cuisineTypes.length === 0
      )
        missingProfileItems.push("Cuisine type");
      if (!restaurantData.description) missingProfileItems.push("Description");
      if (!restaurantData.openingHours)
        missingProfileItems.push("Opening hours");

      // Check menu items
      Promise.all([
        menuService.getMenuItems(user.uid),
        menuService.getCategories(user.uid),
      ])
        .then(([items, categories]) => {
      

          // Filter out any items that might be missing required fields
          const validItems = items.filter(
            (item) => item.name && item.category && item.isAvailable !== false
          );

          // Filter out any categories that might be missing required fields
          const validCategories = categories.filter(
            (cat) => cat.id && cat.name
          );


          setSteps([
            {
              title: "Add Payment Information",
              completed: !!restaurantData.paymentInfo?.paystackSubaccountCode,
              path: "/restaurant-settings",
              missingItems: restaurantData.paymentInfo?.paystackSubaccountCode
                ? undefined
                : ["Bank account details"],
            },
            {
              title: "Add Menu Items",
              completed: validCategories.length > 0 && validItems.length > 0,
              path: "/restaurant-menu",
              missingItems: [
                ...(validCategories.length === 0
                  ? ["Create at least one category"]
                  : []),
                ...(validItems.length === 0
                  ? ["Add at least one menu item"]
                  : []),
              ].filter(Boolean),
            },
            {
              title: "Complete Restaurant Profile",
              completed: missingProfileItems.length === 0,
              path: "/restaurant-settings",
              missingItems:
                missingProfileItems.length > 0
                  ? missingProfileItems
                  : undefined,
            },
          ]);
        })
        .catch((error) => {
          toast("Error fetching menu data:", error);
          setSteps([
            {
              title: "Add Payment Information",
              completed: !!restaurantData.paymentInfo?.paystackSubaccountCode,
              path: "/restaurant-settings",
              missingItems: restaurantData.paymentInfo?.paystackSubaccountCode
                ? undefined
                : ["Bank account details"],
            },
            {
              title: "Add Menu Items",
              completed: false,
              path: "/restaurant-menu",
              missingItems: [
                "Create at least one category",
                "Add at least one menu item",
              ],
            },
            {
              title: "Complete Restaurant Profile",
              completed: missingProfileItems.length === 0,
              path: "/restaurant-settings",
              missingItems:
                missingProfileItems.length > 0
                  ? missingProfileItems
                  : undefined,
            },
          ]);
        });
    } else {
      const riderData = userData as Rider;

      // Check rider profile completeness
      const missingProfileItems: string[] = [];
      if (!riderData.name) missingProfileItems.push("Full name");
      if (!riderData.phone) missingProfileItems.push("Phone number");
      if (!riderData.vehicleType) missingProfileItems.push("Vehicle type");
      if (!riderData.vehiclePlate)
        missingProfileItems.push("Vehicle plate number");
      if (!riderData.isVerified)
        missingProfileItems.push("Verification documents");

      setSteps([
        {
          title: "Add Payment Information",
          completed: !!riderData.paymentInfo?.paystackSubaccountCode,
          path: "/rider-settings",
          missingItems: riderData.paymentInfo?.paystackSubaccountCode
            ? undefined
            : ["Bank account details"],
        },
        {
          title: "Set Availability Status",
          completed: riderData.status === "available",
          path: "/rider-settings",
          missingItems:
            riderData.status === "available"
              ? undefined
              : ["Set status to available"],
        },
        {
          title: "Complete Profile",
          completed: missingProfileItems.length === 0,
          path: "/rider-settings",
          missingItems:
            missingProfileItems.length > 0 ? missingProfileItems : undefined,
        },
      ]);
    }
  }, [userType, userData, user]);

  const incompleteSteps = steps.filter((step) => !step.completed);

  if (incompleteSteps.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Complete Your Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {incompleteSteps.map((step, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm mr-3 
                    ${
                      step.completed ? "bg-green-500 text-white" : "bg-gray-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {step.title}
                </span>
                <button
                  onClick={() => navigate(step.path)}
                  className="text-blue-500 hover:text-blue-600 text-sm"
                >
                  Complete
                </button>
              </div>
              {step.missingItems && step.missingItems.length > 0 && (
                <ul className="ml-11 text-sm text-gray-600 list-disc space-y-1">
                  {step.missingItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
}
