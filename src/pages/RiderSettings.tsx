import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { Rider, RiderStatus } from "../types/rider";
import RiderLayout from "../components/RiderLayout";
import { notificationService } from "../services/notificationService";
import PaymentSetup from "../components/rider/PaymentSetup";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SubaccountBalance from "../components/common/SubaccountBalance";

const LoadingSpinner = () => (
  <RiderLayout>
    <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  </RiderLayout>
);

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h2 className="text-lg font-semibold mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  type?: string;
  error?: string;
} & (
  | React.ComponentPropsWithoutRef<"input">
  | React.ComponentPropsWithoutRef<"select">
);

const FormField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  ...props
}: FormFieldProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    {type === "select" ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-transparent ${
          error ? "border-red-500" : ""
        }`}
        {...(props as React.ComponentPropsWithoutRef<"select">)}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-transparent ${
          error ? "border-red-500" : ""
        }`}
        {...(props as React.ComponentPropsWithoutRef<"input">)}
      />
    )}
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

export default function RiderSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rider, setRider] = useState<Rider | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    vehicleType: "",
    vehiclePlate: "",
    status: "available" as RiderStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadRiderData = async () => {
      if (!user) return;

      try {
        const riderDoc = await getDoc(doc(db, "riders", user.uid));
        if (riderDoc.exists()) {
          const riderData = riderDoc.data() as Rider;
          setRider(riderData);
          setFormData({
            name: riderData.name || "",
            phone: riderData.phone || "",
            vehicleType: riderData.vehicleType || "",
            vehiclePlate: riderData.vehiclePlate || "",
            status: riderData.status || "available",
          });
        }
      } catch (error) {
        console.error("Error loading rider data:", error);
        toast.error("Failed to load rider data");
      } finally {
        setLoading(false);
      }
    };

    loadRiderData();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const riderRef = doc(db, "riders", user.uid);
      await updateDoc(riderRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Settings updated successfully");
      setFormErrors({});
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const validateForm = (data: typeof formData) => {
    const errors: Partial<Record<keyof typeof formData, string>> = {};

    if (!data.name.trim()) errors.name = "Name is required";
    if (!data.phone.trim()) errors.phone = "Phone number is required";
    if (!data.vehicleType) errors.vehicleType = "Vehicle type is required";
    if (!data.vehiclePlate.trim())
      errors.vehiclePlate = "Vehicle plate is required";

    return errors;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <RiderLayout>
      <div className="p-4 max-w-2xl mx-auto mb-16">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {rider?.paymentInfo?.paystackSubaccountCode && (
            <div className="mb-6">
              <SubaccountBalance
                subaccountCode={rider.paymentInfo.paystackSubaccountCode}
                userType="rider"
                autoRefreshInterval={600000}
              />
            </div>
          )}

          <PaymentSetup />

          <FormSection title="Profile Information">
            <FormField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={formErrors.name}
              required
            />
            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={formErrors.phone}
              required
            />
          </FormSection>

          <FormSection title="Vehicle Information">
            <FormField
              label="Vehicle Type"
              name="vehicleType"
              type="select"
              value={formData.vehicleType}
              onChange={handleChange}
              error={formErrors.vehicleType}
              required
            >
              <option value="">Select vehicle type</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
            </FormField>
            <FormField
              label="Vehicle Plate Number"
              name="vehiclePlate"
              value={formData.vehiclePlate}
              onChange={handleChange}
              error={formErrors.vehiclePlate}
              required
            />
          </FormSection>

          <FormSection title="Availability">
            <FormField
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </FormField>
          </FormSection>

          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full btn-secondary"
          >
            Log Out
          </button>
        </div>
      </div>
    </RiderLayout>
  );
}
