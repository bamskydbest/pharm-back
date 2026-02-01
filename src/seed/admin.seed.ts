import bcrypt from "bcryptjs";
import User from "../modules/auth/user.model";

const seedAdmin = async () => {
  const adminExists = await User.findOne({ role: "ADMIN" });

  if (adminExists) {
    console.log("ℹ️ Admin already exists, skipping seed");
    return;
  }

  const email = process.env.INIT_ADMIN_EMAIL;
  const password = process.env.INIT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing INIT_ADMIN_EMAIL or INIT_ADMIN_PASSWORD in env");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    name: "System Admin",
    email,
    password: hashedPassword,
    role: "ADMIN"
  });

  console.log("✅ Initial ADMIN user created");
};

export default seedAdmin;
