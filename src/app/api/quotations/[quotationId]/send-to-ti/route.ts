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
    console.log('=== 处理报价请求 ===');
    console.log('报价单ID:', quotationId);

    // 从数据库中获取报价信息
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      console.error('未找到报价单:', quotationId);
      return NextResponse.json({ error: "未找到报价单" }, { status: 404 });
    }

    console.log('获取到的报价单:', JSON.stringify(quotation, null, 2));

    // 初始化 TIBacklogQuotes
    const tiQuotes = new TIBacklogQuotes(
      process.env.CLIENT_ID || '',
      process.env.CLIENT_SECRET || '',
      process.env.SERVER_URL || ''
    );

    console.log('=== 处理报价单元件 ===');
    // 遍历报价单中的每个元件，并添加到 TI 报价中
    for (const component of quotation.components) {
      console.log('处理元件:', JSON.stringify(component, null, 2));
      tiQuotes.addItemToQuote(component.name.trim(), component.quantity);
    }

    try {
      // 发送报价到 TI
      console.log('=== 发送报价到 TI ===');
      const tiResponse = await tiQuotes.postQuote(quotation.customer);
      console.log('TI 响应:', JSON.stringify(tiResponse, null, 2));

      // 更新数据库中的报价信息，保留 'onTheWay' 状态
      const updatedQuotation = await Quotation.findOneAndUpdate(
        { customerQuoteNumber: quotation.customerQuoteNumber },
        {
          $set: {
            quoteNumber: tiResponse.quotes[0].quoteNumber,
            quoteStatus: tiResponse.quotes[0].quoteStatus,
            'components.$[].status': 'onTheWay'  // 保留这一行，将所有组件状态设置为 onTheWay
          }
        },
        { new: true, runValidators: true }
      );

      console.log('更新后的报价单:', JSON.stringify(updatedQuotation, null, 2));

      // 然后，逐个更新匹配的组件信息
      for (const tiComponent of tiResponse.quotes[0].lineItems) {
        const trimmedPartNumber = tiComponent.tiPartNumber.trim();
        console.log(`正在更新组件 ${trimmedPartNumber}:`);
        
        const updateResult = await Quotation.updateOne(
          { 
            customerQuoteNumber: quotation.customerQuoteNumber,
            'components.name': { $regex: new RegExp('^\\s*' + trimmedPartNumber + '\\s*$', 'i') }
          },
          {
            $set: {
              'components.$.name': trimmedPartNumber, // 更新组件名称，去除多余的空格
              'components.$.tiPrice': tiComponent.tiUnitPrice,
              'components.$.tiCurrency': tiComponent.tiUnitPriceCurrencyCode,
              'components.$.moq': tiComponent.minimumOrderQuantity,
              'components.$.nq': tiComponent.nextOrderQuantityIncrement,
              'components.$.status':tiComponent.status
            }
          }
        );

        console.log('更新结果:', JSON.stringify(updateResult, null, 2));

        // 获取更新后的组件信息
        const updatedComponent = await Quotation.findOne(
          { 
            customerQuoteNumber: quotation.customerQuoteNumber,
            'components.name': trimmedPartNumber
          },
          { 'components.$': 1 }
        );

        console.log('更新后的组件:', JSON.stringify(updatedComponent?.components[0], null, 2));
      }

      if (!updatedQuotation) {
        throw new Error('更新报价单失败');
      }

      // 重新获取更新后的完整报价单
      const finalQuotation = await Quotation.findById(quotationId);

      return NextResponse.json({ 
        message: "报价已成功发送到TI并更新", 
        updatedQuotation: finalQuotation, 
        tiResponse 
      }, { status: 200 });
    } catch (error: any) {
      console.error('=== TI API 调用失败 ===');
      console.error('错误信息:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        errors: error.response?.data?.errors
      });
      throw error;
    }

  } catch (error: any) {
    console.error("=== 发送报价到TI时出错 ===");
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      errors: error.response?.data?.errors
    });
    return NextResponse.json({ 
      error: "内部服务器错误",
      details: error.response?.data?.errors || error.message
    }, { status: 500 });
  }
}
