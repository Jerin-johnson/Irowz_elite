const{Order}= require("../../models/orderSchema");
const PDFDocument = require("pdfkit")
const ExcelJS = require("exceljs")
const path = require("path")
const fs = require("fs")


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


const loadSalesReportPage = async(req,res)=>{
 try {
    const { period = "daily", startDate, endDate, page = 1 } = req.query
    const limit = 10
    const skip = (page - 1) * limit

    console.log("Sales Report Query:", { period, startDate, endDate, page })

    // Get date filter
    const dateFilter = getDateRange(period, startDate, endDate)
    console.log("Date Filter:", dateFilter)

    // Base query for completed orders only
    const baseQuery = {
      ...dateFilter,
      $or: [{ orderStatus: "delivered" }, { orderStatus: "shipped" }, { orderStatus: "processing" }],
    }

    console.log("Base Query:", JSON.stringify(baseQuery, null, 2))

    // Get orders with pagination
    const orders = await Order.find(baseQuery)
      .populate("userId", "name email fullName")
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    console.log(`Found ${orders.length} orders`)

    const totalOrders = await Order.countDocuments(baseQuery)
    const totalPages = Math.ceil(totalOrders / limit)

    // Calculate comprehensive statistics
    const allOrders = await Order.find(baseQuery).lean()

    const statistics = {
      totalSalesCount: allOrders.length,
      totalOrderAmount: 0,
      totalDiscount: 0,
      totalCouponDiscount: 0,
      totalTax: 0,
      totalShipping: 0,
      totalFinalAmount: 0,
    }

    // Calculate totals manually
    allOrders.forEach((order) => {
      statistics.totalOrderAmount += order.totalAmount || 0
      statistics.totalDiscount += order.discount || 0
      statistics.totalCouponDiscount += order.couponDiscount || 0
      statistics.totalTax += order.tax || 0
      statistics.totalShipping += order.shipping || 0
      statistics.totalFinalAmount += order.finalAmount || 0
    })

    console.log("Statistics:", statistics)

    res.render("admin/salesReport", {
      title: "Sales Report",
      orders,
      statistics,
      currentPage: Number.parseInt(page),
      totalPages,
      totalOrders,
      period,
      startDate,
      endDate,
    })
  } catch (error) {
    console.error("Error generating sales report:", error)
    res.status(500).render("error", { message: "Error generating sales report" })
  }
}


const getSalesReport = async (req, res) => {
  try {
    const { period = "daily", startDate, endDate, page = 1 } = req.query
    const limit = 10
    const skip = (page - 1) * limit

    console.log("Sales Report Query:", { period, startDate, endDate, page })

    // Get date filter
    const dateFilter = getDateRange(period, startDate, endDate)
    console.log("Date Filter:", dateFilter)

    // Base query for completed orders only
    const baseQuery = {
      ...dateFilter,
      $or: [{ orderStatus: "delivered" }, { orderStatus: "shipped" }, { orderStatus: "processing" }],
    }

    console.log("Base Query:", JSON.stringify(baseQuery, null, 2))

    // Get orders with pagination
    const orders = await Order.find(baseQuery)
      .populate("userId", "name email fullName")
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    console.log(`Found ${orders.length} orders`)

    const totalOrders = await Order.countDocuments(baseQuery)
    const totalPages = Math.ceil(totalOrders / limit)

    // Calculate comprehensive statistics
    const allOrders = await Order.find(baseQuery).lean()

    const statistics = {
      totalSalesCount: allOrders.length,
      totalOrderAmount: 0,
      totalDiscount: 0,
      totalCouponDiscount: 0,
      totalTax: 0,
      totalShipping: 0,
      totalFinalAmount: 0,
    }

    // Calculate totals manually for accuracy
    allOrders.forEach((order) => {
      statistics.totalOrderAmount += order.totalAmount || 0
      statistics.totalDiscount += order.discount || 0
      statistics.totalCouponDiscount += order.couponDiscount || 0
      statistics.totalTax += order.tax || 0
      statistics.totalShipping += order.shipping || 0
      statistics.totalFinalAmount += order.finalAmount || 0
    })

    console.log("Statistics:", statistics)

    res.render("admin/sales-report/index", {
      title: "Sales Report",
      orders,
      statistics,
      currentPage: Number.parseInt(page),
      totalPages,
      totalOrders,
      period,
      startDate,
      endDate,
    })
  } catch (error) {
    console.error("Error generating sales report:", error)
    res.status(500).render("error", { message: "Error generating sales report" })
  }
}

