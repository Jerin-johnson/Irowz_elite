const { User } = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const { Product } = require("../../models/productSchema");
const { Cart } = require("../../models/cartSchema");
const { calculateDiscount, calculateTax } = require("../../helpers/helper");
const{Coupon}=require("../../models/couponSchema")
const { Order } = require("../../models/orderSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config()


// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// const loadCheckOutPage = async (req, res) => {
//   try {
//     const userId = req.session.user;

//     const cart = await Cart.findOne({ userId }).populate({
//       path: "items.productId",
//       populate: "category",
//     });

//     let address = await Address.findOne({ userId });

//     if (!address) {
//       address = new Address({ userId, addresses: [] });
//       await address.save();
//     }

//     const user = await User.findById(userId);

//     if (!cart || !cart.items || cart.items.length === 0) {
//       return res.render("user/checkout", {
//         user,
//         cart: [],
//         addresses: address.addresses,
//         subtotal: "0.00",
//         discount: "0.00",
//         tax: "0.00",
//         shipping: "0.00",
//         total: "0.00",
//         itemCount: 0,
//       });
//     }

//     // Filter available products
//     const filterCart = cart.items.filter((item) => {
//       const product = item.productId;
//       return (
//         product &&
//         !product.isBlocked &&
//         product.category &&
//         product.category.isListed &&
//         product.stock > 0
//       );
//     });

//     let subtotal = 0;
//     let totalDiscount = 0;

//     // Recalculate prices
//     filterCart.forEach((item) => {
//       const product = item.productId;
//       const regularPrice = product.regularPrice || 0;
//       const salePrice = product.salePrice ?? regularPrice;
//       const quantity = item.quantity || 1;

//       const discount = regularPrice - salePrice;
//       const totalPrice = salePrice * quantity;

//       // Update item values
//       item.originalPrice = regularPrice;
//       item.price = salePrice;
//       item.discount = discount;
//       item.totalPrice = totalPrice;

//       subtotal += regularPrice * quantity;
//       totalDiscount += discount * quantity;
//     });

//     // Keep only valid items in the cart
//     cart.items = filterCart;
//     await cart.save();

//     const tax = calculateTax(subtotal - totalDiscount);
//     const shipping = subtotal >= 1000 ? 0 : 50;
//     const total = subtotal - totalDiscount + tax + shipping;

//     return res.render("user/checkout", {
//       user,
//       cart: filterCart,
//       addresses: address.addresses,
//       subtotal: subtotal.toFixed(2),
//       discount: totalDiscount.toFixed(2),
//       tax: tax.toFixed(2),
//       shipping: shipping.toFixed(2),
//       total: total.toFixed(2),
//       itemCount: filterCart.reduce((sum, item) => sum + item.quantity, 0), 
//     });

//   } catch (error) {
//     console.error("Error loading checkout page:", error);
//     return res.status(400).json({ success: false, message: error.message });
//   }
// };

const loadCheckOutPage = async (req, res) => {
  try {
    const userId = req.session.user

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: "category",
    })

    let address = await Address.findOne({ userId })

    if (!address) {
      address = new Address({ userId, addresses: [] })
      await address.save()
    }

    const user = await User.findById(userId)

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.render("user/checkout", {
        user,
        cart: [],
        addresses: address.addresses,
        subtotal: "0.00",
        discount: "0.00",
        couponDiscount: "0.00",
        tax: "0.00",
        shipping: "0.00",
        total: "0.00",
        itemCount: 0,
        availableCoupons: [],
        appliedCoupon: null,
      })
    }

    // Filter available products
    const filterCart = cart.items.filter((item) => {
      const product = item.productId
      return product && !product.isBlocked && product.category && product.category.isListed && product.stock > 0
    })

    let subtotal = 0
    let totalDiscount = 0

    // Recalculate prices
    filterCart.forEach((item) => {
      const product = item.productId
      const regularPrice = product.regularPrice || 0
      const salePrice = product.salePrice ?? regularPrice
      const quantity = item.quantity || 1

      const discount = regularPrice - salePrice
      const totalPrice = salePrice * quantity

      // Update item values
      item.originalPrice = regularPrice
      item.price = salePrice
      item.discount = discount
      item.totalPrice = totalPrice

      subtotal += regularPrice * quantity
      totalDiscount += discount * quantity
    })

    // Keep only valid items in the cart
    cart.items = filterCart
    await cart.save()

    // Calculate cart amount after product discounts
    const cartAmount = subtotal - totalDiscount

    // Get available coupons for this user
    let allCoupons= await Coupon.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
      minPurchaseAmount: { $lte: cartAmount },
    });


    let  availableCoupons= allCoupons.filter((each)=>{
      let userAgeLimitPerUser = each.usedBy.filter((id)=>{
        return id.toString() === userId.toString()
      }).length;

      return userAgeLimitPerUser <  each.usageLimitPerUser
    })



    console.log("The available coupons for the user ",availableCoupons)
    // Check applied coupon
    let appliedCoupon = null
    let couponDiscount = 0

    if (cart.couponApplied && cart.couponCode) {
      appliedCoupon = await Coupon.findOne({
        code: cart.couponCode,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })

      if (appliedCoupon) {
        couponDiscount = cart.couponDiscount || 0
      } else {
        // Remove invalid coupon
        cart.couponApplied = false
        cart.couponCode = null
        cart.couponDiscount = 0
        await cart.save()
      }
    }

    // const tax = calculateTax(cartAmount - couponDiscount)
    const tax =0
    const shipping = subtotal >= 1000 ? 0 : 50
    const total = cartAmount - couponDiscount + tax + shipping

    return res.render("user/checkout", {
      user,
      cart: filterCart,
      addresses: address.addresses,
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      // itemCount: filterCart.reduce((sum, item) => sum + item.quantity, 0),
      itemCount:filterCart.length,

      availableCoupons,
      appliedCoupon,
    })
  } catch (error) {
    console.error("Error loading checkout page:", error)
    return res.status(400).json({ success: false, message: error.message })
  }
}





