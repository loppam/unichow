import WalletSection from "../components/user/WalletSection";

export default function UserSettings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          {/* Profile settings content */}
        </div>

        {/* Wallet Section */}
        <WalletSection />

        {/* Other settings sections */}
      </div>
    </div>
  );
}
