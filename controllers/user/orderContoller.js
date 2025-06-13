const { populate } = require("dotenv");
const { Order } = require("../../models/orderSchema");
const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const mongoose = require("mongoose");
const{OrderHistory}=require("../../models/orderHistory")
const {Wallet}=require("../../models/walletSchema");
const{calculateDiscount,calculateTax}=require("../../helpers/helper")



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




const cancelOrderItem = async(req,res)=>{
  try {

    const {orderId,productId} = req.params;
    console.log("This is order id"+ orderId+"the product id",productId);
    const{reason}= req.body;
    const userId = req.session.user;
    const order = await Order.findOne({orderId,userId});

    if(!order){
      return res.status(404).json({success:false,message:"Order not found or invalide request"})
    };

    // if pending,processing allow to cancel
    if (!['pending', 'processing'].includes(order.orderStatus)) {
      return res.status(403).json({ success: false, message: 'Item cannot be cancelled at this stage' });
    };

    // Find item in order items
    const itemIndex = order.items.findIndex(item => item.productId.toString() === productId.toString());
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    const cancelItem = order.items[itemIndex];

      // If cancelled no need for cancelling again
    if (cancelItem.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Item already cancelled' });
    }

    const product = await Product.findById(productId);

    if(!product || product.isBlocked)
    {
      return res.json({success:false,message:"Order is Not available"})
    };

    product.stock+=cancelItem.quantity;
    await product.save();

     // Mark item as cancelled
    order.items[itemIndex].status = 'cancelled';
    order.items[itemIndex].cancellationReason = reason || 'Cancelled by user';

  

     // Recalculate order totals
    const activeItems = order.items.filter(item => item.status !== 'cancelled');
    order.totalAmount = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = calculateDiscount(order.totalAmount);
    const tax = calculateTax(order.totalAmount - discount);
    let shipping;
    if(order.totalAmount !=0)
    {
      shipping = order.totalAmount >= 1000 ? 0 : 50; // Free shipping above 1000
    }else{
      shipping = 0;
    }
    order.discount = discount;
    order.tax = tax;
    order.shipping = shipping;
    order.finalAmount = order.totalAmount - discount + tax + shipping;

    if(order.paymentStatus ==="completed" && order.paymentMethod === "online")
    {
      let wallet = await Wallet.findOne({userId});
      if(!wallet)
      {
        wallet = new Wallet({userId, balance:0,transactions:[]});
      }

      // Update wallet balance and add transaction
      wallet.balance += cancelItem.totalPrice;
      wallet.transactions.push({
        type: 'credit',
        amount: cancelItem.totalPrice,
        reason: `Refund for cancelled item: ${cancelItem.productName} (Order: ${order.orderId})`,
        orderId: order.orderId,
        date: new Date()
      });
      wallet.updatedOn = new Date();

      // Update order refund fields
      order.items[itemIndex].refundStatus = 'processing';
      order.items[itemIndex].refundMethod = 'wallet';
      order.items[itemIndex].refundDate = new Date();

      await wallet.save();

    }
       // Check if all items are cancelled then the order is full cancelled
     if (activeItems.length === 0) {
      order.orderStatus = 'cancelled';
      order.cancelledAt = new Date();
      order.cancelledBy = 'user';
      order.cancellationReason = reason || 'All items cancelled by user';
      order.refundStatus = order.paymentMethod === 'online' ? 'processing' : 'not initiated';
    }

       // Log order history
    const orderHistory = new OrderHistory({
      orderId: order._id,
      eventType: 'cancelled',
      description: `Item ${cancelItem.productName} cancelled`,
      details: { productId, reason: reason || 'Cancelled by user' }
    });
    await orderHistory.save();

     // Save order changes
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Product cancelled successfully',
      allItemsCancelled: activeItems.length === 0
    });
    
  } catch (error) {
    console.error(error);
    return res.json({success:false,message:error.message});
    
  }
}


module.exports = {
  loadOrderPage,
  loadOrderDetailedPage,
  cancelOrderItem,
};
