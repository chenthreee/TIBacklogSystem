import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { TIBacklogQuotes } from '@/lib/external/TIBacklogAPI';

export async function GET(
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

    const quoteNumber = quotation.quoteNumber;

    if (!quoteNumber) {
      return NextResponse.json({ error: "该报价单尚未发送到 TI" }, { status: 400 });
    }

    // 初始化 TIBacklogQuotes
    const tiQuotes = new TIBacklogQuotes(
      process.env.CLIENT_ID || '',
      process.env.CLIENT_SECRET || '',
      process.env.SERVER_URL || ''
    );

    // 调用 TI API 获取报价信息
    const tiResponse = await tiQuotes.getQuote(quoteNumber);

    console.log('TI 响应:', JSON.stringify(tiResponse, null, 2));

    // 从 TI 响应中找到对应的报价条目
    const tiQuote = tiResponse.quotes.find((quote: any) => quote.quoteNumber === quoteNumber);
    
    if (!tiQuote) {
      return NextResponse.json({ error: "未在 TI 响应中找到对应的报价" }, { status: 404 });
    }

    // 更新报价单中的组件信息
    for (const tiComponent of tiQuote.lineItems) {
      await Quotation.updateOne(
        { 
          _id: quotationId,
          'components.name': tiComponent.tiPartNumber
        },
        {
          $set: {
            'components.$.status': tiComponent.status,
            'components.$.tiPrice': tiComponent.tiUnitPrice
          }
        }
      );
    }

    // 获取更新后的报价单
    const updatedQuotation = await Quotation.findById(quotationId);

    return NextResponse.json({ quotation: updatedQuotation, tiResponse }, { status: 200 });
  } catch (error) {
    console.error("查询报价时出错:", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}