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
  const { components, username, localEdits } = await req.json() // 从请求体中获取组件、用户名和本地编辑信息

  console.log("Received request body:", JSON.stringify(req.body));

  try {
    const order = await Order.findById(orderId)
    console.log("找到的订单信息:", order ? "订单存在" : "订单不存在");

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (!order.tiOrderNumber) {
      return NextResponse.json({ error: '该订单尚未提交到 TI' }, { status: 400 })
    }

    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)
    console.log('本地编辑信息:')
    console.log(JSON.stringify(localEdits, null, 2))

    const lineItems = []
    const changeLog = [] // 用于记录变更日志

    console.log("开始处理组件，组件数量:", components.length);

    for (const component of components) {
      console.log("正在处理组件:", component.name);
      const originalComponent = order.components.find((c: any) => 
        c.id === component.id && c.tiLineItemNumber === component.tiLineItemNumber
      );
      console.log("找到原始组件:", originalComponent ? "是" : "否");

      console.log("component id modified is : ", component.id);
      console.log("component tiLineItemNumber is : ", component.tiLineItemNumber);
      
      // 修改 localEdit 的取值逻辑
      const componentKey = `${orderId}-${component.id}-${component.tiLineItemNumber}`;
      const localEdit = localEdits[componentKey];
      console.log("localEdit 信息:", localEdit);

      if (localEdit) {
        let logEntry = {
          componentName: component.name,
          changes: [] as string[]
        }

        if (localEdit.quantity !== undefined && localEdit.quantity !== originalComponent.quantity) {
          logEntry.changes.push(`数量从 ${originalComponent.quantity} 变更为 ${localEdit.quantity}`)
        }
        if (localEdit.deliveryDate !== undefined && localEdit.deliveryDate !== originalComponent.deliveryDate) {
          logEntry.changes.push(`交期从 ${originalComponent.deliveryDate} 变更为 ${localEdit.deliveryDate}`)
        }
        if (localEdit.quoteNumber !== undefined && localEdit.quoteNumber !== originalComponent.quoteNumber) {
          logEntry.changes.push(`报价号从 ${originalComponent.quoteNumber} 变更为 ${localEdit.quoteNumber}`)
        }
        if (localEdit.isDeleted) {
          logEntry.changes.push('该物料被标记为删除')
        }

        if (logEntry.changes.length > 0) {
          changeLog.push(logEntry)
        }
      }

      // 处理所有组件，包括不需要修改的
      console.log("开始查询报价信息，报价号:", component.quoteNumber);
      const quotation = await Quotation.findOne({
        quoteNumber: component.quoteNumber,
        'components.name': component.name,
        'components.tiPartNumber': component.tiPartNumber
      })
      console.log("报价查询结果:", quotation ? "找到报价" : "未找到报价");

      if (!quotation) {
        console.log("未找到报价，组件名称:", component.name);
        return NextResponse.json({ 
          error: '修改失败：TI报价号中无对应的元件', 
          componentName: component.name 
        }, { status: 400 })
      }

      const matchedComponent = quotation.components.find(
        (c: any) => c.name === component.name && c.tiPartNumber === component.tiPartNumber
      )
      console.log("匹配的组件:", matchedComponent ? "已找到" : "未找到");

      if (!matchedComponent) {
        console.log("未找到匹配的组件，组件名称:", component.name);
        return NextResponse.json({ 
          error: '修改失败：TI报价号中无对应的元件', 
          componentName: component.name 
        }, { status: 400 })
      }

      const originalIndex = order.components.findIndex((c: any) => 
        c.id === component.id && c.tiLineItemNumber === component.tiLineItemNumber
      );
      console.log("组件在订单中的索引:", originalIndex);//完成板本

      // 在添加 lineItem 之前打印信息
      console.log("准备添加 lineItem，组件信息:", {
        partNumber: component.tiPartNumber || component.name,
        quantity: component.quantity,
        deliveryDate: localEdit ? localEdit.deliveryDate : component.deliveryDate
      });

      lineItems.push({
        customerLineItemNumber: originalIndex + 1,
        lineItemChangeIndicator: component.lineItemChangeIndicator,
        tiPartNumber: component.tiPartNumber || component.name,
        customerAnticipatedUnitPrice: matchedComponent.tiPrice,
        customerCurrencyCode: 'USD',
        quoteNumber: component.quoteNumber,
        schedules: [
          {
            requestedQuantity: parseInt(localEdit ? localEdit.quantity : component.quantity),
            requestedDeliveryDate: new Date(localEdit ? localEdit.deliveryDate : component.deliveryDate)
              .toISOString().split('T')[0],
          },
        ],
      })
    }

    console.log('准备发送到TI的lineItems:', JSON.stringify(lineItems, null, 2));
    let tiResponse; // 声明变量来存储 TI 响应
    try {
        tiResponse = await ordersAPI.changeOrder(
            order.customer,
            order.orderNumber,
            process.env.SHIP_TO!,
            lineItems
        )
        console.log('TI API 修改订单响应:', JSON.stringify(tiResponse, null, 2))
    } catch (apiError: any) {
        // 详细打印 TI API 错误信息
        console.error('TI API 错误详情:', {
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data,
            headers: apiError.response?.headers,
            config: {
                url: apiError.config?.url,
                method: apiError.config?.method,
                data: apiError.config?.data
            }
        });
        
        // 将详细错误信息返回给客户端
        return NextResponse.json({ 
            error: '修改订单失败', 
            details: {
                message: apiError.response?.data?.message || apiError.message,
                data: apiError.response?.data,
                status: apiError.response?.status
            }
        }, { status: apiError.response?.status || 500 })
    }

    order.status = tiResponse.orders[0].orderStatus
    order.components = order.components.map((comp: any) => {
      // 使用 tiLineItemNumber 来匹配正确的组件
      const tiLineItem = tiResponse.orders[0].lineItems.find((li: any) => 
        li.tiLineItemNumber === comp.tiLineItemNumber && 
        (li.tiPartNumber === comp.name || li.tiPartNumber === comp.tiPartNumber)
      );

      if (tiLineItem) {
        console.log('匹配到TI响应中的组件:', {
          name: comp.name,
          originalTiLineNumber: comp.tiLineItemNumber,
          responseTiLineNumber: tiLineItem.tiLineItemNumber
        });

        return {
          ...comp,
          status: tiLineItem.status,
          tiLineItemNumber: tiLineItem.tiLineItemNumber, // 保持原有的 tiLineItemNumber
          quantity: tiLineItem.schedules[0].requestedQuantity,
          deliveryDate: tiLineItem.schedules[0].requestedDeliveryDate,
          quoteNumber: tiLineItem.quoteNumber,
          confirmations: tiLineItem.schedules[0]?.confirmations?.map((conf: any) => ({
            tiScheduleLineNumber: conf.tiScheduleLineNumber,
            scheduledQuantity: conf.scheduledQuantity,
            estimatedShipDate: conf.estimatedShipDate,
            estimatedDeliveryDate: conf.estimatedDeliveryDate,
            estimatedDeliveryDateStatus: conf.estimatedDeliveryDateStatus,
            shippedQuantity: conf.shippedQuantity,
            customerRequestedShipDate: conf.customerRequestedShipDate
          })) || []
        };
      }
      return comp;
    });

    order.totalAmount = order.components.reduce((sum: number, comp: any) => {
      return comp.status !== 'deleted' ? sum + (comp.quantity * comp.unitPrice) : sum
    }, 0)

    // 添加 API 调用日志
    order.apiLogs.push({
      operationType: 'modify',
      timestamp: new Date(),
      username: username,
      changes: changeLog
    });

    await order.save()

    return NextResponse.json({ 
        success: true, 
        order, 
        tiResponse: tiResponse 
    }, { status: 200 })
  } catch (error: any) {
    console.error('修改订单时出错:', error)
    // 如果是 Axios 错误，提供更详细的信息
    if (error.isAxiosError) {
        console.error('API 错误详情:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers
        });
    }
    
    const errorMessage = error.response?.data || error.message || '未知错误';
    return NextResponse.json({ 
        error: '修改订单失败', 
        details: errorMessage,
        apiResponse: error.response?.data 
    }, { status: 500 })
  }
}