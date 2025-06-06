const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
    unique: true,             // ✅ Ensures no duplicate phone numbers
    sparse: true,             // ✅ Enforces uniqueness only when the field is present
    match: [/^\d{10}$/, 'Phone number must be 10 digits'],
    default: null
  },
  dateOfBirth: {
    type: Date,
    // optional field
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Only enforces uniqueness if googleId is present
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  cart: [{
    type: Schema.Types.ObjectId,
    ref: "Cart",
  }],
  wallet: {
    type: Number,
    default: 0
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "WishList"
  }],
  orderHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  }],
  referalCode: {
    type: String
  },
  redeemed: {
    type: Boolean,
    default: false
  },
  redeemedUser: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  searchHistory: [{
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    },
    brand: {
      type: String
    },
    searchOn: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = { User };