const downloadSalesReport = async (req, res) => {
  try {
    const { format, period = "daily", startDate, endDate } = req.query

    console.log("Download request:", { format, period, startDate, endDate })

    // Get date filter
    const dateFilter = getDateRange(period, startDate, endDate)

    const baseQuery = {
      ...dateFilter,
      $or: [{ orderStatus: "delivered" }, { orderStatus: "shipped" }, { orderStatus: "processing" }],
    }

    const orders = await Order.find(baseQuery).populate("userId", "name email fullName").sort({ orderDate: -1 }).lean()

    console.log(`Found ${orders.length} orders for download`)

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

// COMPLETELY REWRITTEN PDF GENERATION - Using Buffer Method
const generatePDF = async (res, orders, statistics, period, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Generating PDF with buffer method...")

      const filename = `sales-report-${period}-${new Date().toISOString().split("T")[0]}.pdf`

      // Create document
      const doc = new PDFDocument({ margin: 50, size: "A4" })

      // Collect PDF data in chunks
      const chunks = []

      doc.on("data", (chunk) => {
        chunks.push(chunk)
      })

      doc.on("end", () => {
        // Combine all chunks into a single buffer
        const pdfBuffer = Buffer.concat(chunks)

        // Set headers and send buffer
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
        res.setHeader("Content-Length", pdfBuffer.length)

        res.send(pdfBuffer)
        resolve()
      })

      doc.on("error", (err) => {
        console.error("PDF generation error:", err)
        reject(err)
      })

      // Generate PDF content
      // Header
      doc.fontSize(24).font("Helvetica-Bold").text("SALES REPORT", { align: "center" })
      doc.moveDown(0.5)

      doc.fontSize(14).font("Helvetica").text(`Period: ${period.toUpperCase()}`, { align: "center" })

      if (period === "custom" && startDate && endDate) {
        doc.text(
          `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
          { align: "center" },
        )
      }

      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" })
      doc.moveDown(2)

      // Summary Statistics
      doc.fontSize(18).font("Helvetica-Bold").text("SUMMARY STATISTICS")
      doc.moveDown(0.5)

      doc.fontSize(12).font("Helvetica")
      const statsY = doc.y

      // Left column
      doc.text(`Total Orders: ${statistics.totalSalesCount}`, 50, statsY)
      doc.text(`Total Order Amount: ₹${statistics.totalOrderAmount.toFixed(2)}`, 50, statsY + 20)
      doc.text(`Product Discounts: ₹${statistics.totalDiscount.toFixed(2)}`, 50, statsY + 40)
      doc.text(`Coupon Discounts: ₹${statistics.totalCouponDiscount.toFixed(2)}`, 50, statsY + 60)

      // Right column
      doc.text(`Tax Collected: ₹${statistics.totalTax.toFixed(2)}`, 300, statsY)
      doc.text(`Shipping Charges: ₹${statistics.totalShipping.toFixed(2)}`, 300, statsY + 20)
      doc.text(`Final Revenue: ₹${statistics.totalFinalAmount.toFixed(2)}`, 300, statsY + 40)

      doc.y = statsY + 100
      doc.moveDown(2)

      // Orders Details
      if (orders.length > 0) {
        doc.fontSize(18).font("Helvetica-Bold").text("ORDER DETAILS")
        doc.moveDown(1)

        doc.fontSize(10).font("Helvetica")
        orders.slice(0, 15).forEach((order, index) => {
          if (doc.y > 700) {
            doc.addPage()
          }

          doc.text(`${index + 1}. Order ID: ${order.orderId}`)
          doc.text(`   Date: ${new Date(order.orderDate).toLocaleDateString()}`)
          doc.text(`   Customer: ${order.userId?.name || order.userId?.fullName || "N/A"}`)
          doc.text(`   Payment: ${order.paymentMethod.toUpperCase()}`)
          doc.text(`   Amount: ₹${order.totalAmount.toFixed(2)} | Final: ₹${order.finalAmount.toFixed(2)}`)
          if (order.couponCode) {
            doc.text(`   Coupon Used: ${order.couponCode}`)
          }
          doc.text(`   Status: ${order.orderStatus.toUpperCase()}`)
          doc.moveDown(0.5)
        })
      }

      // Footer
      doc.fontSize(10).font("Helvetica").text("Thank you for using Irowz Elite Admin Panel!", { align: "center" })

      // Finalize the PDF
      doc.end()
    } catch (error) {
      console.error("Error in PDF generation:", error)
      reject(error)
    }
  })
}

// COMPLETELY REWRITTEN EXCEL GENERATION - Using Buffer Method
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
    downloadSalesReport
}