import { Schema, model, Types } from "mongoose";

export interface IPayroll {
  _id?: Types.ObjectId;
  employeeId: Types.ObjectId;
  month: string; // "YYYY-MM"
  baseSalary: number;
  bonus: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: "pending" | "paid" | "cancelled";
  paidAt: Date | null;
  notes: string;
  createdBy: Types.ObjectId;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    baseSalary: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netPay: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One payroll record per employee per month
PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });
PayrollSchema.index({ month: 1 });
PayrollSchema.index({ status: 1 });

export default model<IPayroll>("Payroll", PayrollSchema);
