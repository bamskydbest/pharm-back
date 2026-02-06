import { Router } from "express";
import { Types } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Customer from "./customer.model.js";
const router = Router();
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
 * GET /customers/search/:query - Search customers by name or phone
 * Roles: ADMIN, CASHIER
 * NOTE: Must be defined BEFORE /:id to avoid route conflicts
 */
router.get("/search/:query", auth, allowRoles("ADMIN", "CASHIER"), async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { query } = req.params;
        const customers = await Customer.find({
            branchId,
            $or: [
                { name: { $regex: query, $options: "i" } },
                { phone: { $regex: query, $options: "i" } }
            ]
        }).limit(20);
        res.json(customers);
    }
    catch (error) {
        console.error("GET /customers/search error:", error);
        res.status(500).json({ message: error.message });
    }
});
/**
 * GET /customers - List all customers
 * Roles: ADMIN
 */
router.get("/", auth, allowRoles("ADMIN"), async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const customers = await Customer.find({ branchId }).sort({ name: 1 });
        res.json(customers);
    }
    catch (error) {
        console.error("GET /customers error:", error);
        res.status(500).json({ message: error.message });
    }
});
/**
 * GET /customers/:id - Get single customer
 * Roles: ADMIN, CASHIER
 */
router.get("/:id", auth, allowRoles("ADMIN", "CASHIER"), async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.json(customer);
    }
    catch (error) {
        console.error("GET /customers/:id error:", error);
        res.status(500).json({ message: error.message });
    }
});
/**
 * POST /customers - Create customer
 * Roles: ADMIN, CASHIER
 */
router.post("/", auth, allowRoles("ADMIN", "CASHIER"), async (req, res) => {
    try {
        const branchId = getBranchId(req);
        if (!branchId) {
            return res.status(400).json({ message: "Branch not configured. Please contact admin." });
        }
        const { name, phone, email, address, notes } = req.body;
        // Check if customer with same phone exists
        const existing = await Customer.findOne({ phone, branchId });
        if (existing) {
            return res.status(400).json({ message: "Customer with this phone already exists" });
        }
        const customer = await Customer.create({
            name,
            phone,
            email,
            address,
            notes,
            branchId,
            loyaltyPoints: 0,
            totalSpent: 0,
            purchaseCount: 0
        });
        res.status(201).json(customer);
    }
    catch (error) {
        console.error("POST /customers error:", error);
        res.status(400).json({ message: error.message });
    }
});
/**
 * PUT /customers/:id - Update customer
 * Roles: ADMIN
 */
router.put("/:id", auth, allowRoles("ADMIN"), async (req, res) => {
    try {
        const { name, phone, email, address, notes, loyaltyPoints } = req.body;
        const customer = await Customer.findByIdAndUpdate(req.params.id, { name, phone, email, address, notes, loyaltyPoints }, { new: true });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.json(customer);
    }
    catch (error) {
        console.error("PUT /customers/:id error:", error);
        res.status(400).json({ message: error.message });
    }
});
/**
 * DELETE /customers/:id - Delete customer
 * Roles: ADMIN
 */
router.delete("/:id", auth, allowRoles("ADMIN"), async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.json({ message: "Customer deleted successfully" });
    }
    catch (error) {
        console.error("DELETE /customers/:id error:", error);
        res.status(400).json({ message: error.message });
    }
});
/**
 * POST /customers/:id/add-purchase - Record a purchase for customer
 * Roles: ADMIN, CASHIER
 */
router.post("/:id/add-purchase", auth, allowRoles("ADMIN", "CASHIER"), async (req, res) => {
    try {
        const { amount, points } = req.body;
        const customer = await Customer.findByIdAndUpdate(req.params.id, {
            $inc: {
                totalSpent: amount || 0,
                purchaseCount: 1,
                loyaltyPoints: points || Math.floor((amount || 0) / 10)
            },
            lastVisit: new Date()
        }, { new: true });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.json(customer);
    }
    catch (error) {
        console.error("POST /customers/:id/add-purchase error:", error);
        res.status(400).json({ message: error.message });
    }
});
export default router;
