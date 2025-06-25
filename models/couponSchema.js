const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const couponSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },

 
  discountPercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },

  // Max discount in ₹ this coupon can give (optional but useful)
  maxDiscountAmount: {
    type: Number,
    default: null // no cap by default
  },

  // Minimum purchase required to apply the coupon
  minPurchaseAmount: {
    type: Number,
    default: 0
  },

  // Coupon status control
  isActive: {
    type: Boolean,
    default: true
  },

  // Coupon expiry date
  expiresAt: {
    type: Date,
    required: true
  },

  // Who can use this coupon
  onlyFor: {
    type: String,
    enum: ['all', 'newUsers', 'vipUsers', 'specificUsers'],
    default: 'all'
  },

  // If onlyFor = specificUsers, check this
  allowedUsers: [
    {
      type: Types.ObjectId,
      ref: 'User'
    }
  ],

  // Per-user usage limit (e.g., 1 means only once per user)
  usageLimitPerUser: {
    type: Number,
    default: 1
  },

  // Max usage across all users
  totalUsageLimit: {
    type: Number
  },

  // How many users have used this
  usedCount: {
    type: Number,
    default: 0
  },

  // Users who already used it
  usedBy: [
    {
      type: Types.ObjectId,
      ref: 'User'
    }
  ]
}, {
  timestamps: true
});




const Coupon = mongoose.model('Coupon', couponSchema);
module.exports={Coupon}