// const placeOrder = async (req, res) => {
//   try {
//     const { addressId, paymentMethod } = req.body
//     console.log("The payment method is", paymentMethod)
//     const userId = req.session.user

//     if (!addressId || !paymentMethod) {
//       return res.status(400).json({
//         success: false,
//         message: "Address and payment method are required",
//       })
//     }

//     const userAddress = await Address.findOne({ userId })
//     if (!userAddress) throw new Error("Invalid Request")

//     const selectedAddress = userAddress.addresses.find((addr) => addr._id.toString() === addressId)
//     if (!selectedAddress) throw new Error("Please add a valid address")

//     if (!["cod", "online"].includes(paymentMethod)) {
//       throw new Error("Invalid payment option")
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: "items.productId",
//       populate: ["category", "brand"],
//     })

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Cart is empty or not found",
//       })
//     }

//     // Filter valid items
//     const validCartItems = cart.items.filter((item) => {
//       const product = item.productId
//       return product && !product.isBlocked && product.category?.isListed && product.stock >= item.quantity
//     })

//     if (validCartItems.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid items in cart",
//       })
//     }

//     let subtotal = 0
//     let totalDiscount = 0
//     const orderItems = []

//     for (const item of validCartItems) {
//       const product = item.productId
//       const quantity = item.quantity

//       const regularPrice = product.regularPrice
//       const salePrice = product.salePrice
//       const discountAmount = regularPrice - salePrice
//       const totalPrice = salePrice * quantity

//       subtotal += regularPrice * quantity
//       totalDiscount += discountAmount * quantity

//       orderItems.push({
//         productId: product._id,
//         productName: product.productName,
//         quantity: quantity,
//         price: salePrice,
//         totalPrice: totalPrice,
//         productImage: product.productImage[0]?.path || null,
//         regularPrice: regularPrice,
//         discountAmount: discountAmount,
//         offerType: product.appliedOfferType || "None",
//         brand: product.brand,
//         category: product.category,
//       })
//     }

//     const tax = calculateTax(subtotal - totalDiscount)
//     const shipping = subtotal >= 1000 ? 0 : 50
//     const finalAmount = subtotal - totalDiscount + tax + shipping

//     const orderId = "ORD" + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase()

//     // Create order object
//     const orderData = {
//       orderId,
//       userId,
//       items: orderItems,
//       totalAmount: subtotal,
//       discount: totalDiscount,
//       tax,
//       shipping,
//       finalAmount,
//       address: selectedAddress,
//       paymentMethod,
//       paymentStatus: paymentMethod === "cod" ? "pending" : "pending", // Will be updated after payment
//       orderStatus: "pending",
//       orderDate: new Date(),
//       createdOn: new Date(),
//       couponApplied: cart.couponApplied || false,
//       couponCode: cart.couponCode || null,
//     }

