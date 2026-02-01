import { Router } from "express";
import { Types } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Ledger from "../models/ledger.model.js";
const router = Router();
/**
 * GET /ledger
 * Roles: Admin, Accountant
 * Returns ledger entries for the authenticated user's branch
 * Supports pagination
 */
router.get("/ledger", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        // Convert branchId from string to ObjectId for Mongoose query
        const branchId = new Types.ObjectId(req.user.branchId);
        // Pagination parameters
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        // Fetch ledger entries for the branch with pagination
        const ledgerEntries = await Ledger.find({ branchId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.status(200).json({
            success: true,
            page,
            limit,
            data: ledgerEntries
        });
    }
    catch (error) {
        console.error("Error fetching ledger:", error);
        res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
    }
});
export default router;
