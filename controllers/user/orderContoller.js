const { populate } = require("dotenv");
const { Order } = require("../../models/orderSchema");
const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const mongoose = require("mongoose");
const { OrderHistory } = require("../../models/orderHistory");
const { Wallet } = require("../../models/walletSchema");
const PDFDocument = require("pdfkit")
const fs = require("fs")
const { calculateDiscount, calculateTax } = require("../../helpers/helper");

const loadOrderDetailedPage = async (req, res) => {
  try {
    const { orderId } = req.params;

    const userId = req.session.user;

    const user = await User.findById(userId);
    console.log(user);

    const order = await Order.findOne({ userId, orderId });

    if (!order) {
      return res.redirect("/error-404");
    }

    res.render("user/orders/orderdetails", { order, user });
  } catch (error) {
    console.error(error);
    return res.json({ message: error.message });
  }
};

const loadOrderPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findOne({ _id: userId });
    let search = req.query.search || "";
    const limit = 4;
    let page = parseInt(req.query.page) || 1;
    let skip = (page - 1) * limit;

    let searchQuery = { userId: userId };

    if (search) {
      searchQuery.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { orderStatus: { $regex: search, $options: "i" } },
        { "items.productName": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await Order.find(searchQuery)
      .populate({ path: "items.productId" })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orders/order", {
      user,
      orders,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      search,
      totalOrders,
    });
  } catch (error) {
    console.error(error);
    return res.json({ message: error.message });
  }
};

// const cancelOrderItem = async (req, res) => {
//   try {
//     const { orderId, productId } = req.params;
//     const { reason } = req.body;
//     const userId = req.session.user;

//     const order = await Order.findOne({ orderId, userId });
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found or invalid request" });
//     }

//     // Only allow cancellation for pending/processing orders
//     if (!["pending", "processing"].includes(order.orderStatus)) {
//       return res.status(403).json({ success: false, message: "Item cannot be cancelled at this stage" });
//     }

//     const itemIndex = order.items.findIndex(item => item.productId.toString() === productId.toString());
//     if (itemIndex === -1) {
//       return res.status(404).json({ success: false, message: "Product not found in order" });
//     }

//     const cancelItem = order.items[itemIndex];
//     if (cancelItem.status === "cancelled") {
//       return res.status(400).json({ success: false, message: "Item already cancelled" });
//     }

//     // Restore stock
//     const product = await Product.findById(productId);
//     if (!product || product.isBlocked) {
//       return res.json({ success: false, message: "Product unavailable" });
//     }
//     product.stock += cancelItem.quantity;
//     await product.save();

//     // Update item status
//     order.items[itemIndex].status = "cancelled";
//     order.items[itemIndex].cancellationReason = reason || "Cancelled by user";

//     // Increment the cancelled amount
//     order.totalCancelAmount += cancelItem.totalPrice;

//     // Recalculate only active items
//     const activeItems = order.items.filter(item => item.status !== "cancelled");
//     order.totalAmount = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);

//     const discount = calculateDiscount(order.totalAmount);
//     const tax = calculateTax(order.totalAmount - discount);
//     const shipping = order.totalAmount > 0 ? (order.totalAmount >= 1000 ? 0 : 50) : 0;

//     order.discount = discount;
//     order.tax = tax;
//     order.shipping = shipping;
//     order.finalAmount = order.totalAmount - discount + tax + shipping;

//     // Handle refund
//     if (order.paymentStatus === "completed" && order.paymentMethod === "online") {
//       let wallet = await Wallet.findOne({ userId });
//       if (!wallet) {
//         wallet = new Wallet({ userId, balance: 0, transactions: [] });
//       }

//       wallet.balance += cancelItem.totalPrice;
//       wallet.transactions.push({
//         type: "credit",
//         amount: cancelItem.totalPrice,
//         reason: `Refund for cancelled item: ${cancelItem.productName} (Order: ${order.orderId})`,
//         orderId: order.orderId,
//         date: new Date(),
//       });

//       order.items[itemIndex].refundStatus = "processing";
//       order.items[itemIndex].refundMethod = "wallet";
//       order.items[itemIndex].refundDate = new Date();

//       await wallet.save();
//     }

//     // If all items cancelled, mark order as fully cancelled
//     if (activeItems.length === 0) {
//       order.orderStatus = "cancelled";
//       order.cancelledAt = new Date();
//       order.cancelledBy = "user";
//       order.cancellationReason = reason || "All items cancelled by user";
//     }

