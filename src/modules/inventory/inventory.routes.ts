import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import {
  scanBarcode,
  stockInProduct,
  listInventory
} from "./inventory.controller.js";

const router = Router();

/**
 * Scan barcode (used in POS & Stock-in)
 */
router.get(
  "/scan/:barcode",
  auth,
  allowRoles("Admin", "Pharmacist", "Cashier"),
  scanBarcode
);

/**
 * Stock-in inventory
 */
router.post(
  "/stock-in",
  auth,
  allowRoles("Admin", "Pharmacist"),
  stockInProduct
);

/**
 * Inventory list (per branch)
 */
router.get(
  "/",
  auth,
  allowRoles("Admin", "Pharmacist"),
  listInventory
);

export default router;
