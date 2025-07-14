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
   profilePic: {
    type: String, // You can store the image URL or file path here
    default: 'uploads/images/product-1749097756066-p15q7l7zp09.jpeg' // Set a default profile picture path if desired
  },
  dateOfBirth: {
    type:String
    // optional field
  },
  googleId: {
    type: String,
    default: null
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
  referredBy: {
  type: String, // store the referralCode of the referrer
  default: null,
},
  referalCode: {
    type: String
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
