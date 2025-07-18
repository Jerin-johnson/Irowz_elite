const { Category } = require("../../models/categorySchema");
const { Product } = require("../../models/productSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

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
    res.status(Status.INTERNAL_SERVER_ERROR).send(message.SERVER_ERROR);
  }
};

// const addCategory = async (req, res) => {
//   try {
//     let { name, description } = req.body;

//     const existingCat = await Category.find({});
//     console.log(existingCat);

//     for (let cat of existingCat) {
//       if (cat.name.toLowerCase() === name.toLowerCase()) {
//         return res
//           .status(Status.BAD_REQUEST)
//           .json({ success: false, message: "The cateogroy already exists" });
//       }
//     }

//     const newCat = await new Category({
//       name,
//       description,
//     });
//     await newCat.save();
//     return res
//       .status(Status.CREATED)
//       .json({ message: "Category add successfully" });
//   } catch (error) {
//     return res
//       .status(Status.INTERNAL_SERVER_ERROR)
//       .json({ message: message.SERVER_ERROR });
//   }
// };



const addCategory = async (req, res) => {
  try {
    let { name, description } = req.body;

    // Fetch all existing categories
    const existingCategories = await Category.find({});
    console.log(existingCategories);

    // Check if a category with the same name already exists (case-insensitive)
    for (let category of existingCategories) {
      if (category.name.toLowerCase() === name.toLowerCase()) {
        return res
          .status(Status.BAD_REQUEST)
          .json({ success: false, message: "The category already exists" });
      }
    }

    // Create and save new category
    const newCategory = new Category({ name, description });
    await newCategory.save();

    return res
      .status(Status.CREATED)
      .json({ message: "Category added successfully" });

  } catch (error) {
    return res
      .status(Status.INTERNAL_SERVER_ERROR)
      .json({ message: message.SERVER_ERROR });
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
    let { id: categoryId } = req.query;
    await Category.findByIdAndUpdate(categoryId, { isListed: true });
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error unlisting category:", err);
    res.status(Status.INTERNAL_SERVER_ERROR).send(message.SERVER_ERROR);
  }
};


const unlistCategory = async (req, res) => {
  try {
    let { id: categoryId } = req.query;

    await Category.findByIdAndUpdate(categoryId, { isListed: false });
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error unlisting category:", err);
    res.status(Status.INTERNAL_SERVER_ERROR).send(message.SERVER_ERROR);
  }
};




const loadEditCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;

    const category = await Category.findById(categoryId);
    res.render("admin/editcategory", { category });
  } catch (error) {
    res.send("Error in edit category page");
  }
};


const editCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    const existingCategories = await Category.find({
      _id: { $ne: categoryId },
    });

    for (let category of existingCategories) {
      if (category.name.toLowerCase() === name.toLowerCase()) {
        return res
          .status(Status.BAD_REQUEST)
          .json({ success: false, message: "The category already exists" });
      }
    }

    const update = await Category.findByIdAndUpdate(
      categoryId,
      { name, description },
      { new: true }
    );

    if (update) {
      res.status(Status.CREATED).json({ message: "Successfully added" });
    } else {
      res.status(Status.NOT_FOUND).json({ message: "Category not found" });
    }
  } catch (error) {
    res.send(message.SERVER_ERROR);
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
