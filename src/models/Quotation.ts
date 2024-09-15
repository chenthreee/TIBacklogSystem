import mongoose from 'mongoose';

const ComponentSchema = new mongoose.Schema({
  id: {type: String, required: true},
  name: {type: String, required: true},
  quantity: {type: Number, required: true},
  unitPrice: {type: Number, required: true},
});

const QuotationSchema = new mongoose.Schema({
  //id: {type: String, required: true},
  date: {type: String, required: true},
  customer: {type: String, required: true},
  totalAmount: {type: Number, required: true},
  components: [ComponentSchema],
});

export default mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);