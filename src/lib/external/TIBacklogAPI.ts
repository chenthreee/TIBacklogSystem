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
    console.error('获取ASN的URL为:', url);
    return this.api.get(url);
  }

  // 按客户订单号获取ASN
  async retrieveByCustomerOrderNumber(orderNumber: string, requestInvoicePdf = true, requestWaybillPdf = false): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/advanced-shipment-notices/test?customerPurchaseOrderNumber=${orderNumber}&requestCommercialInvoicePDF=${requestInvoicePdf}&requestWaybillPDF=${requestWaybillPdf}`);
    console.error('获取ASN的URL为:', url);
    return this.api.get(url);
  }

  // 按提单号获取ASN
  async retrieveByWaybillNumber(waybillNumber: string, requestInvoicePdf = true, requestWaybillPdf = false): Promise<any> {
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
    console.log(`添加元件到报价: partNumber=${partNumber}, quantity=${quantity}`);
    
    if (!partNumber || partNumber.trim() === '') {
      throw new Error('Part number cannot be empty');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }

    const lineItem = {
      tiPartNumber: partNumber.trim(),
      quantity: quantity
    };

    console.log('添加的元件信息:', lineItem);
    this.lineItems.push(lineItem);
  }

  // 发送报价请求
  async postQuote(customerName: string): Promise<any> {
    if (this.lineItems.length === 0) {
      console.warn('No items added to cart, so no quote will be created.');
      return;
    }

    if (!process.env.CHECKOUT_PROFILE_ID) {
      console.error('CHECKOUT_PROFILE_ID 环境变量未设置');
      throw new Error('CHECKOUT_PROFILE_ID environment variable is not set');
    }

    const url = getEndpoint(`${this.server}/v2/backlog/quotes/test`);
    const data = {
      quote: {
        endCustomerCompanyName: 'BAIQIANCHENG SHENZHEN',
        checkoutProfileId: process.env.CHECKOUT_PROFILE_ID,
        requestedUnitPriceCurrencyCode: 'USD',
        lineItems: this.lineItems,
      },
    };

    try {
      console.log('=== TI API 请求信息 ===');
      console.log('请求URL:', url);
      console.log('请求数据:', JSON.stringify(data, null, 2));
      console.log('使用的 CHECKOUT_PROFILE_ID:', process.env.CHECKOUT_PROFILE_ID);
      console.log('元件列表:', this.lineItems);

      const response = await this.api.post(url, data) as {
        status: number;
        data: any;
      };
      
      console.log('=== TI API 响应信息 ===');
      console.log('响应状态:', response.status);
      console.log('响应数据:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error: any) {
      console.error('=== TI API 错误信息 ===');
      console.error('错误状态码:', error.response?.status);
      console.error('错误状态文本:', error.response?.statusText);
      console.error('错误数据:', JSON.stringify(error.response?.data, null, 2));
      console.error('错误详情:', error.response?.data?.errors);
      console.error('错误消息:', error.message);
      throw error;
    }
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
  addItemToCart(partNumber: string, quantity: number, deliveryDate: Date, unitPrice: number, quoteNumber: string,customerPartNumber:string, currencyCode = 'USD'): void {
    const itemNumber = this.lineItems.length + 1;
    this.lineItems.push({
      customerLineItemNumber: itemNumber,
      tiPartNumber: partNumber, // 零件号
      customerAnticipatedUnitPrice: unitPrice, // 单价
      quoteNumber: quoteNumber, // 报价单号
      customerCurrencyCode: currencyCode, // 货币代码
      customerPartNumber: customerPartNumber, // 客户零件号
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
        endCustomerCompanyName: 'BAIQIANCHENG SHENZHEN',
        checkoutProfileId: '1E9B82A96F4D97CCE063DE21BB8B74B9',
        customerPurchaseOrderNumber: customerOrderNumber,
        shipToAccountNumber: shipTo,
        lineItems: this.lineItems,
      },
    };
    console.log('发送请求为:', JSON.stringify(data, null, 2));
    return this.api.post(url, data);
  }

  // 修改订单
  async changeOrder(customerName: string, customerOrderNumber: string, shipTo: string, lineItems: any[]): Promise<any> {
    const url = getEndpoint(`${this.server}/v2/backlog/orders/changeByCustomerPurchaseOrderNumber/test`);
    const data = {
      order: {
        endCustomerCompanyName: 'BAIQIANCHENG SHENZHEN',
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
