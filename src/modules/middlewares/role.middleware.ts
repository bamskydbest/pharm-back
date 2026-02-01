import { Request, Response, NextFunction, RequestHandler } from "express";

type Role = "ADMIN" | "PHARMACIST" | "CASHIER" | "ACCOUNTANT";

const role = (allowedRoles: Role[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

export default role;
