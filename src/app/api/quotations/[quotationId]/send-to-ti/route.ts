import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { TIBacklogQuotes } from '@/lib/external/TIBacklogAPI';

export async function POST(
  request: Request,
  { params }: { params: { quotationId: string } }
) {
  try {
    await dbConnect();

    const { quotationId } = params;

    // 从数据库中获取报价信息
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return NextResponse.json({ error: "未找到报价单" }, { status: 404 });
    }

    // 初始化 TIBacklogQuotes
    const tiQuotes = new TIBacklogQuotes(
      process.env.CLIENT_ID || '',
      process.env.CLIENT_SECRET || '',
      process.env.SERVER_URL || ''
    );

    // 遍历报价单中的每个元件，并添加到 TI 报价中
    for (const component of quotation.components) {
      tiQuotes.addItemToQuote(component.name, component.quantity);
    }

    // 发送报价到 TI
    const tiResponse = await tiQuotes.postQuote(quotation.customer);

    // 打印 TI 的响应
    console.log('TI 响应:', JSON.stringify(tiResponse, null, 2));

    // 更新数据库中的报价信息
    const updatedQuotation = await Quotation.findOneAndUpdate(
      { customerQuoteNumber: quotation.customerQuoteNumber },
      {
        $set: {
          quoteNumber: tiResponse.quotes[0].quoteNumber,
          quoteStatus: tiResponse.quotes[0].quoteStatus,
          'components.$[].status': 'onTheWay'  // 先将所有组件状态设置为 Pending
        }
      },
      { new: true, runValidators: true }
    );

    // 然后，逐个更新匹配的组件状态
    for (const tiComponent of tiResponse.quotes[0].lineItems) {
      await Quotation.updateOne(
        { 
          customerQuoteNumber: quotation.customerQuoteNumber,
          'components.name': tiComponent.tiPartNumber
        },
        {
          $set: {
            'components.$.status': tiComponent.status
          }
        }
      );
    }

    if (!updatedQuotation) {
      throw new Error('更新报价单失败');
    }

    return NextResponse.json({ message: "报价已成功发送到TI并更新", updatedQuotation, tiResponse }, { status: 200 });
  } catch (error) {
    console.error("发送报价到TI时出错:", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}