import { firestoreService } from "../services/firestoreService";

export async function sendNotification(
  userId: string,
  notification: {
    type: "approval" | "rejection" | "info";
    message: string;
  }
) {
  try {
    const notificationData = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };

    await firestoreService.updateDocument("users", userId, {
      notifications: firestoreService.arrayUnion(notificationData),
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

export async function sendApprovalNotification(
  userId: string,
  approved: boolean
) {
  return sendNotification(userId, {
    type: approved ? "approval" : "rejection",
    message: approved
      ? "Your restaurant account has been approved! You can now access your dashboard."
      : "Your restaurant account application has been rejected. Please contact support for more information.",
  });
}
