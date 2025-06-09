
const {User} = require("../../models/userSchema");


const loadCartPage = async(req,res)=>{
    try {

        res.render("user/cart");
       
        
    } catch (error) {
        
    }
};

const addToCart = async(req,res)=>{
    try {
        const productId = req.params.id;

        
        
    } catch (error) {
        
    }
}

module.exports={
    loadCartPage,
    addToCart
}