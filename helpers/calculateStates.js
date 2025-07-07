const { Order } = require("../models/orderSchema");

// async function getDashSalesData(){

//      let allOrders = await Order.find({})
//         let deliveredOrder = await Order.find({paymentStatus :"completed"})

//         let revenueResult = 0;
//         let totalCancelAmount =0;
//         let totalRefundAmount =0;
//         let totalCouponDiscount =0;
//         let totalOrders =0;
//         let totalRevune = deliveredOrder.reduce((acc,cur)=> acc+=cur.finalAmount,0);

//         allOrders.forEach((order)=>{
//           let {items} = order;

//           totalOrders+= items.length

//           let deliveredItems = items.filter((it)=> it.status === 'delivered');
//           let cancelledOrReturnItems = items.filter((it)=> it.status ==="cancelled" || it.status === "returned" );

//           let result = deliveredItems.reduce((acc,cur)=> acc+=cur.totalPrice  ,0);
//           let canceledAmount = cancelledOrReturnItems.reduce((acc,cur)=> acc+=cur.totalPrice ,0);

//           revenueResult += result;
//           totalCancelAmount += canceledAmount;
//           totalRefundAmount+=order.totalRefundAmount;

//           if(order.couponApplied)
//           {
//             totalCouponDiscount += order.couponDiscount;
//           }

//         })

//         return{
//             revenueResult,
//             totalCancelAmount,
//             totalRefundAmount,
//             totalCouponDiscount,
//             totalOrders,
//             totalRevune
//         }

// }

async function getDashSalesData() {
  try {
    let totalRevune = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "delivered" } },
      { $group: { _id: null, revenue: { $sum: "$items.totalPrice" } } },
    ]);

    const totalOrders = await Order.countDocuments();

    const totalRefundAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRefundAmount: { $sum: "$totalRefundAmount" },
        },
      },
    ]);
    const totalCouponDiscount = await Order.aggregate([
      { $group: { _id: null, couponDiscount: { $sum: "$couponDiscount" } } },
    ]);

    const finalRevune = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
          "items.refundStatus": { $nin: ["refunded", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          finalRevenue: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    let couponDis = totalCouponDiscount[0]?.couponDiscount || 0

    let obj = {
      finalRevune: finalRevune[0]?.finalRevenue - couponDis||0,
      totalRefundAmount: totalRefundAmount[0]?.totalRefundAmount || 0,
      totalCouponDiscount: totalCouponDiscount[0]?.couponDiscount || 0,
      totalOrders: totalOrders || 0,
      totalRevune: totalRevune[0]?.revenue || 0,
    };

      console.log(obj)
    return obj;
  } catch (error) {
    console.error(error);
  }
}

module.exports = { getDashSalesData };
