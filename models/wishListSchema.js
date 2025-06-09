const mongoose = require('mongoose');
const { Schema } = mongoose;

// const wishListSchema = new Schema({
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   productId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Product',
//     required: true
//   }
// }, { timestamps: true });

// const Wishlist = mongoose.model('Wishlist', wishListSchema);
// module.exports = {Wishlist}

const wishlistSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, 
  },
  products: [{
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  addedAt: { type: Date, default: Date.now }
}]

 
}, { timestamps: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = { Wishlist };

