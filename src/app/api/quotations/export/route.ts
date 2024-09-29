import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { quotationIds } = await req.json();

    const quotations = await Quotation.find({ _id: { $in: quotationIds } }).lean();

    const exportData = [];

    for (const quotation of quotations) {
      for (const component of quotation.components) {
        exportData.push({
          报价单号: quotation.quoteNumber,
          客户报价编号: quotation.customerQuoteNumber,
          客户: quotation.customer,
          日期: quotation.date,
          总金额: quotation.totalAmount,
          报价状态: quotation.quoteStatus,
          报价开始日期: quotation.quoteStartDate,
          报价结束日期: quotation.quoteEndDate,
          元件ID: component.id,
          元件名称: component.name,
          数量: component.quantity,
          单价: component.unitPrice,
          TI价格: component.tiPrice,
          小计: component.quantity * component.unitPrice,
          MOQ: component.moq,
          NQ: component.nq,
          状态: component.status,
          交期: component.deliveryDate,
          K3编码: component.k3Code,
          类型: component.type,
          规格描述: component.description
        });
      }
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('导出报价单时出错:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}