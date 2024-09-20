import mongoose from 'mongoose';

const ComponentSchema = new mongoose.Schema({
  id: String,
  name: String,
  quantity: Number,
  unitPrice: Number,
  status: String,
  deliveryDate: String,
  tiLineItemNumber: String,
  quoteNumber: String,
  shippingDate: String,
  estimatedDateOfArrival: String,
  carrier: String,
  k3Code: String, // 新增字段
  type: String, // 新增字段
  description: String // 新增字段
});

const OrderSchema = new mongoose.Schema({
  date: String,
  customer: String,
  totalAmount: Number,
  status: String,
  orderNumber: String,
  tiOrderNumber: String,
  components: [ComponentSchema],
  quotationId: String,
  purchaseOrderNumber: String // 新增字段
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order;