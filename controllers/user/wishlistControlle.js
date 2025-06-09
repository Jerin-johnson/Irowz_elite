const { User } = require("../../models/userSchema");
const { Wishlist } = require("../../models/wishListSchema");
const { Product } = require("../../models/productSchema");

const loadWishlistPage = async (req, res) => {
  try {
    const userId = req.session.user;
    
      const wishlist = await Wishlist.findOne({userId:userId }).populate({path:"products.productId",populate:"category"});
      const user = await User.findById(userId);

    console.log(wishlist)

      if(!wishlist)
      {
        return res.status(400).res.render("user/wishlist", {
      wishlistItems: [],
      totalValue: 0,
      inStockCount: 0,
    });
      }

       
    const items = wishlist.products;
  
    const totalValue = wishlist.products.reduce((acc,cur)=>{
        return acc+=(cur.productId.salePrice || 0);
    },0);


    const inStockCount = wishlist.products.filter((val,ind)=>{
        return val.productId.stock >0
    }).length;

    return res.status(200).render("user/wishlist",{
         wishlistItems: items,
      totalValue,
      inStockCount,
      user
    });
   
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};



const addToWishList = async(req,res)=>{
    try {

        const userId = req.session.user;
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if(!product)
        {
            throw new Error("The product doesn't exit");
        }

        let wishlist = await Wishlist.findOne({userId});
        
        if(!wishlist)
        {
            wishlist = new Wishlist({userId,products:[]});
        }

        const checkProduct = await Wishlist.findOne({userId,"products.productId":productId});

        if(checkProduct)
        {
            throw new Error("The product already exists")
        }

        wishlist.products.push({productId})

        await wishlist.save();

        return res.status(200).json({success:true,message:"Added to wishlist"})
        
    } catch (error) {
        console.error(error);
        return res.status(400).json({success:false,message:error.message});
    }
}

const deleteWishlist = async(req,res)=>{
    try {

        const userId = req.session.user;
        const deleted = await Wishlist.findOneAndUpdate({userId},{$set:{products:[]}},
            {new:true});

            if(!deleted)
            {
                return res.status(500).json({success:true,message:"Could not updated...Something went wrong"})
            }

            return res.status(200).json({success:true,message:"wishlist cleared successfully"})
        
    } catch (error) {

        console.error(error);
        return res.status(400).json({success:false,message:error.message});
        
    }
}



module.exports = {
  loadWishlistPage,
  addToWishList,
  deleteWishlist
};
