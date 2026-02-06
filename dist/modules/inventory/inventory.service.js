import Product from "./models/product.model.js";
import Batch from "./models/batch.model.js";
import StockMovement from "./models/stockMovement.model.js";
import { Types } from "mongoose";
/**
 * Find product by barcode
 */
export const findProductByBarcode = async (barcode) => {
    return Product.findOne({ barcode });
};
/**
 * Get FEFO-sorted batches for POS sales
 */
export const getAvailableBatchesFEFO = async (productId, branchId) => {
    return Batch.find({
        productId,
        branchId,
        quantity: { $gt: 0 },
        expiryDate: { $gt: new Date() }
    }).sort({ expiryDate: 1 });
};
/**
 * Stock-in product (create product if not exists)
 */
export const stockInProductService = async ({ barcode, name, category, manufacturer, batchNumber, expiryDate, quantity, costPrice, sellingPrice, supplier, reorderLevel, location, createdBy, branchId, userName }) => {
    if (expiryDate <= new Date()) {
        throw new Error("Expired batch not allowed");
    }
    let product = await Product.findOne({ barcode });
    let isNewProduct = false;
    if (!product) {
        isNewProduct = true;
        product = await Product.create({
            name,
            barcode,
            category,
            manufacturer,
            reorderLevel: reorderLevel || 10,
            location,
            createdBy
        });
    }
    const batch = await Batch.create({
        productId: product._id,
        batchNumber,
        expiryDate,
        quantity,
        costPrice,
        sellingPrice,
        supplier,
        branchId
    });
    // Record stock movement
    await StockMovement.create({
        productId: product._id,
        productName: product.name,
        batchId: batch._id,
        batchNumber,
        type: "in",
        quantity,
        newQuantity: quantity,
        costPrice,
        sellingPrice,
        reason: isNewProduct ? "New product stock-in" : "Restock",
        branchId,
        performedBy: userName,
        performedById: createdBy
    });
    return { product, batch };
};
/**
 * Deduct stock using FEFO logic (used during sales)
 */
export const deductStockFEFO = async ({ productId, productName, quantity, branchId, saleId, userId, userName }) => {
    const batches = await getAvailableBatchesFEFO(productId, branchId);
    let remaining = quantity;
    for (const batch of batches) {
        if (remaining <= 0)
            break;
        const previousQty = batch.quantity;
        const usedQty = Math.min(batch.quantity, remaining);
        batch.quantity -= usedQty;
        remaining -= usedQty;
        await batch.save();
        // Record stock movement for each batch affected
        await StockMovement.create({
            productId,
            productName,
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            type: "sale",
            quantity: usedQty,
            previousQuantity: previousQty,
            newQuantity: batch.quantity,
            sellingPrice: batch.sellingPrice,
            reason: "POS Sale",
            reference: saleId?.toString(),
            branchId,
            performedBy: userName,
            performedById: userId
        });
    }
    if (remaining > 0) {
        throw new Error("Insufficient stock");
    }
};
/**
 * Inventory summary (aggregated per product) - Enhanced version
 */
export const getInventorySummary = async (branchId) => {
    return Batch.aggregate([
        {
            $match: { branchId }
        },
        {
            $group: {
                _id: "$productId",
                quantity: { $sum: "$quantity" },
                nearestExpiry: { $min: "$expiryDate" },
                totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
                totalSellingValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
                avgCostPrice: { $avg: "$costPrice" },
                avgSellingPrice: { $avg: "$sellingPrice" },
                batches: {
                    $push: {
                        _id: "$_id",
                        batchNumber: "$batchNumber",
                        expiryDate: "$expiryDate",
                        quantity: "$quantity",
                        costPrice: "$costPrice",
                        sellingPrice: "$sellingPrice"
                    }
                }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $project: {
                _id: "$product._id",
                barcode: "$product.barcode",
                name: "$product.name",
                category: "$product.category",
                manufacturer: "$product.manufacturer",
                reorderLevel: { $ifNull: ["$product.reorderLevel", 10] },
                location: "$product.location",
                status: { $ifNull: ["$product.status", "active"] },
                quantity: 1,
                expiryDate: "$nearestExpiry",
                costPrice: "$avgCostPrice",
                sellingPrice: "$avgSellingPrice",
                totalCostValue: 1,
                totalSellingValue: 1,
                batches: 1,
                createdAt: "$product.createdAt",
                updatedAt: "$product.updatedAt"
            }
        },
        { $sort: { name: 1 } }
    ]);
};
/**
 * Get inventory statistics
 */
export const getInventoryStats = async (branchId) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    // Get all batches for the branch
    const batches = await Batch.aggregate([
        { $match: { branchId } },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
                totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
                nearestExpiry: { $min: "$expiryDate" }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" }
    ]);
    const totalProducts = batches.length;
    const totalValue = batches.reduce((sum, b) => sum + (b.totalValue || 0), 0);
    const lowStock = batches.filter((b) => b.totalQuantity <= (b.product.reorderLevel || 10) && b.totalQuantity > 0).length;
    const expiringSoon = batches.filter((b) => b.nearestExpiry && b.nearestExpiry <= thirtyDaysFromNow && b.nearestExpiry > today).length;
    const expired = batches.filter((b) => b.nearestExpiry && b.nearestExpiry <= today).length;
    return {
        totalProducts,
        totalValue,
        lowStock,
        expiringSoon,
        expired
    };
};
/**
 * Get categories with product counts
 */
