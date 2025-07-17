const { Product } = require("../../models/productSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

const getStockManagementPage = async (req, res) => {
  try {
    const { search, filter, page = 1, limit = 5 } = req.query;

    let query = { isBlocked: false };

    if (search) {
      query.$or = [{ productName: { $regex: search, $options: "i" } }];
    }

    if (filter) {
      switch (filter) {
        case "critical":
          query.stock = { $lt: 10, $gt: 0 };
          break;
        case "low":
          query.stock = { $gte: 10, $lt: 50 };
          break;
        case "good":
          query.stock = { $gte: 50 };
          break;
        case "out":
          query.stock = 0;
          break;
      }
    }

    const products = await Product.find(query)
      .populate("category brand")
      .skip((page - 1) * limit)
      .limit(limit);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("admin/stock-alert", {
      products,
      search,
      filter,
      currentPage: parseInt(page),
      totalPages,
      limit: parseInt(limit),
      totalProducts,
    });
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: error.message });
  }
};

const updateStockQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    console.log(productId, quantity);
    if (!productId || !quantity) {
      throw new Error("The Invalid request");
    }

    if (quantity <= 0) {
      return res.json({
        success: false,
        message: "Please enter a valid quantity",
      });
    }

    let product = await Product.findById(productId);
    if (!product) {
      return res
        .status(Status.NOT_FOUND)
        .json({ success: false, message: "The product is not found" });
    }

    product.stock += quantity;

    await product.save();

    return res
      .status(Status.OK)
      .json({
        success: true,
        message: "The product stock updated successfully",
      });
  } catch (error) {
    return res.status(Status.NOT_FOUND).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStockManagementPage,
  updateStockQuantity,
};
