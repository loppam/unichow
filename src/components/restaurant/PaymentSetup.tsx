import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentService } from '../../services/paymentService';
import { RestaurantPaymentInfo, RestaurantData } from '../../types/restaurant';
import { toast } from 'react-hot-toast';

interface PaymentSetupProps {
  data: RestaurantData;
}

interface Bank {
  code: string;
  name: string;
  id?: string;
}

export default function PaymentSetup({ data }: PaymentSetupProps) {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<RestaurantPaymentInfo>>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    settlementSchedule: 'weekly'
  });

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const bankList = await paymentService.getBankList();
      const uniqueBanks = bankList.filter((bank: Bank, index: number, self: Bank[]) =>
        index === self.findIndex((b) => b.code === bank.code && b.name === bank.name)
      );
      setBanks(uniqueBanks);
    } catch (error) {
      setError('Failed to load banks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First verify the bank account
      const verifiedAccount = await paymentService.verifyBankAccount(
        formData.accountNumber!,
        formData.bankName!
      );

      // Create subaccount if verification successful
      await paymentService.createSubaccount(user!.uid, {
        ...formData,
        accountName: verifiedAccount.account_name,
        isVerified: true,
        lastUpdated: new Date().toISOString()
      } as RestaurantPaymentInfo);

      toast.success('Payment information setup successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to setup payment information';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Payment Setup</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name
          </label>
          <select
            value={formData.bankName}
            onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="">Select Bank</option>
            {banks.map((bank: Bank) => (
              <option key={`${bank.code}-${bank.name}`} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
            className="w-full p-2 border rounded-lg"
            required
            pattern="[0-9]{10}"
            maxLength={10}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Settlement Schedule
          </label>
          <select
            value={formData.settlementSchedule}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              settlementSchedule: e.target.value as RestaurantPaymentInfo['settlementSchedule']
            }))}
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
        >
          {loading ? 'Setting up...' : 'Setup Payment'}
        </button>
      </form>
    </div>
  );
} 