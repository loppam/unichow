export const getOrderStatusNotification = (status: string, orderId: string) => {
  const orderNumber = orderId.slice(-6);
  switch (status) {
    case "accepted":
      return `Order #${orderNumber} has been accepted by the restaurant`;
    case "preparing":
      return `Your order #${orderNumber} is being prepared`;
    case "ready":
      return `Order #${orderNumber} is ready for pickup`;
    case "picked_up":
      return `Your order #${orderNumber} is on the way`;
    case "delivered":
      return `Order #${orderNumber} has been delivered`;
    case "cancelled":
      return `Order #${orderNumber} has been cancelled`;
    default:
      return `Status update for order #${orderNumber}: ${status}`;
  }
};
