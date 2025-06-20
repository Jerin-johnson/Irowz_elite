const { User } = require("../../models/userSchema");
const { Product } = require("../../models/productSchema");
const{Cart}= require("../../models/cartSchema");

const loadProductDetailedPage = async (req, res) => {
    try {
        const pid = req.params.pid;
        console.log(pid);
        const reviews =[];
        const userId = req.session.user;

        // Get user if session exists
        let user = null;
        if (userId) {
           user = await User.findOne({_id:userId,isBlocked:false});
            
        }

        const cart = await Cart.findOne({userId});
        console.log("The product page cart",cart);
        const product = await Product.findById(pid).populate('category').populate("brand");
        if (!product) {
            return res.status(404).render("user/404", { message: "Product not found" });
        }

        const relatedProducts = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 }
        }).limit(4);

        console.log(cart.items.length)
        res.render("user/pd", {
            user,
            product,
            relatedProducts,
            reviews,
            itemCount :cart.items.length
        });
    } catch (error) {
        console.error("Error loading product detail page:", error);
        res.status(500).redirect("/error404")
    }
};



module.exports = { loadProductDetailedPage };
