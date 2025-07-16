const{Order}= require("../../models/orderSchema");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require("path")
const fs = require("fs");
// const { getDashSalesData } = require("../../helpers/calculateStates");


// Helper function to get date ranges
const getDateRange = (period, startDate, endDate) => {
  const now = new Date()
  let dateFilter = {}

  switch (period) {
    case "daily":
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      dateFilter = {
        orderDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }
      break
    case "weekly":
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      dateFilter = {
        orderDate: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      }
      break
    case "monthly":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      dateFilter = {
        orderDate: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      }
      break
    case "yearly":
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      dateFilter = {
        orderDate: {
          $gte: startOfYear,
          $lte: endOfYear,
        },
      }
      break
    case "custom":
      if (startDate && endDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter = {
          orderDate: {
            $gte: start,
            $lte: end,
          },
        }
      }
      break
  }

  return dateFilter
}

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


    console.log(allOrders)
    const statistics = {
      totalSalesCount: allOrders.length,
      totalOrderAmount: allOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0),
      totalDiscount: allOrders.reduce((acc, order) => acc + (order.discount || 0), 0),
      totalCouponDiscount,
      totalShipping: allOrders.reduce((acc, order) => acc + (order.shipping || 0), 0),
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
    res.status(500).render("error", { message: "Error generating sales report" });
  }
};





const downloadSalesReport = async (req, res) => {
  try {
    const { format, period = "daily", startDate, endDate } = req.query

   
    const dateFilter = getDateRange(period, startDate, endDate)

    const baseQuery = {
      ...dateFilter,
      $or: [{ orderStatus: "delivered" }, { orderStatus: "shipped" }, { orderStatus: "processing" }],
    }


    const orders = await Order.find(baseQuery).populate("userId", "name email fullName").sort({ orderDate: -1 }).lean()

    console.log(`Found ${orders} orders for download`)

    // Calculate statistics
    const statistics = {
      totalSalesCount: orders.length,
      totalOrderAmount: 0,
      totalDiscount: 0,
      totalCouponDiscount: 0,
      totalTax: 0,
      totalShipping: 0,
      totalFinalAmount: 0,
    }



   
    orders.forEach((order) => {
      statistics.totalOrderAmount += order.totalAmount || 0
      statistics.totalDiscount += order.discount || 0
      statistics.totalCouponDiscount += order.couponDiscount || 0
      statistics.totalTax += order.tax || 0
      statistics.totalShipping += order.shipping || 0
      statistics.totalFinalAmount += order.finalAmount || 0
    })

    console.log("The format of",format)

    if (format === "pdf") {
      await generatePDF(res, orders, statistics, period, startDate, endDate)
    } else if (format === "excel") {
      await generateExcel(res, orders, statistics, period, startDate, endDate)
    } else {
      res.status(400).json({ success: false, message: "Invalid format" })
    }
  } catch (error) {
    console.error("Error downloading sales report:", error)
    res.status(500).json({ success: false, message: "Error downloading report" })
  }
}





