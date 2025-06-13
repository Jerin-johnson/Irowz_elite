const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    productName: String,
    quantity: Number,
    price: Number,
    totalPrice: Number,
    productImage: String,
    status: {
      type: String,
      enum: ['active', 'cancelled', 'returned'],
      default: "active"
    },
    cancellationReason: String,
    refundStatus: {
      type: String,
      enum: ['not initiated', 'processing', 'refunded', 'failed'],
      default: 'not initiated'
    },
    refundMethod: {
      type: String // 'wallet', 'razorpay', etc.
    },
    refundDate: {
      type: Date
    }
  }
] ,
  totalAmount: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  shipping: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  address: {
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
    state: String,
    pinCode: String,
    country: String,
    addressType: String
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "online"],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending"
  },
  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled", "return requested", "returned"],
    default: "pending"
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
    createdOn: {
    type: Date,
    default: Date.now,
    required: true
  },
    invoiceDate: {
    type: Date
  },
  couponApplied: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
  type: Date
},
cancelledBy: {
  type: String, // 'user' or 'admin'
  enum: ['user', 'admin'],
},
cancellationReason: {
  type: String
},
refundStatus: {
  type: String,
  enum: ['not initiated', 'processing', 'refunded', 'failed'],
  default: 'not initiated'
},
refundDate: {
  type: Date
},
refundMethod: {
  type: String, // e.g., 'wallet', 'razorpay', 'stripe'
},
fraudScore: {
  type: Number,
  default: 0
}

});


const Order = mongoose.model("Order", orderSchema);

module.exports = {Order};
