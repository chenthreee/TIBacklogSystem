import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { TIBacklogOrders } from '@/lib/external/TIBacklogAPI'

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params
  const { username } = await req.json()

  try {
    console.log('=== 开始处理订单提交 ===')
    console.log('订单ID:', orderId)
    const order = await Order.findById(orderId)

    if (!order) {
      console.error('订单未找到，订单ID:', orderId)
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    console.log('获取到的订单信息:', JSON.stringify({
      orderNumber: order.orderNumber,
      customer: order.customer,
      componentsCount: order.components.length,
      components: order.components
    }, null, 2))

    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)
    
    console.log('=== 处理订单组件 ===')
    order.components.forEach((component: any) => {
      const deliveryDate = new Date(component.deliveryDate)
      console.log('添加组件到购物车:', JSON.stringify({
        name: component.name.trim(),
        quantity: component.quantity,
        deliveryDate: deliveryDate,
        unitPrice: component.unitPrice,
        quoteNumber: component.quoteNumber,
        k3Code: component.k3Code
      }, null, 2))
      
      try {
        ordersAPI.addItemToCart(
          component.name.trim(), 
          component.quantity, 
          deliveryDate, 
          component.unitPrice, 
          component.quoteNumber, 
          component.k3Code
        )
      } catch (err) {
        console.error('=== 添加组件到购物车失败 ===')
        console.error('错误信息:', {
          component: component.name,
          error: err
        })
        throw err
      }
    })

    console.log('=== 发送订单到 TI ===')
    console.log('提交参数:', JSON.stringify({
      customer: order.customer,
      orderNumber: order.orderNumber,
      shipTo: process.env.SHIP_TO
    }, null, 2))

    try {
      const response = await ordersAPI.postOrder(
        order.customer,
        order.orderNumber,
        process.env.SHIP_TO!
      )

      console.log('TI API 响应:', JSON.stringify(response, null, 2))

      if (!response.orders || !response.orders[0]) {
        console.error('TI返回的响应格式异常:', JSON.stringify(response, null, 2))
        throw new Error('TI返回的响应格式异常')
      }

      order.status = response.orders[0].orderStatus
      order.tiOrderNumber = response.orders[0].orderNumber

      console.log('=== 更新组件状态 ===')
      response.orders[0].lineItems.forEach((lineItem: any) => {
        const component = order.components.find((c: any) => 
          c.name.trim().toLowerCase() === lineItem.tiPartNumber.trim().toLowerCase()
        )
        if (component) {
          console.log('更新组件:', JSON.stringify({
            originalName: component.name,
            newName: lineItem.tiPartNumber.trim(),
            status: lineItem.status,
            tiLineItemNumber: lineItem.tiLineItemNumber
          }, null, 2))
          component.status = lineItem.status
          component.tiLineItemNumber = lineItem.tiLineItemNumber
          component.name = lineItem.tiPartNumber.trim()
        } else {
          console.warn('未找到匹配的组件:', JSON.stringify({
            tiPartNumber: lineItem.tiPartNumber,
            status: lineItem.status
          }, null, 2))
        }
      })

      console.log('记录操作日志，用户:', username)
      order.apiLogs.push({
        operationType: 'submit',
        timestamp: new Date(),
        username: username
      });

      await order.save()
      console.log('订单更新成功，订单号:', order.orderNumber)

      return NextResponse.json({ success: true, tiResponse: response }, { status: 200 })
    } catch (error: any) {
      console.error('=== TI API 调用失败 ===')
      console.error('错误信息:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        errors: error.response?.data?.errors
      })
      
      if (error.response?.data?.orders) {
        console.error('TI 返回的订单详情:', JSON.stringify(error.response.data.orders, null, 2))
        error.response.data.orders.forEach((order: any, index: number) => {
          console.error(`订单 ${index + 1} 详情:`, {
            orderStatus: order.orderStatus,
            orderNumber: order.orderNumber,
            errors: order.errors,
            validationErrors: order.validationErrors,
            lineItems: order.lineItems?.map((item: any) => ({
              tiPartNumber: item.tiPartNumber,
              status: item.status,
              error: item.error,
              validationErrors: item.validationErrors
            }))
          })
        })
      }
      
      throw error
    }
  } catch (error: any) {
    console.error("=== 提交订单到TI时出错 ===")
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      errors: error.response?.data?.errors
    })

    if (error.response?.data?.orders) {
      console.error('完整的订单错误信息:', JSON.stringify(error.response.data.orders, null, 2))
    }

    return NextResponse.json({ 
      error: "提交订单失败",
      details: error.response?.data?.errors || error.message,
      orderErrors: error.response?.data?.orders?.[0]?.errors || [],
      validationErrors: error.response?.data?.orders?.[0]?.validationErrors || [],
      lineItemErrors: error.response?.data?.orders?.[0]?.lineItems?.map((item: any) => ({
        partNumber: item.tiPartNumber,
        error: item.error,
        validationErrors: item.validationErrors
      })) || []
    }, { status: 500 })
  }
}
