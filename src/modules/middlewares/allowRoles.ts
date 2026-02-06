import { Request, Response, NextFunction } from "express";

const allowRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Case-insensitive role comparison
    const userRole = req.user.role?.toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());

    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log(`Access denied: User role "${req.user.role}" not in allowed roles [${roles.join(", ")}]`);
      return res.status(403).json({
        message: "Access denied"
      });
    }

    next();
  };
};

export default allowRoles;