//     // Log history
//     const orderHistory = new OrderHistory({
//       orderId: order._id,
//       eventType: "cancelled",
//       description: `Item ${cancelItem.productName} cancelled`,
//       details: { productId, reason: reason || "Cancelled by user" },
//     });
//     await orderHistory.save();

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: "Product cancelled successfully",
//       allItemsCancelled: activeItems.length === 0,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.json({ success: false, message: error.message });
//   }
// };

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or invalid request" });
    }

    if (!["pending", "processing"].includes(order.orderStatus)) {
      return res.status(403).json({ success: false, message: "Item cannot be cancelled at this stage" });
    }

    const itemIndex = order.items.findIndex(item => item.productId.toString() === productId.toString());
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

    const cancelItem = order.items[itemIndex];
    if (cancelItem.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Item already cancelled" });
    }

    //  Restore stock
    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      return res.status(400).json({ success: false, message: "Product unavailable or blocked" });
    }
    product.stock += cancelItem.quantity;
    await product.save();

    // Mark item as cancelled
    cancelItem.status = "cancelled";
    cancelItem.cancellationReason = reason || "Cancelled by user";

    // Track cancellation amount (for summary display)
    order.totalCancelAmount += cancelItem.totalPrice;

    //  Recalculate active item-based totals
    const activeItems = order.items.filter(item => item.status !== "cancelled");

    order.totalActiveAmount = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Use only stored discountAmount per item (not new logic)
    order.discount = activeItems.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0);

    order.tax = calculateTax(order.totalActiveAmount - order.discount);
    order.shipping = order.totalActiveAmount >= 1000 ? 0 : (order.totalActiveAmount > 0 ? 50 : 0);

    order.finalAmount = order.totalActiveAmount - order.discount + order.tax + order.shipping;

    //  Refund logic (only for prepaid orders)
    if (order.paymentMethod === "online" && order.paymentStatus === "completed") {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += cancelItem.totalPrice;
      wallet.transactions.push({
        type: "credit",
        amount: cancelItem.totalPrice,
        reason: `Refund for cancelled item: ${cancelItem.productName} (Order: ${order.orderId})`,
        orderId: order.orderId,
        date: new Date(),
      });
      wallet.updatedOn = new Date();
      await wallet.save();

      cancelItem.refundStatus = "processing";
      cancelItem.refundMethod = "wallet";
      cancelItem.refundDate = new Date();
    }

    // Full order cancelled if all items are cancelled
    if (activeItems.length === 0) {
      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();
      order.cancelledBy = "user";
      order.cancellationReason = reason || "All items cancelled by user";
    }

    //  Order History log
    const orderHistory = new OrderHistory({
      orderId: order._id,
      eventType: "cancelled",
      description: `Item ${cancelItem.productName} cancelled`,
      details: { productId, reason: reason || "Cancelled by user" },
    });
    await orderHistory.save();

    // Save final order
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Item cancelled successfully",
      allItemsCancelled: activeItems.length === 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



const cancelEntireOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ userId, orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or invalid request" });
    }

     if (!["pending", "processing"].includes(order.orderStatus)) {
      return res.status(403).json({ success: false, message: "Item cannot be cancelled at this stage" });
    }

    const hasCancelledItem = order.items.some(item => item.status === "cancelled");
    if (hasCancelledItem) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel the entire order because some items are already cancelled",
      });
    }

    const now = new Date();
