import APIAccessor from './apiAccessor';

const API_ENV = process.env.NEXT_PUBLIC_API_ENV || 'development';

// 根据环境变量决定是否使用测试endpoint
const getEndpoint = (endpoint: string) => {
  return API_ENV === 'production' ? endpoint.replace('/test', '') : endpoint;
};

// 发票API
export class TIBacklogInvoice {
  private api: APIAccessor;
  private server: string;

  constructor(clientId: string, clientSecret: string, server: string) {
    this.server = server;
    this.api = new APIAccessor(server, clientId, clientSecret);
  }

  // 按订单号获取发票
  async retrieveByOrderNumber(orderNumber: string, requestPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/financial-documents/test?orderNumber=${orderNumber}&requestInvoicePDF=${requestPdf}`);
    return this.api.get(url);
  }

  // 按客户订单号获取发票
  async retrieveByCustomerOrderNumber(orderNumber: string, requestPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/financial-documents/test?customerPurchaseOrderNumber=${orderNumber}&requestInvoicePDF=${requestPdf}`);
    return this.api.get(url);
  }

  // 按发货号获取发票
  async retrieveByDeliveryNumber(deliveryNumber: string, requestPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/financial-documents/test?deliveryNumber=${deliveryNumber}&requestInvoicePDF=${requestPdf}`);
    return this.api.get(url);
  }

  // 按财务文件号获取发票
  async retrieveByDocumentNumber(documentNumber: string, requestPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/financial-documents/test?financialDocumentNumber=${documentNumber}&requestInvoicePDF=${requestPdf}`);
    return this.api.get(url);
  }
}

// 预装通知（ASN）API
export class TIBacklogASN {
  private api: APIAccessor;
  private server: string;

  constructor(clientId: string, clientSecret: string, server: string) {
    this.server = server;
    this.api = new APIAccessor(server, clientId, clientSecret);
  }

  // 按订单号获取ASN
  async retrieveByOrderNumber(orderNumber: string, requestInvoicePdf = false, requestWaybillPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/advanced-shipment-notices/test?orderNumber=${orderNumber}&requestCommercialInvoicePDF=${requestInvoicePdf}&requestWaybillPDF=${requestWaybillPdf}`);
    return this.api.get(url);
  }

  // 按客户订单号获取ASN
  async retrieveByCustomerOrderNumber(orderNumber: string, requestInvoicePdf = false, requestWaybillPdf = true): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/advanced-shipment-notices/test?customerPurchaseOrderNumber=${orderNumber}&requestCommercialInvoicePDF=${requestInvoicePdf}&requestWaybillPDF=${requestWaybillPdf}`);
    return this.api.get(url);
  }

  // 按提单号获取ASN
  async retrieveByWaybillNumber(waybillNumber: string, requestInvoicePdf = false, requestWaybillPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/advanced-shipment-notices/test?wayBillNumber=${waybillNumber}&requestCommercialInvoicePDF=${requestInvoicePdf}&requestWaybillPDF=${requestWaybillPdf}`);
    return this.api.get(url);
  }
}

// 汇款API
export class TIBacklogRemittance {
  private api: APIAccessor;
  private server: string;

  constructor(clientId: string, clientSecret: string, server: string) {
    this.server = server;
    this.api = new APIAccessor(server, clientId, clientSecret);
  }

  // 发送汇款建议
  async postRemittance(adviceNumber: string, lineItems: any[], currencyCode = 'USD'): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/remittance-advice/test`);
    const data = {
      remittanceAdviceNumber: adviceNumber,
      currencyCode: currencyCode,
      lineItems: lineItems,
    };
    return this.api.post(url, data);
  }
}

// 报价API
export class TIBacklogQuotes {
  private api: APIAccessor;
  private server: string;
  private lineItems: any[];

  constructor(clientId: string, clientSecret: string, server: string) {
    this.server = server;
    this.api = new APIAccessor(server, clientId, clientSecret);
    this.lineItems = [];
  }

  // 添加商品到报价
  addItemToQuote(partNumber: string, quantity: number): void {
    this.lineItems.push({
      tiPartNumber: partNumber,
      quantity: quantity,
    });
  }

  // 发送报价请求
  async postQuote(customerName: string): Promise<any> {
    if (this.lineItems.length === 0) {
      console.warn('No items added to cart, so no quote will be created.');
      return;
    }

    const url = getEndpoint(`${this.server}/v2/backlog/quotes/test`);
    const data = {
      quote: {
        endCustomerCompanyName: customerName,
        checkoutProfileId: '1E9B82A96F4D97CCE063DE21BB8B74B9',
        requestedUnitPriceCurrencyCode: 'USD',
        lineItems: this.lineItems,
      },
    };
    return this.api.post(url, data);
  }

  // 获取报价
  async getQuote(quoteNumber: string): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/quotes/test?quoteNumber=${quoteNumber}`);
    return this.api.get(url);
  }
}

// 订单API
export class TIBacklogOrders {
  private api: APIAccessor;
  private server: string;
  private lineItems: any[];

  constructor(clientId: string, clientSecret: string, server: string) {
    this.server = server;
    this.api = new APIAccessor(server, clientId, clientSecret);
    this.lineItems = [];
  }

  // 添加商品到订单
  addItemToCart(partNumber: string, quantity: number, deliveryDate: Date, unitPrice: number, quoteNumber: string, currencyCode = 'USD'): void {
    const itemNumber = this.lineItems.length + 1;
    this.lineItems.push({
      customerLineItemNumber: itemNumber,
      tiPartNumber: partNumber, // 零件号
      customerAnticipatedUnitPrice: unitPrice, // 单价
      quoteNumber: quoteNumber, // 报价单号
      customerCurrencyCode: currencyCode, // 货币代码
      schedules: [
        {
          requestedQuantity: quantity, // 数量
          requestedDeliveryDate: deliveryDate.toISOString().split('T')[0], // 交货日期
        },
      ],
    });
  }

  // 提交订单
  async postOrder(customerName: string, customerOrderNumber: string, shipTo: string): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/orders/test`);
    const data = {
      order: {
        endCustomerCompanyName: customerName,
        checkoutProfileId: '1E9B82A96F4D97CCE063DE21BB8B74B9',
        customerPurchaseOrderNumber: customerOrderNumber,
        shipToAccountNumber: shipTo,
        lineItems: this.lineItems,
      },
    };
    return this.api.post(url, data);
  }

  // 修改订单
  async changeOrder(customerName: string, customerOrderNumber: string, shipTo: string, lineItems: any[]): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/orders/changeByCustomerPurchaseOrderNumber/test`);
    const data = {
      order: {
        endCustomerCompanyName: customerName,
        checkoutProfileId: '1E9B82A96F4D97CCE063DE21BB8B74B9',
        customerPurchaseOrderNumber: customerOrderNumber,
        shipToAccountNumber: shipTo,
        lineItems: lineItems,
      },
    };
    return this.api.post(url, data);
  }

  // 通过供应商订单号获取订单
  async retrieveOrderBySupplierNumber(supplierOrderNumber: string): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/orders/test?orderNumber=${supplierOrderNumber}`);
    return this.api.get(url);
  }

  // 通过客户订单号获取订单
  async retrieveOrderByCustomerNumber(customerOrderNumber: string): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/orders/test?customerPurchaseOrderNumber=${customerOrderNumber}`);
    return this.api.get(url);
  }
}
