const { Category } = require("../../models/categorySchema");
const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const { Brand } = require("../../models/brandSchema");
const mongoose = require("mongoose");
const fs = require("fs");
const sharp = require("sharp");
const path = require("path");

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

    // console.log("To check what comes after populated", products);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit) || 1;
    const categories = await Category.find({ isListed: true });

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
    res.status(500).send("Server Error");
  }
};

const loadAddProductPage = async (req, res) => {
  try {
    const cat = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    res.render("admin/addproducts", {
      categories: cat,
      brands,
    });
  } catch (error) {
    console.error(err);
    res.status(500).send("Server Error");
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
      salePrice,
    } = req.body;
    const images = req.files;
    console.log("req.body of add product page", req.body);

    const existProduct = await Product.findOne({ productName: name });

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

    const imageData = images.map((file, index) => ({
      path: file.path.replace(/\\/g, "/"),
    }));

    // Create and save product
    const product = new Product({
      productName: name,
      description,
      category,
      brand,
      quantity: parseFloat(stock),
      stock: parseInt(stock),
      regularPrice: parseFloat(regularPrice),
      salePrice: parseFloat(salePrice),
      productImage: imageData,
      status: "Available",
    });

    await product.save();

    // Return success response
    res
      .status(200)
      .json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message || "Failed to add product" });
  }
};

// GET Edit Product Page
const loadEditProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).render("admin/editProduct", {
        product: null,
        categories: [],
        brands: [],
        error: "Product not found",
      });
    }

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    res.render("admin/editProduct", {
      product,
      categories,
      brands,
      error: null,
    });
  } catch (error) {
    console.error("Error loading edit product:", error);
    res.status(500).render("admin/editProduct", {
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
      salePrice,
      existingImages,
      removedImages,
    } = req.body;
    const images = req.files;
    console.log(req.files)

    // Basic validation
    if (
      !name ||
      !description ||
      !category ||
      !brand ||
      !stock ||
      !regularPrice ||
      !salePrice
    ) {
      throw new Error("All fields are required");
    }
    if (parseInt(stock) < 0) {
      throw new Error("Stock quantity must be non-negative");
    }
    if (parseFloat(regularPrice) <= 0) {
      throw new Error("Regular price must be positive");
    }
    if (parseFloat(salePrice) <= 0) {
      throw new Error("Sale price must be positive");
    }
    if (parseFloat(salePrice) > parseFloat(regularPrice)) {
      throw new Error("Sale price must not exceed regular price");
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

    // Update product
    product.productName = name;
    product.description = description;
    product.category = category;
    product.brand = brand;
    product.stock = parseInt(stock);
    product.regularPrice = parseFloat(regularPrice);
    product.salePrice = parseFloat(salePrice);
    product.productImage = [...remainingImages, ...newImages];

    await product.save();

    res
      .status(200)
      .json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to update product" });
  }
};

const blockProduct = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid product ID");
    }

    const result = await Product.updateOne(
      { _id: id },
      { $set: { isBlocked: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("Product not found");
    }

    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error blocking product:", error);
    res.status(500).send("Error in blocking product");
  }
};

const unBlockProduct = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid product ID");
    }

    const result = await Product.updateOne(
      { _id: id },
      { $set: { isBlocked: false } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("Product not found");
    }

    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error unblocking product:", error);
    res.status(500).send("Error in unblocking product");
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
