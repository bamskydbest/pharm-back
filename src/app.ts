import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import employeesRoutes from "./modules/employees/employees.routes.js";
import customersRoutes from "./modules/customers/customers.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import accountingRoutes from "./modules/accounting/accounting.routes.js";

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

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/accounting", accountingRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
