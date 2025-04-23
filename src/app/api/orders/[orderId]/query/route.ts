import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { TIBacklogOrders } from '@/lib/external/TIBacklogAPI'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params

  try {
    console.log('=== 开始查询订单 ===')
    console.log('订单ID:', orderId)
    
    const order = await Order.findById(orderId)

    if (!order) {
      console.error('订单未找到，订单ID:', orderId)
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (!order.tiOrderNumber) {
      console.error('订单尚未提交到TI，订单号:', order.orderNumber)
      return NextResponse.json({ error: '该订单尚未提交到 TI' }, { status: 400 })
    }

    console.log('查询订单信息:', JSON.stringify({
      orderNumber: order.orderNumber,
      customer: order.customer,
      tiOrderNumber: order.tiOrderNumber
    }, null, 2))

    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)

    try {
      console.log('=== 发送查询请求到 TI ===')
      const tiResponse = await ordersAPI.retrieveOrderByCustomerNumber(order.orderNumber)
      console.log('TI API 响应:', JSON.stringify(tiResponse, null, 2))

      if (!tiResponse.orders || !tiResponse.orders[0]) {
        console.error('TI返回的响应格式异常:', JSON.stringify(tiResponse, null, 2))
        throw new Error('TI返回的响应格式异常')
      }

      order.status = tiResponse.orders[0].orderStatus
      
      console.log('=== 更新组件状态 ===')
      order.components = order.components.map((comp: any) => {
        // 在所有订单中查找匹配项
        const allLineItems = tiResponse.orders.flatMap((order: any) => order.lineItems);
        
        // 添加调试日志
        console.log('正在查找组件:', JSON.stringify({
          name: comp.name,
          tiLineItemNumber: comp.tiLineItemNumber,
          allItems: allLineItems.map((item :any)  => ({
            tiPartNumber: item.tiPartNumber,
            tiLineItemNumber: item.tiLineItemNumber
          }))
        }, null, 2));

        // 先尝试通过零件号和tiLineItemNumber同时匹配
        let exactMatch = allLineItems.find((li: any) => {
          const normalizedTiPart = li.tiPartNumber.trim().toLowerCase();
          const normalizedCompName = comp.name.trim().toLowerCase();
          return normalizedTiPart === normalizedCompName && 
                 li.tiLineItemNumber === comp.tiLineItemNumber;
        });

        // 如果找不到完全匹配，则只通过零件号匹配
        if (!exactMatch) {
          console.log('未找到完全匹配，尝试仅通过零件号匹配');
          exactMatch = allLineItems.find((li: any) => {
            const normalizedTiPart = li.tiPartNumber.trim().toLowerCase();
            const normalizedCompName = comp.name.trim().toLowerCase();
            return normalizedTiPart === normalizedCompName;
          });
        }
        
        // 使用匹配的项，如果找到的话
        const tiLineItem = exactMatch || null;

        if (tiLineItem) {
          console.log('更新组件:', JSON.stringify({
            name: comp.name,
            tiLineItemNumber: comp.tiLineItemNumber,
            status: tiLineItem.status,
            quantity: tiLineItem.tiTotalOrderItemQuantity
          }, null, 2))
          
          comp.status = tiLineItem.status
          comp.quantity = tiLineItem.tiTotalOrderItemQuantity
          comp.unitPrice = tiLineItem.customerAnticipatedUnitPrice
          comp.tiLineItemNumber = tiLineItem.tiLineItemNumber
          comp.name = tiLineItem.tiPartNumber.trim()
          
          if (tiLineItem.schedules && tiLineItem.schedules[0] && tiLineItem.schedules[0].confirmations) {
            comp.confirmations = tiLineItem.schedules[0].confirmations.map((conf: any) => ({
              tiScheduleLineNumber: conf.tiScheduleLineNumber,
              scheduledQuantity: conf.scheduledQuantity,
              estimatedShipDate: conf.estimatedShipDate,
              estimatedDeliveryDate: conf.estimatedDeliveryDate,
              estimatedDeliveryDateStatus: conf.estimatedDeliveryDateStatus,
              shippedQuantity: conf.shippedQuantity,
              customerRequestedShipDate: conf.customerRequestedShipDate
            }))
          } else {
            comp.confirmations = []
          }
        } else {
          console.warn('未找到匹配的组件:', JSON.stringify({
            componentName: comp.name
          }, null, 2))
        }
        return comp
      })
      
      console.log('保存更新后的订单')
      await order.save()

      return NextResponse.json({ success: true, order, tiResponse }, { status: 200 })
    } catch (error: any) {
      console.error('=== TI API 调用失败 ===')
      console.error('错误信息:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        errors: error.response?.data?.errors
      })
      
      // 详细打印错误数组
      if (error.response?.data?.errors) {
        console.error('TI 返回的错误详情:', JSON.stringify(error.response.data.errors, null, 2))
      }
      
      throw error
    }
  } catch (error: any) {
    console.error("=== 查询订单失败 ===")
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      errors: error.response?.data?.errors
    })

    // 同样在外层 catch 中也详细打印
    if (error.response?.data?.errors) {
      console.error('完整的错误信息:', JSON.stringify(error.response.data.errors, null, 2))
    }

    return NextResponse.json({ 
      error: '查询订单失败',
      details: error.response?.data?.errors || error.message,
      tiErrors: error.response?.data?.errors || []
    }, { status: error.response?.status || 500 })
  }
}
