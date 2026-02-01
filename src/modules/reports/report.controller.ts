import { Request, Response } from "express";
import { Types } from "mongoose";
import Sale from "../models/sale.model.js"; // your Sale model

interface SalesSummaryQuery {
  startDate?: string;
  endDate?: string;
}

export const salesSummary = async (req: Request<{}, {}, {}, SalesSummaryQuery>, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Convert branchId to ObjectId for Mongoose
    const branchId = new Types.ObjectId(req.user.branchId);

    // Parse optional date filters from query params
    const { startDate, endDate } = req.query;
    const match: any = { branchId };

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // Aggregate sales by day
    const data = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          totalSales: { $sum: "$totalAmount" },
          count: { $sum: 1 } // number of sales per day
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    res.status(200).json({
      success: true,
      branchId: req.user.branchId,
      totalDays: data.length,
      data
    });
  } catch (error: any) {
    console.error("Error generating sales summary:", error);
    res.status(500).json({ success: false, message: "Failed to generate sales summary", error: error.message });
  }
};
