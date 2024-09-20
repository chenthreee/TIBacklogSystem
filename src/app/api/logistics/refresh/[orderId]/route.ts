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

    console.log('TI ASN API 响应:', JSON.stringify(tiResponse, null, 2))

    // 创建一个映射来存储所有的 itemDetails
    const itemDetailsMap = new Map()

    // 处理所有的 consolidatedInformation
    tiResponse.data.consolidatedInformation.forEach((consolidatedInfo: any) => {
      //console.error('consolidatedInfo:', JSON.stringify(consolidatedInfo, null, 2))

      if (!consolidatedInfo.bookingOrderDetails) {
        console.error('TI ASN API 响应中缺少 bookingOrderDetails')
        return // 跳过这个 consolidatedInfo
      }

      // 遍历所有的 bookingOrderDetails
      consolidatedInfo.bookingOrderDetails.forEach((booking: any) => {
        if (booking.packageDetails) {
          booking.packageDetails.forEach((pkg: any) => {
            if (pkg.itemDetails) {
              pkg.itemDetails.forEach((item: any) => {
                itemDetailsMap.set(item.tiPartNumber, {
                  ...item,
                  shippingDate: consolidatedInfo.shippingDate,
                  estimatedDateOfArrival: consolidatedInfo.estimatedDateOfArrival,
                  carrier: consolidatedInfo.carrierShipmentMasterTrackingNumber
                })
              })
            }
          })
        }
      })
    })

    // 打印 itemDetailsMap 的内容
    console.error('\x1b[31m%s\x1b[0m', 'itemDetailsMap contents:')
    Array.from(itemDetailsMap).forEach(([key, value]) => {
      console.error('\x1b[31m%s\x1b[0m', `Key: ${key}, Value:`, JSON.stringify(value, null, 2))
    })

    // 更新每个组件的信息
    order.components.forEach((component: any) => {
      const matchingItem = itemDetailsMap.get(component.name)
      
      console.error('\x1b[31m%s\x1b[0m', 'Matching attempt:', JSON.stringify({
        componentName: component.name,
        matchingItem: matchingItem ? matchingItem.tiPartNumber : 'Not found'
      }))

      if (matchingItem) {
        component.shippingDate = matchingItem.shippingDate
        component.estimatedDateOfArrival = matchingItem.estimatedDateOfArrival
        component.carrier = matchingItem.carrier
        console.log('更新的组件信息:', JSON.stringify(component, null, 2))
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