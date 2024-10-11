import { NextRequest, NextResponse } from 'next/server';
import { basicAuthMiddleware } from '@/lib/auth';
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { captureRejectionSymbol } from 'events';

async function handleTILogisticsUpdate(req: NextRequest) {

  await dbConnect();

  try {
    const logisticsData = await req.json();
    //console.log('Received TI logistics update:', JSON.stringify(logisticsData, null, 2));

    // 在这里，我们只打印接收到的数据，不对数据库进行任何修改
    // 如果将来需要处理数据，可以在这里添加相关逻辑
    const orderID=logisticsData.customerPurchaseOrderNumber;
    console.error(`读取到的oderID是${orderID}`);

    const order=await Order.findOne({orderNumber:orderID});
    if(!order){
      console.error(`订单${orderID}不存在`);
      throw new Error(`订单${orderID}不存在`);
    }


    const logisticsResponseMap=new Map();

    logisticsData.data.consolidatedInformation.forEach(async (consolidatedInfo:any)=>{
      if(consolidatedInfo.bookingOrderDetails){
        //判断有bookingOrderDetails字段后
        consolidatedInfo.bookingOrderDetails.forEach((booking:any)=>{
          if(booking.packageDetails){
            booking.packageDetails.forEach((pkg:any)=>{
              if(pkg.itemDetails){
                pkg.itemDetails.forEach((item:any)=>{
                  logisticsResponseMap.set(item.tiPartNumber,{
                    ...item,
                    shippingDate:consolidatedInfo.shippingDate,
                    estimatedDateOfArrival:consolidatedInfo.estimatedDateOfArrival,
                    carrier:consolidatedInfo.carrierShipmentMasterTrackingNumber,
                    commercialInvoicePDF:consolidatedInfo.commercialInvoiceList?.[0]?.commercialInvoicePDF
                  })
                })
              }
            })
            
          }
        })

        //更新组件信息
        const updatedComponents=order.components.map((component:any)=>{
          const matchingItem=logisticsResponseMap.get(component.name);
          if(matchingItem){
            component.shippingDate=matchingItem.shippingDate;
            component.estimatedDateOfArrival=matchingItem.estimatedDateOfArrival;
            component.carrier=matchingItem.carrier;

            return {
              ...component.toObject(),
              commercialInvoicePDF:matchingItem.commercialInvoicePDF
            };
          }
          return component.toObject();
        })

        const updateOrder=await Order.findOneAndUpdate(
          {orderNumber:orderID},
          {$set:{components:updatedComponents.map((c:any)=>({...c,commercialInvoicePDF:undefined}))}},
          {new:true}
        )

        if (updateOrder) {
          console.log('Updated order data:', JSON.stringify(updateOrder.toObject(), null, 2));
        } else {
          console.log('Order not found or not updated');
        }

        return NextResponse.json({
          success:true,
          components:updatedComponents
        },{status:200})

       
      }else{
        console.error('此条消息中缺少bookingOrderDetails字段，检查TI推送字段')
        throw new Error("词条消息中缺少bookingOrderDetails字段，检查TI推送字段")
      }
    })


    return NextResponse.json({ success: true, message: '物流更新信息已接收' }, { status: 200 });
  } catch (error) {
    console.error('处理 TI 物流更新时出错:', error);
    return NextResponse.json({ error: '处理物流更新失败' }, { status: 500 });
  }
}

export const POST = basicAuthMiddleware(handleTILogisticsUpdate);