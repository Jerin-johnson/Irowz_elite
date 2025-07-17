const { Order } = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const Status = require("../../utils/status");
const message = require("../../utils/message");
// const { getDashSalesData } = require("../../helpers/calculateStates");

// Helper function to get date ranges
const getDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let dateFilter = {};

  switch (period) {
    case "daily":
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      dateFilter = {
        orderDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      };
      break;
    case "weekly":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      dateFilter = {
        orderDate: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      };
      break;
    case "monthly":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      );
      dateFilter = {
        orderDate: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      };
      break;
    case "yearly":
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      dateFilter = {
        orderDate: {
          $gte: startOfYear,
          $lte: endOfYear,
        },
      };
      break;
    case "custom":
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter = {
          orderDate: {
            $gte: start,
            $lte: end,
          },
        };
      }
      break;
  }

  return dateFilter;
};

// helper function

async function getDashSalesData(dateFilter = {}) {
  try {
    let totalRevune = await Order.aggregate([
      { $match: { ...dateFilter } },
      { $unwind: "$items" },
      { $match: { "items.status": "delivered" } },
      { $group: { _id: null, revenue: { $sum: "$items.totalPrice" } } },
    ]);

    const totalOrders = await Order.countDocuments({
      ...dateFilter,
      $or: [
        { orderStatus: "delivered" },
        { orderStatus: "shipped" },
        { orderStatus: "processing" },
      ],
    });

    const totalRefundAmount = await Order.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: null,
          totalRefundAmount: { $sum: "$totalRefundAmount" },
        },
      },
    ]);

    const totalCouponDiscount = await Order.aggregate([
      { $match: { ...dateFilter } },
      {
        $match: {
          $or: [
            { orderStatus: "delivered" },
            { orderStatus: "shipped" },
            { orderStatus: "processing" },
          ],
        },
      },
      {
        $group: {
          _id: null,
          couponDiscount: { $sum: "$couponDiscount" },
        },
      },
    ]);

    const finalRevune = await Order.aggregate([
      { $match: { ...dateFilter, paymentStatus: "completed" } },
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
          "items.refundStatus": { $nin: ["refunded", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          finalRevenue: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    let couponDis = totalCouponDiscount[0]?.couponDiscount || 0;

    return {
      finalRevune: (finalRevune[0]?.finalRevenue || 0) - couponDis,
      totalRefundAmount: totalRefundAmount[0]?.totalRefundAmount || 0,
      totalCouponDiscount: couponDis,
      totalOrders,
      totalRevune: totalRevune[0]?.revenue || 0,
    };
  } catch (error) {
    console.error(error);
    return {};
  }
}

const loadSalesReportPage = async (req, res) => {
  try {
    const { period = "daily", startDate, endDate, page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    const dateFilter = getDateRange(period, startDate, endDate);

    const baseQuery = {
      ...dateFilter,
      $or: [
        { orderStatus: "delivered" },
        { orderStatus: "shipped" },
        { orderStatus: "processing" },
      ],
    };

    const {
      finalRevune,
      totalRefundAmount,
      totalCouponDiscount,
      totalOrders,
      totalRevune,
    } = await getDashSalesData(dateFilter);

    const orders = await Order.find(baseQuery)
      .populate("userId", "name email fullName")
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalAfterFilterOrders = await Order.countDocuments(baseQuery);
    const totalPages = Math.ceil(totalAfterFilterOrders / limit);

    const allOrders = await Order.find(baseQuery).lean();

    console.log(allOrders);
    const statistics = {
      totalSalesCount: allOrders.length,
      totalOrderAmount: allOrders.reduce(
        (acc, order) => acc + (order.totalAmount || 0),
        0
      ),
      totalDiscount: allOrders.reduce(
        (acc, order) => acc + (order.discount || 0),
        0
      ),
      totalCouponDiscount,
      totalShipping: allOrders.reduce(
        (acc, order) => acc + (order.shipping || 0),
        0
      ),
      totalFinalAmount: finalRevune,
    };

    res.render("admin/salesReport", {
      title: "Sales Report",
      orders,
      statistics,
      currentPage: parseInt(page),
      totalPages,
      totalOrders: totalAfterFilterOrders,
      period,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error generating sales report:", error);
    res
      .status(Status.INTERNAL_SERVER_ERROR)
      .render("error", { message: "Error generating sales report" });
  }
};

const downloadSalesReport = async (req, res) => {
  try {
    const { format, period = "daily", startDate, endDate } = req.query;

    const dateFilter = getDateRange(period, startDate, endDate);

    const baseQuery = {
      ...dateFilter,
      $or: [
        { orderStatus: "delivered" },
        { orderStatus: "shipped" },
        { orderStatus: "processing" },
      ],
    };

    const orders = await Order.find(baseQuery)
      .populate("userId", "name email fullName")
      .sort({ orderDate: -1 })
      .lean();

    console.log(`Found ${orders} orders for download`);

    // Calculate statistics
    const statistics = {
      totalSalesCount: orders.length,
      totalOrderAmount: 0,
      totalDiscount: 0,
      totalCouponDiscount: 0,
      totalTax: 0,
      totalShipping: 0,
      totalFinalAmount: 0,
    };

    orders.forEach((order) => {
      statistics.totalOrderAmount += order.totalAmount || 0;
      statistics.totalDiscount += order.discount || 0;
      statistics.totalCouponDiscount += order.couponDiscount || 0;
      statistics.totalTax += order.tax || 0;
      statistics.totalShipping += order.shipping || 0;
      statistics.totalFinalAmount += order.finalAmount || 0;
    });

    console.log("The format of", format);

    if (format === "pdf") {
      await generatePDF(res, orders, statistics, period, startDate, endDate,dateFilter);
    } else if (format === "excel") {
      await generateExcel(res, orders, statistics, period, startDate, endDate);
    } else {
      res.status(Status.BAD_REQUEST).json({ success: false, message: "Invalid format" });
    }
  } catch (error) {
    console.error("Error downloading sales report:", error);
    res
      .status(Status.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error downloading report" });
  }
};



const generatePDF = async (
  res,
  orders,
  statistics,
  period,
  startDate,
  endDate,
  dateFilter
) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Generating professional sales report PDF...");
      console.log({ orders, statistics, period, startDate, endDate });

      // Validate inputs
      if (!res || !orders || !statistics) {
        throw new Error("Missing required parameters: res, orders, or statistics");
      }

      const filename = `sales-report-${period}-${new Date().toISOString().split("T")[0]}.pdf`;
      const doc = new PDFDocument({ 
        margin: 50, 
        size: "A4",
        info: {
          Title: `Sales Report - ${period.toUpperCase()}`,
          Author: 'Irowz Elite',
          Subject: 'Sales Report',
          Keywords: 'sales, report, analytics, orders'
        }
      });

      const chunks = [];

      
      let {finalRevune,
      totalRefundAmount,
      totalCouponDiscount,
      totalOrders,
      totalRevune,
    } = await getDashSalesData(dateFilter);

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);
        resolve();
      });
      doc.on("error", (err) => {
        console.error("PDF generation error:", err);
        reject(err);
      });

      // Color scheme
      const colors = {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#f8fafc',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        dark: '#1e293b',
        light: '#f1f5f9'
      };

      // Helper function to draw rounded rectangle
      const drawRoundedRect = (x, y, width, height, radius = 5) => {
        doc.roundedRect(x, y, width, height, radius);
      };

      // Helper function to format currency
      const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      // Helper function to format date
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      };

      // Helper function to get status color
      const getStatusColor = (status) => {
        const statusColors = {
          'delivered': colors.success,
          'shipped': colors.primary,
          'processing': colors.warning,
          'cancelled': colors.danger,
          'returned': colors.secondary,
          'pending': colors.warning
        };
        return statusColors[status?.toLowerCase()] || colors.secondary;
      };

      // Enhanced table drawing function
      const drawEnhancedTable = (headers, data, startY, options = {}) => {
        const {
          columnWidths = headers.map(() => 70),
          headerHeight = 30,
          rowHeight = 25,
          headerBgColor = colors.primary,
          alternateRowColor = colors.light,
          fontSize = 10,
          headerFontSize = 11
        } = options;

        let currentY = startY;
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const startX = (595 - tableWidth) / 2; // Center table on page

        // Calculate column X positions
        const columnX = [startX];
        for (let i = 1; i < headers.length; i++) {
          columnX.push(columnX[i - 1] + columnWidths[i - 1]);
        }

        // Draw table header
        doc.fillColor(headerBgColor);
        drawRoundedRect(startX, currentY, tableWidth, headerHeight, 5);
        doc.fill();

        // Header text
        doc.fillColor('#ffffff')
           .fontSize(headerFontSize)
           .font('Helvetica-Bold');

        headers.forEach((header, i) => {
          const textY = currentY + (headerHeight - headerFontSize) / 2;
          doc.text(header, columnX[i] + 8, textY, {
            width: columnWidths[i] - 16,
            align: 'center'
          });
        });

        currentY += headerHeight;

        // Draw data rows
        data.forEach((row, rowIndex) => {
          // Check for page break
          if (currentY > 700) {
            doc.addPage();
            currentY = 80;
            
            // Redraw header on new page
            doc.fillColor(headerBgColor);
            drawRoundedRect(startX, currentY, tableWidth, headerHeight, 5);
            doc.fill();

            doc.fillColor('#ffffff')
               .fontSize(headerFontSize)
               .font('Helvetica-Bold');

            headers.forEach((header, i) => {
              const textY = currentY + (headerHeight - headerFontSize) / 2;
              doc.text(header, columnX[i] + 8, textY, {
                width: columnWidths[i] - 16,
                align: 'center'
              });
            });

            currentY += headerHeight;
          }

          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc.fillColor(alternateRowColor);
            doc.rect(startX, currentY, tableWidth, rowHeight).fill();
          }

          // Row border
          doc.strokeColor('#e2e8f0')
             .lineWidth(0.5)
             .rect(startX, currentY, tableWidth, rowHeight)
             .stroke();

          // Row text
          doc.fillColor(colors.dark)
             .fontSize(fontSize)
             .font('Helvetica');

          row.forEach((cell, cellIndex) => {
            const textY = currentY + (rowHeight - fontSize) / 2;
            const cellValue = cell?.toString() || 'N/A';
            
            // Special formatting for certain columns
            const align = cellIndex === 0 ? 'center' : 
                         (cellIndex >= headers.length - 3 ? 'right' : 'left');
            
            doc.text(cellValue, columnX[cellIndex] + 8, textY, {
              width: columnWidths[cellIndex] - 16,
              align: align,
              ellipsis: true
            });
          });

          currentY += rowHeight;
        });

        return currentY;
      };

      // Page Header with Company Branding
      const drawPageHeader = () => {
        // Header background
        doc.fillColor(colors.primary);
        drawRoundedRect(50, 50, 495, 70, 10);
        doc.fill();

        // Company name
        doc.fillColor('#ffffff')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('IROWZ ELITE', 70, 75);

        // Subtitle
        doc.fontSize(12)
           .font('Helvetica')
           .text('Business Intelligence & Analytics', 70, 105);

        // Date and time
        doc.fontSize(10)
           .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 400, 85);
      };

      // Draw main header
      drawPageHeader();

      // Report Title Section
      let yPosition = 150;
      
      doc.fillColor(colors.accent);
      drawRoundedRect(50, yPosition, 495, 80, 8);
      doc.fill();

      doc.fillColor(colors.dark)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('SALES REPORT', 70, yPosition + 20);

      doc.fontSize(14)
         .font('Helvetica')
         .text(`Period: ${period.toUpperCase()}`, 70, yPosition + 50);

      if (period === "custom" && startDate && endDate) {
        doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, 350, yPosition + 20);
      }

      doc.text(`Total Orders: ${orders.length}`, 350, yPosition + 50);

      yPosition += 100;

      // Key Metrics Cards
      const metrics = [
        { 
          label: 'Total Revenue', 
          value: formatCurrency(finalRevune || 0), 
          color: colors.success 
        },
        { 
          label: 'Total Orders', 
          value: (statistics.totalSalesCount || 0).toString(), 
          color: colors.primary 
        },
        { 
          label: 'Avg Order Value', 
          value: formatCurrency((finalRevune || 0) / (statistics.totalSalesCount || 1)), 
          color: colors.warning 
        },
        { 
          label: 'Total Discounts', 
          value: formatCurrency((statistics.totalDiscount || 0) + (statistics.totalCouponDiscount || 0)), 
          color: colors.danger 
        }
      ];

      const cardWidth = 110;
      const cardHeight = 60;
      const cardSpacing = 15;
      const startXCards = (595 - (4 * cardWidth + 3 * cardSpacing)) / 2;

      metrics.forEach((metric, index) => {
        const cardX = startXCards + index * (cardWidth + cardSpacing);
        
        // Card background
        doc.fillColor(metric.color);
        drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 8);
        doc.fill();

        // Card text
        doc.fillColor('#ffffff')
           .fontSize(10)
           .font('Helvetica')
           .text(metric.label, cardX + 8, yPosition + 10, {
             width: cardWidth - 16,
             align: 'center'
           });

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(metric.value, cardX + 8, yPosition + 30, {
             width: cardWidth - 16,
             align: 'center'
           });
      });

      yPosition += 90;

      // Detailed Statistics Table
      doc.fillColor(colors.dark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('FINANCIAL BREAKDOWN', 70, yPosition);

      yPosition += 30;

      const statsData = [
        ['Total Order Amount', formatCurrency(totalOrders || 0)],
        ['Product Discounts', formatCurrency(statistics.totalDiscount || 0)],
        ['Coupon Discounts', formatCurrency(totalCouponDiscount || 0)],
        ['Tax Collected', formatCurrency(statistics.totalTax || 0)],
        ['Shipping Charges', formatCurrency(statistics.totalShipping || 0)],
        ['Final Revenue', formatCurrency(finalRevune || 0)]
      ];

      yPosition = drawEnhancedTable(
        ['Metric', 'Amount'],
        statsData,
        yPosition,
        {
          columnWidths: [300, 195],
          headerHeight: 35,
          rowHeight: 30,
          fontSize: 12,
          headerFontSize: 13
        }
      );

      // Order Details Section
      if (orders.length > 0) {
        yPosition += 40;

        // Check if we need a new page
        if (yPosition > 600) {
          doc.addPage();
          yPosition = 80;
        }

        doc.fillColor(colors.dark)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('ORDER DETAILS', 70, yPosition);

        yPosition += 30;

        const headers = ['#', 'Order ID', 'Date', 'Customer', 'Payment', 'Items', 'Total', 'Status'];
        const orderData = orders.slice(0, 20).map((order, index) => [
          (index + 1).toString(),
          order.orderId?.substring(0, 8) + '...' || 'N/A',
          formatDate(order.orderDate),
          order.userId?.fullName || order.userId?.name || 'N/A',
          (order.paymentMethod || 'N/A').toUpperCase(),
          order.items?.length?.toString() || '0',
          formatCurrency(order.finalAmount || 0),
          (order.orderStatus || 'N/A').toUpperCase()
        ]);

        yPosition = drawEnhancedTable(
          headers,
          orderData,
          yPosition,
          {
            columnWidths: [30, 70, 60, 100, 60, 40, 70, 65],
            headerHeight: 35,
            rowHeight: 28,
            fontSize: 9,
            headerFontSize: 10
          }
        );

        // Payment Method Distribution
        if (yPosition < 600) {
          yPosition += 30;
          
          doc.fillColor(colors.dark)
             .fontSize(16)
             .font('Helvetica-Bold')
             .text('PAYMENT METHOD DISTRIBUTION', 70, yPosition);

          yPosition += 20;

          const paymentMethods = orders.reduce((acc, order) => {
            const method = order.paymentMethod || 'unknown';
            acc[method] = (acc[method] || 0) + 1;
            return acc;
          }, {});

          Object.entries(paymentMethods).forEach(([method, count]) => {
            const percentage = ((count / orders.length) * 100).toFixed(1);
            doc.fillColor(colors.secondary)
               .fontSize(12)
               .font('Helvetica')
               .text(`${method.toUpperCase()}: ${count} orders (${percentage}%)`, 70, yPosition);
            yPosition += 20;
          });
        }
      }

      // Footer
      const footerY = 750;
      doc.fillColor(colors.accent);
      drawRoundedRect(50, footerY, 495, 50, 8);
      doc.fill();

      doc.fillColor(colors.dark)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Thank you for using Irowz Elite Admin Panel!', 70, footerY + 15);

      doc.fontSize(10)
         .font('Helvetica')
         .text('For support, contact: admin@irowzelite.com', 70, footerY + 32);

      // Add watermark
      doc.fillColor('#f0f0f0')
         .fontSize(60)
         .font('Helvetica-Bold')
         .opacity(0.1)
         .text('CONFIDENTIAL', 200, 400, { rotate: 45 });

      doc.end();
    } catch (error) {
      console.error("Error in PDF generation:", error);
      reject(error);
    }
  });
};


