import { Router, Request, Response } from "express";
import { Types, startSession } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import Sale from "../models/sale.model.js";
import Ledger from "../accounting/ledger.model.js";
import Batch from "../inventory/models/batch.model.js";
import Customer from "../customers/customer.model.js";
import { generateReceipt } from "../sales/receipt.controller.js";

const router = Router();

/**
 * CREATE SALE (POS)
 * Roles: ADMIN, CASHIER
 * Atomic: batch decrements + sale + ledger
 */
router.post(
  "/",
  auth,
  allowRoles("ADMIN", "CASHIER"),
  async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { items, paymentMethod, amountPaid, customer } = req.body;
    const branchId = new Types.ObjectId(req.user.branchId);

    const session = await startSession();
    session.startTransaction();

    try {
      let saleItems: any[] = [];
      let subtotal = 0;

      // Process each item and decrement stock atomically
      for (const item of items) {
        let qtyNeeded = item.quantity;

        const batches = await Batch.find({
          productId: item.productId,
          branchId,
          quantity: { $gt: 0 },
          expiryDate: { $gt: new Date() }
        })
          .sort({ expiryDate: 1 })
          .session(session);

        for (const batch of batches) {
          if (qtyNeeded <= 0) break;

          const usedQty = Math.min(batch.quantity, qtyNeeded);

          // Atomic decrement
          const updated = await Batch.findOneAndUpdate(
            { _id: batch._id, quantity: { $gte: usedQty } },
            { $inc: { quantity: -usedQty } },
            { new: true, session }
          );

          if (!updated) {
            throw new Error(`Insufficient stock for ${item.name}`);
          }

          saleItems.push({
            productId: item.productId,
            batchId: batch._id,
            name: item.name,
            quantity: usedQty,
            unitPrice: item.unitPrice,
            total: usedQty * item.unitPrice
          });

          subtotal += usedQty * item.unitPrice;
          qtyNeeded -= usedQty;
        }

        if (qtyNeeded > 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }

      // Create sale document
const sale = await Sale.create(
  [
    {
      items: saleItems,
      subtotal,
      paymentMethod,
      amountPaid,
      change: amountPaid - subtotal,
      branchId,
      soldBy: {
        id: new Types.ObjectId(req.user.id), 
        name: req.user.role
      }
    }
  ],
  { session }
) as any; 

await Ledger.create(
  [
    {
      branchId,
      type: "SALE",
      referenceId: sale[0]._id,
      amount: subtotal,
      description: "POS Sale",
      createdBy: new Types.ObjectId(req.user.id)
    }
  ] as any,
  { session }
);

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Handle customer creation/update (outside transaction — non-critical)
      if (customer && customer.name) {
        try {
          if (customer.isNew && customer.phone) {
            // Create new customer if doesn't already exist
            const existing = await Customer.findOne({ phone: customer.phone, branchId });
            if (!existing) {
              await Customer.create({
                name: customer.name,
                phone: customer.phone,
                email: customer.email || "",
                address: customer.address || "",
                branchId,
                loyaltyPoints: Math.floor(subtotal / 10),
                totalSpent: subtotal,
                purchaseCount: 1,
                lastVisit: new Date(),
              });
            } else {
              // Customer with this phone exists — update their stats
              await Customer.findByIdAndUpdate(existing._id, {
                $inc: {
                  totalSpent: subtotal,
                  purchaseCount: 1,
                  loyaltyPoints: Math.floor(subtotal / 10),
                },
                lastVisit: new Date(),
              });
            }
          } else if (customer.customerId) {
            // Existing customer — update stats
            await Customer.findByIdAndUpdate(customer.customerId, {
              $inc: {
                totalSpent: subtotal,
                purchaseCount: 1,
                loyaltyPoints: Math.floor(subtotal / 10),
              },
              lastVisit: new Date(),
            });
          }
        } catch (custErr) {
          console.error("Customer update error (non-critical):", custErr);
        }
      }

      res.status(201).json(sale[0]);
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      console.error("Sale error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * DOWNLOAD RECEIPT PDF
 * Roles: ADMIN, CASHIER
 */
router.get(
  "/:id/receipt",
  auth,
  allowRoles("ADMIN", "CASHIER"),
  generateReceipt
);

/**
 * SALES REPORT WITH PAGINATION
 * Roles: ADMIN, ACCOUNTANT
 * Query params: page, limit
 */
router.get(
  "/reports",
  auth,
  allowRoles("ADMIN", "ACCOUNTANT"),
  async (req: Request, res: Response) => {
    try {
      const branchId = req.user!.branchId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      const sales = await Sale.find({ branchId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Sale.countDocuments({ branchId });

      res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: sales
      });
    } catch (error: any) {
      console.error("Report error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
