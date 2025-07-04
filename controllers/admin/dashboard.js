const { Order } = require('../../models/orderSchema');
const { Product } = require('../../models/productSchema');
const { Category } = require('../../models/categorySchema');
const { Brand } = require('../../models/brandSchema');
const { User } = require('../../models/userSchema');

const adminDashboardController = {
  // Main dashboard page
  getDashboard: async (req, res) => {
    try {
      const filter = req.query.filter || 'monthly';
      const refresh = req.query.refresh === 'true';

      // Get basic stats
      const stats = await getBasicStats();
      
      // Get chart data based on filter
      const chartData = await getChartData(filter);
      
      // Get best selling data
      const bestProducts = await getBestSellingProducts();
      const bestCategories = await getBestSellingCategories();
      const bestBrands = await getBestSellingBrands();

      res.render('admin/admindash', {
        stats,
        chartData,
        bestProducts,
        bestCategories,
        bestBrands,
        filter,
        refresh
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).render('admin/error', { 
        message: 'Error loading dashboard',
        error: error.message 
      });
    }
  },

  
  getDashboardAPI: async (req, res) => {
    try {
      const filter = req.query.filter || 'monthly';
      
      const stats = await getBasicStats();
      const chartData = await getChartData(filter);
      
      res.json({
        success: true,
        stats,
        chartData
      });
    } catch (error) {
      console.error('Dashboard API error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// Helper function to get basic statistics
async function getBasicStats() {
  try {
    // Total revenue from delivered orders
    const revenueResult = await Order.aggregate([
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      }
    ]);

    // Total orders count
    const totalOrders = await Order.countDocuments();

    // Total customers (unique users who placed orders)
    const customerResult = await Order.aggregate([
      {
        $group: {
          _id: '$userId'
        }
      },
      {
        $count: 'totalCustomers'
      }
    ]);

    // Total products
    const totalProducts = await Product.countDocuments({ isBlocked: false });

    return {
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      totalOrders,
      totalCustomers: customerResult[0]?.totalCustomers || 0,
      totalProducts
    };
  } catch (error) {
    console.error('Error getting basic stats:', error);
    
  }
}

// Helper function to get chart data based on filter
async function getChartData(filter) {
  try {
    let groupBy, dateFormat, labels = [];
    const now = new Date();
    
    switch (filter) {
      case 'daily':
        // Last 30 days
        groupBy = {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' },
          day: { $dayOfMonth: '$orderDate' }
        };
        dateFormat = 'daily';
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        break;
        
      case 'weekly':
        // Last 12 weeks
        groupBy = {
          year: { $year: '$orderDate' },
          week: { $week: '$orderDate' }
        };
        dateFormat = 'weekly';
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          labels.push(`Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        }
        break;
        
      case 'yearly':
        // Last 5 years
        groupBy = {
          year: { $year: '$orderDate' }
        };
        dateFormat = 'yearly';
        for (let i = 4; i >= 0; i--) {
          labels.push((now.getFullYear() - i).toString());
        }
        break;
        
      default: // monthly
        // Last 12 months
        groupBy = {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' }
        };
        dateFormat = 'monthly';
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }
    }

    const pipeline = [
      {
        $match: {
          'items.status': 'delivered',
          orderDate: {
            $gte: getStartDate(filter, now)
          }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const results = await Order.aggregate(pipeline);
    
    // Map results to chart data
    const data = labels.map(() => 0);
    
    results.forEach(result => {
      let index = -1;
      
      switch (filter) {
        case 'daily':
          const resultDate = new Date(result._id.year, result._id.month - 1, result._id.day);
          const daysDiff = Math.floor((now - resultDate) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0 && daysDiff < 30) {
            index = 29 - daysDiff;
          }
          break;
          
        case 'weekly':
          // Calculate which week this belongs to
          const weekDate = new Date(result._id.year, 0, 1 + (result._id.week - 1) * 7);
          const weeksDiff = Math.floor((now - weekDate) / (1000 * 60 * 60 * 24 * 7));
          if (weeksDiff >= 0 && weeksDiff < 12) {
            index = 11 - weeksDiff;
          }
          break;
          
        case 'yearly':
          const yearsDiff = now.getFullYear() - result._id.year;
          if (yearsDiff >= 0 && yearsDiff < 5) {
            index = 4 - yearsDiff;
          }
          break;
          
        default: // monthly
          const monthsDiff = (now.getFullYear() - result._id.year) * 12 + (now.getMonth() + 1 - result._id.month);
          if (monthsDiff >= 0 && monthsDiff < 12) {
            index = 11 - monthsDiff;
          }
      }
      
      if (index >= 0 && index < data.length) {
        data[index] = result.revenue;
      }
    });

    return { labels, data };
  } catch (error) {
    console.error('Error getting chart data:', error);
    throw error;
  }
}

// Helper function to get start date based on filter
function getStartDate(filter, now) {
  const date = new Date(now);
  
  switch (filter) {
    case 'daily':
      date.setDate(date.getDate() - 30);
      break;
    case 'weekly':
      date.setDate(date.getDate() - (12 * 7));
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() - 5);
      break;
    default: // monthly
      date.setMonth(date.getMonth() - 12);
  }
  
  return date;
}

// Helper function to get best selling products
async function getBestSellingProducts() {
  try {
    const pipeline = [
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: 'product.brand',
          foreignField: '_id',
          as: 'brand'
        }
      },
      {
        $project: {
          _id: 1,
          productName: 1,
          totalSold: 1,
          totalRevenue: 1,
          brandName: { $arrayElemAt: ['$brand.brandName', 0] }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      }
    ];

    return await Order.aggregate(pipeline);
  } catch (error) {
    console.error('Error getting best selling products:', error);
    throw error;
  }
}

// Helper function to get best selling categories
async function getBestSellingCategories() {
  try {
    const pipeline = [
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $group: {
          _id: '$items.category',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          _id: 1,
          categoryName: { $arrayElemAt: ['$category.name', 0] },
          totalSold: 1,
          totalRevenue: 1,
          productCount: { $size: '$products' }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      }
    ];

    return await Order.aggregate(pipeline);
  } catch (error) {
    console.error('Error getting best selling categories:', error);
    throw error;
  }
}

// Helper function to get best selling brands
async function getBestSellingBrands() {
  try {
    const pipeline = [
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $group: {
          _id: '$items.brand',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brand'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'brand',
          as: 'products'
        }
      },
      {
        $project: {
          _id: 1,
          brandName: { $arrayElemAt: ['$brand.brandName', 0] },
          totalSold: 1,
          totalRevenue: 1,
          productCount: { $size: '$products' }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      }
    ];

    return await Order.aggregate(pipeline);
  } catch (error) {
    console.error('Error getting best selling brands:', error);
    throw error;
  }
}

module.exports = adminDashboardController;