//     // If online payment, create Razorpay order
//     if (paymentMethod === "online") {
//       try {
//         const razorpayOrder = await razorpay.orders.create({
//           amount: Math.round(finalAmount * 100), // Convert to paise
//           currency: "INR",
//           receipt: orderId,
//           payment_capture: 1,
//         })

//         orderData.razorpayOrderId = razorpayOrder.id

//         // Save order
//         const newOrder = new Order(orderData)
//         await newOrder.save()

//         return res.json({
//           success: true,
//           message: "Order created successfully",
//           orderId,
//           razorpayOrderId: razorpayOrder.id,
//           amount: finalAmount,
//           currency: "INR",
//           key: process.env.RAZORPAY_KEY_ID,
//           customerDetails: {
//             name: `${selectedAddress.firstName} ${selectedAddress.lastName}`,
//             email: req.session.userEmail || "", // Add email to session if available
//             contact: selectedAddress.phone,
//           },
//         })
//       } catch (error) {
//         console.error("Razorpay order creation failed:", error)
//         return res.status(500).json({
//           success: false,
//           message: "Failed to create payment order",
//         })
//       }
//     } else {
//       // COD order
//       const newOrder = new Order(orderData)
//       await newOrder.save()

//       // Clear cart and update stock for COD orders
//       await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } })

//       for (const item of validCartItems) {
//         await Product.findByIdAndUpdate(item.productId._id, {
//           $inc: { stock: -item.quantity },
//         })
//       }

//       return res.json({
//         success: true,
//         message: "Order placed successfully",
//         orderId,
//         totalAmount: finalAmount,
//       })
//     }
//   } catch (error) {
//     console.error(error)
//     return res.status(500).json({ success: false, message: error.message })
//   }
// }



