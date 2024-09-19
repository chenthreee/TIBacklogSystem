import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface SearchAndImportProps {
  searchTerm: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileInput: () => void;
}

function SearchAndImport({
  searchTerm,
  handleSearch,
  handleFileUpload,
  triggerFileInput
}: SearchAndImportProps) {
  return (
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
  );
}

export default SearchAndImport;