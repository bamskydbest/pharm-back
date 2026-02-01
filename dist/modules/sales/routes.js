import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import { createSale } from "./sales.controller.js";
const router = Router();
/**
 * POST /sales
 * Create a new sale
 * Only accessible by CASHIER role
 */
router.post("/", auth, role(["CASHIER"]), async (req, res, next) => {
    try {
        const result = await createSale(req, res, next);
        res.status(201).json({
            success: true,
            message: "Sale created successfully",
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
