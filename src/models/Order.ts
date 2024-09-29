import mongoose from 'mongoose';

const ConfirmationSchema = new mongoose.Schema({
  tiScheduleLineNumber: String,
  scheduledQuantity: Number,
  estimatedShipDate: String,
  estimatedDeliveryDate: String,
  estimatedDeliveryDateStatus: String,
  shippedQuantity: Number,
  customerRequestedShipDate: String
});

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
  k3Code: String,
  type: String,
  description: String,
  confirmations: [ConfirmationSchema],
  moq: { type: Number, default: 0 },
  nq: { type: Number, default: 0 }
});

const ChangeLogEntrySchema = new mongoose.Schema({
  componentName: String,
  changes: [String]
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
  purchaseOrderNumber: String,
  apiLogs: [{
    operationType: {
      type: String,
      enum: ['submit', 'modify'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    username: {
      type: String
    },
    changes: [ChangeLogEntrySchema] // 新增字段，用于记录详细的变更日志
  }]
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order;