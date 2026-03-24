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
    //const tiResponse = await asnAPI.retrieveByOrderNumber(order.tiOrderNumber)
    const tiResponse = await asnAPI.retrieveByCustomerOrderNumber(order.orderNumber)


    console.log('TI ASN API 响应:', JSON.stringify(tiResponse, null, 2))

    // 创建一个映射来存储所有的 itemDetails
    const itemDetailsMap = new Map()

    // 处理所有的 consolidatedInformation
    tiResponse.data.consolidatedInformation.forEach((consolidatedInfo: any) => {
      if (!consolidatedInfo.bookingOrderDetails) {
        console.error('TI ASN API 响应中缺少 bookingOrderDetails')
        return // 跳过这个 consolidatedInfo
      }

      const trackingNumber = consolidatedInfo.carrierShipmentMasterTrackingNumber

      // 提取该 consolidatedInfo 下所有发票的 PDF（过滤掉空值）
      const invoicePDFs: Array<{ invoiceNumber: string; pdf: string }> =
        (consolidatedInfo.commercialInvoiceList ?? [])
          .filter((inv: any) => inv.commercialInvoicePDF)
          .map((inv: any) => ({
            invoiceNumber: inv.commercialInvoiceNumber,
            pdf: inv.commercialInvoicePDF
          }))

      // 遍历所有的 bookingOrderDetails
      consolidatedInfo.bookingOrderDetails.forEach((booking: any) => {
        if (booking.packageDetails) {
          booking.packageDetails.forEach((pkg: any) => {
            if (pkg.itemDetails) {
              pkg.itemDetails.forEach((item: any) => {
                const existing = itemDetailsMap.get(item.tiPartNumber)
                if (existing) {
                  // 已存在该零件，追加快递单号（去重）
                  if (trackingNumber && !existing.carriers.includes(trackingNumber)) {
                    existing.carriers.push(trackingNumber)
                  }
                  // 追加发票（按 invoiceNumber 去重）
                  for (const inv of invoicePDFs) {
                    if (!existing.commercialInvoices.some((e: any) => e.invoiceNumber === inv.invoiceNumber)) {
                      existing.commercialInvoices.push(inv)
                    }
                  }
                  // 取最新的发货日期和预计到达日期（按 shippingDate 最大值）
                  if (consolidatedInfo.shippingDate > existing.shippingDate) {
                    existing.shippingDate = consolidatedInfo.shippingDate
                    existing.estimatedDateOfArrival = consolidatedInfo.estimatedDateOfArrival
                  }
                } else {
                  itemDetailsMap.set(item.tiPartNumber, {
                    ...item,
                    shippingDate: consolidatedInfo.shippingDate,
                    estimatedDateOfArrival: consolidatedInfo.estimatedDateOfArrival,
                    carriers: trackingNumber ? [trackingNumber] : [],
                    commercialInvoices: [...invoicePDFs]
                  })
                }
              })
            }
          })
        }
      })
    })

    // 更新每个组件的信息
    const updatedComponents = order.components.map((component: any) => {
      const matchingItem = itemDetailsMap.get(component.name)
      
      if (matchingItem) {
        // 更新组件信息，但不包括 commercialInvoicePDF
        component.shippingDate = matchingItem.shippingDate
        component.estimatedDateOfArrival = matchingItem.estimatedDateOfArrival
        component.carrier = matchingItem.carriers
        
        // 返回更新后的组件，包括 commercialInvoices（仅用于前端显示）
        return {
          ...component.toObject(),
          commercialInvoices: matchingItem.commercialInvoices
        }
      }
      return component.toObject()
    })

    // 保存更新后的订单信息到数据库（不包括 commercialInvoicePDF）
    await Order.findOneAndUpdate(
      { orderNumber: orderId },
      { $set: { components: updatedComponents.map((c: any) => ({ ...c, commercialInvoices: undefined })) } },
      { new: true }
    )

    return NextResponse.json({ 
      success: true, 
      components: updatedComponents, // 包含 commercialInvoicePDF，用于前端显示
      tiResponse
    }, { status: 200 })
  } catch (error) {
    console.error('刷新物流信息时出错:', error)
    return NextResponse.json({ error: '刷新物流信息失败' }, { status: 500 })
  }
}