import { TIBacklogOrders, TIBacklogQuotes, TIBacklogInvoice, TIBacklogASN, TIBacklogRemittance } from './TIBacklogAPI';
import { format } from 'date-fns';

class BacklogAPITest {
  private server: string;
  private clientID: string;
  private clientSecret: string;
  private shipTo: string;
  private soldTo: string;
  private payerID: string;
  private opn: string;
  private testID: string;
  private now: Date;
  private ordersAPI!: TIBacklogOrders;
  private quotesAPI!: TIBacklogQuotes;
  private invoiceAPI!: TIBacklogInvoice;
  private asnAPI!: TIBacklogASN;
  private remittanceAPI!: TIBacklogRemittance;

  constructor(server: string, clientID: string, clientSecret: string, shipTo: string, soldTo: string, payerID: string, opn = 'SN74LS00N') {
    this.server = server;
    this.clientID = clientID;
    this.clientSecret = clientSecret;
    this.shipTo = shipTo;
    this.soldTo = soldTo;
    this.payerID = payerID;
    this.opn = opn;

    // 获取当前时间并生成测试ID
    this.now = new Date();
    this.testID = format(this.now, "yyyyMMddHHmmss");
  }

  // 初始化API类
  async initAPIs(): Promise<void> {
    this.ordersAPI = new TIBacklogOrders(this.clientID, this.clientSecret, this.server);
    this.quotesAPI = new TIBacklogQuotes(this.clientID, this.clientSecret, this.server);
    this.invoiceAPI = new TIBacklogInvoice(this.clientID, this.clientSecret, this.server);
    this.asnAPI = new TIBacklogASN(this.clientID, this.clientSecret, this.server);
    this.remittanceAPI = new TIBacklogRemittance(this.clientID, this.clientSecret, this.server);
  }

  // 创建报价
  async createQuote(): Promise<string> { // 修改返回类型为 Promise<string>
    this.quotesAPI.addItemToQuote('SN74LS00N', 10000);
    const response = await this.quotesAPI.postQuote('BQCDZ');
    const quoteNumber = response.quotes[0].quoteNumber;
    console.log('Create Quote:', response);
    return quoteNumber; // 确保返回 quoteNumber
  }

  // 获取报价
  async retrieveQuote(quoteNumber: string): Promise<void> {
    const response = await this.quotesAPI.getQuote(quoteNumber);
    console.log('Retrieve Quote:', response);
  }

  // 创建订单
  async createOrder(): Promise<string> {
    this.ordersAPI.addItemToCart('SN7407N', 10000, new Date(2027, 5, 15), 0.3);
    const response = await this.ordersAPI.postOrder('Test Customer', this.testID, this.shipTo);
    const orderNumber = response.orders[0].customerPurchaseOrderNumber;
    console.log('Create Order:', response);
    return orderNumber;
  }

  // 获取订单
  async retrieveOrder(orderNumber: string): Promise<void> {
    const response = await this.ordersAPI.retrieveOrderByCustomerNumber(orderNumber);
    console.log('Retrieve Order:', response);
  }

  // 修改订单
  async changeOrder(orderNumber: string): Promise<void> {
    const lineItems = [
      {
        customerLineItemNumber: 1,
        lineItemChangeIndicator: 'U',
        tiPartNumber: 'SN7407N',
        customerAnticipatedUnitPrice: 0.5,
        customerCurrencyCode: 'USD',
        schedules: [
          {
            requestedQuantity: 5000,
            requestedDeliveryDate: '2027-08-15',
          },
        ],
      },
    ];
    const response = await this.ordersAPI.changeOrder('Test Customer', orderNumber, this.shipTo, lineItems);
    console.log('Change Order:', response);
  }

  // 获取发票
  async retrieveInvoice(orderNumber: string): Promise<void> {
    const response = await this.invoiceAPI.retrieveByCustomerOrderNumber(orderNumber);
    console.log('Retrieve Invoice:', response);
  }

  // 获取ASN
  async retrieveASN(orderNumber: string): Promise<void> {
    const response = await this.asnAPI.retrieveByCustomerOrderNumber(orderNumber);
    console.log('Retrieve ASN:', response);
  }

  // 发送汇款通知
  async postRemittance(orderNumber: string): Promise<void> {
    const lineItem = {
      paymentAmount: 20000,
      financialDocumentNumber: 5497396240,
    };
    const response = await this.remittanceAPI.postRemittance(this.testID, [lineItem]);
    console.log('Post Remittance:', response);
  }

  // 执行测试
  async runTest(): Promise<void> {
    await this.initAPIs();

    console.log(`Running test with Test ID: ${this.testID}`);

    // 创建并获取报价
    const quoteNumber = await this.createQuote(); // 确保 quoteNumber 是 string 类型
    await this.retrieveQuote(quoteNumber);

    // 创建并获取订单
    const orderNumber = await this.createOrder();
    await this.retrieveOrder(orderNumber);

    // 修改订单
    await this.changeOrder(orderNumber);

    // 获取发票
    await this.retrieveInvoice(orderNumber);

    // 获取ASN
    await this.retrieveASN(orderNumber);

    // 发送汇款通知
    await this.postRemittance(orderNumber);

    console.log('Test completed successfully');
  }
}

// 示例执行代码
export async function runBacklogAPITest() {
  const backlogTest = new BacklogAPITest(
    process.env.SERVER_URL || '',
    process.env.CLIENT_ID || '',
    process.env.CLIENT_SECRET || '',
    'Ship_id_01',
    'Sold_to_01',
    'Payer_01'
  );

  try {
    await backlogTest.runTest();
  } catch (error) {
    console.error('Error running backlog API test:', error);
  }
}
