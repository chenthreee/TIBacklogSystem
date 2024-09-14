import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { checkQuotationDataTypes , getDetailedType} from '@/lib/dataTypeChecker';

// 模拟数据库中的报价数据
export async function GET() {
  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    console.log('Fetching quotations...');
    const quotations = await Quotation.find({}).lean();
    
    //console.log('Quotations (before formatting):', quotations); 

    const dataTypes = checkQuotationDataTypes(quotations);
    //console.log('Data types:', JSON.stringify(dataTypes, null, 2));

    if (!dataTypes.isArray) {
      return NextResponse.json({ error: 'Data is not an array' }, { status: 500 });
    }


    // const formattedQuotations = quotations.map((q) => {
    //   const subQuotations = q.quotations || [];  // 获取嵌套数组

    //   // 处理每个子报价信息
    //   return subQuotations.map((subQ: any) => ({
    //     id: q._id?.toString(),
    //     date: subQ.date || 'N/A',  // 从子对象中获取字段
    //     customer: subQ.customer || 'N/A',
    //     totalAmount: subQ.totalAmount ? Number(subQ.totalAmount) : 0,
    //     components: Array.isArray(subQ.components) ? subQ.components.map((c: any) => ({
    //       id: c._id?.toString(),
    //       name: c.name || 'N/A',
    //       quantity: Number(c.quantity) || 0,
    //       unitPrice: Number(c.unitPrice) || 0
    //     })) : []
    //   }));
    // }).flat();  // 平坦化数组，将嵌套的报价合并到一个数组中


    // 直接映射主文档中的数据
    const formattedQuotations = quotations.map((q) => ({
      id: q._id?.toString(),  // 将 MongoDB ObjectId 转为字符串
      date: q.date || 'N/A',
      customer: q.customer || 'N/A',
      totalAmount: q.totalAmount ? Number(q.totalAmount) : 0,
      components: Array.isArray(q.components) ? q.components.map((c: any) => ({
        id: c._id?.toString(),
        name: c.name || 'N/A',
        quantity: Number(c.quantity) || 0,
        unitPrice: Number(c.unitPrice) || 0
      })) : []
    }));

    console.log('Formatted quotations:', JSON.stringify(formattedQuotations, null, 3));

    return NextResponse.json(formattedQuotations);
  } catch (error) {
    console.error('Error in GET /api/quotations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 连接数据库
    await dbConnect();

    // 获取前端发送的数据
    const data = await request.json();

    // 创建新的报价对象并保存到数据库
    const newQuotation = new Quotation(data);
    const savedQuotation = await newQuotation.save();

    // 返回保存成功的响应
    return NextResponse.json(savedQuotation, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/quotations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}