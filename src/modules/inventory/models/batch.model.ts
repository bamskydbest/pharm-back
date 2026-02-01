import { Schema, model } from "mongoose";

const BatchSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    supplier: String,
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" }
  },
  { timestamps: true }
);

BatchSchema.index({ productId: 1, expiryDate: 1 });
BatchSchema.index({ expiryDate: 1 });

export default model("Batch", BatchSchema);
