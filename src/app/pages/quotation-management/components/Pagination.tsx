import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

function Pagination({ currentPage, totalPages, setCurrentPage }: PaginationProps) {
  return (
    <div className="flex justify-between items-center mt-4">
      <Button
        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
      >
        上一页
      </Button>
      <span>
        第 {currentPage} 页，共 {totalPages} 页
      </span>
      <Button
        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        下一页
      </Button>
    </div>
  );
}

export default Pagination;