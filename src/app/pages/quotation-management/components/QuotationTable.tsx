import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Pencil, Trash2, Send, Search, Plus, Download } from "lucide-react";

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
  handleExportQuotations: (quotationIds: string[]) => void;
  handleBatchQuery: () => Promise<void>;
  isRefreshing: boolean;
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
  handleAddComponent,
  handleExportQuotations,
  handleBatchQuery,
  isRefreshing
}: QuotationTableProps) {
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedQuotations([]);
    } else {
      setSelectedQuotations(quotations.map(quotation => quotation.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectQuotation = (quotationId: string) => {
    setSelectedQuotations(prev => 
      prev.includes(quotationId) 
        ? prev.filter(id => id !== quotationId)
        : [...prev, quotationId]
    );
  };

  const handleExport = () => {
    handleExportQuotations(selectedQuotations);
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Checkbox
              checked={selectAll}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="ml-2">全选</label>
          </div>
          <Button 
            onClick={handleBatchQuery} 
            disabled={isRefreshing}
            variant="outline"
          >
            {isRefreshing ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                刷新中...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                一键刷新
              </>
            )}
          </Button>
        </div>
        <Button onClick={handleExport} disabled={selectedQuotations.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          导出选中报价单
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="w-1/7 px-4">TI报价号</TableHead>
            <TableHead className="w-1/7 px-4">日期</TableHead>
            <TableHead className="w-1/7 px-4">客户</TableHead>
            <TableHead className="w-1/7 px-4">总金额</TableHead>
            <TableHead className="w-1/7 px-4">状态</TableHead>
            <TableHead className="w-1/7 px-4">有效日期</TableHead>
            <TableHead className="w-1/7 px-4 text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((quotation) => (
            <React.Fragment key={quotation.id}>
              <TableRow>
                <TableCell>
                  <Checkbox
                    checked={selectedQuotations.includes(quotation.id)}
                    onCheckedChange={() => handleSelectQuotation(quotation.id)}
                  />
                </TableCell>
                <TableCell className="px-4">{quotation.quoteNumber || '未提交'}</TableCell>
                <TableCell className="px-4">{quotation.date}</TableCell>
                <TableCell className="px-4">{quotation.customer}</TableCell>
                <TableCell className="px-4">${quotation.totalAmount.toFixed(3)}</TableCell>
                <TableCell className="px-4">{quotation.status}</TableCell>
                <TableCell className="px-4">{quotation.quoteEndDate || 'N/A'}</TableCell>
                <TableCell className="px-4">
                  <div className="flex justify-center space-x-2">
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
                      {expandedQuotations.includes(quotation.id) ? "收起" : "展开"}
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
                    {/* 删除按钮 - 暂时隐藏 */}
                    {false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuotation(quotation.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </Button>
                    )}
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
                          <TableHead className="w-1/10 px-3">序号</TableHead>
                          <TableHead className="w-1/10 px-3">元件名称</TableHead>
                          <TableHead className="w-1/10 px-3">年用量</TableHead>
                          <TableHead className="w-1/10 px-3">MOQ</TableHead>
                          <TableHead className="w-1/10 px-3">NQ</TableHead>
                          <TableHead className="w-1/10 px-3">报价</TableHead>
                          <TableHead className="w-1/10 px-3">TI返回价格</TableHead>
                          <TableHead className="w-1/10 px-3">小计</TableHead>
                          <TableHead className="w-1/10 px-3">状态</TableHead>
                          <TableHead className="w-1/10 px-3">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation.components.map((component: any, index: number) => (
                          <TableRow key={component.id}>
                            <TableCell className="px-3">{index + 1}</TableCell>
                            <TableCell className="px-3">{component.name}</TableCell>
                            <TableCell className="px-3">{component.quantity}</TableCell>
                            <TableCell className="px-3">{component.moq ?? 'N/A'}</TableCell>
                            <TableCell className="px-3">{component.nq ?? 'N/A'}</TableCell>
                            <TableCell className="px-3">${component.unitPrice.toFixed(3)}</TableCell>
                            <TableCell className="px-3">${component.tiPrice.toFixed(3)}</TableCell>
                            <TableCell className="px-3">${(component.quantity * component.unitPrice).toFixed(3)}</TableCell>
                            <TableCell className="px-3">{component.status}</TableCell>
                            <TableCell className="px-3">
                              <div className="flex justify-center space-x-2">
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
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default QuotationTable;
