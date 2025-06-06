const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");


const loadProductDetailedPage = async (req, res) => {
    try {
        const pid = req.params.pid;
        console.log(pid);
        const reviews =[];

        // Get user if session exists
        // let user = null;
        if (req.session.user) {
          const user = await User.findOne({_id:req.session.user,isBlocked:false});
            
        }

        const product = await Product.findById(pid).populate('category').populate("brand");
        if (!product) {
            return res.status(404).render("user/404", { message: "Product not found" });
        }

        const relatedProducts = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 }
        }).limit(4);

        res.render("user/pd", {
            user,
            product,
            relatedProducts,
            reviews
        });
    } catch (error) {
        console.error("Error loading product detail page:", error);
        res.status(500).render("user/500", { message: "Internal Server Error" });
    }
};



module.exports = { loadProductDetailedPage };
