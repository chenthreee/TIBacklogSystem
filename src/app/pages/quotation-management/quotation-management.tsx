import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
// 定义Quotation类型
interface Quotation {
<<<<<<< HEAD
  id: number;
=======
  //id: string;
>>>>>>> main
  date: string;
  customer: string;
  totalAmount: number;
  components: Component[];
}

interface Component {
<<<<<<< HEAD
  id: number;
=======
  id: string;
>>>>>>> main
  name: string;
  quantity: number;
  unitPrice: number;
}
// 模拟API调用
const fetchQuotations = async (page: number, searchTerm: string) => {
  // 这里应该是实际的API调用
<<<<<<< HEAD
  const response = await fetch('/api/quotations');
  const data = await response.json();

  const filteredQuotations = data.filter((q: Quotation) =>
    q.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.date.includes(searchTerm)
  )

  const pageSize = 2
  const startIndex = (page - 1) * pageSize
  const paginatedQuotations = filteredQuotations.slice(startIndex, startIndex + pageSize)

  return {
    quotations: paginatedQuotations,
    totalPages: Math.ceil(filteredQuotations.length / pageSize)
=======
  try {
    const response = await fetch('/api/quotations');
    const data = await response.json();
    console.log('Fetched data:', JSON.stringify(data, null, 2));

    // const filteredQuotations = data.filter((q: Quotation) =>
    //   q.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //   q.date.includes(searchTerm)
    // )
    if (!Array.isArray(data)) {
      console.error('Unexpected data format:', data);
      return { quotations: [], totalPages: 0 };
    }

    const validQuotations = data.map((q: any) => ({
      id: q._id || q.id, // 使用 MongoDB 的 _id 或自定义 id
      date: q.date || '',
      customer: q.customer || '',
      totalAmount: typeof q.totalAmount === 'number' ? q.totalAmount : 0,
      components: Array.isArray(q.components) ? q.components : []
    }));
    
    const filteredQuotations = data.filter((q: Quotation) =>
      (typeof q.customer === 'string' && q.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof q.date === 'string' && q.date.includes(searchTerm))
    );

    //const filteredQuotations = data;  // 不进行过滤

    const pageSize = 10
    const startIndex = (page - 1) * pageSize
    
    const paginatedQuotations = filteredQuotations.slice(startIndex, startIndex + pageSize)


    return {
      quotations: paginatedQuotations,
      //totalPages: Math.ceil(filteredQuotations.length / pageSize)
      totalPages: Math.ceil(data.length / pageSize)
    }
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return { quotations: [], totalPages: 0 };
>>>>>>> main
  }
}

export default function QuotationManagement() {
  const [quotations, setQuotations] = useState<any[]>([])
  const [expandedQuotations, setExpandedQuotations] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editingComponent, setEditingComponent] = useState<any>(null)
<<<<<<< HEAD

=======
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [isQuotationUpdated, setIsQuotationUpdated] = useState(false);
  
>>>>>>> main
  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm])

<<<<<<< HEAD
=======
  useEffect(() => {
    // 这里可以添加一些逻辑来处理状态变化后的操作
    console.log('Quotations updated:', quotations);
  }, [quotations]);

