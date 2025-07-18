const { Order } = require("../../models/orderSchema");
const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const { Wallet } = require("../../models/walletSchema");
const {
  OrderStatus,
  PaymentStatus,
} = require("../../constants/order&payementStatus");
const Status = require("../../utils/status");
const message = require("../../utils/message");

const loadOrderListingPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const { status, paymentMethod, search, sort } = req.query;

    // Build filter object
    let filter = {};

    if (status) {
      filter.orderStatus = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const users = await User.find({
        $or: [{ fullName: searchRegex }, { email: searchRegex }],
      }).select("_id");

      const userIds = users.map((user) => user._id);

      filter.$or = [{ orderId: searchRegex }, { userId: { $in: userIds } }];
    }

    // for Buidlinf sort option
    let sortOption = {};
    switch (sort) {
      case "date_asc":
        sortOption = { orderDate: 1 };
        break;
      case "date_desc":
        sortOption = { orderDate: -1 };
        break;
      case "amount_asc":
        sortOption = { finalAmount: 1 };
        break;
      case "amount_desc":
        sortOption = { finalAmount: -1 };
        break;
      default:
        sortOption = { orderDate: -1 }; // Default: latest first
    }

    // Get orders with pagination
    const orders = await Order.find(filter)
      .populate("userId", "fullName email phone")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/order", {
      orders,
      currentPage: page,
      totalPages,
      limit,
      status: status || "",
      paymentMethod: paymentMethod || "",
      search: search || "",
      sort: sort || "date_desc",
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(Status.INTERNAL_SERVER_ERROR).render("error", { message: "Failed to fetch orders" });
  }
};

