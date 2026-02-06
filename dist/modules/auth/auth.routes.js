import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../auth/user.model.js";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
const router = Router();
/**
 * REGISTER USER (ADMIN ONLY)
 */
router.post("/register", auth, allowRoles("ADMIN"), async (req, res) => {
    try {
        const { name, email, password, role, branchId, phone, salary, dateOfEmployment, department, address, emergencyContact, emergencyPhone } = req.body;
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            branchId: branchId || req.user?.branchId,
            phone,
            salary: salary ? parseFloat(salary) : undefined,
            dateOfEmployment: dateOfEmployment ? new Date(dateOfEmployment) : new Date(),
            department,
            address,
            emergencyContact,
            emergencyPhone,
            status: "active"
        });
        res.status(201).json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
            phone: user.phone,
            salary: user.salary,
            dateOfEmployment: user.dateOfEmployment,
            department: user.department,
            status: user.status
        });
    }
    catch (err) {
        console.error("REGISTER ERROR:", err);
        if (err.code === 11000) {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Registration failed" });
    }
});
/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({
            id: user._id,
            role: user.role,
            branchId: user.branchId,
            name: user.name,
        }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                branchId: user.branchId,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: "Login failed" });
    }
});
/**
 * CURRENT USER
 */
router.get("/me", auth, async (req, res) => {
    const user = await User.findById(req.user.id).select("_id name role branchId");
    res.json(user);
});
export default router;