const generatePDF = async (res, orders, statistics, period, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Generating PDF with buffer method...");
      console.log({ orders, statistics, period, startDate, endDate }); // Log input for debugging

      // Validate inputs
      if (!res || !orders || !statistics) {
        throw new Error("Missing required parameters: res, orders, or statistics");
      }

      const filename = `sales-report-${period}-${new Date().toISOString().split("T")[0]}.pdf`;
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const padding = 5; // Define padding globally within the function

      const chunks = [];

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

      // Helper function to draw a table row with borders and text wrapping
      const drawTableRow = (doc, y, values, columnX, columnWidths, isHeader = false) => {
        const rowHeight = 20;
        let maxHeight = rowHeight;

        values.forEach((value, i) => {
          if (value === undefined || value === null) value = "N/A"; // Handle undefined/null values
          const textY = y + padding;

          // Draw cell background for headers
          if (isHeader) {
            doc.rect(columnX[i], y, columnWidths[i], rowHeight)
              .fillOpacity(0.1)
              .fill("#b4883e")
              .fillOpacity(1.0);
          }

          // Draw cell borders
          doc.rect(columnX[i], y, columnWidths[i], rowHeight)
            .strokeColor("#666")
            .lineWidth(0.5)
            .stroke();

          // Draw text with wrapping
          const textOptions = {
            width: columnWidths[i] - 2 * padding,
            align: "left",
          };
          doc.fontSize(10)
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fillColor(isHeader ? "#333" : "black")
            .text(value.toString(), columnX[i] + padding, textY, textOptions);

          // Adjust height if text wraps
          const textHeight = doc.heightOfString(value.toString(), textOptions);
          maxHeight = Math.max(maxHeight, textHeight + 2 * padding);
        });

        return maxHeight; // Return the actual height needed for the row
      };

      // Header
      doc.fontSize(24).font("Helvetica-Bold").text("SALES REPORT", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica").text(`Period: ${period.toUpperCase()}`, { align: "center" });

      if (period === "custom" && startDate && endDate) {
        doc.text(
          `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
          { align: "center" }
        );
      }

      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(2);

      // Summary Statistics Table
      doc.fontSize(18).font("Helvetica-Bold").text("SUMMARY STATISTICS");
      doc.moveDown(1);

      const tableStartY = doc.y;
      const labelX = [50, 300]; // Fixed positions
      const columnWidths = [250, 245]; // Total 495px to fit A4 width

      // Draw table headers
      let rowY = tableStartY;
      rowY += drawTableRow(doc, rowY, ["Metric", "Value"], labelX, columnWidths, true);

      // Draw table rows
      const statRows = [
        ["Total Orders", statistics.totalSalesCount || 0],
        ["Total Order Amount", `₹${(statistics.totalOrderAmount || 0).toFixed(2)}`],
        ["Product Discounts", `₹${(statistics.totalDiscount || 0).toFixed(2)}`],
        ["Coupon Discounts", `₹${(statistics.totalCouponDiscount || 0).toFixed(2)}`],
        ["Tax Collected", `₹${(statistics.totalTax || 0).toFixed(2)}`],
        ["Shipping Charges", `₹${(statistics.totalShipping || 0).toFixed(2)}`],
        ["Final Revenue", `₹${(statistics.totalFinalAmount || 0).toFixed(2)}`],
      ];

      statRows.forEach(([label, value]) => {
        rowY += drawTableRow(doc, rowY, [label, value], labelX, columnWidths);
      });

      doc.y = rowY + 20;

      // Order Details Table
      if (orders.length > 0) {
        doc.fontSize(18).font("Helvetica-Bold").text("ORDER DETAILS");
        doc.moveDown(1);

        const headers = ["#", "Order ID", "Date", "Customer", "Payment", "Total", "Final", "Status"];
        const columnWidths = [30, 80, 70, 100, 60, 50, 50, 55]; // Sum ~495px
        const columnX = [50];
        for (let i = 1; i < headers.length; i++) {
          columnX.push(columnX[i - 1] + columnWidths[i - 1]);
        }

        let y = doc.y;

        // Draw headers
        y += drawTableRow(doc, y, headers, columnX, columnWidths, true);

        orders.slice(0, 15).forEach((order, index) => {
          if (y > 650) { // Threshold for page break
            doc.addPage();
            y = 50;
            y += drawTableRow(doc, y, headers, columnX, columnWidths, true);
          }

          const customer = order.userId?.name || order.userId?.fullName || "N/A";
          const rowData = [
            index + 1,
            order.orderId || "N/A",
            new Date(order.orderDate || Date.now()).toLocaleDateString(),
            customer,
            (order.paymentMethod || "N/A").toUpperCase(),
            `₹${(order.totalAmount || 0).toFixed(2)}`,
            `₹${(order.finalAmount || 0).toFixed(2)}`,
            (order.orderStatus || "N/A").toUpperCase(),
          ];

          y += drawTableRow(doc, y, rowData, columnX, columnWidths);

          // Add coupon info below row if exists
          if (order.couponCode) {
            doc.fontSize(8).fillColor("#555");
            doc.text(`Coupon: ${order.couponCode || "N/A"}`, columnX[1] + padding, y + padding, {
              width: columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] - 2 * padding,
              align: "left",
            });
            y += 15;
            doc.fontSize(10).fillColor("black");
          }
        });

        doc.y = y;
      }

      doc.moveDown(2);
      doc.fontSize(10).font("Helvetica").text("Thank you for using Irowz Elite Admin Panel!", {
        align: "center",
      });

      doc.end();
    } catch (error) {
      console.error("Error in PDF generation:", error);
      reject(error);
    }
  });
};





const generateExcel = async (res, orders, statistics, period, startDate, endDate) => {
  try {
    console.log("Generating Excel with buffer method...")

    const filename = `sales-report-${period}-${new Date().toISOString().split("T")[0]}.xlsx`

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Sales Report")

    // Title and Headers
    worksheet.addRow(["IROWZ ELITE - SALES REPORT"])
    worksheet.addRow([`Period: ${period.toUpperCase()}`])

    if (period === "custom" && startDate && endDate) {
      worksheet.addRow([
        `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
      ])
    }

    worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`])
    worksheet.addRow([]) // Empty row

    // Summary Statistics
    worksheet.addRow(["SUMMARY STATISTICS"])
    worksheet.addRow(["Metric", "Value"])
    worksheet.addRow(["Total Orders", statistics.totalSalesCount])
    worksheet.addRow(["Total Order Amount", statistics.totalOrderAmount])
    worksheet.addRow(["Product Discounts", statistics.totalDiscount])
    worksheet.addRow(["Coupon Discounts", statistics.totalCouponDiscount])
    worksheet.addRow(["Tax Collected", statistics.totalTax])
    worksheet.addRow(["Shipping Charges", statistics.totalShipping])
    worksheet.addRow(["Final Revenue", statistics.totalFinalAmount])

    worksheet.addRow([]) // Empty row

    // Order Details Headers
    worksheet.addRow(["ORDER DETAILS"])
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
    ])

    // Style the header row
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" },
    }

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
      ])
    })

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Set headers and send buffer
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", buffer.length)

    res.send(buffer)
    console.log("Excel generated successfully")
  } catch (error) {
    console.error("Error generating Excel:", error)
    res.status(500).json({ success: false, message: "Error generating Excel" })
  }
}





module.exports={
    loadSalesReportPage,
    downloadSalesReport,
     getDashSalesData
}