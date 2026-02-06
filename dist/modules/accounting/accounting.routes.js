import { Router } from "express";
import { Types } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Sale from "../models/sale.model.js";
import Ledger from "./ledger.model.js";
const router = Router();
/**
 * GET /accounting/summary - Financial summary
 * Roles: ADMIN, ACCOUNTANT
 */
router.get("/summary", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
    try {
        const branchId = new Types.ObjectId(req.user.branchId);
        const { from, to } = req.query;
        const dateMatch = {};
        if (from || to) {
            dateMatch.createdAt = {};
            if (from)
                dateMatch.createdAt.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                dateMatch.createdAt.$lte = toDate;
            }
        }
        // Get sales revenue
        const salesStats = await Sale.aggregate([
            { $match: { branchId, ...dateMatch } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$subtotal" }
                }
            }
        ]);
        const totalRevenue = salesStats[0]?.totalRevenue || 0;
        // Get ledger entries
        const ledgerStats = await Ledger.aggregate([
            { $match: { branchId, ...dateMatch } },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" }
                }
            }
        ]);
        const ledgerByType = ledgerStats.reduce((acc, item) => {
            acc[item._id] = item.total;
            return acc;
        }, {});
        const totalExpenses = ledgerByType["EXPENSE"] || 0;
        const totalTax = ledgerByType["TAX"] || 0;
        const totalCost = ledgerByType["COST"] || 0;
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalExpenses - totalTax;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        res.json({
            totalRevenue,
            totalCost,
            totalExpenses,
            totalTax,
            grossProfit,
            netProfit,
            profitMargin
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/**
 * GET /accounting/ledger - Ledger entries
 * Roles: ADMIN, ACCOUNTANT
 */
router.get("/ledger", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
    try {
        const branchId = new Types.ObjectId(req.user.branchId);
        const { from, to, type } = req.query;
        const match = { branchId };
        if (from || to) {
            match.createdAt = {};
            if (from)
                match.createdAt.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                match.createdAt.$lte = toDate;
            }
        }
        if (type) {
            match.type = type;
        }
        const entries = await Ledger.find(match)
            .sort({ createdAt: -1 })
            .limit(500);
        res.json(entries);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/**
 * POST /accounting/ledger - Create ledger entry
 * Roles: ADMIN, ACCOUNTANT
 */
router.post("/ledger", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
    try {
        const branchId = new Types.ObjectId(req.user.branchId);
        const { type, category, amount, description, reference } = req.body;
        const entry = await Ledger.create({
            branchId,
            type,
            category,
            amount,
            description,
            reference,
            createdBy: new Types.ObjectId(req.user.id)
        });
        res.status(201).json(entry);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
/**
 * GET /accounting/expenses/breakdown - Expense breakdown by category
 * Roles: ADMIN, ACCOUNTANT
 */
router.get("/expenses/breakdown", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
    try {
        const branchId = new Types.ObjectId(req.user.branchId);
        const { from, to } = req.query;
        const match = { branchId, type: "EXPENSE" };
        if (from || to) {
            match.createdAt = {};
            if (from)
                match.createdAt.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                match.createdAt.$lte = toDate;
            }
        }
        const breakdown = await Ledger.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$category",
                    amount: { $sum: "$amount" }
                }
            },
            { $sort: { amount: -1 } }
        ]);
        const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
        const result = breakdown.map(item => ({
            category: item._id || "Uncategorized",
            amount: item.amount,
            percentage: total > 0 ? (item.amount / total) * 100 : 0
        }));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/**
 * GET /accounting/taxes - Tax records
 * Roles: ADMIN, ACCOUNTANT
 */
router.get("/taxes", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
    try {
        const branchId = new Types.ObjectId(req.user.branchId);
        const { year } = req.query;
        const currentYear = year ? parseInt(year) : new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        // Get tax entries from ledger
        const taxEntries = await Ledger.find({
            branchId,
            type: "TAX",
            createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: -1 });
        // Get sales for tax calculation
        const salesByMonth = await Sale.aggregate([
            {
                $match: {
                    branchId,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalSales: { $sum: "$subtotal" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // Calculate tax records by month (assuming 15% VAT for demo)
        const taxRate = 0.15;
        const taxRecords = salesByMonth.map(month => {
            const monthName = new Date(currentYear, month._id - 1, 1).toLocaleString('default', { month: 'long' });
            return {
                _id: `${currentYear}-${month._id}`,
                type: "VAT",
                taxableAmount: month.totalSales,
                taxRate: taxRate * 100,
                taxAmount: month.totalSales * taxRate,
                period: `${monthName} ${currentYear}`,
                status: "pending",
                dueDate: new Date(currentYear, month._id, 15),
                paidDate: null
            };
        });
        res.json(taxRecords);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
