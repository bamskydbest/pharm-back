import mongoose from "mongoose";
import Batch from "../inventory/models/batch.model.js";
import Product from "../inventory/models/product.model.js";
import Sale from "../models/sale.model.js";
export const createSale = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { items, paymentMethod, amountPaid } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items provided" });
        }
        let saleItems = [];
        let subtotal = 0;
        for (const item of items) {
            const product = await Product.findOne({ barcode: item.barcode });
            if (!product)
                throw new Error(`Product not found: ${item.barcode}`);
            let qtyToSell = item.quantity;
            const batches = await Batch.find({
                productId: product._id,
                expiryDate: { $gt: new Date() },
                quantity: { $gt: 0 },
            })
                .sort({ expiryDate: 1 })
                .session(session);
            for (const batch of batches) {
                if (qtyToSell <= 0)
                    break;
                const usedQty = Math.min(batch.quantity, qtyToSell);
                batch.quantity -= usedQty;
                qtyToSell -= usedQty;
                await batch.save({ session });
                const lineTotal = usedQty * batch.sellingPrice;
                saleItems.push({
                    productId: product._id,
                    batchId: batch._id,
                    name: product.name,
                    quantity: usedQty,
                    unitPrice: batch.sellingPrice,
                    total: lineTotal,
                });
                subtotal += lineTotal;
            }
            if (qtyToSell > 0) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }
        }
        if (amountPaid < subtotal) {
            throw new Error("Insufficient payment");
        }
        const sale = await Sale.create([
            {
                items: saleItems,
                subtotal,
                paymentMethod,
                amountPaid,
                change: amountPaid - subtotal,
                soldBy: {
                    id: new mongoose.Types.ObjectId(req.user.id), //convert string to ObjectId
                    name: req.user.name,
                },
            },
        ], { session });
        await session.commitTransaction();
        res.status(201).json({
            success: true,
            message: "Sale created successfully",
            data: sale[0],
        });
    }
    catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    }
    finally {
        session.endSession();
    }
};
