import { Schema, model } from "mongoose";
const ProductSchema = new Schema({
    name: { type: String, required: true },
    barcode: { type: String, required: true, unique: true },
    category: {
        type: String,
        enum: ["PRESCRIPTION", "OTC", "SUPPLEMENT", "SUPPLY"],
        required: true
    },
    manufacturer: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
// ProductSchema.index({ barcode: 1 });
export default model("Product", ProductSchema);
