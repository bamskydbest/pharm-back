import { findProductByBarcode, getAvailableBatchesFEFO, stockInProductService, getInventorySummary } from "./inventory.service.js";
import { Types } from "mongoose";
/**
 * Scan barcode (POS + Stock-in)
 * Used by:
 * - Cashier (POS)
 * - Pharmacist (Stock-in validation)
 */
export const scanBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        const branchId = new Types.ObjectId(req.user.branchId);
        const product = await findProductByBarcode(barcode);
        if (!product) {
            return res.json({ exists: false });
        }
        const batches = await getAvailableBatchesFEFO(product._id, branchId);
        res.json({ exists: true, product, batches });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
/**
 * Stock-in inventory (Barcode-based)
 * Roles: Admin, Pharmacist
 */
export const stockInProduct = async (req, res) => {
    try {
        const result = await stockInProductService({
            ...req.body,
            createdBy: new Types.ObjectId(req.user.id),
            branchId: new Types.ObjectId(req.user.branchId)
        });
        res.status(201).json({
            message: "Stock added successfully",
            ...result
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
/**
 * Inventory list (aggregated quantities per product)
 * Roles: Admin, Pharmacist
 */
export const listInventory = async (req, res) => {
    try {
        const branchId = new Types.ObjectId(req.user.branchId);
        const inventory = await getInventorySummary(branchId);
        res.json(inventory);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
