const { populate } = require("dotenv");
const { Order } = require("../../models/orderSchema");
const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const mongoose = require("mongoose");
const { OrderHistory } = require("../../models/orderHistory");
const { Wallet } = require("../../models/walletSchema");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const { Coupon } = require("../../models/couponSchema");
const { calculateDiscount, calculateTax } = require("../../helpers/helper");
const { Category } = require("../../models/categorySchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

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

function calculateTotalRefundAmount(order, itemIndex, coupon) {
  let cancelledItem = order.items[itemIndex];
  let refundAmount = 0;

  if (!cancelledItem) {
    return 0;
  }

  let checkIfCouponValid = order.finalAmount - cancelledItem.totalPrice;

  if (coupon.minPurchaseAmount > checkIfCouponValid) {
    //coupon is not valid
    refundAmount = cancelledItem.totalPrice - order.couponDiscount;
  } else {
    refundAmount = cancelledItem.totalPrice;
  }

  return refundAmount;
}

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

    //  await Order.deleteMany({paymentMethod:"online",paymentStatus:"pending"});

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

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res.status(Status.NOT_FOUND).json({
        success: false,
        message: "Order not found or invalid request",
      });
    }

    if (!["pending", "processing"].includes(order.orderStatus)) {
      return res.status(403).json({
        success: false,
        message: "Item cannot be cancelled at this stage",
      });
    }

    const itemIndex = order.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );
    if (itemIndex === -1) {
      return res
        .status(Status.NOT_FOUND)
        .json({ success: false, message: "Product not found in order" });
    }

    const cancelItem = order.items[itemIndex];
    if (cancelItem.status === "cancelled") {
      return res
        .status(Status.BAD_REQUEST)
        .json({ success: false, message: "Item already cancelled" });
    }

    //  stock increasing of that product
    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      return res
        .status(Status.BAD_REQUEST)
        .json({ success: false, message: "Product unavailable or blocked" });
    }

    product.stock += cancelItem.quantity;
    await product.save();

    // Mark item as cancelled
    cancelItem.status = "cancelled";
    cancelItem.cancellationReason = reason || "Cancelled by user";
    let cancelCouponMessage = "";

    let refundAmount = 0;

    if (order.couponApplied) {
      let coupon = await Coupon.findOne({ code: order.couponCode });
      if (!coupon) {
        console.log("Skipped the coupon");
      }

      refundAmount = calculateTotalRefundAmount(order, itemIndex, coupon);

      if (refundAmount === order.items[itemIndex].totalPrice) {
        //if refund amount matches to the cancelAmount means coupon is still valid
        console.log(
          "The coupon is still valid righ",
          refundAmount + "" + order.items[itemIndex].totalPrice
        );
      } else {
        order.couponApplied = false;
        order.couponCode = null;
        order.couponDiscount = 0;
        cancelCouponMessage =
          "Coupon discount removed; refund issued after deducting coupon amount.";
        console.log(
          "The coupon is not valid anymore",
          refundAmount + "" + order.items[itemIndex].totalPrice
        );
      }
    } else {
      refundAmount = order.items[itemIndex].totalPrice;
    }

    if (refundAmount < order.items[itemIndex].totalPrice) {
      throw new Error(
        "Since the coupon is applied you cannot cancelled this order"
      );
    }

    //  cancellation amount
    order.totalCancelAmount += refundAmount;

    //  Recalculate active item-based totals
    const activeItems = order.items.filter(
      (item) => item.status !== "cancelled"
    );

    order.totalActiveAmount = activeItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // Use only stored discountAmount per item (not new logic)
    // order.discount = activeItems.reduce(
    //   (sum, item) => sum + item.discountAmount * item.quantity,
    //   0
    // );

    //  refunding online paid user
    if (
      order.paymentMethod === "online" &&
      order.paymentStatus === "completed"
    ) {
      let wallet = await Wallet.findOne({ userId });
      let refund = refundAmount;
      if (refund === 0) {
        refundAmount = order.items[itemIndex].totalPrice;
      }
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
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

    // Save final order
    order.totalRefundAmount += refundAmount;
    await order.save();

    return res.status(Status.OK).json({
      success: true,
      message: "Item cancelled successfully",
      allItemsCancelled: activeItems.length === 0,
      cancelCouponMessage,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(Status.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

const cancelEntireOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ userId, orderId });
    if (!order) {
      return res.status(Status.NOT_FOUND).json({
        success: false,
        message: "Order not found or invalid request",
      });
    }

    if (!["pending", "processing"].includes(order.orderStatus)) {
      return res.status(Status.BAD_REQUEST).json({
        success: false,
        message: "Item cannot be cancelled at this stage",
      });
    }

    const hasCancelledItem = order.items.some(
      (item) => item.status === "cancelled"
    );
    if (hasCancelledItem) {
      return res.status(Status.BAD_REQUEST).json({
        success: false,
        message:
          "Cannot cancel the entire order because some items are already cancelled",
      });
    }

    const now = new Date();
    // upadting each items to cancelled
    order.items.forEach((item) => {
      item.status = "cancelled";
      item.cancellationReason = reason || "Cancelled by user";
      if (
        order.paymentMethod === "online" &&
        order.paymentStatus === "completed"
      ) {
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
    if (
      order.paymentMethod === "online" &&
      order.paymentStatus === "completed"
    ) {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += order.finalAmount; // finalAmount,
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
    order.totalCancelAmount = order.finalAmount;

    await order.save();

    // Log order history
    // const orderHistory = new OrderHistory({
    //   orderId: order._id,
    //   eventType: "cancelled",
    //   description: `Entire order ${order.orderId} cancelled`,
    //   details: { reason: reason || "Cancelled by user" },
    // });
    // await orderHistory.save();

    return res.status(Status.OK).json({
      success: true,
      message: "Entire order cancelled and refunded successfully",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(Status.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
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
      return res
        .status(Status.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    const user = await User.findById(userId);

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      info: {
        Title: `Invoice ${orderId}`,
        Author: "Irowz Elite",
        Subject: "Invoice",
        Keywords: "invoice, order, receipt",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${orderId}.pdf`
    );

    doc.pipe(res);

    // Colors
    const primaryColor = "#2563eb";
    const secondaryColor = "#64748b";
    const accentColor = "#f8fafc";
    const textColor = "#1e293b";

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x, y, width, height, radius = 5) => {
      doc.roundedRect(x, y, width, height, radius);
    };

    // Header Background
    doc.fillColor(primaryColor);
    drawRoundedRect(50, 40, 500, 80, 8);
    doc.fill();

    // Company Header
    doc
      .fillColor("#ffffff")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("Irowz Elite", 70, 65);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text("Premium Business Solutions", 70, 95);

    // Company Contact Info (Right side of header)
    doc
      .fontSize(10)
      .text("123 Business Street", 400, 65)
      .text("City, State 12345", 400, 78)
      .text("Phone: (555) 123-4567", 400, 91)
      .text("Email: info@irowzelite.com", 400, 104);

    // Invoice Title Section
    doc.fillColor(accentColor);
    drawRoundedRect(50, 140, 500, 60, 8);
    doc.fill();

    doc
      .fillColor(textColor)
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("INVOICE", 70, 160);

    doc.fontSize(12).font("Helvetica").text(`Invoice #: ${orderId}`, 70, 185);

    doc.text(
      `Date: ${new Date(order.orderDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      300,
      160
    );

    doc.text(`Status: ${order.status || "Completed"}`, 300, 175);
    doc.text(`Payment Method: ${order.paymentMethod || "N/A"}`, 300, 190);

    // Customer Information Section
    let yPos = 230;

    // Bill To Section
    doc
      .fillColor(secondaryColor)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("BILL TO:", 70, yPos);

    doc
      .fillColor(textColor)
      .fontSize(12)
      .font("Helvetica")
      .text(`${user.fullName || "N/A"}`, 70, yPos + 20)
      .text(`${user.email || "N/A"}`, 70, yPos + 35);

    if (user.phone) {
      doc.text(`Phone: ${user.phone}`, 70, yPos + 50);
    }

    // Ship To Section
    if (order.address) {
      doc
        .fillColor(secondaryColor)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("SHIP TO:", 320, yPos);

      doc
        .fillColor(textColor)
        .fontSize(12)
        .font("Helvetica")
        .text(
          `${order.address.firstName || ""} ${order.address.lastName || ""}`,
          320,
          yPos + 20
        )
        .text(`${order.address.address || ""}`, 320, yPos + 35)
        .text(
          `${order.address.state || ""}, ${order.address.pinCode || ""}`,
          320,
          yPos + 50
        )
        .text(`${order.address.country || ""}`, 320, yPos + 65);
    }

    // Items Table
    yPos = 350;

    // Table Header Background
    doc.fillColor(primaryColor);
    drawRoundedRect(50, yPos, 500, 25, 5);
    doc.fill();

    // Table Headers
    doc
      .fillColor("#ffffff")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("ITEM", 70, yPos + 8)
      .text("QTY", 280, yPos + 8)
      .text("PRICE", 330, yPos + 8)
      .text("TOTAL", 400, yPos + 8)
      .text("STATUS", 470, yPos + 8);

    yPos += 35;

    // Table Rows
    doc.fillColor(textColor).font("Helvetica");

    order.items.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.fillColor("#f8fafc");
        doc.rect(50, yPos - 5, 500, 25).fill();
      }

      const name =
        item.productName || item.productId?.productName || "Unnamed Product";
      const status = item.status || "Delivered";

      doc
        .fillColor(textColor)
        .fontSize(11)
        .text(name, 70, yPos, { width: 180, ellipsis: true })
        .text(item.quantity.toString(), 280, yPos)
        .text(`₹${item.price.toFixed(2)}`, 330, yPos)
        .text(`₹${item.totalPrice.toFixed(2)}`, 400, yPos)
        .text(status, 470, yPos);

      yPos += 25;
    });

    // Summary Section
    yPos += 20;

    // Summary Background
    doc.fillColor(accentColor);
    drawRoundedRect(300, yPos, 250, 120, 8);
    doc.fill();

    yPos += 15;

    // Summary Items
    doc.fillColor(textColor).fontSize(12).font("Helvetica");

    const summaryItems = [
      { label: "Subtotal:", value: order.totalAmount },
      ...(order.discount > 0
        ? [{ label: "Discount:", value: -order.discount }]
        : []),
      ...(order.tax > 0 ? [{ label: "Tax:", value: order.tax }] : []),
      ...(order.shipping > 0
        ? [{ label: "Shipping:", value: order.shipping }]
        : []),
      // Fixed: Flatten the array properly
      ...(order.couponApplied
        ? [{ label: "Coupon:", value: -order.couponDiscount }]
        : []),
    ];

    summaryItems.forEach((item) => {
      doc
        .text(item.label, 320, yPos)
        .text(`₹${item.value.toFixed(2)}`, 480, yPos, { align: "right" });
      yPos += 18;
    });

    // Total Line
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(320, yPos)
      .lineTo(530, yPos)
      .stroke();

    yPos += 10;

    // Final Total
    doc
      .fillColor(primaryColor)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("TOTAL:", 320, yPos)
      .text(`₹${order.finalAmount.toFixed(2)}`, 480, yPos, { align: "right" });

    // Footer Section
    yPos += 60;

    // Footer Background
    doc.fillColor(accentColor);
    drawRoundedRect(50, yPos, 500, 80, 8);
    doc.fill();

    doc
      .fillColor(textColor)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Thank you for your business!", 70, yPos + 15);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        "This invoice was generated on " + new Date().toLocaleDateString(),
        70,
        yPos + 35
      )
      .text(
        "For questions about this invoice, contact us at support@irowzelite.com",
        70,
        yPos + 50
      )
      .text("Visit us at www.irowzelite.com", 70, yPos + 65);

    // Add page numbers if needed
    const pageCount = doc.bufferedPageRange().count;
    if (pageCount > 1) {
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .text(`Page ${i + 1} of ${pageCount}`, 500, 750);
      }
    }

    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res
      .status(Status.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error generating invoice" });
  }
};

const sendReturnOrderRequest = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const orderId = req.params.orderId;
    const productId = req.body.productId;
    const reason = req.body.reason;

    let order = await Order.findOne({ userId, orderId });

    const productIndex = order.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );
    if (productIndex === -1) {
      throw new Error("The product is not found");
    }

    const now = new Date();
    if (order.items[productIndex].status !== "delivered") {
      throw new Error("Only delivered Product can be returned ");
    }

    if (order.items[productIndex].status === "return requested") {
      throw new Error("Return request already submitted for this product.");
    }

    order.items[productIndex].returnRequestedAt = now;
    order.items[productIndex].status = "return requested";
    order.items[productIndex].returnReason = reason;

    await order.save();

    return res
      .status(200)
      .json({ success: true, message: "You request will review Soon" });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

module.exports = {
  loadOrderPage,
  loadOrderDetailedPage,
  cancelOrderItem,
  cancelEntireOrder,
  downloadInvoice,
  sendReturnOrderRequest,
};
