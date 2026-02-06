import { Schema, model, Types } from "mongoose";

export interface ILedger {
  _id?: Types.ObjectId;
  branchId: Types.ObjectId;
  type: "income" | "expense" | "tax" | "refund" | "INCOME" | "EXPENSE" | "TAX" | "REFUND" | "SALE" | "COST";
  category?: string;
  amount: number;
  description?: string;
  reference?: string;
  referenceId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
}

const LedgerSchema = new Schema<ILedger>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true
    },
    type: {
      type: String,
      enum: ["income", "expense", "tax", "refund", "INCOME", "EXPENSE", "TAX", "REFUND", "SALE", "COST"],
      required: true
    },
    category: {
      type: String
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String
    },
    reference: {
      type: String
    },
    referenceId: {
      type: Schema.Types.ObjectId
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

LedgerSchema.index({ branchId: 1, createdAt: -1 });
LedgerSchema.index({ type: 1, createdAt: -1 });

export default model<ILedger>("Ledger", LedgerSchema);