const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body
    console.log("The payment method is", paymentMethod)
    const userId = req.session.user

    if (!addressId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Address and payment method are required",
      })
    }

    const userAddress = await Address.findOne({ userId })
    if (!userAddress) throw new Error("Invalid Request")

    const selectedAddress = userAddress.addresses.find((addr) => addr._id.toString() === addressId)
    if (!selectedAddress) throw new Error("Please add a valid address")

    if (!["cod", "online"].includes(paymentMethod)) {
      throw new Error("Invalid payment option")
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: ["category", "brand"],
    })

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty or not found",
      })
    }

    // Filter valid items
    const validCartItems = cart.items.filter((item) => {
      const product = item.productId
      return product && !product.isBlocked && product.category?.isListed && product.stock >= item.quantity
    })

    if (validCartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid items in cart",
      })
    }

    let subtotal = 0
    let totalDiscount = 0
    const orderItems = []

    for (const item of validCartItems) {
      const product = item.productId
      const quantity = item.quantity

      const regularPrice = product.regularPrice
      const salePrice = product.salePrice
      const discountAmount = regularPrice - salePrice
      const totalPrice = salePrice * quantity

      subtotal += regularPrice * quantity
      totalDiscount += discountAmount * quantity

      orderItems.push({
        productId: product._id,
        productName: product.productName,
        quantity: quantity,
        price: salePrice,
        totalPrice: totalPrice,
        productImage: product.productImage[0]?.path || null,
        regularPrice: regularPrice,
        discountAmount: discountAmount,
        offerType: product.appliedOfferType || "None",
        brand: product.brand,
        category: product.category,
      })
    }

    // Calculate amounts after product discounts
    const amountAfterDiscount = subtotal - totalDiscount

    //  coupon discount
    let couponDiscount = 0
    let appliedCoupon = null

    if (cart.couponApplied && cart.couponCode) {
      const coupon = await Coupon.findOne({
        code: cart.couponCode,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })

      if(!coupon)
      {
        return res.status(404).json({success:false,message:"Invalid Coupon is applied please remove that"})
      }


      couponDiscount = cart.couponDiscount 
      appliedCoupon = coupon;
    }

    // const tax = calculateTax(amountAfterDiscount - couponDiscount)
    const tax=0
    const shipping = subtotal >= 1000 ? 0 : 50
    const finalAmount = amountAfterDiscount - couponDiscount + tax + shipping

    const orderId = "ORD" + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase()

    // Create order object
    const orderData = {
      orderId,
      userId,
      items: orderItems,
      totalAmount: subtotal,
      discount: totalDiscount,
      couponDiscount: couponDiscount,
      tax,
      shipping,
      finalAmount,
      address: selectedAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      orderStatus: "pending",
      orderDate: new Date(),
      createdOn: new Date(),
      couponApplied: cart.couponApplied || false,
      couponCode: cart.couponCode || null,
    }

    // If online payment, create Razorpay order
    if (paymentMethod === "online") {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(finalAmount * 100),
          currency: "INR",
          receipt: orderId,
          payment_capture: 1,
        })

        orderData.razorpayOrderId = razorpayOrder.id

        // Save order
        const newOrder = new Order(orderData)
        await newOrder.save()

        return res.json({
          success: true,
          message: "Order created successfully",
          orderId,
          razorpayOrderId: razorpayOrder.id,
          amount: finalAmount,
          currency: "INR",
          key: process.env.RAZORPAY_KEY_ID,
          customerDetails: {
            name: `${selectedAddress.firstName} ${selectedAddress.lastName}`,
            email: req.session.userEmail || "",
            contact: selectedAddress.phone,
          },
        })
      } catch (error) {
        console.error("Razorpay order creation failed:", error)
        return res.status(500).json({
          success: false,
          message: "Failed to create payment order",
        })
      }
    } else {
      // COD order
      const newOrder = new Order(orderData)
      await newOrder.save()

      // Update coupon usage if applied
      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(appliedCoupon._id, {
          $inc: { usedCount: 1 },
          $push: { usedBy: userId },
        })
      }

      // Clear cart and update stock for COD orders
      await Cart.findOneAndUpdate(
        { userId },
        {
          $set: {
            items: [],
            couponApplied: false,
            couponCode: null,
            couponDiscount: 0,
          },
        },
      )

      for (const item of validCartItems) {
        await Product.findByIdAndUpdate(item.productId._id, {
          $inc: { stock: -item.quantity },
        })
      }

      return res.json({
        success: true,
        message: "Order placed successfully",
        orderId,
        totalAmount: finalAmount,
      })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: error.message })
  }
}



// verify patement

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const userId = req.session.user;
    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required payment verification fields",
      });
    }

    // Ensure Razorpay secret key exists
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Server configuration error - missing Razorpay secret key",
      });
    }

    // Generate expected signature
    const bodyString = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(bodyString)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Update payment details
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.paymentStatus = "completed";
      await order.save();

      const cart =await Cart.findOne({userId :order.userId});
      if(cart.couponApplied)
      {
        await Coupon.findOneAndUpdate({code:cart.couponCode}, {
          $inc: { usedCount: 1 },
          $push: { usedBy: userId },
        })
      }

      // Clear user's cart
      await Cart.findOneAndUpdate({ userId: order.userId }, { $set: {
              items: [],
            couponApplied: false,
            couponCode: null,
            couponDiscount: 0,} });

      // Reduce stock for each product
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      return res.json({
        success: true,
        message: "Payment verified successfully",
        orderId: order.orderId,
      });
    } else {
      // Signature mismatch
      await Order.findOneAndUpdate(
        { orderId },
        {
          paymentStatus: "failed",
          paymentFailureReason: "Signature verification failed",
        }
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification error",
      error: error.message,
    });
  }
};





const loadOrderSuccessPage = async (req, res) => {
  try {
    console.log(req.query);
    const { orderId } = req.query;
    const userId = req.session.user;

    const user = await User.findOne({userId});
    console.log(user)

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

const loadOrderFaliurePage = async(req,res)=>{
 try {
    const { orderId } = req.query
    let order = null

    if (orderId) {
      order = await Order.findOne({ orderId }).populate("items.productId")
    }

    res.render("user/order-failure", { order })
  } catch (error) {
    console.error("Error loading failure page:", error)
    res.render("order-failure", { order: null })
  }
}


module.exports = {
  loadCheckOutPage,
  placeOrder,
  loadOrderSuccessPage,
  loadOrderFaliurePage,
  verifyPayment
};
