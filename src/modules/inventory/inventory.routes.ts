import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
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
