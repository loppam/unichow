import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { firestoreService } from "../../services/firestoreService";
import toast from "react-hot-toast";
import {
  User,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { testNotification } from "../../utils/testNotification";

type CustomUser = User & {
  firstName?: string;
  lastName?: string;
};

interface AdminSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  minimumAppVersion: string;
  maxOrdersPerDay: number;
  commissionRate: number;
  supportEmail: string;
  supportPhone: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await firestoreService.getDocument(
          "admin/settings",
          "general"
        );
        setSettings(data as AdminSettings);
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      await firestoreService.updateDocument("admin/settings", "general", {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid,
      });
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!settings) {
    return <div>No settings found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Maintenance Mode
          </label>
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) =>
              setSettings({ ...settings, maintenanceMode: e.target.checked })
            }
            className="mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Allow New Registrations
          </label>
          <input
            type="checkbox"
            checked={settings.allowNewRegistrations}
            onChange={(e) =>
              setSettings({
                ...settings,
                allowNewRegistrations: e.target.checked,
              })
            }
            className="mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Minimum App Version
          </label>
          <input
            type="text"
            value={settings.minimumAppVersion}
            onChange={(e) =>
              setSettings({ ...settings, minimumAppVersion: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Orders Per Day
          </label>
          <input
            type="number"
            value={settings.maxOrdersPerDay}
            onChange={(e) =>
              setSettings({
                ...settings,
                maxOrdersPerDay: parseInt(e.target.value),
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Commission Rate (%)
          </label>
          <input
            type="number"
            value={settings.commissionRate}
            onChange={(e) =>
              setSettings({
                ...settings,
                commissionRate: parseFloat(e.target.value),
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Support Email
          </label>
          <input
            type="email"
            value={settings.supportEmail}
            onChange={(e) =>
              setSettings({ ...settings, supportEmail: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Support Phone
          </label>
          <input
            type="tel"
            value={settings.supportPhone}
            onChange={(e) =>
              setSettings({ ...settings, supportPhone: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
