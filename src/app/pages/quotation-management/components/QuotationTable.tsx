import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil, Trash2, Send, Search, Plus } from "lucide-react";

interface QuotationTableProps {
  quotations: any[];
  expandedQuotations: number[];
  toggleExpand: (id: number) => void;
  handleSendToTI: (id: string) => void;
  handleQuery: (id: string) => void;
  handleDeleteQuotation: (id: string) => void;
  handleEditComponent: (quotationId: number, component: any) => void;
  handleDeleteComponent: (quotationId: string, componentId: string) => void;
  handleAddComponent: (quotationId: string) => void;
}

function QuotationTable({
  quotations,
  expandedQuotations,
  toggleExpand,
  handleSendToTI,
  handleQuery,
  handleDeleteQuotation,
  handleEditComponent,
  handleDeleteComponent,
  handleAddComponent
}: QuotationTableProps) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>报价ID</TableHead>
            <TableHead>TI报价号</TableHead>
            <TableHead>日期</TableHead>
            <TableHead>客户</TableHead>
            <TableHead>总金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((quotation) => (
            <>
              <TableRow key={quotation.id}>
                <TableCell>{quotation.id}</TableCell>
                <TableCell>{quotation.quoteNumber || '未提交'}</TableCell>
                <TableCell>{quotation.date}</TableCell>
                <TableCell>{quotation.customer}</TableCell>
                <TableCell>${quotation.totalAmount.toFixed(2)}</TableCell>
                <TableCell>{quotation.status}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(quotation.id)}
                    >
                      {expandedQuotations.includes(quotation.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {expandedQuotations.includes(quotation.id)
                        ? "收起"
                        : "展开"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendToTI(quotation.id)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      向TI发送报价
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuery(quotation.id)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      查询
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuotation(quotation.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddComponent(quotation.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      添加组件
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedQuotations.includes(quotation.id) && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>元件名称</TableHead>
                          <TableHead>年用量</TableHead>
                          <TableHead>MOQ</TableHead>
                          <TableHead>NQ</TableHead>
                          <TableHead>报价</TableHead>
                          <TableHead>TI返回价格</TableHead>
                          <TableHead>小计</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation.components.map((component: any) => (
                          <TableRow key={component.id}>
                            <TableCell>{component.name}</TableCell>
                            <TableCell>{component.quantity}</TableCell>
                            <TableCell>{component.moq ?? 'N/A'}</TableCell>
                            <TableCell>{component.nq ?? 'N/A'}</TableCell>
                            <TableCell>${component.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>${component.tiPrice.toFixed(2)}</TableCell>
                            <TableCell>${(component.quantity * component.unitPrice).toFixed(2)}</TableCell>
                            <TableCell>{component.status}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditComponent(quotation.id, component)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComponent(quotation.id, component.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default QuotationTable;