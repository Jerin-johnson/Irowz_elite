const { Product } = require("../../models/productSchema");
const { User } = require("../../models/userSchema");
const { Category } = require("../../models/categorySchema");
const { Cart } = require("../../models/cartSchema");
const { Wishlist } = require("../../models/wishListSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

//  helper functions
const { calculateDiscount, calculateTax } = require("../../helpers/helper");

const loadCartPage = async (req, res) => {
  try {
    const userId = req.session.user;

    // Load cart with product and category data
    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: "category",
    });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    const user = await User.findById(userId);

    // Filter out unavailable/blocked products
    cart.items = cart.items.filter((item) => {
      const product = item.productId;
      return (
        product &&
        !product.isBlocked &&
        product.category &&
        product.category.isListed &&
        product.status?.toLowerCase() !== "out of stock"
      );
    });

    let subtotal = 0;
    let totalDiscount = 0;

    // Recalculate prices and update cart consistency
    cart.items.forEach((item) => {
      const product = item.productId;
      const regularPrice = product.regularPrice || 0;
      const salePrice = product.salePrice;
      const quantity = item.quantity || 1;

      const discount = regularPrice - salePrice;
      const totalPrice = salePrice * quantity;

      // Update cart item fields with latest values
      item.originalPrice = regularPrice;
      item.price = salePrice;
      item.discount = discount;
      item.totalPrice = totalPrice;

      subtotal += regularPrice * quantity;
      totalDiscount += discount * quantity;
    });

    // Save updated cart
    await cart.save();

    // const tax = calculateTax(subtotal - totalDiscount); // 10% assumed
    const tax = 0;
    const shipping = subtotal >= 1000 ? 0 : 50;
    const total = subtotal - totalDiscount + tax + shipping;

    res.render("user/cart", {
      user,
      cart,
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      itemCount: cart.items.length,
    });
  } catch (error) {
    console.error("Error loading cart page:", error);
    res
      .status(Status.INTERNAL_SERVER_ERROR)
      .render("error", { message: "Error loading cart page" });
  }
};

module.exports = { loadCartPage };

const maxProductLimit = 10;

const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user;

    const product = await Product.findById(productId).populate("category");

    if (!product) {
      throw new Error("Product Not Found");
    }

    if (
      product.isBlocked ||
      (product.category && product.category.isListed === false)
    ) {
      throw new Error("The product is currently unavailable");
    }

    if (product.stock <= 0) {
      throw new Error("The product is currently out of stock");
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
      await cart.save();
    }

    let wishlist = await Wishlist.findOne({
      userId: userId,
      products: { $elemMatch: { productId: productId } },
    });
    console.log("The Wishlist items", wishlist);

    if (wishlist) {
      await Wishlist.updateOne(
        { userId },
        { $pull: { products: { productId } } }
      );
    }

    const isProductExitIndex = cart.items.findIndex((product) => {
      return product.productId.toString() === productId;
    });

    const originalPrice = product.regularPrice;
    const salePrice = product.salePrice;
    const discountAmount = originalPrice - salePrice;

    if (isProductExitIndex >= 0) {
      const newOty = cart.items[isProductExitIndex].quantity + 1;
      if (maxProductLimit < newOty) {
        throw new Error("Maxium limit has reached");
      }
      if (newOty >= product.stock) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }
      cart.items[isProductExitIndex].quantity = newOty;
      cart.items[isProductExitIndex].totalPrice = newOty * salePrice;
    } else {
      cart.items.push({
        productId,
        quantity: 1,
        price: salePrice,
        originalPrice: originalPrice,
        discount: discountAmount,
        totalPrice: salePrice,
      });
    }

    await cart.save();

    return res.status(Status.OK).json({
      success: true,
      message: "product added to cart successfully",
      cart,
      cartCount: cart.items.length,
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(Status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { quantity, productId } = req.body;
    const userId = req.session.user;

    console.log(quantity, productId);

    const product = await Product.findById(productId);

    if (product.isBlocked || product.stock <= 0) {
      throw new Error("The product is currently unavailable");
    }

    if (product.stock < quantity) {
      throw new Error(`Only ${product.stock} is left`);
    }

    let cart = await Cart.findOne({ userId, "items.productId": productId });

    if (!cart) {
      throw new Error("Product doesn't exit in the cart");
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (maxProductLimit < Number(quantity)) {
      throw new Error("Maxium quantity limit is reached");
    }

    if (itemIndex === -1) {
      throw new Error("Product not found in the cart");
    }

    console.log("Check whether what comes c", product);

    // Update quantity & prices
    const item = cart.items[itemIndex];
    item.quantity = quantity;
    item.price = product.salePrice;
    item.originalPrice = product.regularPrice;
    item.discount = product.regularPrice - product.salePrice;
    item.totalPrice = quantity * product.salePrice;

    await cart.save();

    // Calculate summary values
    let subtotal = 0;
    let totalDiscount = 0;

    cart.items.forEach((item) => {
      subtotal += item.originalPrice * item.quantity;
      totalDiscount += (item.originalPrice - item.price) * item.quantity;
    });

    //  const tax = calculateTax(subtotal - totalDiscount);
    const tax = 0;
    const shipping = subtotal >= 1000 ? 0 : 50; // Free shipping above 1000
    const total = subtotal - totalDiscount + tax + shipping;

    res.json({
      success: true,
      message: "Quantity updated successfully",
      itemTotal: cart.items[itemIndex].totalPrice.toFixed(2),
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      itemCount: cart.items.length,
    });
  } catch (error) {
    console.error(error.message);
    return res
      .status(Status.NOT_FOUND)
      .json({ success: false, message: error.message });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user;

    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User Not Found");
    }

    let cart = await Cart.findOne({ userId });

    cart.items = cart.items.filter((val) => {
      return val.productId.toString() !== productId;
    });

    await cart.save();

    res
      .status(Status.OK)
      .json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      throw new Error("Invalid Request");
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: userId },
      { $set: { items: [] } }
    );

    await cart.save();

    return res
      .status(Status.OK)
      .json({ success: true, message: "Cleared Successfully" });
  } catch (error) {
    console.error(error.message);
    return res
      .status(Status.NOT_FOUND)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  loadCartPage,
  addToCart,
  updateCartQuantity,
  deleteCartItem,
  clearCart,
};
