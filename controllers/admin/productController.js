const { Category } = require("../../models/categorySchema");
const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const { Brand } = require("../../models/brandSchema");
const mongoose = require("mongoose");
const fs = require("fs");
const sharp = require("sharp");
const path = require("path");
const { calculateOfferDetails } = require("../../helpers/calculateSalesPrice");
const Status = require("../../utils/status");
const message = require("../../utils/message");

// load product page all
const loadProductPage = async (req, res) => {
  try {
    const { search = "", page = 1 } = req.query;
    const limit = 4;

    const query = search
      ? { productName: { $regex: search, $options: "i" } }
      : {};

    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category")
      .populate("brand")
      .sort({ createdAt: -1 })
      .exec();

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit) || 1;
    const categories = await Category.find({ isListed: true });

    // Check if the request is AJAX
    const isAjax = req.headers["x-requested-with"] === "XMLHttpRequest";

    if (isAjax) {
      // Return JSON for AJAX requests
      return res.json({
        products,
        search,
        currentPage: parseInt(page),
        totalPages,
        limit,
      });
    }

    // Render EJS for initial page load
    res.render("admin/viewproduct", {
      products,
      categories,
      search,
      currentPage: parseInt(page),
      totalPages,
      limit,
    });
  } catch (err) {
    console.error(err);
    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.status(500).json({ error: "Server Error" });
    }
    res.status(500).send("Server Error");
  }
};

// loadAddProductPage
const loadAddProductPage = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    res.render("admin/addproducts", {
      categories,
      brands,
    });
  } catch (error) {
    console.error(error);
    res.status(Status.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      brand,
      stock,
      regularPrice,
      productOffer,
    } = req.body;
    const images = req.files;

    if (
      !name ||
      !description ||
      !category ||
      !brand ||
      !stock ||
      !regularPrice
    ) {
      throw new Error("All fields are required except offer");
    }

    if (parseFloat(regularPrice) <= 0) {
      throw new Error("Regular price must be greater than 0");
    }

    if (productOffer && (productOffer < 0 || productOffer > 90)) {
      throw new Error("Product offer must be between 0 and 90%");
    }

    // const existProduct = await Product.findOne({productName:{ $regex: name, $options: "i" }});
    const existProduct = await Product.findOne({
      productName: { $regex: `^${name}$`, $options: "i" },
    });

    if (existProduct) {
      throw new Error("The Product Name already exist");
    }

    // const check whether the catrogry exist and brand exist

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new Error("Selected category does not exist");
    }
    const brandExists = await Brand.findById(brand);
    if (!brandExists) {
      throw new Error("Selected brand does not exist");
    }

    const calculateDetails = await calculateOfferDetails(
      regularPrice,
      productOffer,
      category
    );
    console.log(calculateDetails);
    const salePrice = calculateDetails.salePrice;
    console.log("The Product Offer is", salePrice);

    const discountAmount = regularPrice - salePrice;

    console.log("the discounted price", discountAmount);

    const imageData = images.map((file, index) => ({
      path: file.path.replace(/\\/g, "/"),
    }));

    console.log("the applied offer", calculateDetails.appliedOfferType);

    // Create and save product
    const product = new Product({
      productName: name,
      description,
      category,
      brand,
      quantity: parseFloat(stock),
      stock: parseInt(stock),
      regularPrice: parseFloat(regularPrice),
      salePrice,
      productImage: imageData,
      productOffer: productOffer || 0,
      discountAmount,
      appliedOfferType: calculateDetails.appliedOfferType,
    });

    await product.save();

    // Return success response
    res
      .status(Status.OK)
      .json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.log(error.message);
    res
      .status(Status.BAD_REQUEST)
      .json({ message: error.message || "Failed to add product" });
  }
};

// GET Edit Product Page
const loadEditProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(Status.NOT_FOUND4).render("admin/editproduct", {
        product: null,
        categories: [],
        brands: [],
        error: "Product not found",
      });
    }

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    res.render("admin/editproduct", {
      product,
      categories,
      brands,
      error: null,
    });
  } catch (error) {
    console.log("Error loading edit product:", error);
    res.status(Status.INTERNAL_SERVER_ERROR).render("admin/editproduct", {
      product: null,
      categories: [],
      brands: [],
      error: "Server error",
    });
  }
};

