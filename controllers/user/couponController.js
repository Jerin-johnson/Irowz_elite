const { Cart } = require("../../models/cartSchema");
const { Coupon } = require("../../models/couponSchema");
const { Order } = require("../../models/orderSchema");


const applyCoupon = async(req,res)=>{
    try {
        const{couponCode}=req.body;
        const userId = req.session.user;

        if(!couponCode) throw new Error("Coupon code is required");

        const coupon = await Coupon.findOne({code:couponCode.toUpperCase(),isActive:true,expiresAt: { $gt: new Date() },});

        if(!coupon) throw new Error ("The coupon is not found");

  // Get cart
    const cart = await Cart.findOne({ userId }).populate("items.productId")
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Your cart is empty" })
    }

    // Ccoupon is already applied
    if (cart.couponApplied && cart.couponCode === couponCode) {
      return res.json({ success: false, message: "This coupon is already applied" })
    }

     // Calculate cart amount
    let cartAmount = 0
    cart.items.forEach((item) => {
      const salePrice = item.productId.salePrice 
      cartAmount += salePrice * item.quantity
    })

    console.log(cartAmount)
     // Validate minimum purchase amount

    if (cartAmount < coupon.minPurchaseAmount) {
      return res.json({
        success: false,
        message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`,
      })
    }

   const userUsageCount = coupon.usedBy.filter((id) => id.toString() === userId.toString()).length;

  if (userUsageCount >= coupon.usageLimitPerUser) {
  return res.json({ success: false, message: "You have already used this coupon maximum times" })
}

if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) {
  return res.json({ success: false, message: "This coupon has reached its usage limit" })
}

let discount = (cartAmount * coupon.discountPercent) / 100
if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
  discount = coupon.maxDiscountAmount
}


     if((cartAmount-discount) <= 10)
     {
      return res.json({success:false,message:"This coupon cannot use for this order"})
     }

cart.couponApplied = true
cart.couponCode = coupon.code
cart.couponDiscount = discount
await cart.save()

return res.json({
  success: true,
  message: `Coupon applied! You saved ₹${discount.toFixed(2)}`,
  couponDiscount: discount.toFixed(2),
  couponCode: coupon.code,
})
    
        
    } catch (error) {
        console.error(error);
        return res.status(404).json({success:false,message:error.message})
        
    }
}

const removeAppliedCoupon = async(req,res)=>{
    try {

        const userId = req.session.user;

        const cart = await Cart.findOne({userId});

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" })
    }

    if (!cart.couponApplied) {
      return res.json({ success: false, message: "No coupon applied" })
    }

    cart.couponApplied = false;
    cart.couponCode = null;
    cart.couponDiscount = 0;


    await cart.save();

     return res.json({
      success: true,
      message: "Coupon removed successfully",
    })
        
    } catch (error) {
        console.error(error);
        return res.status(404).json({success:false,message:error.message});
        
    }
}


module.exports={
    applyCoupon,
    removeAppliedCoupon
    
}