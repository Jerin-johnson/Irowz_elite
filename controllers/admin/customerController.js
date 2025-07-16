const { User } = require("../../models/userSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

const loadCustomer = async (req, res) => {
  try {
    const filter = req.query.filter || "";
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    let query = {
      isAdmin: false,
      $or: [
        { fullName: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };

    if (filter === "unblocked") {
      query.isBlocked = false;
    } else if (filter === "blocked") {
      query.isBlocked = true;
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    // Check if the request is AJAX
    const isAjax = req.headers["x-requested-with"] === "XMLHttpRequest";

    if (isAjax) {
      // Return JSON for AJAX requests
      return res.json({
        users,
        currentPage: page,
        totalPages,
        limit,
        search,
        filter,
      });
    }

    // Render EJS for initial page load
    res.render("admin/customer", {
      users,
      currentPage: page,
      totalPages,
      limit,
      search,
      filter,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// block and unblock the user

const blockUser = async (req, res) => {
  try {
    const userId = req.query.id;

    // Validate userId
    if (!userId) {
      if (req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      return res.status(400).send("User ID is required");
    }

    // Update user to set isBlocked to true
    const result = await User.updateOne(
      { _id: userId },
      { $set: { isBlocked: true } }
    );

    // Check if the user was found and updated
    if (result.modifiedCount === 0) {
      if (req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res
          .status(404)
          .json({ success: false, error: "User not found or already blocked" });
      }
      return res.status(404).send("User not found or already blocked");
    }

    // Handle AJAX request
    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.json({ success: true, message: "User blocked successfully" });
    }

    // Handle non-AJAX request
    res.redirect("/admin/customer");
  } catch (error) {
    console.error("Error blocking user:", error);
    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res
        .status(500)
        .json({ success: false, error: "Server error while blocking user" });
    }
    res.status(500).send("Error in blocking");
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.query.id;

    // Validate userId
    if (!userId) {
      if (req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      return res.status(400).send("User ID is required");
    }

    // Update user to set isBlocked to false
    const result = await User.updateOne(
      { _id: userId },
      { $set: { isBlocked: false } }
    );

    // Check if the user was found and updated
    if (result.modifiedCount === 0) {
      if (req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res
          .status(404)
          .json({
            success: false,
            error: "User not found or already unblocked",
          });
      }
      return res.status(404).send("User not found or already unblocked");
    }

    // Handle AJAX request
    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.json({
        success: true,
        message: "User unblocked successfully",
      });
    }

    // Handle non-AJAX request
    res.redirect("/admin/customer");
  } catch (error) {
    console.error("Error unblocking user:", error);
    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res
        .status(500)
        .json({ success: false, error: "Server error while unblocking user" });
    }
    res.status(500).send("Error in unblocking");
  }
};

module.exports = {
  loadCustomer,
  blockUser,
  unblockUser,
};
