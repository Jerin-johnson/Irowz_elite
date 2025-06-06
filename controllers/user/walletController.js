

const loadWalletPage = async(req,res)=>{

    try {
        res.render("user/wallet/wallet")
    } catch (error) {
        
    }
}

module.exports ={
    loadWalletPage
}