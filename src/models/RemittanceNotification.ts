import mongoose from 'mongoose';

const RemittanceNotificationSchema = new mongoose.Schema({
  remittanceNumber: { type: String, required: true, unique: true },
  currency: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.models.RemittanceNotification || mongoose.model('RemittanceNotification', RemittanceNotificationSchema);