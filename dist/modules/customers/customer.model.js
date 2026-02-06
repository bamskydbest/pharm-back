import { Schema, model } from "mongoose";
const CustomerSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    address: {
        type: String
    },
    notes: {
        type: String
    },
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    purchaseCount: {
        type: Number,
        default: 0
    },
    lastVisit: {
        type: Date
    },
    branchId: {
        type: Schema.Types.ObjectId,
        ref: "Branch",
        required: true
    }
}, { timestamps: true });
CustomerSchema.index({ phone: 1, branchId: 1 });
CustomerSchema.index({ name: "text" });
export default model("Customer", CustomerSchema);
