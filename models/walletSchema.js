const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ["credit", "debit"],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      reason: {
        type: String,
        required: true  // e.g. "Refund", "Order Payment"
      },
      orderId: {
        type: String  // Optional traceable order ID
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  updatedOn: {
    type: Date,
    default: Date.now
  }
});

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports ={ Wallet};
