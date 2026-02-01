import { Schema, model } from "mongoose";

const LedgerSchema = new Schema({
  type: { type: String, enum: ["INCOME", "EXPENSE"] },
  amount: Number,
  reference: String,
  branchId: Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
});

export default model("Ledger", LedgerSchema);
