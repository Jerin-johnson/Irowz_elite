const { User } = require("../../models/userSchema");
const {Wallet} = require("../../models/walletSchema");

const loadWalletPage = async (req, res) => {
  try {
   
    const userId = req.session.user;
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }

    const walletData = {
      balance: wallet.balance.toFixed(2),
      lastUpdated: wallet.updatedOn.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      transactions: wallet.transactions
      .sort((a, b) => b.date - a.date)
       .map((tx) => ({
        type: tx.type,
        amount: tx.amount.toFixed(2),
        reason: tx.reason,
        orderId: tx.orderId || "",
        date: tx.date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        icon: tx.type === "credit" ? (tx.reason === "Cashback Received" ? "gift" : "plus") : "shopping-bag",
      })),
    };


    const user = await User.findById(userId)
    res.render("user/wallet/wallet", { walletData,user});
  } catch (error) {
    console.error("Error fetching wallet page:", error.message);
    res.status(500).render("error", {
      message: "Server error. Please try again later",
    });
  }
};



module.exports ={
    loadWalletPage
}