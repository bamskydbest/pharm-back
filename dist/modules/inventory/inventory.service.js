import Product from "./models/product.model.js";
import Batch from "./models/batch.model.js";
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
export const stockInProductService = async ({ barcode, name, category, manufacturer, batchNumber, expiryDate, quantity, costPrice, sellingPrice, supplier, createdBy, branchId }) => {
    if (expiryDate <= new Date()) {
        throw new Error("Expired batch not allowed");
    }
    let product = await Product.findOne({ barcode });
    if (!product) {
        product = await Product.create({
            name,
            barcode,
            category,
            manufacturer,
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
    return { product, batch };
};
/**
 * Deduct stock using FEFO logic (used during sales)
 */
export const deductStockFEFO = async ({ productId, quantity, branchId }) => {
    const batches = await getAvailableBatchesFEFO(productId, branchId);
    let remaining = quantity;
    for (const batch of batches) {
        if (remaining <= 0)
            break;
        if (batch.quantity >= remaining) {
            batch.quantity -= remaining;
            remaining = 0;
        }
        else {
            remaining -= batch.quantity;
            batch.quantity = 0;
        }
        await batch.save();
    }
    if (remaining > 0) {
        throw new Error("Insufficient stock");
    }
};
/**
 * Inventory summary (aggregated per product)
 */
export const getInventorySummary = async (branchId) => {
    return Batch.aggregate([
        {
            $match: { branchId }
        },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
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
};
