const {getAllProducts}=require("../../models/sampledata")


// For Loading Home page before sign in
const loadLoadingPage = async(req,res)=>{

  try {
    const products = getAllProducts();
    res.render("user/pages/pre-loading",{products});
  } catch (error) {
    
  }
}


// For loading userRegister page

const loadUserRegister = async(req,res)=>{
    try {
        res.render("user/loadingPage")
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Having issues in Loading user Register Page")
    }
}





// For exporting all the function
module.exports ={loadLoadingPage,loadUserRegister}