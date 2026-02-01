import { Schema, model, Types } from "mongoose";
const LedgerSchema = new Schema({
    branchId: { type: Types.ObjectId, ref: "Branch", required: true },
    type: { type: String, enum: ["SALE", "EXPENSE", "REFUND", "ADJUSTMENT"], required: true },
    referenceId: { type: Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    createdBy: { type: Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
LedgerSchema.index({ branchId: 1, createdAt: -1 });
export default model("Ledger", LedgerSchema);
