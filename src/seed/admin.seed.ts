import bcrypt from "bcryptjs";
import User from "../modules/auth/user.model.js";
import Branch from "../modules/branches/branch.model.js";

const seedAdmin = async () => {
  let defaultBranch = await Branch.findOne({ code: "MAIN" });

  if (!defaultBranch) {
    defaultBranch = await Branch.create({
      name: "Main Branch",
      location: "Main Location",
      code: "MAIN"
    });
    console.log("✅ Default branch created");
  }

  const usersWithoutBranch = await User.find({ branchId: { $exists: false } });
  if (usersWithoutBranch.length > 0) {
    await User.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: defaultBranch._id } }
    );
    console.log(`✅ Fixed ${usersWithoutBranch.length} user(s) without branchId`);
  }

  const usersWithNullBranch = await User.find({ branchId: null });
  if (usersWithNullBranch.length > 0) {
    await User.updateMany(
      { branchId: null },
      { $set: { branchId: defaultBranch._id } }
    );
    console.log(` Fixed ${usersWithNullBranch.length} user(s) with null branchId`);
  }

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
    role: "ADMIN",
    branchId: defaultBranch._id,
    status: "active",
    dateOfEmployment: new Date()
  });

  console.log("✅ Initial ADMIN user created with branchId");
};

export default seedAdmin;
