const { Coupon } = require("../../models/couponSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

const loadCouponPage = async (req, res) => {
  try {
    const { search } = req.query;
    const limit = 10;
    const page = parseInt(req.query.page) || 1;

    let query = {};
    if (search) {
      query = {
        code: { $regex: search, $options: "i" },
      };
    }

    const totalCoupons = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(totalCoupons / limit);
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/coupon", {
      coupons,
      currentPage: page,
      totalPages,
      limit,
      search,
      totalCoupons,
    });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

// add coupon

const createCoupon = async (req, res) => {
  try {
    console.log("the add Coupon req.body", req.body);
    const {
      code,
      discountPercent,
      maxDiscountAmount,
      minPurchaseAmount,
      expiresAt,
      onlyFor,
      usageLimitPerUser,
      totalUsageLimit,
    } = req.body;

    // Check if already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(Status.BAD_REQUEST).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    //  expiry date
    if (new Date(expiresAt) < new Date()) {
      return res.json({
        success: false,
        message: "Expiry date cannot be in the past",
      });
    }

    if(maxDiscountAmount > 10000)
    {
      throw new Error("The max discount should be below 10000");
    }

    if(minPurchaseAmount< 800)
    {
      throw new Error("The min purchase amount should be atleast 800 or above ")
    }

    if(discountPercent > 90)
    {
      throw new Error("The maximun discount amount should below 90% ");
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      discountPercent: parseInt(discountPercent),
      maxDiscountAmount: maxDiscountAmount ? parseInt(maxDiscountAmount) : null,
      minPurchaseAmount: parseInt(minPurchaseAmount) || 0,
      expiresAt: new Date(expiresAt),
      onlyFor,
      usageLimitPerUser: parseInt(usageLimitPerUser) || 1,
      totalUsageLimit: totalUsageLimit ? parseInt(totalUsageLimit) : null,
    });

    await newCoupon.save();
    res.Status(Status.CREATED).json({ success: true, message: "Coupon added successfully" });
  } catch (error) {
    console.error("Error adding coupon:", error);
    res.json({ success: false, message: error.message });
  }
};

const loadEditCouponPage = async (req, res) => {
  try {
    const { id } = req.query;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.redirect("/error404");
    }

    return res.render("admin/editcoupon", { coupon });
  } catch (error) {
    console.error(error);
    return res.redirect("/error404");
  }
};

const editCoupon = async (req, res) => {
  try {
    console.log(req.body);
    const {
      id,
      code,
      discountPercent,
      maxDiscountAmount,
      minPurchaseAmount,
      expiresAt,
      onlyFor,
      usageLimitPerUser,
      totalUsageLimit,
      isActive,
    } = req.body;

     // Check if coupon code already exists (excluding current coupon)
    const existingCoupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      _id: { $ne: id }
    });

       if (existingCoupon) {
      return res.json({ success: false, message: 'Coupon code already exists' });
    }


      if(maxDiscountAmount > 10000)
    {
      throw new Error("The max discount should be below 10000");
    }

    if(minPurchaseAmount < 800)
    {
      throw new Error("The min purchase amount should be atleast 800 or above ")
    }

     if(discountPercent > 90)
    {
      throw new Error("The maximun discount amount should below 90% ");
    }

     const updateData = {
      code: code.toUpperCase(),
      discountPercent: parseInt(discountPercent),
      maxDiscountAmount: maxDiscountAmount ? parseInt(maxDiscountAmount) : null,
      minPurchaseAmount: parseInt(minPurchaseAmount) || 0,
      expiresAt: new Date(expiresAt),
      onlyFor,
      usageLimitPerUser: parseInt(usageLimitPerUser) || 1,
      totalUsageLimit: totalUsageLimit ? parseInt(totalUsageLimit) : null,
      isActive: isActive === 'true'
    };

        await Coupon.findByIdAndUpdate(id, updateData);
    res.status(Status.ACCEPTED).json({ success: true, message: 'Coupon updated successfully' });

  } catch (error) {
      console.error('Error updating coupon:', error);
    res.json({ success: false, message: error.message });
  }
};


const deleteCoupon = async(req,res)=>{
   try {
    const { id } = req.body;
    const coupon = await Coupon.findById(id);
    
    if (!coupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }
    
    // Check if coupon has been used
    if (coupon.usedCount > 0) {
      return res.json({ 
        success: false, 
        message: 'Cannot delete coupon that has been used. Deactivate it instead.' 
      });
    }
    
    await Coupon.findByIdAndDelete(id);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.json({ success: false, message: message.SERVER_ERROR });
  }
}

const activateCoupon = async (req,res)=>{
    try {
    const { id } = req.body;
    await Coupon.findByIdAndUpdate(id, { isActive: true });
    res.json({ success: true, message: 'Coupon activated successfully' });
  } catch (error) {
    console.error('Error activating coupon:', error);
    res.json({ success: false, message: 'Error activating coupon' });
  }
}

const deactivateCoupon = async(req,res)=>{
    try {
    const { id } = req.body;
    await Coupon.findByIdAndUpdate(id, { isActive: false });
    res.json({ success: true, message: 'Coupon deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating coupon:', error);
    res.json({ success: false, message: 'Error deactivating coupon' });
  }
}

module.exports = {
  loadCouponPage,
  createCoupon,
  loadEditCouponPage,
  editCoupon,
  deleteCoupon,
  activateCoupon,
  activateCoupon,
  deactivateCoupon

};
