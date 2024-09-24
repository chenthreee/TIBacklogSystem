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
    let quotation = await Quotation.findById(quotationId);

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
    let updatedComponents = quotation.components.map((component: any) => {
      const tiComponent = tiQuote.lineItems.find((item: any) => item.tiPartNumber === component.name);
      if (tiComponent) {
        console.log(`Updating component ${component.name}:`);
        console.log(`  - Original MOQ: ${component.moq}`);
        console.log(`  - Original NQ: ${component.nq}`);
        console.log(`  - TI minimumOrderQuantity: ${tiComponent.minimumOrderQuantity}`);
        console.log(`  - TI nextOrderQuantityIncrement: ${tiComponent.nextOrderQuantityIncrement}`);
        
        const updatedComponent = {
          ...component.toObject(),
          status: tiComponent.status,
          tiPrice: tiComponent.tiUnitPrice,
          moq: tiComponent.minimumOrderQuantity,
          nq: tiComponent.nextOrderQuantityIncrement
        };
        
        console.log(`  - Updated component:`, JSON.stringify(updatedComponent, null, 2));
        return updatedComponent;
      } else {
        console.log(`No matching TI component found for ${component.name}`);
        return component.toObject();
      }
    });

    console.log('After updating components:', JSON.stringify(updatedComponents, null, 2));

    // 确保 components 数组中的每个元素都是普通对象，并且保留 moq 字段
    quotation.components = updatedComponents;

    // 更新整个报价单
    if (tiQuote.quoteStartDate) {
      quotation.quoteStartDate = new Date(tiQuote.quoteStartDate).toISOString().split('T')[0];
    }
    if (tiQuote.quoteEndDate) {
      quotation.quoteEndDate = new Date(tiQuote.quoteEndDate).toISOString().split('T')[0];
    }

    console.log(`Updated quote dates: Start: ${quotation.quoteStartDate}, End: ${quotation.quoteEndDate}`);

    console.log('Before saving, quotation components:', JSON.stringify(quotation.components, null, 2));

    // 标记 components 数组已被修改
    quotation.markModified('components');

    // 保存更新后的报价单
    try {
      await quotation.save();
      console.log('Quotation saved successfully');
    } catch (saveError) {
      console.error('Error saving quotation:', saveError);
      throw saveError;
    }

    // 重新获取更新后的报价单以确保所有更改都被保存
    quotation = await Quotation.findById(quotationId);

    console.log('After saving and retrieving, quotation components:', JSON.stringify(quotation.components, null, 2));

    // 检查更新后的 moq 值
    quotation.components.forEach((component: any) => {
      console.log(`Component ${component.name} - MOQ after update: ${component.moq}`);
    });

    console.log('Sending response:', JSON.stringify({
      quotation: {
        ...quotation.toObject(),
        components: quotation.components.map((component: any) => ({
          ...component.toObject(),
          moq: component.moq
        }))
      },
      tiResponse: {
        ...tiResponse,
        quotes: tiResponse.quotes.map((quote: any) => ({
          ...quote,
          lineItems: quote.lineItems.map((item: any) => ({
            ...item,
            minimumOrderQuantity: item.minimumOrderQuantity
          }))
        }))
      }
    }, null, 2));

    return NextResponse.json({
      quotation: quotation.toObject(),
      tiResponse
    }, { status: 200 });
  } catch (error) {
    console.error("查询报价时出错:", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}