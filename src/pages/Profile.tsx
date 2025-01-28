import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User as UserIcon, Edit2, Check, X } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import BottomNav from "../components/BottomNav";
import WalletSection from "../components/user/WalletSection";
import LoadingButton from "../components/LoadingButton";

interface UserDetails {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  birthday: string;
  createdAt: string;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<Partial<UserDetails>>({});
  const [saving, setSaving] = useState(false);
  const [emailVerified, setEmailVerified] = useState(
    user?.emailVerified || false
  );

  useEffect(() => {
    setEmailVerified(user?.emailVerified || false);
  }, [user?.emailVerified]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserDetails;
          setUserDetails(data);
          setEditedDetails(data);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSave = async () => {
    if (!user || !editedDetails) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ...editedDetails,
        lastUpdated: new Date().toISOString(),
      });
      setUserDetails(editedDetails as UserDetails);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedDetails(userDetails || {});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-semibold">Profile</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-600 hover:text-black"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex gap-2">
            <LoadingButton isLoading={saving} onClick={handleSave}>
              Save Changes
            </LoadingButton>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4 pb-20">
        {/* Avatar and Name */}
        <div className="bg-white rounded-lg p-6 text-center shadow-sm">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">
            {editedDetails.firstName} {editedDetails.lastName}
          </h2>
          <p className="text-gray-500">{editedDetails.email}</p>
        </div>
        {/* Wallet Section */}
        <WalletSection />
        {/* User Details */}
        <div className="bg-white rounded-lg p-6 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-700">Personal Information</h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails.firstName || ""}
                  onChange={(e) =>
                    setEditedDetails((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg mt-1"
                />
              ) : (
                <p className="font-medium">{userDetails?.firstName}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails.lastName || ""}
                  onChange={(e) =>
                    setEditedDetails((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg mt-1"
                />
              ) : (
                <p className="font-medium">{userDetails?.lastName}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedDetails.phone || ""}
                  onChange={(e) =>
                    setEditedDetails((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg mt-1"
                />
              ) : (
                <p className="font-medium">{userDetails?.phone}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedDetails.birthday || ""}
                  onChange={(e) =>
                    setEditedDetails((prev) => ({
                      ...prev,
                      birthday: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg mt-1"
                />
              ) : (
                <p className="font-medium">
                  {userDetails?.birthday
                    ? new Date(userDetails.birthday).toLocaleDateString()
                    : "Not set"}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Address</label>
              {isEditing ? (
                <textarea
                  value={editedDetails.address || ""}
                  onChange={(e) =>
                    setEditedDetails((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg mt-1"
                  rows={3}
                />
              ) : (
                <p className="font-medium">{userDetails?.address}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{userDetails?.email}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Email Status</label>
              <p
                className={`font-medium ${
                  emailVerified ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {emailVerified ? "Verified" : "Not Verified"}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Member Since</label>
              <p className="font-medium">
                {userDetails?.createdAt
                  ? new Date(userDetails.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
