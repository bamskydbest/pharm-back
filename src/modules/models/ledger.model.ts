import { Schema, model, Types, Document } from "mongoose";

export interface LedgerDoc extends Document {
  branchId: Types.ObjectId;
  type: "SALE" | "EXPENSE" | "REFUND" | "ADJUSTMENT";
  referenceId: Types.ObjectId;
  amount: number;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerSchema = new Schema<LedgerDoc>(
  {
    branchId: { type: Types.ObjectId, ref: "Branch", required: true },
    type: { type: String, enum: ["SALE", "EXPENSE", "REFUND", "ADJUSTMENT"], required: true },
    referenceId: { type: Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    createdBy: { type: Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

LedgerSchema.index({ branchId: 1, createdAt: -1 });

export default model<LedgerDoc>("Ledger", LedgerSchema);