export const getCategoriesWithCounts = async (branchId) => {
    const categories = await Batch.aggregate([
        { $match: { branchId } },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.category",
                count: { $addToSet: "$productId" }
            }
        },
        {
            $project: {
                _id: 1,
                name: "$_id",
                count: { $size: "$count" }
            }
        },
        { $sort: { name: 1 } }
    ]);
    return categories;
};
/**
 * Get expiry alerts
 */
export const getExpiryAlerts = async (branchId) => {
    const today = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    const alerts = await Batch.aggregate([
        {
            $match: {
                branchId,
                quantity: { $gt: 0 }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $project: {
                _id: 1,
                name: "$product.name",
                barcode: "$product.barcode",
                batchNumber: 1,
                quantity: 1,
                expiryDate: 1,
                daysUntilExpiry: {
                    $ceil: {
                        $divide: [
                            { $subtract: ["$expiryDate", today] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                status: {
                    $cond: {
                        if: { $lte: ["$expiryDate", today] },
                        then: "expired",
                        else: {
                            $cond: {
                                if: { $lte: ["$expiryDate", thirtyDays] },
                                then: "critical",
                                else: {
                                    $cond: {
                                        if: { $lte: ["$expiryDate", ninetyDays] },
                                        then: "warning",
                                        else: "safe"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        { $sort: { expiryDate: 1 } }
    ]);
    return alerts;
};
/**
 * Get stock movement history
 */
export const getStockHistory = async (branchId, options = {}) => {
    const query = { branchId };
    if (options.from || options.to) {
        query.createdAt = {};
        if (options.from)
            query.createdAt.$gte = new Date(options.from);
        if (options.to) {
            const toDate = new Date(options.to);
            toDate.setHours(23, 59, 59, 999);
            query.createdAt.$lte = toDate;
        }
    }
    if (options.productId) {
        query.productId = new Types.ObjectId(options.productId);
    }
    if (options.type) {
        query.type = options.type;
    }
    const movements = await StockMovement.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 500);
    return movements;
};
/**
 * Adjust stock (manual adjustment)
 */
export const adjustStock = async ({ productId, type, quantity, reason, branchId, userId, userName }) => {
    const product = await Product.findById(productId);
    if (!product)
        throw new Error("Product not found");
    // Get the most recent batch for this product
    const batch = await Batch.findOne({
        productId,
        branchId,
        quantity: { $gt: 0 }
    }).sort({ expiryDate: 1 });
    if (!batch && type === "out") {
        throw new Error("No stock available to adjust");
    }
    const previousQuantity = batch ? batch.quantity : 0;
    let newQuantity = previousQuantity;
    if (type === "in") {
        // For stock in without a batch, we'd normally need batch details
        // For adjustment purposes, we'll add to the most recent batch
        if (batch) {
            batch.quantity += quantity;
            newQuantity = batch.quantity;
            await batch.save();
        }
        else {
            throw new Error("No batch found. Use stock-in for new products.");
        }
    }
    else if (type === "out" || type === "adjustment") {
        if (batch && batch.quantity >= quantity) {
            batch.quantity -= quantity;
            newQuantity = batch.quantity;
            await batch.save();
        }
        else {
            throw new Error("Insufficient stock for adjustment");
        }
    }
    // Record the movement
    await StockMovement.create({
        productId,
        productName: product.name,
        batchId: batch?._id,
        batchNumber: batch?.batchNumber,
        type,
        quantity,
        previousQuantity,
        newQuantity,
        reason,
        branchId,
        performedBy: userName,
        performedById: userId
    });
    return { product, previousQuantity, newQuantity };
};
/**
 * Get comprehensive stock report
 */
export const getStockReport = async (branchId, from, to) => {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    // Get all products with current stock
    const currentInventory = await getInventorySummary(branchId);
    // Get all movements in the period
    const movements = await StockMovement.find({
        branchId,
        createdAt: { $gte: fromDate, $lte: toDate }
    });
    // Build report for each product
    const reportItems = currentInventory.map((item) => {
        const productMovements = movements.filter((m) => m.productId.toString() === item._id.toString());
        // Calculate purchases (stock in) during period
        const purchasesQty = productMovements
            .filter((m) => m.type === "in")
            .reduce((sum, m) => sum + m.quantity, 0);
        const purchasesAmount = productMovements
            .filter((m) => m.type === "in")
            .reduce((sum, m) => sum + m.quantity * (m.costPrice || item.costPrice || 0), 0);
        // Calculate consumption (sales + adjustments out) during period
        const consumptionQty = productMovements
            .filter((m) => m.type === "sale" || m.type === "out")
            .reduce((sum, m) => sum + m.quantity, 0);
        const consumptionAmount = productMovements
            .filter((m) => m.type === "sale" || m.type === "out")
            .reduce((sum, m) => sum + m.quantity * (m.sellingPrice || item.sellingPrice || 0), 0);
        // Returns
        const returnsQty = productMovements
            .filter((m) => m.type === "return")
            .reduce((sum, m) => sum + m.quantity, 0);
        // Closing stock is current quantity
        const closingQty = item.quantity;
        const closingAmount = closingQty * (item.costPrice || 0);
        // Opening stock = Closing - Purchases - Returns + Consumption
        const openingQty = closingQty - purchasesQty - returnsQty + consumptionQty;
        const openingAmount = openingQty * (item.costPrice || 0);
        // Balance = Opening + Purchases + Returns
        const balanceQty = openingQty + purchasesQty + returnsQty;
        const balanceAmount = balanceQty * (item.costPrice || 0);
        return {
            _id: item._id,
            barcode: item.barcode,
            name: item.name,
            category: item.category,
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            openingStock: {
                qty: Math.max(0, openingQty),
                amount: Math.max(0, openingAmount)
            },
            purchases: {
                qty: purchasesQty,
                amount: purchasesAmount
            },
            balance: {
                qty: Math.max(0, balanceQty),
                amount: Math.max(0, balanceAmount)
            },
            consumption: {
                qty: consumptionQty,
                amount: consumptionAmount
            },
            closingStock: {
                qty: closingQty,
                amount: closingAmount
            }
        };
    });
    // Calculate summary
    const summary = {
        totalOpeningQty: reportItems.reduce((sum, r) => sum + r.openingStock.qty, 0),
        totalOpeningValue: reportItems.reduce((sum, r) => sum + r.openingStock.amount, 0),
        totalPurchasesQty: reportItems.reduce((sum, r) => sum + r.purchases.qty, 0),
        totalPurchasesValue: reportItems.reduce((sum, r) => sum + r.purchases.amount, 0),
        totalBalanceQty: reportItems.reduce((sum, r) => sum + r.balance.qty, 0),
        totalBalanceValue: reportItems.reduce((sum, r) => sum + r.balance.amount, 0),
        totalConsumptionQty: reportItems.reduce((sum, r) => sum + r.consumption.qty, 0),
        totalConsumptionValue: reportItems.reduce((sum, r) => sum + r.consumption.amount, 0),
        totalClosingQty: reportItems.reduce((sum, r) => sum + r.closingStock.qty, 0),
        totalClosingValue: reportItems.reduce((sum, r) => sum + r.closingStock.amount, 0)
    };
    return { report: reportItems, summary };
};
/**
 * Update product details
 */
export const updateProduct = async (productId, updates) => {
    return Product.findByIdAndUpdate(productId, updates, { new: true });
};
/**
 * Update batch pricing
 */
export const updateBatchPricing = async (batchId, updates) => {
    return Batch.findByIdAndUpdate(batchId, updates, { new: true });
};
/**
 * Delete product (soft delete by setting quantity to 0)
 */
export const deleteProduct = async (productId, branchId) => {
    // Set all batches to 0 quantity
    await Batch.updateMany({ productId, branchId }, { quantity: 0 });
    // Update product status
    await Product.findByIdAndUpdate(productId, { status: "discontinued" });
    return { success: true };
};
