export function getDetailedType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'Date';
  if (typeof value === 'object' && value._bsontype === 'ObjectID') return 'ObjectId';
  return typeof value;
}



export function checkQuotationDataTypes(data: any): {
  isArray: boolean;
  itemTypes: Array<{
    id: string;
    date: string;
    customer: string;
    totalAmount: string;
    components: Array<{
      id: string;
      name: string;
      quantity: string;
      unitPrice: string;
    }>;
  }>;
} {
  const result = {
    isArray: Array.isArray(data),
    itemTypes: [] as any[]
  };

  if (!result.isArray) {
    return result;
  }

  data.forEach((item: any, index: number) => {
    const itemType = {
      id: getDetailedType(item._id || item.id),
      date: getDetailedType(item.date),
      customer: getDetailedType(item.customer),
      totalAmount: getDetailedType(item.totalAmount),
      components: [] as any[]
    };

    if (Array.isArray(item.components)) {
      item.components.forEach((component: any) => {
        itemType.components.push({
          id: getDetailedType(component._id || component.id),
          name: getDetailedType(component.name),
          quantity: getDetailedType(component.quantity),
          unitPrice: getDetailedType(component.unitPrice)
        });
      });
    } else {
      itemType.components = [{ type: getDetailedType(item.components) }];
    }

    result.itemTypes.push(itemType);
  });

  return result;
}