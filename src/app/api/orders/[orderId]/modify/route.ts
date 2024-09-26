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
  const { components, username } = await req.json() // 从请求体中获取组件和用户名

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

    const lineItems = []
    for (const component of components) {
      // 处理所有组件，包括不需要修改的
      const quotation = await Quotation.findOne({
        quoteNumber: component.quoteNumber,
        'components.name': component.name,
        'components.tiPartNumber': component.tiPartNumber
      })

      if (!quotation) {
        return NextResponse.json({ 
          error: '修改失败：TI报价号中无对应的元件', 
          componentName: component.name 
        }, { status: 400 })
      }

      const matchedComponent = quotation.components.find(
        (c: any) => c.name === component.name && c.tiPartNumber === component.tiPartNumber
      )

      if (!matchedComponent) {
        return NextResponse.json({ 
          error: '修改失败：TI报价号中无对应的元件', 
          componentName: component.name 
        }, { status: 400 })
      }

      const originalIndex = order.components.findIndex((c: any) => c.id === component.id)

      lineItems.push({
        customerLineItemNumber: originalIndex + 1,
        lineItemChangeIndicator: component.lineItemChangeIndicator,
        tiPartNumber: component.tiPartNumber || component.name,
        customerAnticipatedUnitPrice: matchedComponent.tiPrice,
        customerCurrencyCode: 'USD',
        quoteNumber: component.quoteNumber,
        schedules: [
          {
            requestedQuantity: parseInt(component.quantity),
            requestedDeliveryDate: new Date(component.deliveryDate).toISOString().split('T')[0],
          },
        ],
      })
    }

    console.log('准备发送到TI的lineItems:', JSON.stringify(lineItems, null, 2));
    const response = await ordersAPI.changeOrder(
      order.customer,
      order.orderNumber,
      process.env.SHIP_TO!,
      lineItems
    )

    console.log('TI API 修改订单响应:', JSON.stringify(response, null, 2))

    order.status = response.orders[0].orderStatus
    order.components = order.components.map((comp: any) => {
      const updatedComp = components.find((c: any) => c.id === comp.id)
      if (updatedComp) {
        const tiLineItem = response.orders[0].lineItems.find((li: any) => li.tiPartNumber === updatedComp.tiPartNumber || li.tiPartNumber === updatedComp.name)
        if (tiLineItem) {
          const newComp = {
            ...comp,
            ...updatedComp,
            status: updatedComp.lineItemChangeIndicator === 'X' ? 'deleted' : tiLineItem.status,
            tiLineItemNumber: tiLineItem.tiLineItemNumber,
            quantity: tiLineItem.schedules[0].requestedQuantity,
            deliveryDate: tiLineItem.schedules[0].requestedDeliveryDate,
            quoteNumber: tiLineItem.quoteNumber,
          }
          // 只有在存在确认信息时才更新
          if (tiLineItem.schedules[0]?.confirmations) {
            newComp.confirmations = tiLineItem.schedules[0].confirmations.map((conf: any) => ({
              tiScheduleLineNumber: conf.tiScheduleLineNumber,
              scheduledQuantity: conf.scheduledQuantity,
              estimatedShipDate: conf.estimatedShipDate,
              estimatedDeliveryDate: conf.estimatedDeliveryDate,
              estimatedDeliveryDateStatus: conf.estimatedDeliveryDateStatus,
              shippedQuantity: conf.shippedQuantity,
              customerRequestedShipDate: conf.customerRequestedShipDate
            }))
          }
          return newComp
        }
        return { ...comp, ...updatedComp, status: updatedComp.lineItemChangeIndicator === 'X' ? 'deleted' : comp.status }
      }
      return comp
    })

    order.totalAmount = order.components.reduce((sum: number, comp: any) => {
      return comp.status !== 'deleted' ? sum + (comp.quantity * comp.unitPrice) : sum
    }, 0)

    // 添加 API 调用日志，包含用户名
    order.apiLogs.push({
      operationType: 'modify',
      timestamp: new Date(),
      username: username // 添加用户名
    });

    await order.save()

    return NextResponse.json({ success: true, order, tiResponse: response }, { status: 200 })
  } catch (error: any) {
    console.error('修改订单时出错:', error)
    // 添加更详细的错误信息
    const errorMessage = error.response?.data || error.message || '未知错误';
    return NextResponse.json({ error: '修改订单失败', details: errorMessage }, { status: 500 })
  }
}