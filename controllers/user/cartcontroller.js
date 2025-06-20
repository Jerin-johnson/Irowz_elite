const { Product } = require("../../models/productSchema");
const { User } = require("../../models/userSchema");
const { Category } = require("../../models/categorySchema");
const { Cart } = require("../../models/cartSchema");
const { Wishlist } = require("../../models/wishListSchema");

//  helper functions
const {calculateDiscount,calculateTax} = require("../../helpers/helper")



const loadCartPage = async (req, res) => {
  try {
    const userId = req.session.user;
    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: "category",
    });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    const user = await User.findById(req.session.user);

    //  Filter out blocked or unavailable products
    console.log(cart.items);
    cart.items = cart.items.filter((item) => {
      const product = item.productId;
      return (
        product &&
        !product.isBlocked &&
        product.category &&
        product.category.isListed === true &&
        product.status?.toLowerCase() !== "out of stock"
      );
    });

    console.log("FilterProduct = ", cart.items);

    let subtotal = 0;
    cart.items.forEach((item) => {
      const product = item.productId;
      const price = product.salePrice ;
      const quantity = item.quantity || 1;
      item.price = price;
      item.totalPrice = price * quantity;
      subtotal += item.totalPrice;
    });

    console.log(subtotal)

    const discount = calculateDiscount(subtotal);
    const tax = calculateTax(subtotal - discount);
    const shipping = subtotal >= 1000 ? 0 : 50; // Free shipping above 1000
    const total = subtotal - discount + tax + shipping;

    //     // Render the cart page with all values
    res.render("user/cart", {
      user,
      cart,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      itemCount: cart.items.length,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).render("error", { message: "Error loading cart" });
  }
};

const maxProductLimit =10;

const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user;

    const product = await Product.findById(productId).populate("category");

    if (!product) {
      throw new Error("Product Not Found");
    }

    if (
      product.isBlocked ||
      (product.category && product.category.isListed === false)
    ) {
      throw new Error("The product is currently unavailable");
    }

    if(product.stock <= 0)
    {
      throw new Error("The product is currently out of stock")
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
      await cart.save();
    }

    const isProductExitIndex = cart.items.findIndex((product) => {
      return product.productId.toString() === productId;
    });

    

    if (isProductExitIndex >= 0) {
      const newOty = cart.items[isProductExitIndex].quantity + 1;
      if(maxProductLimit < newOty)
      {
        throw new Error("Maxium limit has reached");
      }
      if (newOty >= product.stock) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }
      cart.items[isProductExitIndex].quantity = newOty;
      cart.items[isProductExitIndex].totalPrice = newOty * product.salePrice;
    } else {
      cart.items.push({
        productId,
        totalPrice: product.salePrice,
        price: product.salePrice,
        quantity: 1,
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "product added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const updateCartQuantity = async(req,res)=>{
  try {

    const {quantity,productId}=req.body;
    const userId = req.session.user;

    console.log(quantity,productId);

    const product = await Product.findById(productId);
    

    if(product.isBlocked || product.stock<=0)
    {
      throw new Error("The product is currently unavailable")
    }
   
    if(product.stock<quantity)
    {
      throw new Error(`Only ${product.stock} is left`)
    }

    let cart = await Cart.findOne({userId,"items.productId":productId});

    if(!cart)
    {
      throw new Error("Product doesn't exit in the cart");
    }
    
     const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

     if(maxProductLimit<Number(quantity))
     {
      throw new Error("Maxium quantity limit is reached");
     };
    
     if(itemIndex === -1)
     {
      throw new Error("Product not found in the cart");
     };

     console.log("Check whether what comes c",product);

     cart.items[itemIndex].quantity = quantity;
     cart.items[itemIndex].price = product.salePrice;
     cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity *  cart.items[itemIndex].price;

     await cart.save();

    

 
      // Calculate all totals 
        let subtotal = 0
       cart.items.forEach((item) => {
        subtotal += item.totalPrice
      });

     const discount = calculateDiscount(subtotal);
     const tax = calculateTax(subtotal - discount);
     const shipping = subtotal >= 1000 ? 0 : 50; // Free shipping above 1000
      const total = subtotal - discount + tax + shipping;

     res.json({
      success: true,      
       message: "Quantity updated successfully",
      itemTotal: cart.items[itemIndex].totalPrice.toFixed(2),
      subtotal: subtotal.toFixed(2),
       discount: discount.toFixed(2),
       tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      itemCount: cart.items.length
     })
     
  } catch (error) {
    console.error(error.message);
    return res.status(404).json({success:true,message:error.message});
    
  }
}

const deleteCartItem = async(req,res)=>{
  try {

    const productId = req.body.productId;
    const userId = req.session.user;

    const user = await User.findById(userId);

    if(!user)
    {
      throw new Error("User Not Found");
    }

    let cart = await Cart.findOne({userId});

    cart.items = cart.items.filter((val)=>{
      return val.productId.toString() !== productId
    })

    await cart.save();

    res.status(200).json({success:true,message:"Deleted Successfully"})
    
  } catch (error) {
    console.error(error);
    return res.status(400).json({success:false,message:error.message})
    
  }
}

const clearCart = async(req,res)=>{
  try {
    const userId = req.session.user;
    if(!userId)
    {
      throw new Error("Invalid Request")
    };

    const cart = await Cart.findOneAndUpdate({userId:userId},{$set:{items:[]}});

    await cart.save();

    return res.status(200).json({success:true,message:"Cleared Successfully"})

    
  } catch (error) {

    console.error(error.message);
    return res.status(404).json({success:false,message:error.message})
    
  }
}

module.exports = {
  loadCartPage,
  addToCart,
  updateCartQuantity,
  deleteCartItem,
  clearCart
};
