
const OrderStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURN_REQUESTED: "return requested",
  RETURNED: "returned",
  RETURN_REJECTED: "return rejected",
};

const PaymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
};

module.exports = {
  OrderStatus,
  PaymentStatus,
};