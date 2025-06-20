const { User } = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const { Product } = require("../../models/productSchema");
const { Cart } = require("../../models/cartSchema");
const { calculateDiscount, calculateTax } = require("../../helpers/helper");
const { Order } = require("../../models/orderSchema");

const loadCheckOutPage = async (req, res) => {
  try {
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: "category",
    });

    let address = await Address.findOne({ userId });

    if (!address) {
      address = new Address({ userId, addresses: [] });
      await address.save();
    }
    const user = await User.findById(userId);

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.render("user/checkout", {
        user,
        cart: [],
        addresses: address.addresses,
        subtotal: "0.00",
        discount: "0.00",
        tax: "0.00",
        shipping: "0.00",
        total: "0.00",
        itemCount: 0,
      });
    }

    const filterCart = cart.items.filter((item) => {
      const product = item.productId;
      return (
        product &&
        !product.isBlocked &&
        product.category &&
        product.category.isListed &&
        product.stock > 0
      );
    });

    let subtotal = 0;
    filterCart.forEach((item) => {
      const product = item.productId;
      const quantity = item.quantity || 1;
      const price = product.salePrice || 0;
      subtotal += price * quantity;
    });

    const discount = calculateDiscount(subtotal);
    const tax = calculateTax(subtotal - discount);
    const shipping = subtotal >= 1000 ? 0 : 50; // Free shipping above 1000
    const total = subtotal - discount + tax + shipping;

    return res.render("user/checkout", {
      user,
      cart: filterCart,
      addresses: address.addresses,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      itemCount: filterCart.length,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    const userId = req.session.user;

    //     // Validation
    if (!addressId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Address and payment method are required",
      });
    }

    const userAddress = await Address.findOne({ userId });

    if (!userAddress) {
      throw new Error("Invalid Request");
    }

    const selectedAddress = userAddress.addresses.find((address) => {
      return addressId.toString() === address._id.toString();
    });

    if (!selectedAddress) {
      throw new Error("Please Add a address");
    }

    if (!["cod", "online"].includes(paymentMethod)) {
      throw new Error("Invalid payment option");
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: "category",
    });

    console.log("This is cart", cart);

    const validCartItems = cart.items.filter((item) => {
      let product = item.productId;

      return (
        product &&
        !product.isBlocked &&
        product.category &&
        product.category.isListed &&
        product.stock >= item.quantity
      );
    });

    if (validCartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid items in cart",
      });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of validCartItems) {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.salePrice;
      const totalPrice = price * quantity;

      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        productName: product.productName,
        quantity: quantity,
        price: price,
        totalPrice: totalPrice,
        productImage: product.productImage[0]?.path || null,
      });
    }

    const discount = calculateDiscount(subtotal);
    const tax = calculateTax(subtotal - discount);
    const shipping = subtotal >= 1000 ? 0 : 50; // Free shipping above 1000
    const finalAmount = subtotal - discount + tax + shipping;

    // Generate unique order ID
    const orderId =
      "ORD" +
      Date.now() +
      Math.random().toString(36).substr(2, 5).toUpperCase();

    //     // Create order
    const newOrder = new Order({
      orderId: orderId,
      userId: userId,
      items: orderItems,
      totalAmount: finalAmount,
      discount: discount,
      tax: tax,
      shipping: shipping,
      finalAmount: finalAmount,
      address: {
        firstName: selectedAddress.firstName,
        lastName: selectedAddress.lastName,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        state: selectedAddress.state,
        pinCode: selectedAddress.pinCode,
        country: selectedAddress.country,
        addressType: selectedAddress.addressType,
      },
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "completed",
      orderStatus: "pending",
      orderDate: new Date(),
    });

    await newOrder.save();

    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { new: true }
    );

    //     // Update product stock
    for (const item of validCartItems) {
      await Product.findByIdAndUpdate(
        item.productId._id,
        { $inc: { stock: -item.quantity } }
      );
    }
  
   
    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: orderId,
      totalAmount: finalAmount,
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: error.message });
  }
};

const loadOrderSuccessPage = async (req, res) => {
  try {
    console.log(req.query);
    const { orderId } = req.query;
    const userId = req.user.user;

    const user = await User.findOne({userId});

    if (!orderId) {
      return res.redirect("/");
    }

    const order = await Order.findOne({ orderId }).populate({
      path: "items.productId",
      select: "productName productImage regularPrice salePrice",
    });

    if (!order) {
      return res.redirect("/");
    }

    res.render("user/order-success", {
      order,
      orderId: order.orderId,
      orderTotal: order.finalAmount.toFixed(2),
      user
    });
  } catch (error) {
    console.error("Error loading order success:", error);
    res.json({ success: false, message: error.message });
  }
};


module.exports = {
  loadCheckOutPage,
  placeOrder,
  loadOrderSuccessPage,
};