const loadOrderDetailedPage = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId }).populate({
      path: "userId",
    });

    if (!order) {
      return res.redirect("/error-404");
    }

    res.render("admin/orderdetails", {
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// const changeOrderStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status, userId } = req.body;

//     const user = await User.findById(userId);

//     const validStatuses = [
//       "pending",
//       "processing",
//       "shipped",
//       "delivered",
//       "cancelled",
//     ];
//     const validTransitions = {
//       pending: ["processing", "cancelled"],
//       processing: ["shipped", "cancelled"],
//       shipped: ["delivered"],
//       delivered: [],
//       cancelled: [],
//     };

//     if (!validStatuses.includes(status)) {
//       return res
//         .status(Status.NOT_FOUND)
//         .json({ success: false, message: "InValid Status" });
//     }

//     const order = await Order.findOne({ orderId, userId });
//     if (!order) {
//       return res.json({ success: false, message: "Order is Not Found" });
//     }

//     if (!validTransitions[order.orderStatus].includes(status)) {
//       return res.json({
//         success: false,
//         message: "This is also not a vaild transaction",
//       });
//     }

//     const now = new Date();
//     order.orderStatus = status;

//     order.items.forEach((item) => {
//       if (!["cancelled", "returned", "delivered"].includes(item.status)) {
//         //if the item is alreary c/r/d then no need for overridding
//         item.status = status;

//         if (status === "shipped") item.shippedAt = now;
//         if (status === "delivered") item.deliveredAt = now;
//       }
//     });

//     if (status === "delivered") {
//       order.deliveredAt = now;
//       if (order.paymentMethod === "cod") {
//         order.paymentStatus = "completed";
//       }
//     }

//     if (status === "cancelled") {
//       order.cancelledAt = now;
//       order.cancelledBy = "admin";
//       order.cancellationReason =
//         "There so Problem reqarding the delivery of the product";

//       // Restore stock and update item status
//       for (let item of order.items) {
//         if (!["cancelled", "returned", "delivered"].includes(item.status)) {
//           item.status = "cancelled";
//           await Product.findByIdAndUpdate(item.productId, {
//             $inc: { stock: item.quantity },
//           });
//         }
//       }
//     }

//     await order.save();

//     res.json({ success: true, message: "Order status updated successfully" });
//   } catch (error) {
//     console.error(error.message);
//     return res.json({ success: false, message: error.message });
//   }
// };

const changeOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, userId } = req.body;

    const user = await User.findById(userId);

    const validTransitions = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!Object.values(OrderStatus).includes(status)) {
      return res
        .status(Status.NOT_FOUND)
        .json({ success: false, message: "Invalid Status" });
    }

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res.json({ success: false, message: "Order is Not Found" });
    }

    if (!validTransitions[order.orderStatus].includes(status)) {
      return res.json({
        success: false,
        message: "This is not a valid transition",
      });
    }

    const now = new Date();
    order.orderStatus = status;

    order.items.forEach((item) => {
      if (
        ![
          OrderStatus.CANCELLED,
          OrderStatus.RETURNED,
          OrderStatus.DELIVERED,
        ].includes(item.status)
      ) {
        item.status = status;

        if (status === OrderStatus.SHIPPED) item.shippedAt = now;
        if (status === OrderStatus.DELIVERED) item.deliveredAt = now;
      }
    });

    if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = now;
      if (order.paymentMethod === "cod") {
        order.paymentStatus = PaymentStatus.COMPLETED;
      }
    }

    if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = now;
      order.cancelledBy = "admin";
      order.cancellationReason =
        "There was a problem regarding the delivery of the product";

      // Restore stock and update item status
      for (let item of order.items) {
        if (
          ![
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
            OrderStatus.DELIVERED,
          ].includes(item.status)
        ) {
          item.status = OrderStatus.CANCELLED;
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    await order.save();

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// const approveOrRejectReturnRequest = async (req, res) => {
//   try {
//     const { orderId, productId } = req.params;
//     const { action } = req.body;

//     console.log(action);

//     if (!orderId?.trim() || !productId?.trim()) {
//       return res.status(Status.NOT_FOUND).json({
//         success: false,
//         message: "OrderId and ProductId is not defined",
//       });
//     }
//     console.log(orderId);
//     const order = await Order.findById(orderId);
//     console.log(order);
//     if (!order) {
//       throw new Error("The order is not found");
//     }
//     const userId = order.userId;

//     console.log(productId);
//     const productIndex = order.items.findIndex(
//       (item) => item.productId.toString() === productId.toString()
//     );

//     if (productIndex === -1) {
//       throw new Error("The Product Is not found");
//     }

//     if (order.items[productIndex].status !== "return requested") {
//       throw new Error("Invalid Return Call");
//     }

//     if (action === "approve") {
//       let refundAmount = 0;
//       if (order.couponApplied) {
//         if (order.items[productIndex].totalPrice <= order.couponDiscount) {
//           throw new Error(
//             "This request cannot be approved since the order coupon discount is greater that the product amount"
//           );
//         }
//         refundAmount =
//           order.items[productIndex].totalPrice - order.couponDiscount;
//         order.couponApplied = false;
//         order.couponCode = null;
//         order.couponDiscount = 0;
//       } else {
//         refundAmount = order.items[productIndex].totalPrice;
//       }

//       let wallet = await Wallet.findOne({ userId });
//       if (!wallet) {
//         wallet = new Wallet({ userId, balance: 0, transactions: [] });
//         await wallet.save();
//       }

//       wallet.balance = parseFloat((wallet.balance + refundAmount).toFixed(2));

//       wallet.transactions.push({
//         type: "credit",
//         amount: refundAmount,
//         reason: "Refunded",
//         orderId: order.orderId,
//       });
//       wallet.updatedOn = new Date();

//       order.items[productIndex].status = "returned";
//       order.items[productIndex].refundStatus = "refunded";
//       order.items[productIndex].refundMethod = "wallet";
//       order.items[productIndex].refundDate = new Date();
//       order.items[productIndex].returnCompletedAt = new Date();
//       order.totalRefundAmount += refundAmount;

//       await wallet.save();
//     } else if (action === "reject") {
//       order.items[productIndex].status = "return rejected";
//     } else {
//       throw new Error("Invalid Action");
//     }

//     await order.save();

//     const statusMessage = action === "approve" ? "approved" : "rejected";
//     return res.status(Status.OK).json({
//       success: true,
//       message: `You have successfully ${statusMessage} the return request.`,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.json({ success: false, message: error.message });
//   }
// };

const approveOrRejectReturnRequest = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { action } = req.body;

    if (!orderId?.trim() || !productId?.trim()) {
      return res
        .status(Status.NOT_FOUND)
        .json({
          success: false,
          message: "OrderId and ProductId are not defined",
        });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("The order is not found");
    }
    const userId = order.userId;

    const productIndex = order.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (productIndex === -1) {
      throw new Error("The Product Is not found");
    }

    if (order.items[productIndex].status !== OrderStatus.RETURN_REQUESTED) {
      throw new Error("Invalid Return Call");
    }

    if (action === "approve") {
      let refundAmount = 0;
      if (order.couponApplied) {
        if (order.items[productIndex].totalPrice <= order.couponDiscount) {
          throw new Error(
            "This request cannot be approved since the order coupon discount is greater than the product amount"
          );
        }
        refundAmount =
          order.items[productIndex].totalPrice - order.couponDiscount;
        order.couponApplied = false;
        order.couponCode = null;
        order.couponDiscount = 0;
      } else {
        refundAmount = order.items[productIndex].totalPrice;
      }

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
        await wallet.save();
      }

      wallet.balance = parseFloat((wallet.balance + refundAmount).toFixed(2));

      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        reason: "Refunded",
        orderId: order.orderId,
      });
      wallet.updatedOn = new Date();

      order.items[productIndex].status = OrderStatus.RETURNED;
      order.items[productIndex].refundStatus = PaymentStatus.REFUNDED;
      order.items[productIndex].refundMethod = "wallet";
      order.items[productIndex].refundDate = new Date();
      order.items[productIndex].returnCompletedAt = new Date();
      order.totalRefundAmount += refundAmount;

      await wallet.save();
    } else if (action === "reject") {
      order.items[productIndex].status = OrderStatus.RETURN_REJECTED;
    } else {
      throw new Error("Invalid Action");
    }

    await order.save();

    const statusMessage = action === "approve" ? "approved" : "rejected";
    return res
      .status(Status.OK)
      .json({
        success: true,
        message: `You have successfully ${statusMessage} the return request.`,
      });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

module.exports = {
  loadOrderListingPage,
  loadOrderDetailedPage,
  changeOrderStatus,
  approveOrRejectReturnRequest,
};
