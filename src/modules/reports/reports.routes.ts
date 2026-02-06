import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Sale from "../models/sale.model.js";
import Ledger from "../accounting/ledger.model.js";

const router = Router();

/**
 * GET /reports/sales - Sales report with date range
 * Roles: ADMIN, ACCOUNTANT
 */
router.get("/sales", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req: Request, res: Response) => {
  try {
    const branchId = new Types.ObjectId(req.user!.branchId);
    const { from, to } = req.query;

    const match: any = { branchId };

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        match.createdAt.$lte = toDate;
      }
    }

    // Aggregate sales by date
    const salesByDate = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: "$subtotal" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          total: 1,
          count: 1
        }
      }
    ]);

    res.json(salesByDate);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /reports/summary - Overall summary stats
 * Roles: ADMIN, ACCOUNTANT
 */
router.get("/summary", auth, allowRoles("ADMIN", "ACCOUNTANT"), async (req: Request, res: Response) => {
  try {
    const branchId = new Types.ObjectId(req.user!.branchId);
    const { from, to } = req.query;

    const match: any = { branchId };

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        match.createdAt.$lte = toDate;
      }
    }

    const salesStats = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$subtotal" },
          totalSales: { $sum: 1 },
          avgSale: { $avg: "$subtotal" }
        }
      }
    ]);

    const stats = salesStats[0] || {
      totalRevenue: 0,
      totalSales: 0,
      avgSale: 0
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
