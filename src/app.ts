import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);

export default app;
