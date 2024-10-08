import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Plus } from 'lucide-react';

interface SearchAndImportProps {
  searchTerm: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileInput: () => void;
  handleCreateNewQuotation: () => void;
}

function SearchAndImport({
  searchTerm,
  handleSearch,
  handleFileUpload,
  triggerFileInput,
  handleCreateNewQuotation
}: SearchAndImportProps) {
  return (
    <div className="flex justify-between items-center">
      <Input
        type="text"
        placeholder="搜索元件名称、TI报价号或客户名称..."
        value={searchTerm}
        onChange={handleSearch}
        className="max-w-sm"
      />
      <div className="space-x-2">
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
        <Button variant="outline" onClick={handleCreateNewQuotation}>
          <Plus className="mr-2 h-4 w-4" /> 新建报价
        </Button>
      </div>
    </div>
  );
}

export default SearchAndImport;