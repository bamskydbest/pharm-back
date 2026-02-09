import { Router, Request, Response } from "express";
import User from "../auth/user.model.js";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";

const router = Router();

/**
 * GET /employees/stats/summary - Get employee statistics
 * Roles: ADMIN
 * NOTE: This must be defined BEFORE /:id to avoid route conflicts
 */
router.get("/stats/summary", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const employees = await User.find();

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === "active").length;
    const totalPayroll = employees
      .filter(e => e.status === "active")
      .reduce((sum, e) => sum + (e.salary || 0), 0);
    const avgSalary = activeEmployees > 0 ? totalPayroll / activeEmployees : 0;

    const byRole = {
      ADMIN: employees.filter(e => e.role === "ADMIN").length,
      PHARMACIST: employees.filter(e => e.role === "PHARMACIST").length,
      CASHIER: employees.filter(e => e.role === "CASHIER").length,
      ACCOUNTANT: employees.filter(e => e.role === "ACCOUNTANT").length
    };

    const byDepartment = employees.reduce((acc: any, e) => {
      const dept = e.department || "Unassigned";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      totalPayroll,
      avgSalary,
      byRole,
      byDepartment
    });
  } catch (error: any) {
    console.error("GET /employees/stats/summary error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /employees - List all employees
 * Roles: ADMIN
 */
router.get("/", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const employees = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // Transform to match frontend expected format
    const transformed = employees.map((emp: any) => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || "",
      role: emp.role,
      department: emp.department || "",
      salary: emp.salary || 0,
      hireDate: emp.dateOfEmployment || emp.createdAt,
      dateOfEmployment: emp.dateOfEmployment || emp.createdAt,
      address: emp.address || "",
      emergencyContact: emp.emergencyContact || "",
      emergencyPhone: emp.emergencyPhone || "",
      profilePicture: emp.profilePicture || "",
      status: emp.status || "active",
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error("GET /employees error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /employees/:id - Get single employee
 * Roles: ADMIN
 */
router.get("/:id", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const employee = await User.findById(req.params.id).select("-password");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (error: any) {
    console.error("GET /employees/:id error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /employees/:id - Update employee
 * Roles: ADMIN
 */
router.put("/:id", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      role,
      branchId,
      phone,
      salary,
      dateOfEmployment,
      department,
      address,
      emergencyContact,
      emergencyPhone,
      status
    } = req.body;

    const employee = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        role,
        branchId,
        phone,
        salary,
        dateOfEmployment,
        department,
        address,
        emergencyContact,
        emergencyPhone,
        status
      },
      { new: true }
    ).select("-password");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee updated", employee });
  } catch (error: any) {
    console.error("PUT /employees/:id error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /employees/:id - Delete/Deactivate employee
 * Roles: ADMIN
 */
router.delete("/:id", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    // Soft delete - set status to inactive
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    ).select("-password");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee deactivated", employee });
  } catch (error: any) {
    console.error("DELETE /employees/:id error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
