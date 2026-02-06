import { Schema, model } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    barcode: { type: String, required: true, unique: true },
    category: {
      type: String,
      required: true
    },
    manufacturer: { type: String },
    supplier: { type: String },
    reorderLevel: { type: Number, default: 10 },
    location: { type: String },
    status: {
      type: String,
      enum: ["active", "discontinued"],
      default: "active"
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

ProductSchema.index({ barcode: 1 });
ProductSchema.index({ name: "text" });

export default model("Product", ProductSchema);
