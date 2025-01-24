import { riderAssignmentService } from './riderAssignmentService';

const CHECK_INTERVAL = 60000; // 1 minute

export const backgroundService = {
  startPeriodicChecks() {
    setInterval(async () => {
      await riderAssignmentService.checkAndReassignOrders();
    }, CHECK_INTERVAL);
  }
}; 