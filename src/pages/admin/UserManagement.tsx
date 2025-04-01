import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ROLES, UserRole } from "../../constants/roles";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const adminUsers = snapshot.docs
        .filter((doc) => doc.data().isAdmin)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AdminUser[];
      setUsers(adminUsers);
    } catch (err) {
      setError("Failed to load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsProcessing(true);
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to delete user");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Admin Users</h1>
        <button
          onClick={() => navigate("/admin/users/create")}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          Create New Admin
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 relative">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {format(new Date(user.createdAt), "MM/dd/yyyy")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), "MM/dd/yyyy")
                      : "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {isSuperAdmin && user.email !== "lolade132@gmail.com" && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={isProcessing}
                      className="text-red-600 hover:text-red-900"
                    >
                      {isProcessing ? (
                        "Deleting..."
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
