import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { TIBacklogASN } from '@/lib/external/TIBacklogAPI'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params

  try {
    const order = await Order.findOne({ orderNumber: orderId })

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (!order.tiOrderNumber) {
      return NextResponse.json({ error: '该订单尚未提交到 TI' }, { status: 400 })
    }

    // 初始化 TIBacklogASN
    const asnAPI = new TIBacklogASN(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)

    // 查询 TI ASN
    const tiResponse = await asnAPI.retrieveByCustomerOrderNumber(order.orderNumber)

    // 打印完整的响应，包括嵌套内容
    console.log('TI ASN API 响应:', JSON.stringify(tiResponse, null, 2))

    // 提取预计到达日期和发货日期
    const consolidatedInfo = tiResponse.data.consolidatedInformation[0]

    // 确保 consolidatedInfo 和 bookingOrderDetails 存在
    if (!consolidatedInfo || !consolidatedInfo.bookingOrderDetails) {
      console.error('TI ASN API 响应中缺少 bookingOrderDetails')
      return NextResponse.json({ error: 'TI ASN API 响应中缺少 bookingOrderDetails' }, { status: 500 })
    }

    const bookingOrderDetails = consolidatedInfo.bookingOrderDetails

    // 打印 bookingOrderDetails 以调试
    console.log('bookingOrderDetails:', JSON.stringify(bookingOrderDetails, null, 2))

    // 确保 bookingOrderDetails 和 packageDetails 存在
    if (!bookingOrderDetails[0] || !bookingOrderDetails[0].packageDetails) {
      console.error('TI ASN API 响应中缺少 packageDetails')
      return NextResponse.json({ error: 'TI ASN API 响应中缺少 packageDetails' }, { status: 500 })
    }

    const packageDetails = bookingOrderDetails[0].packageDetails

    // 打印 packageDetails 以调试
    console.log('packageDetails:', JSON.stringify(packageDetails, null, 2))

    // 更新每个组件的信息
    order.components.forEach((component: any) => {
      let matchingItem = null;
      packageDetails.forEach((pkg: any) => {
        const item = pkg.itemDetails.find((i: any) => i.tiPartNumber === component.name)
        if (item) {
          matchingItem = item;
        }
      })
      if (matchingItem) {
        component.shippingDate = consolidatedInfo.shippingDate
        component.estimatedDateOfArrival = consolidatedInfo.estimatedDateOfArrival
        component.carrier = consolidatedInfo.carrierShipmentMasterTrackingNumber
        console.log('更新的组件信息:', JSON.stringify(component, null, 2)) // 添加这行来打印更新后的组件信息
      } else {
        console.warn(`未找到匹配的组件: ${component.name}`)
      }
    })

    // 保存订单信息到数据库
    await order.save()

    // 打印更新后的订单信息
    console.log('更新后的订单信息:', JSON.stringify(order, null, 2))

    return NextResponse.json({ 
      success: true, 
      components: order.components,
      tiResponse
    }, { status: 200 })
  } catch (error) {
    console.error('刷新物流信息时出错:', error)
    return NextResponse.json({ error: '刷新物流信息失败' }, { status: 500 })
  }
}