const generateExcel = async (
  res,
  orders,
  statistics,
  period,
  startDate,
  endDate
) => {
  try {
    console.log("Generating Excel with buffer method...");

    const filename = `sales-report-${period}-${new Date().toISOString().split("T")[0]}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Title and Headers
    worksheet.addRow(["IROWZ ELITE - SALES REPORT"]);
    worksheet.addRow([`Period: ${period.toUpperCase()}`]);

    if (period === "custom" && startDate && endDate) {
      worksheet.addRow([
        `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
      ]);
    }

    worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
    worksheet.addRow([]); // Empty row

    // Summary Statistics
    worksheet.addRow(["SUMMARY STATISTICS"]);
    worksheet.addRow(["Metric", "Value"]);
    worksheet.addRow(["Total Orders", statistics.totalSalesCount]);
    worksheet.addRow(["Total Order Amount", statistics.totalOrderAmount]);
    worksheet.addRow(["Product Discounts", statistics.totalDiscount]);
    worksheet.addRow(["Coupon Discounts", statistics.totalCouponDiscount]);
    worksheet.addRow(["Tax Collected", statistics.totalTax]);
    worksheet.addRow(["Shipping Charges", statistics.totalShipping]);
    worksheet.addRow(["Final Revenue", statistics.totalFinalAmount]);

    worksheet.addRow([]); // Empty row

    // Order Details Headers
    worksheet.addRow(["ORDER DETAILS"]);
    const headerRow = worksheet.addRow([
      "S.No",
      "Order ID",
      "Date",
      "Customer Name",
      "Customer Email",
      "Payment Method",
      "Order Amount",
      "Product Discount",
      "Coupon Code",
      "Coupon Discount",
      "Tax",
      "Shipping",
      "Final Amount",
      "Status",
    ]);

    // Style the header row
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" },
    };

    // Order Data
    orders.forEach((order, index) => {
      worksheet.addRow([
        index + 1,
        order.orderId,
        new Date(order.orderDate).toLocaleDateString(),
        order.userId?.name || order.userId?.fullName || "N/A",
        order.userId?.email || "N/A",
        order.paymentMethod.toUpperCase(),
        order.totalAmount,
        order.discount,
        order.couponCode || "N/A",
        order.couponDiscount,
        order.tax,
        order.shipping,
        order.finalAmount,
        order.orderStatus.toUpperCase(),
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers and send buffer
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
    console.log("Excel generated successfully");
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error generating Excel" });
  }
};

module.exports = {
  loadSalesReportPage,
  downloadSalesReport,
  getDashSalesData,
};
