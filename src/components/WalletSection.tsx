export default function WalletSection() {
  // ... existing state ...

  const handleFundWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create Paystack transaction
      const response = await paystackService.initializeTransaction({
        email: user?.email || "",
        amount: amount * 100, // Convert to kobo
        reference: `wallet_fund_${Date.now()}`,
      });

      // Initialize wallet if it doesn't exist
      const wallet = await walletService.getWallet(user?.uid || "");
      if (!wallet) {
        await walletService.createWallet(user?.uid || "");
      }

      // Add funds to wallet
      await walletService.addFunds(user?.uid || "", amount, response.reference);

      // Refresh wallet data
      await fetchWalletData();
      setAmount("");
      setShowFundModal(false);
      toast.success("Wallet funded successfully!");
    } catch (error: any) {
      console.error("Error funding wallet:", error);
      setError(
        error?.message || "Failed to fund wallet. Please try again later."
      );

      // Handle specific error cases
      if (error?.code === "resource-exhausted") {
        toast.error("Service is busy. Please try again in a few moments.");
      } else if (error?.code === "permission-denied") {
        toast.error("You don't have permission to perform this action.");
      } else {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get wallet data with retry
      const walletData = await walletService.getWallet(user?.uid || "");
      if (walletData) {
        setBalance(walletData.balance || 0);
      }

      // Get transaction history with retry
      const transactions = await walletService.getTransactionHistory(
        user?.uid || ""
      );
      setTransactionHistory(transactions);
    } catch (error: any) {
      console.error("Error fetching wallet data:", error);
      setError(
        error?.message || "Failed to fetch wallet data. Please try again later."
      );

      // Handle specific error cases
      if (error?.code === "resource-exhausted") {
        toast.error("Service is busy. Please try again in a few moments.");
      } else if (error?.code === "permission-denied") {
        toast.error("You don't have permission to view wallet data.");
      } else {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of the component code ...
}
