import mongoose from 'mongoose';

const ComponentSchema = new mongoose.Schema({
  id: {type: String, required: true},
  name: {type: String, required: true},
  quantity: {type: Number, required: true},
  unitPrice: {type: Number, required: true},
  tiPrice: {type: Number, default: 0},
  status: {type: String, default: 'Pending'}, // 新增状态字段
});

const QuotationSchema = new mongoose.Schema({
  date: {type: String, required: true},
  customer: {type: String, required: true},
  totalAmount: {type: Number, required: true},
  quoteStatus: {type: String, default: 'OnPending'}, // 新增报价状态字段
  quoteNumber: {type: String, default: ''}, // 新增报价编号字段
  customerQuoteNumber: {
    type: String,
    default: function(this: any) { return this._id.toString(); }
  }, // 新增客户报价编号字段
  components: [ComponentSchema],
});

export default mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);