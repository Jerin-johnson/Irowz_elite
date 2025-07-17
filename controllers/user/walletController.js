const { User } = require("../../models/userSchema");
const {Wallet} = require("../../models/walletSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");

const loadWalletPage = async (req, res) => {
  try {
    const userId = req.session.user;
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const startIndex = (page - 1) * limit;
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);
    const paginatedTransactions = wallet.transactions
      .sort((a, b) => b.date - a.date)
      .slice(startIndex, startIndex + limit)
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
      }));

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
      transactions: paginatedTransactions,
    };

    const user = await User.findById(userId);
    res.render("user/wallet/wallet", { walletData, user, currentPage: page, totalPages });
  } catch (error) {
    console.error("Error fetching wallet page:", error.message);
    res.status(Status.INTERNAL_SERVER_ERROR).render("error", {
      message: "Server error. Please try again later",
    });
  }
};



module.exports ={
    loadWalletPage
}