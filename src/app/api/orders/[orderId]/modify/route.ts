import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import Quotation from '@/models/Quotation'
import { TIBacklogOrders } from '@/lib/external/TIBacklogAPI'

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params
  const { components } = await req.json()

  try {
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (!order.tiOrderNumber) {
      return NextResponse.json({ error: '该订单尚未提交到 TI' }, { status: 400 })
    }

    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)
    
    console.log('传入的components:', JSON.stringify(components, null, 2));

    // 准备修改订单的数据
    const lineItems = []
    for (const component of components) {
      // 查找对应的报价
      const quotation = await Quotation.findOne({
        quoteNumber: component.quoteNumber,
        'components.name': component.name,
        'components.tiPartNumber': component.tiPartNumber
      })

      if (!quotation) {
        return NextResponse.json({ 
          error: '修改失败：新的TI报价号中无对应的元件', 
          componentName: component.name 
        }, { status: 400 })
      }

      const matchedComponent = quotation.components.find(
        (c: any) => c.name === component.name && c.tiPartNumber === component.tiPartNumber
      )

      if (!matchedComponent) {
        return NextResponse.json({ 
          error: '修改失败：新的TI报价号中无对应的元件', 
          componentName: component.name 
        }, { status: 400 })
      }

      // 找到组件在原始订单中的索引
      const originalIndex = order.components.findIndex((c: any) => c.id === component.id)

      lineItems.push({
        customerLineItemNumber: originalIndex + 1, // 使用原始订单中的索引 + 1
        lineItemChangeIndicator: component.isDeleted ? 'X' : 'U', // 'X' for delete, 'U' for update
        tiPartNumber: component.name,
        customerAnticipatedUnitPrice: matchedComponent.tiPrice,
        customerCurrencyCode: 'USD', // 假设使用美元，您可能需要根据实际情况调整
        quoteNumber: component.quoteNumber,
        schedules: [
          {
            requestedQuantity: component.quantity,
            requestedDeliveryDate: component.deliveryDate,
          },
        ],
      })
    }

    console.log('准备发送到TI的lineItems:', JSON.stringify(lineItems, null, 2));
    // 发送修改订单请求
    const response = await ordersAPI.changeOrder(
      order.customer,
      order.orderNumber,
      process.env.SHIP_TO!, // 确保在环境变量中设置了 SHIP_TO
      lineItems
    )

    console.log('TI API 修改订单响应:', JSON.stringify(response, null, 2))

    // 更新本地订单信息
    order.status = response.orders[0].orderStatus
    order.components = order.components.map((comp: any) => {
      const updatedComp = components.find((c: any) => c.id === comp.id)
      if (updatedComp) {
        const tiLineItem = response.orders[0].lineItems.find((li: any) => li.tiPartNumber === updatedComp.name)
        if (tiLineItem) {
          return {
            ...comp,
            ...updatedComp,
            status: updatedComp.isDeleted ? 'deleted' : tiLineItem.status,
            tiLineItemNumber: tiLineItem.tiLineItemNumber,
            quantity: tiLineItem.schedules[0].requestedQuantity,
            deliveryDate: tiLineItem.schedules[0].requestedDeliveryDate,
            quoteNumber: tiLineItem.quoteNumber,
          }
        }
        return { ...comp, ...updatedComp, status: updatedComp.isDeleted ? 'deleted' : comp.status }
      }
      return comp
    })

    // 重新计算总金额，排除被标记为删除的组件
    order.totalAmount = order.components.reduce((sum: number, comp: any) => {
      return comp.status !== 'deleted' ? sum + (comp.quantity * comp.unitPrice) : sum
    }, 0)

    await order.save()

    return NextResponse.json({ success: true, order, tiResponse: response }, { status: 200 })
  } catch (error) {
    console.error('修改订单时出错:', error)
    return NextResponse.json({ error: '修改订单失败' }, { status: 500 })
  }
}