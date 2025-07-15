
const { Category } = require("../../models/categorySchema");
const { Product } = require("../../models/productSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");



async function getCategoryOfferIfValid(categoryId) {
  console.log("fbhdfhdsfbh vsdbfbhds")
  const category = await Category.findById(categoryId);
   
    console.log("The cateogy is ",category)
  if (!category || !category.categoryOffer || !category.offerStartDate || !category.offerEndDate) {
    return 0;
  }

  // const now = new Date();
  // if (now >= category.offerStartDate && now <= category.offerEndDate) {
   
    console.log("hgghvg vhgvghg")
    return category.categoryOffer;
  // }
  return 0;
}

async function calculateOfferDetails(regularPrice, productOffer, categoryId) {
  console.log("hfdhbfdshfsd")
  const categoryOffer = await getCategoryOfferIfValid(categoryId);
  const bestOffer = Math.max(productOffer || 0, categoryOffer || 0);
  const appliedOfferType = categoryOffer > (productOffer || 0) ? 'Category' :
                           productOffer > 0 ? 'Product' : 'None';

  const discountAmount = Math.round(regularPrice * (bestOffer / 100));
  const salePrice = regularPrice - discountAmount;

  console.log(bestOffer);

  return {
    bestOffer,
    appliedOfferType,
    discountAmount,
    salePrice
  };
}


const addProductOffer = async (req, res) => {
  try {
    const { id, offer } = req.body;

    if (!id || offer === undefined) {
      return res.status(400).json({ success: false, message: "Missing product ID or offer" });
    }

    const numericOffer = Number(offer);
    if (isNaN(numericOffer) || numericOffer < 0 || numericOffer > 100) {
      return res.status(400).json({ success: false, message: "Invalid offer value" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.productOffer = numericOffer;

    const offerDetails = await calculateOfferDetails(
      product.regularPrice,
      numericOffer,
      product.category
    );

    product.salePrice = offerDetails.salePrice;
    product.discountAmount = offerDetails.discountAmount;
    product.appliedOfferType = offerDetails.appliedOfferType;

    await product.save();

    return res.status(Status.OK).json({ success: true, message: "Product offer added successfully" });

  } catch (error) {
    console.error(error);
    return res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

// ------------------ REMOVE PRODUCT OFFER ------------------
const removeProductOfffer = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Invalid data" });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.productOffer = 0;

    const offerDetails = await calculateOfferDetails(
      product.regularPrice,
      0, // productOffer
      product.category
    );

    product.salePrice = offerDetails.salePrice;
    product.discountAmount = offerDetails.discountAmount;
    product.appliedOfferType = offerDetails.appliedOfferType;

    await product.save();

    return res.status(Status.OK).json({ success: true, message: "Product offer removed successfully" });

  } catch (error) {
    console.error(error);
    return res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

// ------------------ ADD CATEGORY OFFER ------------------
const addCategoryOffer = async (req, res) => {
  try {
    const { id, offer, startDate, endDate } = req.body;

    console.log(startDate,endDate)

    if (!id || offer === undefined || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const numericOffer = Number(offer);
    if (isNaN(numericOffer) || numericOffer < 0 || numericOffer > 100) {
      return res.status(400).json({ success: false, message: "Invalid offer value" });
    }

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    category.categoryOffer = numericOffer;
    category.offerStartDate = new Date(startDate);
    category.offerEndDate = new Date(endDate);
     await category.save();

    const products = await Product.find({ category: id });

    for (let item of products) {
      const offerDetails = await calculateOfferDetails(
        item.regularPrice,
        item.productOffer,
        item.category
      );
      item.salePrice = offerDetails.salePrice;
      item.discountAmount = offerDetails.discountAmount;
      item.appliedOfferType = offerDetails.appliedOfferType;
      await item.save();
    }

   

    return res.status(Status.OK).json({ success: true, message: "Category offer added successfully" });

  } catch (error) {
    console.error(error);
    return res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

// ------------------ REMOVE CATEGORY OFFER ------------------
const removeCategoryOffer = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) return res.status(400).json({ success: false, message: "Invalid category ID" });

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    // Reset offer fields
    category.categoryOffer = 0;
    category.offerStartDate = null;
    category.offerEndDate = null;

    await category.save();

    const products = await Product.find({ category: id });

    for (let item of products) {
      const offerDetails = await calculateOfferDetails(
        item.regularPrice,
        item.productOffer,
        item.category
      );

      console.log("OfferDetails in removerProducts",offerDetails)
      item.salePrice = offerDetails.salePrice;
      item.discountAmount = offerDetails.discountAmount;
      item.appliedOfferType = offerDetails.appliedOfferType;
      await item.save();
    }

    

    return res.status(Status.OK).json({ success: true, message: "Category offer removed successfully" });

  } catch (error) {
    console.error(error.message);
    return res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

module.exports = {
  addProductOffer,
  removeProductOfffer,
  addCategoryOffer,
  removeCategoryOffer
};
