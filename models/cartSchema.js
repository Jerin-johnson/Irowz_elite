const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    price: {
      type: Number,
      required: true // salePrice
    },
    originalPrice: {
      type: Number,
      required: true // regularPrice
    },
    discount: {
      type: Number,
      required: true // regularPrice - salePrice
    },
    totalPrice: {
      type: Number,
      required: true // quantity * salePrice
    },
    status: {
      type: String,
      default: 'Placed'
    },
    cancellationReason: {
      type: String,
      default: 'none'
    }
  }
],
 // Add coupon fields to cart
  couponApplied: {
    type: Boolean,
    default: false,
  },
  couponCode: {
    type: String,
    default: null,
  },
  couponDiscount:Number
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports={Cart}