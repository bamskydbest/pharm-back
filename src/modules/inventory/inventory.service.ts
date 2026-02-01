import Product from "./models/product.model.js";
import Batch from "./models/batch.model.js";
import { Types } from "mongoose";

/**
 * Find product by barcode
 */
export const findProductByBarcode = async (barcode: string) => {
  return Product.findOne({ barcode });
};

/**
 * Get FEFO-sorted batches for POS sales
 */
export const getAvailableBatchesFEFO = async (
  productId: Types.ObjectId,
  branchId: Types.ObjectId
) => {
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
export const stockInProductService = async ({
  barcode,
  name,
  category,
  manufacturer,
  batchNumber,
  expiryDate,
  quantity,
  costPrice,
  sellingPrice,
  supplier,
  createdBy,
  branchId
}: {
  barcode: string;
  name: string;
  category: string;
  manufacturer?: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  createdBy: Types.ObjectId;
  branchId: Types.ObjectId;
}) => {
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
export const deductStockFEFO = async ({
  productId,
  quantity,
  branchId
}: {
  productId: Types.ObjectId;
  quantity: number;
  branchId: Types.ObjectId;
}) => {
  const batches = await getAvailableBatchesFEFO(productId, branchId);

  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;

    if (batch.quantity >= remaining) {
      batch.quantity -= remaining;
      remaining = 0;
    } else {
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
export const getInventorySummary = async (branchId: Types.ObjectId) => {
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
