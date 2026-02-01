// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import app from "./app"; 
// import seedAdmin from "./seed/admin.seed";
// dotenv.config();
// await seedAdmin();
// const PORT = process.env.PORT || 5000;
// // MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI as string)
//   .then(() => {
//     console.log("MongoDB connected successfully");
//     // Start server after DB connection
//     app.listen(PORT, () => {
//       console.log(`Server running on http://localhost:${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//     process.exit(1);
//   });
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import seedAdmin from "./seed/admin.seed";
dotenv.config();
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        // 1️⃣ Connect DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully");
        console.log("JWT_SECRET:", !!process.env.JWT_SECRET);
        // 2️⃣ Seed admin (safe, idempotent)
        await seedAdmin();
        // 3️⃣ Start server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Startup error:", error);
        process.exit(1);
    }
};
startServer();
