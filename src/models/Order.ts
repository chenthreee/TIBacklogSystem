import mongoose from 'mongoose';

const ComponentSchema = new mongoose.Schema({
  id: String,
  name: String,
  quantity: Number,
  unitPrice: Number,
  status: String,
  deliveryDate: String,
  tiLineItemNumber: String, // 新增字段
  quoteNumber: String, // 新增字段
  shippingDate: String, // 新增字段
  estimatedDateOfArrival: String, // 新增字段
  //carrierShipmentMasterTrackingNumber: String,
  carrier: String,
});

const OrderSchema = new mongoose.Schema({
  date: String,
  customer: String,
  totalAmount: Number,
  status: String,
  orderNumber: String,
  tiOrderNumber: String,
  components: [ComponentSchema],
  quotationId: String, // 如果之前没有，也需要添加这个字段
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order;