const { Brand } = require("../../models/brandSchema");
const { Product } = require("../../models/productSchema");

const loadBrandPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;
    const query = search ? { brandName: { $regex: search, $options: 'i' } } : {};
    const brandData = await Brand.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalBrand = await Brand.countDocuments(query);
    let totalPages = Math.ceil(totalBrand / limit)|| 1

    res.render("admin/brand", {
      brands: brandData,
      currentPage: page,
      totalPages: totalPages,
      totalBrand: totalBrand,
      search: search,
      limit
    });
  } catch (error) {
    res.send(error.message);
  }
};

const addBrand = async (req, res) => {
  try {
    const brandName = req.body.brandName; ;

    if (!brandName || brandName.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Brand name must be at least 3 characters long." });
    }

    // Check if brand exists already
    const exists = await Brand.findOne({ brandName: brandName });
    if (exists) {
      return res.status(400).json({ error: "Brand name already exists." });
    };

    // In addBrand controller
  if (!req.file) {
  return res.status(400).json({ error: "Brand logo is required" });
  }

    let logoPath = "";
    if (req.file) {
      logoPath = `/uploads/images/${req.file.filename}`;
    }

    const brand = await new Brand({
        brandName,
        brandImage:logoPath,
    })

    await brand.save();
    res.status(201).json({ message: 'Brand created successfully' });
  } catch (err) {

     console.error('Error adding brand:', err);
    res.status(500).json({ error: 'Server error while adding brand' });
  }
};



const changeStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { isBlocked } = req.body;

    // Use findByIdAndUpdate for better reliability
    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      { isBlocked },
      { new: true }
    );

    if (!updatedBrand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating brand status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};




module.exports = {
  loadBrandPage,
  addBrand,
  changeStatus
};