>>>>>>> main
  const fetchData = async () => {
    setIsLoading(true)
    const data = await fetchQuotations(currentPage, searchTerm)
    setQuotations(data.quotations)
    setTotalPages(data.totalPages)
    setIsLoading(false)
  }

  const toggleExpand = (id: number) => {
    setExpandedQuotations(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleEditComponent = (quotationId: number, component: any) => {
    setEditingComponent({ ...component, quotationId })
  }

  const handleDeleteComponent = async (quotationId: number, componentId: number) => {
    // 这里应该是实际的删除API调用
    setQuotations(quotations.map(q => {
      if (q.id === quotationId) {
        return {
          ...q,
          components: q.components.filter((c: any) => c.id !== componentId),
          totalAmount: q.components.filter((c: any) => c.id !== componentId).reduce((sum: number, c: any) => sum + c.quantity * c.unitPrice, 0)
        }
      }
      return q
    }))
  }

  const handleSaveComponent = async (editedComponent: any) => {
<<<<<<< HEAD
    // 这里应该是实际的保存API调用
    setQuotations(quotations.map(q => {
      if (q.id === editedComponent.quotationId) {
        return {
          ...q,
          components: q.components.map((c: any) => c.id === editedComponent.id ? editedComponent : c),
          totalAmount: q.components.map((c: any) => c.id === editedComponent.id ? editedComponent : c).reduce((sum: number, c: any) => sum + c.quantity * c.unitPrice, 0)
        }
      }
      return q
    }))
    setEditingComponent(null)
=======
    console.log('handleSaveComponent called with:', editedComponent);
    try {
      const response = await fetch(`/api/quotations/${editedComponent.quotationId}/components/${editedComponent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedComponent),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to update component');
      }

      const updatedQuotation = await response.json();
      console.log('Updated quotation:', updatedQuotation);

      // 更新前端状态
      setQuotations(prevQuotations => prevQuotations.map(q => {
        if (q.id === updatedQuotation.id) {
          return {
            ...q,
            components: updatedQuotation.components,
            totalAmount: updatedQuotation.totalAmount, // 更新总金额
          };
        }
        return q;
      }));

      setEditingComponent(null); // 关闭编辑对话框

      // 重新获取数据
      fetchData();
    } catch (error) {
      console.error('Error updating component:', error);
    }
>>>>>>> main
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)

        // 处理Excel数据并创建新的报价
        const newQuotation = {
          id: quotations.length + 1,
          date: new Date().toISOString().split('T')[0],
<<<<<<< HEAD
          customer: 'New Customer',
=======
          customer: customerName, // 使用输入的客户名称
>>>>>>> main
          components: json.map((row: any, index) => ({
            id: index + 1,
            name: row['元件名称'],
            quantity: row['数量'],
            unitPrice: row['单价']
<<<<<<< HEAD
          }))
        }
        newQuotation.totalAmount = newQuotation.components.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0)

        setQuotations([...quotations, newQuotation])
=======
          })),
          totalAmount: json.reduce((sum: number, row: any) => sum + row['数量'] * row['单价'], 0)
        }
        //newQuotation.totalAmount = newQuotation.components.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0)

        setQuotations([...quotations, newQuotation])
        fetch('/api/quotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newQuotation),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log('报价已成功保存到数据库:', data);
            fetchData(); // 重新获取数据
          })
          .catch((error) => {
            console.error('保存报价时出错:', error);
          });
>>>>>>> main
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const triggerFileInput = () => {
<<<<<<< HEAD
=======
    setIsCustomerDialogOpen(true);
  };

  const handleCustomerDialogSubmit = () => {
    setIsCustomerDialogOpen(false);
>>>>>>> main
    document.getElementById('excel-upload')?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          type="text"
          placeholder="搜索客户或日期..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-sm"
        />
        <div>
          <input
            type="file"
            id="excel-upload"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />
          <label htmlFor="excel-upload">
            <Button variant="outline" onClick={triggerFileInput}>
              <Upload className="mr-2 h-4 w-4" /> 从Excel导入报价
            </Button>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>报价ID</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>总金额</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => (
                <>
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.id}</TableCell>
                    <TableCell>{quotation.date}</TableCell>
                    <TableCell>{quotation.customer}</TableCell>
                    <TableCell>¥{quotation.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
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
                        {expandedQuotations.includes(quotation.id) ? '收起' : '展开'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedQuotations.includes(quotation.id) && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>元件名称</TableHead>
                              <TableHead>数量</TableHead>
                              <TableHead>单价</TableHead>
                              <TableHead>小计</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotation.components.map((component: any) => (
                              <TableRow key={component.id}>
                                <TableCell>{component.name}</TableCell>
                                <TableCell>{component.quantity}</TableCell>
                                <TableCell>¥{component.unitPrice.toFixed(2)}</TableCell>
                                <TableCell>¥{(component.quantity * component.unitPrice).toFixed(2)}</TableCell>
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
      )}

      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          上一页
        </Button>
        <span>第 {currentPage} 页，共 {totalPages} 页</span>
        <Button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          下一页
        </Button>
      </div>

      {editingComponent && (
        <Dialog open={!!editingComponent} onOpenChange={() => setEditingComponent(null)}>
          <DialogContent className="sm:max-w-[425px] bg-white"> {/* 添加背景颜色 */}
            <DialogHeader>
              <DialogTitle>编辑元件</DialogTitle>
              <DialogDescription>
                修改元件的详细信息。完成后点击保存。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantity" className="text-right">
                  数量
                </Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editingComponent.quantity}
                  onChange={(e) => setEditingComponent({ ...editingComponent, quantity: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-unitPrice" className="text-right">
                  单价
                </Label>
                <Input
                  id="edit-unitPrice"
                  type="number"
                  step="0.01"
                  value={editingComponent.unitPrice}
                  onChange={(e) => setEditingComponent({ ...editingComponent, unitPrice: parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleSaveComponent(editingComponent)}>保存更改</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
<<<<<<< HEAD
=======
      {isCustomerDialogOpen && (
        <Dialog open={isCustomerDialogOpen} onOpenChange={() => setIsCustomerDialogOpen(false)}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle>输入客户名称</DialogTitle>
              <DialogDescription>
                请输入客户名称，然后点击确认继续上传文件。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer-name" className="text-right">
                  客户名称
                </Label>
                <Input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCustomerDialogSubmit}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
>>>>>>> main
    </div>
  )
}