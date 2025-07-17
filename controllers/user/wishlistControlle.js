const { User } = require("../../models/userSchema");
const { Wishlist } = require("../../models/wishListSchema");
const { Product } = require("../../models/productSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

const loadWishlistPage = async (req, res) => {
  try {
    const userId = req.session.user;

    let wishlist = await Wishlist.findOne({ userId: userId }).populate({
      path: "products.productId",
      populate: "category",
    });
    const user = await User.findById(userId);

    console.log(wishlist);

    if (!wishlist) {
      return res.status(Status.BAD_REQUEST).render("user/wishlist", {
        wishlistItems: [],
        totalValue: 0,
        inStockCount: 0,
      });
    }

    const items = wishlist.products;

    const totalValue = wishlist.products.reduce((acc, cur) => {
      return (acc += cur.productId.salePrice || 0);
    }, 0);

    const inStockCount = wishlist.products.filter((val, ind) => {
      return val.productId.stock > 0;
    }).length;

    return res.status(Status.OK).render("user/wishlist", {
      wishlistItems: items,
      totalValue,
      inStockCount,
      user,
    });
  } catch (error) {
    return res.status(Status.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const addToWishList = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("The product doesn't exit");
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const checkProduct = await Wishlist.findOne({
      userId,
      "products.productId": productId,
    });

    if (checkProduct) {
      throw new Error("The product already exists");
    }

    wishlist.products.push({ productId });

    await wishlist.save();

    return res
      .status(Status.OK)
      .json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    console.error(error);
    return res.status(Status.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const deleteWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const deleted = await Wishlist.findOneAndUpdate(
      { userId },
      { $set: { products: [] } },
      { new: true }
    );

    if (!deleted) {
      return res
        .status(Status.INTERNAL_SERVER_ERROR)
        .json({
          success: true,
          message: "Could not updated...Something went wrong",
        });
    }

    return res
      .status(Status.OK)
      .json({ success: true, message: "wishlist cleared successfully" });
  } catch (error) {
    console.error(error);
    return res.status(Status.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user;

    const wishlist = await Wishlist.findOne({ userId });
   
    const findProductIndex = wishlist.products.findIndex(
      (item) => productId.toString() === item.productId.toString()
    );

    if (findProductIndex === -1) {
      throw new Error("The product Not found");
    }

    wishlist.products.splice(findProductIndex, 1);
    await wishlist.save();

    return res
      .status(Status.OK)
      .json({
        success: true,
        message: "The product removed from the wishlist successfully",
      });
  } catch (error) {
    console.error(error);
    return res.status(Status.NOT_FOUND).json({ success: false, message: error.message });
  }
};

module.exports = {
  loadWishlistPage,
  addToWishList,
  deleteWishlist,
  removeFromWishlist,
};
