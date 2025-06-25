

module.exports = {
  PAGINATION: {
    PRODUCTS_PER_PAGE: 9,
  },
  SORT_OPTIONS: {
    DEFAULT: "newest",
    ALLOWED: ["price-asc", "price-desc", "name-asc", "name-desc", "newest"],
    SORT_QUERY_MAP: {
      "price-asc": { salePrice: 1 },
      "price-desc": { salePrice: -1 },
      "name-asc": { productName: 1 },
      "name-desc": { productName: -1 },
      "newest": { createdAt: -1 },
    },
  },
  PRICE_RANGES: [
    { value: "0-1000", label: "₹0- ₹1000" },
    { value: "1000-2000", label: "₹1000 - ₹2000" },
    { value: "2000-3000", label: "₹2000 - ₹3000" },
    { value: "3000-4000", label: "₹3000 - ₹4000" },
    { value: "4000-8000", label: "₹4000 - ₹8000" },
    { value: "10000", label: "₹10000+" },
  ],
};
