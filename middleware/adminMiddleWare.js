const {User} = require("../models/userSchema");


const adminAuth = async (req, res, next) => {
  try {
    const adminId = req.session.admin;
    if (!adminId) return res.redirect("/admin/login");

    const admin = await User.findById(adminId).lean();

    if (!admin || !admin.isAdmin) {
         res.redirect("/admin/login");
    }

    next();
  } catch (error) {
    console.error("Error in admin middleware:", error);
    res.status(500).send("Server error in admin authentication");
  }
};


const isAdminLoggedIn = async (req, res, next) => {
    try {
        if (req.session.admin) {
            const admin = await User.findById(req.session.admin);
            if (admin && admin.isAdmin) {
                 next();
            }
        }
         res.redirect("/admin/login");
    } catch (error) {
        console.log("Error in isAdminLoggedIn:", error.message);
        res.redirect("/admin/login");
    }
};

const isAdminLoggedOut = async (req, res, next) => {
    try {
        if (!req.session.admin) return next();

        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
             next();
        }

         res.redirect("/admin/dashboard");
    } catch (error) {
        console.error("Error in isAdminLoggedOut:", error.message);
        res.redirect("/admin/login");
    }
};

module.exports = {
    adminAuth,
    isAdminLoggedIn,
    isAdminLoggedOut
};
