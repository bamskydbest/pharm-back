import { findProductByBarcode, getAvailableBatchesFEFO, stockInProductService, getInventorySummary, getInventoryStats, getCategoriesWithCounts, getExpiryAlerts, getStockHistory, adjustStock, getStockReport, updateProduct, deleteProduct } from "./inventory.service.js";
import { Types } from "mongoose";
/**
 * Helper to safely get branchId from user
 */
const getBranchId = (req) => {
    if (!req.user?.branchId) {
        return null;
    }
    try {
        return new Types.ObjectId(req.user.branchId);
    }
    catch {
        return null;
    }
};
/**
 * Scan barcode (POS + Stock-in)
 * Used by:
 * - Cashier (POS)
 * - Pharmacist (Stock-in validation)
 */
export const scanBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const product = await findProductByBarcode(barcode);
        if (!product) {
            return res.json({ exists: false });
        }
        const batches = await getAvailableBatchesFEFO(product._id, branchId);
        res.json({ exists: true, product, batches });
    }
    catch (error) {
        console.error("scanBarcode error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Stock-in inventory (Barcode-based)
 * Roles: Admin, Pharmacist
 */
export const stockInProduct = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const result = await stockInProductService({
            ...req.body,
            createdBy: new Types.ObjectId(req.user.id),
            branchId,
            userName: req.user.name || "Unknown"
        });
        res.status(201).json({
            message: "Stock added successfully",
            ...result
        });
    }
    catch (error) {
        console.error("stockInProduct error:", error);
        res.status(400).json({ message: error.message });
    }
};
/**
 * Inventory list (aggregated quantities per product)
 * Roles: Admin, Pharmacist
 */
export const listInventory = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const inventory = await getInventorySummary(branchId);
        res.json(inventory);
    }
    catch (error) {
        console.error("listInventory error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Get inventory statistics
 * Roles: Admin, Pharmacist
 */
export const getStats = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const stats = await getInventoryStats(branchId);
        res.json(stats);
    }
    catch (error) {
        console.error("getStats error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Get categories with counts
 * Roles: Admin, Pharmacist
 */
export const getCategories = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const categories = await getCategoriesWithCounts(branchId);
        res.json(categories);
    }
    catch (error) {
        console.error("getCategories error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Get expiry alerts
 * Roles: Admin, Pharmacist
 */
export const getAlerts = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const alerts = await getExpiryAlerts(branchId);
        res.json(alerts);
    }
    catch (error) {
        console.error("getAlerts error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Get stock movement history
 * Roles: Admin, Pharmacist, Accountant
 */
export const getHistory = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { from, to, type, limit } = req.query;
        const history = await getStockHistory(branchId, {
            from: from,
            to: to,
            type: type,
            limit: limit ? parseInt(limit) : undefined
        });
        res.json(history);
    }
    catch (error) {
        console.error("getHistory error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Get stock history for a specific product
 * Roles: Admin, Pharmacist, Accountant
 */
export const getProductHistory = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { productId } = req.params;
        const { from, to } = req.query;
        const history = await getStockHistory(branchId, {
            productId,
            from: from,
            to: to
        });
        res.json(history);
    }
    catch (error) {
        console.error("getProductHistory error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Adjust stock (manual adjustment)
 * Roles: Admin, Pharmacist
 */
export const adjustInventory = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { productId, type, quantity, reason } = req.body;
        if (!productId || !type || !quantity || !reason) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const result = await adjustStock({
            productId: new Types.ObjectId(productId),
            type,
            quantity: parseInt(quantity),
            reason,
            branchId,
            userId: new Types.ObjectId(req.user.id),
            userName: req.user.name || "Unknown"
        });
        res.json({
            message: "Stock adjusted successfully",
            ...result
        });
    }
    catch (error) {
        console.error("adjustInventory error:", error);
        res.status(400).json({ message: error.message });
    }
};
/**
 * Get comprehensive stock report
 * Roles: Admin, Pharmacist, Accountant
 */
export const stockReport = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ message: "Date range required" });
        }
        const report = await getStockReport(branchId, from, to);
        res.json(report);
    }
    catch (error) {
        console.error("stockReport error:", error);
        res.status(500).json({ message: error.message });
    }
};
/**
 * Update product
 * Roles: Admin, Pharmacist
 */
export const updateInventoryProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const product = await updateProduct(new Types.ObjectId(id), updates);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product updated", product });
    }
    catch (error) {
        console.error("updateInventoryProduct error:", error);
        res.status(400).json({ message: error.message });
    }
};
/**
 * Delete product (soft delete)
 * Roles: Admin
 */
export const deleteInventoryProduct = async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { id } = req.params;
        await deleteProduct(new Types.ObjectId(id), branchId);
        res.json({ message: "Product deleted successfully" });
    }
    catch (error) {
        console.error("deleteInventoryProduct error:", error);
        res.status(400).json({ message: error.message });
    }
};
