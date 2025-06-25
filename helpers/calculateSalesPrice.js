const { Category } = require("../models/categorySchema");

async function getCategoryOfferIfValid(categoryId) {
  const category = await Category.findById(categoryId);
   console.log("fbhdfhdsfbh vsdbfbhds")
  if (!category || !category.categoryOffer || !category.offerStartDate || !category.offerEndDate) {
    return 0;
  }

  console.log("fhdwbfhbew")
  const now = new Date();
  if (now >= category.offerStartDate && now <= category.offerEndDate) {
    console.log("fhdwbfhbewfefewfew")
    return category.categoryOffer;
  }
  return 0;
}

async function calculateOfferDetails(regularPrice, productOffer, categoryId) {
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

module.exports = {
  calculateOfferDetails,
   getCategoryOfferIfValid  
};
