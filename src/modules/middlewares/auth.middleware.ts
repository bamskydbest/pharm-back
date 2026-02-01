import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type UserRole = "ADMIN" | "PHARMACIST" | "CASHIER" | "ACCOUNTANT";

interface JwtPayload {
  id: string;
  role: UserRole;
  branchId: string;
  name: string;
}

const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
      branchId: decoded.branchId,
      name: decoded.name
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default auth;
