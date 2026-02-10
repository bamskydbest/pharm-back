import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Product from "./models/product.model.js";
import Batch from "./models/batch.model.js";
import {
  scanBarcode,
  stockInProduct,
  listInventory,
  getStats,
  getCategories,
  getAlerts,
  getHistory,
  getProductHistory,
  adjustInventory,
  stockReport,
  updateInventoryProduct,
  deleteInventoryProduct
} from "./inventory.controller.js";

const router = Router();

/**
 * Search products by name or barcode (used by POS)
 * Query: ?q=searchTerm
 * Returns products with aggregated stock and selling price for the user's branch
 */
router.get(
  "/search",
  auth,
  allowRoles("ADMIN", "PHARMACIST", "CASHIER"),
  async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q || q.length < 2) {
        return res.json([]);
      }

      if (!req.user?.branchId) {
        return res.status(400).json({ message: "Branch not configured" });
      }

      const branchId = new Types.ObjectId(req.user.branchId);

      // Find matching products by name or barcode
      const products = await Product.find({
        status: { $ne: "discontinued" },
        $or: [
          { name: { $regex: q, $options: "i" } },
          { barcode: { $regex: q, $options: "i" } },
        ],
      }).limit(20);

      if (products.length === 0) {
        return res.json([]);
      }

      const productIds = products.map((p) => p._id);

      // Aggregate stock and price from batches for this branch
      const batchAgg = await Batch.aggregate([
        {
          $match: {
            productId: { $in: productIds },
            branchId,
            quantity: { $gt: 0 },
            expiryDate: { $gt: new Date() },
          },
        },
        {
          $group: {
            _id: "$productId",
            stock: { $sum: "$quantity" },
            sellingPrice: { $avg: "$sellingPrice" },
          },
        },
      ]);

      const stockMap = new Map(
        batchAgg.map((b: any) => [b._id.toString(), b])
      );

      const results = products
        .map((p) => {
          const batch = stockMap.get(p._id.toString());
          return {
            _id: p._id,
            name: p.name,
            barcode: p.barcode,
            category: p.category,
            price: batch ? Math.round(batch.sellingPrice * 100) / 100 : 0,
            stock: batch ? batch.stock : 0,
          };
        })
        .filter((p) => p.stock > 0);

      res.json(results);
    } catch (error: any) {
      console.error("GET /inventory/search error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * Scan barcode (used in POS & Stock-in)
 */
router.get(
  "/scan/:barcode",
  auth,
  allowRoles("ADMIN", "PHARMACIST", "CASHIER"),
  scanBarcode
);

/**
 * Stock-in inventory
 */
router.post(
  "/stock-in",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  stockInProduct
);

/**
 * Inventory list (per branch)
 */
router.get(
  "/",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  listInventory
);

/**
 * Inventory statistics
 */
router.get(
  "/stats",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  getStats
);

/**
 * Categories with counts
 */
router.get(
  "/categories",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  getCategories
);

/**
 * Expiry alerts
 */
router.get(
  "/expiry-alerts",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  getAlerts
);

/**
 * Stock movement history
 */
router.get(
  "/stock-history",
  auth,
  allowRoles("ADMIN", "PHARMACIST", "ACCOUNTANT"),
  getHistory
);

/**
 * Stock history for specific product
 */
router.get(
  "/stock-history/:productId",
  auth,
  allowRoles("ADMIN", "PHARMACIST", "ACCOUNTANT"),
  getProductHistory
);

/**
 * Stock adjustment
 */
router.post(
  "/adjust",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  adjustInventory
);

/**
 * Stock report
 */
router.get(
  "/stock-report",
  auth,
  allowRoles("ADMIN", "PHARMACIST", "ACCOUNTANT"),
  stockReport
);

/**
 * Update product
 */
router.put(
  "/:id",
  auth,
  allowRoles("ADMIN", "PHARMACIST"),
  updateInventoryProduct
);

/**
 * Delete product (soft delete)
 */
router.delete(
  "/:id",
  auth,
  allowRoles("ADMIN"),
  deleteInventoryProduct
);

export default router;
