import { IUser } from "../modules/auth/auth.types";
import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: "ADMIN" | "PHARMACIST" | "CASHIER" | "ACCOUNTANT";
        branchId: string;
        name?: string;
      };
    }
  }
}

export {};
