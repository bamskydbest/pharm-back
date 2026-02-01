import { Schema, model, Types } from "mongoose";
const SaleItemSchema = new Schema({
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    batchId: { type: Types.ObjectId, ref: "Batch", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true }
}, { _id: false });
const SaleSchema = new Schema({
    items: { type: [SaleItemSchema], required: true },
    subtotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["CASH", "MOMO", "CARD"], required: true },
    amountPaid: { type: Number, required: true },
    change: { type: Number, required: true },
    branchId: { type: Types.ObjectId, ref: "Branch", required: true },
    soldBy: {
        id: { type: Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true }
    }
}, { timestamps: true });
export default model("Sale", SaleSchema);
