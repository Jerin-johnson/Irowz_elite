const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  // productOffer: {
  //   type: Number,
  //   required: true,
  //   min: 0
  // },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
  },
  // color: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },
  productImage: {
    type: [{
      path: { type: String, required: true }, 
    }],
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Available', 'Out of Stock', 'Discounted'],
    default: 'Discounted',
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    // required: true
  },
  // offerId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Offer',
  //   default: null
  // },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  regularPrice: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    required: true,
    min: 0
  },
  rating: {
    type: Number,
    default: 4,
    min: 0,
    max: 5
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports={Product};