// POST Edit Product
const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name,
      description,
      category,
      brand,
      stock,
      regularPrice,
      productOffer,
      existingImages,
      removedImages,
    } = req.body;
    const images = req.files;

    // Basic validation
    if (
      !name ||
      !description ||
      !category ||
      !brand ||
      !stock ||
      !regularPrice
    ) {
      throw new Error("All fields are required");
    }
    if (parseInt(stock) < 0) {
      throw new Error("Stock quantity must be non-negative");
    }
    if (parseFloat(regularPrice) <= 0) {
      throw new Error("Regular price must be positive");
    }

    if (productOffer && (productOffer < 0 || productOffer > 90)) {
      throw new Error("Product offer must be between 0 and 90%");
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Parse existing and removed images
    const existingImagesArray = JSON.parse(existingImages || "[]");
    const removedImagesArray = JSON.parse(removedImages || "[]");

    // Validate image count
    const newImages = images
      ? images.map((file) => ({
          path: path.normalize(file.path).replace(/\\/g, "/"),
          _id: new mongoose.Types.ObjectId(),
        }))
      : [];
    const remainingImages = existingImagesArray.filter(
      (img) => !removedImagesArray.includes(img._id.toString())
    );

    const totalImages = remainingImages.length + newImages.length;
    if (totalImages < 3 || totalImages > 5) {
      throw new Error("Please ensure 3 to 5 images in total");
    }

    // Delete removed images from storage
    for (const imageId of removedImagesArray) {
      const image = product.productImage.find(
        (img) => img._id.toString() === imageId
      );
      if (image && image.path) {
        const imagePath = path.join(
          __dirname,
          "..",
          "uploads",
          "images",
          path.basename(image.path)
        );

        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error(`Failed to delete image ${image.path}:`, err);
          } else {
            console.log(`Deleted image: ${imagePath}`);
          }
        });
      }
    }

    const offer = parseFloat(productOffer) || 0;

    const Pricedetails = await calculateOfferDetails(
      parseFloat(regularPrice),
      offer,
      category
    );
    console.log(Pricedetails);

    const salePrice = Pricedetails.salePrice;
    const discountAmount = parseFloat(regularPrice) - salePrice;
    console.log("Edit Product salePrice", salePrice);

    // Update product
    product.productName = name;
    product.description = description;
    product.category = category;
    product.brand = brand;
    product.stock = parseInt(stock);
    product.regularPrice = parseFloat(regularPrice);
    product.productOffer = parseFloat(productOffer) || 0;
    product.salePrice = salePrice;
    product.productImage = [...remainingImages, ...newImages];
    product.discountAmount = discountAmount;
    product.appliedOfferType = Pricedetails.appliedOfferType;

    await product.save();

    res
      .status(Status.OK)
      .json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(Status.BAD_REQUEST)
      .json({ message: error.message || "Failed to update product" });
  }
};

// const blockProduct = async (req, res) => {
//   try {
//     const id = req.query.id;

//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(Status.BAD_REQUEST).send("Invalid product ID");
//     }

//     const result = await Product.updateOne(
//       { _id: id },
//       { $set: { isBlocked: true } }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(Status.NOT_FOUND4).send("Product not found");
//     }

//     res.redirect("/admin/product");
//   } catch (error) {
//     console.error("Error blocking product:", error);
//     res.status(500).send("Error in blocking product");
//   }
// };

const blockProduct = async (req, res) => {
  try {
    const productId = req.query.id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(Status.BAD_REQUEST).send("Invalid product ID");
    }

    const result = await Product.updateOne(
      { _id: productId },
      { $set: { isBlocked: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(Status.NOT_FOUND).send("Product not found");
    }

    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error blocking product:", error);
    res.status(500).send("Error in blocking product");
  }
};

// const unBlockProduct = async (req, res) => {
//   try {
//     const id = req.query.id;

//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(Status.BAD_REQUEST).send("Invalid product ID");
//     }

//     const result = await Product.updateOne(
//       { _id: id },
//       { $set: { isBlocked: false } }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(Status.NOT_FOUND4).send("Product not found");
//     }

//     res.redirect("/admin/product");
//   } catch (error) {
//     console.error("Error unblocking product:", error);
//     res.status(500).send("Error in unblocking product");
//   }
// };

const unBlockProduct = async (req, res) => {
  try {
    const productId = req.query.id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(Status.BAD_REQUEST).send("Invalid product ID");
    }

    const result = await Product.updateOne(
      { _id: productId },
      { $set: { isBlocked: false } }
    );

    if (result.matchedCount === 0) {
      return res.status(Status.NOT_FOUND).send("Product not found");
    }

    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error unblocking product:", error);
    res.status(Status.INTERNAL_SERVER_ERROR).send("Error in unblocking product");
  }
};


module.exports = {
  loadProductPage,
  loadAddProductPage,
  addProduct,
  editProduct,
  loadEditProduct,
  blockProduct,
  unBlockProduct,
};
