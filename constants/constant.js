

module.exports = {
  PAGINATION: {
    PRODUCTS_PER_PAGE: 4,
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
    { value: "0-50", label: "$0.00 - $50.00" },
    { value: "50-100", label: "$50.00 - $100.00" },
    { value: "100-150", label: "$100.00 - $150.00" },
    { value: "150-200", label: "$150.00 - $200.00" },
    { value: "200-250", label: "$200.00 - $250.00" },
    { value: "250", label: "$250.00+" },
  ],
};
