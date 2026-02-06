import { Schema, model } from "mongoose";
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["ADMIN", "PHARMACIST", "CASHIER", "ACCOUNTANT"],
        required: true
    },
    branchId: {
        type: Schema.Types.ObjectId,
        ref: "Branch"
    },
    // Employee details
    phone: { type: String },
    salary: { type: Number },
    dateOfEmployment: { type: Date, default: Date.now },
    department: { type: String },
    address: { type: String },
    emergencyContact: { type: String },
    emergencyPhone: { type: String },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
}, { timestamps: true });
export default model("User", UserSchema);
