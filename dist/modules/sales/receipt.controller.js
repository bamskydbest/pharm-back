import PDFDocument from "pdfkit";
import Sale from "../models/sale.model.js";
export const generateReceipt = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (!sale)
            return res.status(404).json({ message: "Sale not found" });
        // Optional: Fetch branch name if  only branchId is stored
        let branchName = sale.branchId?.toString() || "Unknown Branch";
        let cashierName = sale.soldBy?.name || "Unknown";
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=receipt-${sale._id}.pdf`);
        doc.pipe(res);
        // Header
        doc.fontSize(16).text("PHARMACY RECEIPT", { align: "center" });
        doc.moveDown();
        // Sale info
        doc.fontSize(10);
        doc.text(`Branch: ${branchName}`);
        doc.text(`Cashier: ${cashierName}`);
        doc.text(`Date: ${sale.createdAt.toLocaleString()}`);
        doc.moveDown();
        // Items
        sale.items.forEach((item) => {
            doc.text(`${item.name} x${item.quantity}  ₵${(item.unitPrice * item.quantity).toFixed(2)}`);
        });
        doc.moveDown();
        // Totals
        doc.text(`TOTAL: ₵${sale.subtotal.toFixed(2)}`);
        doc.text(`PAID: ₵${sale.amountPaid.toFixed(2)}`);
        doc.text(`CHANGE: ₵${sale.change.toFixed(2)}`);
        doc.text(`PAYMENT: ${sale.paymentMethod}`);
        doc.end();
    }
    catch (error) {
        console.error("Error generating receipt:", error);
        res.status(500).json({ message: "Failed to generate receipt", error: error.message });
    }
};
