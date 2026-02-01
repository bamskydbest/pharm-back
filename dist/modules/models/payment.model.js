import { Schema, model, Types } from "mongoose";
const PaymentSchema = new Schema({
    saleId: { type: Types.ObjectId, ref: "Sale", required: true },
    method: {
        type: String,
        enum: ["CASH", "CARD", "MOMO"],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        required: true,
        default: "PENDING"
    },
    reference: { type: String, trim: true }
}, { timestamps: true });
// Index for fast lookups per sale
PaymentSchema.index({ saleId: 1 });
export default model("Payment", PaymentSchema);
