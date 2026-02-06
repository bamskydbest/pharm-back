import { Schema, model } from "mongoose";
const StockMovementSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    batchId: {
        type: Schema.Types.ObjectId,
        ref: "Batch"
    },
    batchNumber: {
        type: String
    },
    type: {
        type: String,
        enum: ["in", "out", "adjustment", "return", "sale"],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousQuantity: {
        type: Number
    },
    newQuantity: {
        type: Number
    },
    costPrice: {
        type: Number
    },
    sellingPrice: {
        type: Number
    },
    reason: {
        type: String
    },
    reference: {
        type: String
    },
    branchId: {
        type: Schema.Types.ObjectId,
        ref: "Branch",
        required: true
    },
    performedBy: {
        type: String,
        required: true
    },
    performedById: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });
// Indexes for efficient querying
StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ branchId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });
StockMovementSchema.index({ createdAt: -1 });
export default model("StockMovement", StockMovementSchema);
