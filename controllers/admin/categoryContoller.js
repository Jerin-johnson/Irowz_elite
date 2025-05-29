const { Category } = require("../../models/categorySchema");
//  const { User } = require("../../models/userSchema");

const loadCategory = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const query = {};

    // Search by name or description (case-insensitive)
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/category", {
      categories,
      currentPage: page,
      totalPages,
      limit,
      search,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Server Error");
  }
};

const addCategory = async (req, res) => {
  try {
    let { name, description } = req.body;

    const existingCat = await Category.findOne({ name });
    if (existingCat) {
      return res.status(401).json({ message: "The Category already exist" });
    }

    const newCat = await new Category({
      name,
      description,
    });
    await newCat.save();
    return res.status(201).json({ message: "Category add successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const loadAddCategory = (req, res) => {
  try {
    return res.render("admin/addcategory");
  } catch (error) {
    return res.send("Error in loading add category");
  }
};

const listCategory = async (req, res) => {
  try {
    let { id } = req.query;

    await Category.findByIdAndUpdate(id, { isListed: true });
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error unlisting category:", err);
    res.status(500).send("Internal Server Error");
  }
};

const unlistCategory = async (req, res) => {
  try {
    let { id } = req.query;

    await Category.findByIdAndUpdate(id, { isListed: false });
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error unlisting category:", err);
    res.status(500).send("Internal Server Error");
  }
};

const loadEditCategory = async (req, res) => {
  try {
    const id = req.query.id;

    const category = await Category.findById(id);
    res.render("admin/editcategory", { category });
  } catch (error) {
    res.send("Error in edit category page");
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;
    const existCat = await Category.findOne({
      name: name,
      _id: { $ne: id },
    });

    if (existCat) {
      return res.status(400).json({ message: "Category already exist" });
    }

    const update = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (update) {
      res.status(200).json({ message: "Successfully added" });
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (error) {
    res.send("Something wrong in edit category");
  }
};




module.exports = {
  loadCategory,
  addCategory,
  loadAddCategory,
  listCategory,
  unlistCategory,
  loadEditCategory,
  editCategory,
};
