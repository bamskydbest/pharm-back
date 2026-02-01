import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";
import seedAdmin from "./seed/admin.seed.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1️⃣ Connect DB
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB connected successfully");
    console.log("JWT_SECRET:", !!process.env.JWT_SECRET);


    // 2️⃣ Seed admin (safe, idempotent)
    await seedAdmin();

    // 3️⃣ Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();
