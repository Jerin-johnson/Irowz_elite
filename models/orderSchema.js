const mongoose = require("mongoose")
const { Schema } = mongoose
const { v4: uuidv4 } = require("uuid")

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      productName: String,
      quantity: Number,
      regularPrice: Number,
      price: Number,
      discountAmount: Number,
      totalPrice: Number,
      productImage: String,
      category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
      brand: {
        type: Schema.Types.ObjectId,
        ref: "Brand",
      },
      offerType: {
        type: String,
        enum: ["Product", "Category", "None"],
        default:'None'
      },
      isCouponApplied: {
        type: Boolean,
        default: false,
      },
      couponCode: String,
      status: {
        type: String,
        enum: [
          "active",
          "processing",
          "cancelled",
          "shipped",
          "delivered",
          "return requested",
          "returned",
          "return rejected",
        ],
        default: "active",
      },
      deliveredAt: Date,
      shippedAt: Date,
      cancellationReason: String,
      returnRequestedAt: Date,
      returnCompletedAt: Date,
      returnReason: String,
      refundStatus: {
        type: String,
        enum: ["not initiated", "processing", "refunded", "failed"],
        default: "not initiated",
      },
      refundMethod: String,
      refundDate: Date,
    },
  ],

  totalAmount: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  deliveredAt: Date,
  tax: {
    type: Number,
    default: 0,
  },
  shipping: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },

  address: {
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
    state: String,
    pinCode: String,
    country: String,
    addressType: String,
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "online"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },

  // Razorpay specific fields
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentFailureReason: String,

  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },

  orderDate: {
    type: Date,
    default: Date.now,
  },

  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },

  invoiceDate: Date,
  couponApplied: {
    type: Boolean,
    default: false,
  },
  totalCancelAmount: {
    type: Number,
    default: 0,
  },
  totalActiveAmount: {
    type: Number,
    default: 0,
  },
  cancelledAt: Date,
  cancelledBy: {
    type: String,
    enum: ["user", "admin"],
  },
  cancellationReason: String,
  totalRefundAmount: {
    type: Number,
    default: 0,
  },
  fraudScore: {
    type: Number,
    default: 0,
  },
   // 
  couponDiscount: {
    type: Number,
    default: 0,
  },
   // 
  couponCode: {
    type: String,
    default: null,
  },
})

const Order = mongoose.model("Order", orderSchema)
module.exports = { Order }
