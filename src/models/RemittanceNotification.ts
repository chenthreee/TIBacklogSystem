import mongoose from 'mongoose';

const RemittanceItemSchema = new mongoose.Schema({
  invoiceNumber: String,
  amount: Number,
}, { _id: false });

const RemittanceNotificationSchema = new mongoose.Schema({
  remittanceNumber: String,
  currency: String,
  paymentDate: Date,
  items: [RemittanceItemSchema],
}, { timestamps: true });

// 添加一个虚拟属性来计算总金额
RemittanceNotificationSchema.virtual('totalAmount').get(function() {
  return this.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
});

// 确保虚拟属性在 JSON 中也可见
RemittanceNotificationSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    ret.id = ret._id.toHexString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const RemittanceNotification = mongoose.models.RemittanceNotification || mongoose.model('RemittanceNotification', RemittanceNotificationSchema);

export default RemittanceNotification;