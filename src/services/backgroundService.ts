import { riderAssignmentService } from "./riderAssignmentService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const CHECK_INTERVAL = 60000; // 1 minute

export const backgroundService = {
  startPeriodicChecks() {
    setInterval(async () => {
      // Check for stale assignments
      await riderAssignmentService.checkAndReassignOrders();

      // Check for orders needing riders
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("status", "==", "accepted"),
        where("riderId", "==", null),
        where("needsRiderAssignment", "==", true)
      );

      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
        await riderAssignmentService.assignRiderToOrder(doc.id);
      }
    }, CHECK_INTERVAL);
  },
};
