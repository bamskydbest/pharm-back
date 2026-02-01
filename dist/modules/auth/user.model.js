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
    }
}, { timestamps: true });
export default model("User", UserSchema);
