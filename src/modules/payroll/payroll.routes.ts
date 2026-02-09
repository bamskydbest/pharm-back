import { Router, Request, Response } from "express";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Payroll from "./payroll.model.js";

const router = Router();

// ────────────────────────────────────────────────────────
// GET /employee/:id — Payroll records for an employee
// Query: ?year=2026
// ────────────────────────────────────────────────────────
router.get("/employee/:id", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { year } = req.query;

    const query: any = { employeeId: id };
    if (year) {
      // Match months starting with the year: "2026-01", "2026-02", etc.
      query.month = { $regex: `^${year}` };
    }

    const records = await Payroll.find(query).sort({ month: -1 });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /employee/:id/summary — Payroll summary for an employee
// Query: ?year=2026
// ────────────────────────────────────────────────────────
router.get("/employee/:id/summary", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { year } = req.query;

    const query: any = { employeeId: id };
    if (year) {
      query.month = { $regex: `^${year}` };
    }

    const records = await Payroll.find(query);

    const totalEarnings = records.reduce((sum, r) => sum + r.baseSalary + r.bonus, 0);
    const totalDeductions = records.reduce((sum, r) => sum + r.deductions, 0);
    const totalTax = records.reduce((sum, r) => sum + r.tax, 0);
    const totalNetPay = records.reduce((sum, r) => sum + r.netPay, 0);

    res.json({
      totalEarnings,
      totalDeductions,
      totalTax,
      totalNetPay,
      recordCount: records.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// POST / — Create a payroll record
// ────────────────────────────────────────────────────────
router.post("/", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { employeeId, month, baseSalary, bonus, deductions, tax, netPay, notes } = req.body;

    if (!employeeId || !month || baseSalary == null || netPay == null) {
      return res.status(400).json({ message: "employeeId, month, baseSalary, and netPay are required" });
    }

    const record = await Payroll.create({
      employeeId,
      month,
      baseSalary,
      bonus: bonus || 0,
      deductions: deductions || 0,
      tax: tax || 0,
      netPay,
      notes: notes || "",
      createdBy: req.user!.id,
    });

    res.status(201).json(record);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Payroll record already exists for this employee and month" });
    }
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// PATCH /:id/status — Update payroll status
// ────────────────────────────────────────────────────────
router.patch("/:id/status", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "status must be 'pending', 'paid', or 'cancelled'" });
    }

    const update: any = { status };
    if (status === "paid") {
      update.paidAt = new Date();
    } else {
      update.paidAt = null;
    }

    const record = await Payroll.findByIdAndUpdate(id, update, { new: true });

    if (!record) {
      return res.status(404).json({ message: "Payroll record not found" });
    }

    res.json(record);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