// upadting each items to cancelled
    order.items.forEach((item) => {
      item.status = "cancelled";
      item.cancellationReason = reason || "Cancelled by user";
      if (order.paymentMethod === "online" && order.paymentStatus === "completed") {
        item.refundStatus = "processing";
        item.refundMethod = "wallet";
        item.refundDate = now;
      }
    });

    // Restore stock for each item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    //  Refund to wallet 
    if (order.paymentMethod === "online" && order.paymentStatus === "completed") {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += order.finalAmount; // finalAmount, not totalAmount
      wallet.transactions.push({
        type: "credit",
        amount: order.finalAmount,
        reason: `Refund for cancelled Order: ${order.orderId}`,
        orderId: order.orderId,
        date: now,
      });

      order.refundStatus = "processing";
      order.refundMethod = "wallet";
      order.refundDate = now;

      await wallet.save();
    }

    //  Update order-level status
    order.orderStatus = "cancelled";
    order.cancelledAt = now;
    order.cancelledBy = "user";
    order.cancellationReason = reason || "Entire order cancelled by user";

    await order.save();

    // Log order history
    const orderHistory = new OrderHistory({
      orderId: order._id,
      eventType: "cancelled",
      description: `Entire order ${order.orderId} cancelled`,
      details: { reason: reason || "Cancelled by user" },
    });
    await orderHistory.save();

    return res.status(200).json({
      success: true,
      message: "Entire order cancelled and refunded successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// Generate and download invoice
const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId }).populate({
      path: "items.productId",
      select: "productName regularPrice salePrice",
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const user = await User.findById(userId);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${orderId}.pdf`);

    doc.pipe(res);

    // Company Header
    doc.fontSize(20).font('Helvetica-Bold').text("Irowz Elite", 50, 50);
    doc.fontSize(10).font('Helvetica').text("123 Business Street", 50, 80);
    doc.text("City, State 12345", 50, 95);
    doc.text("Phone: (555) 123-4567", 50, 110);

    // Invoice Header
    doc.fontSize(20).font('Helvetica-Bold').text("INVOICE", 400, 50);
    doc.fontSize(12).font('Helvetica').text(`Invoice #: ${orderId}`, 400, 80);
    doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, 400, 100);
    doc.text(`Status: ${order.orderStatus}`, 400, 120);

    // Customer Info
    doc.fontSize(14).font('Helvetica-Bold').text("Bill To:", 50, 160);
    doc.fontSize(12).font('Helvetica').text(`${user.fullName}`, 50, 180);
    doc.text(`${user.email}`, 50, 195);

    // Shipping Info
    if (order.address) {
      doc.fontSize(14).font('Helvetica-Bold').text("Ship To:", 300, 160);
      doc.fontSize(12).font('Helvetica').text(`${order.address.firstName} ${order.address.lastName}`, 300, 180);
      doc.text(`${order.address.address}`, 300, 195);
      doc.text(`${order.address.state}, ${order.address.pinCode}`, 300, 210);
      doc.text(`${order.address.country}`, 300, 225);
    }

    // Line Separator
    doc.moveTo(50, 250).lineTo(550, 250).stroke();

    // Table Headers
    const tableTop = 270;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text("Item", 50, tableTop);
    doc.text("Quantity", 250, tableTop);
    doc.text("Price", 350, tableTop);
    doc.text("Total", 450, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table Rows
    let yPosition = tableTop + 30;
    doc.font('Helvetica');
    order.items.forEach((item) => {
      const name = item.productName || item.productId?.productName || "Unnamed Product";
      doc.text(name, 50, yPosition, { width: 180 });
      doc.text(item.quantity.toString(), 250, yPosition);
      doc.text(`$${item.price.toFixed(2)}`, 350, yPosition);
      doc.text(`$${item.totalPrice.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
    });

    // Line before totals
    yPosition += 10;
    doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();

    // Totals
    yPosition += 10;
    doc.font('Helvetica-Bold');
    doc.text(`Subtotal:`, 350, yPosition);
    doc.text(`$${order.totalAmount.toFixed(2)}`, 450, yPosition, { align: 'right' });

    yPosition += 15;
    if (order.discount > 0) {
      doc.text(`Discount:`, 350, yPosition);
      doc.text(`-$${order.discount.toFixed(2)}`, 450, yPosition, { align: 'right' });
      yPosition += 15;
    }

    if (order.tax > 0) {
      doc.text(`Tax:`, 350, yPosition);
      doc.text(`$${order.tax.toFixed(2)}`, 450, yPosition, { align: 'right' });
      yPosition += 15;
    }

    if (order.shipping > 0) {
      doc.text(`Shipping:`, 350, yPosition);
      doc.text(`$${order.shipping.toFixed(2)}`, 450, yPosition, { align: 'right' });
      yPosition += 15;
    }

    // Final Total
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`Total:`, 350, yPosition);
    doc.text(`$${order.finalAmount.toFixed(2)}`, 450, yPosition, { align: 'right' });

    // Footer
    doc.fontSize(10).font('Helvetica').text("Thank you for your business!", 50, yPosition + 50);

    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ success: false, message: "Error generating invoice" });
  }
};

const sendReturnOrderRequest = async(req,res)=>{
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const orderId = req.params.orderId;
    const productId = req.body.productId;
    const reason = req.body.reason;

    let order = await Order.findOne({userId,orderId});

    const productIndex = order.items.findIndex((item)=> item.productId.toString() === productId.toString());
    if (productIndex === -1) {
  throw new Error("The product is not found");
}

    const now =new Date();
    if(order.items[productIndex].status !=="delivered")
    {
      throw new Error("Only delivered Product can be returned ")
    }

    if (order.items[productIndex].status === 'return requested') {
  throw new Error("Return request already submitted for this product.");
}

    order.items[productIndex].returnRequestedAt = now;
    order.items[productIndex].status ='return requested';
    order.items[productIndex].returnReason = reason;

    await order.save();

    return res.status(200).json({success:true,message:"You request will review Soon"})
    
    
  } catch (error) {
    console.error(error);
    return res.json({success:false,message:error.message})
    
  }
}


module.exports = {
  loadOrderPage,
  loadOrderDetailedPage,
  cancelOrderItem,
  cancelEntireOrder,
  downloadInvoice,
  sendReturnOrderRequest,
};
