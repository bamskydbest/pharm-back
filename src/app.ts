import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173", 
      "https://pospharm.netlify.app" 
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);

export default app;
