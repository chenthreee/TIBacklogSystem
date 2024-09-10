import { NextResponse } from 'next/server';

// 模拟数据库中的报价数据
const quotations = [
  {
    id: 1,
    date: '2023-06-05',
    customer: '客户A',
    totalAmount: 15000,
    components: [
      { id: 1, name: '电阻', quantity: 1000, unitPrice: 0.5 },
      { id: 2, name: '电容', quantity: 500, unitPrice: 1 },
      { id: 3, name: '晶体管', quantity: 200, unitPrice: 5 },
    ],
  },
  {
    id: 2,
    date: '2023-06-06',
    customer: '客户B',
    totalAmount: 22000,
    components: [
      { id: 4, name: '集成电路', quantity: 100, unitPrice: 50 },
      { id: 5, name: '二极管', quantity: 1000, unitPrice: 2 },
      { id: 6, name: 'LED', quantity: 500, unitPrice: 3 },
    ],
  },
];

// 处理 GET 请求的 API 路由
export async function GET() {
  return NextResponse.json(quotations);
}

// 处理其他 HTTP 方法
export async function POST() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
