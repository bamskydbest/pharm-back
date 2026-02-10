import { Schema, model, Types, Document, HydratedDocument } from "mongoose";

export interface SaleItem {
  productId: Types.ObjectId;
  batchId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleDoc extends Document {
  items: SaleItem[];
  subtotal: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  branchId: Types.ObjectId;
  soldBy: {
    id: Types.ObjectId;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<SaleItem>(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    batchId: { type: Types.ObjectId, ref: "Batch", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true }
  },
  { _id: false }
);

const SaleSchema = new Schema<SaleDoc>(
  {
    items: { type: [SaleItemSchema], required: true },
    subtotal: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    change: { type: Number, required: true },
    branchId: { type: Types.ObjectId, ref: "Branch", required: true },
    soldBy: {
      id: { type: Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true }
    }
  },
  { timestamps: true }
);

export default model<SaleDoc>("Sale", SaleSchema);
