import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";

interface ResizableTableProps {
  children: React.ReactNode;
  storageKey?: string;
}

interface ColumnWidths {
  [key: number]: number;
}

export const ResizableTable: React.FC<ResizableTableProps> = ({
  children,
  storageKey = 'table-column-widths'
}) => {
  return (
    <div className="relative overflow-x-auto">
      <Table>{children}</Table>
    </div>
  );
};

interface ResizableTableHeaderProps {
  children: React.ReactNode;
  storageKey?: string;
}

export const ResizableTableHeader: React.FC<ResizableTableHeaderProps> = ({
  children,
  storageKey = 'table-column-widths'
}) => {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // 从本地存储加载列宽
  useEffect(() => {
    const savedWidths = localStorage.getItem(storageKey);
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.error('Failed to parse saved column widths', e);
      }
    }
  }, [storageKey]);

  // 保存列宽到本地存储
  const saveColumnWidths = (widths: ColumnWidths) => {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  };

  const handleMouseDown = (columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveColumn(columnIndex);
    startXRef.current = e.clientX;

    // 获取当前列的宽度
    const th = tableRef.current?.querySelectorAll('th')[columnIndex];
    if (th) {
      startWidthRef.current = th.offsetWidth;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (activeColumn === null) return;

      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + diff); // 最小宽度50px

      setColumnWidths(prev => {
        const newWidths = { ...prev, [activeColumn]: newWidth };
        return newWidths;
      });
    };

    const handleMouseUp = () => {
      if (activeColumn !== null) {
        // 保存到本地存储
        saveColumnWidths(columnWidths);
        setActiveColumn(null);
      }
    };

    if (activeColumn !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeColumn, columnWidths]);

  // 克隆children并添加拖拽功能
  const enhanceTableRow = (row: React.ReactElement) => {
    if (row.type === TableRow) {
      const cells = React.Children.toArray(row.props.children);
      const enhancedCells = cells.map((cell: any, index: number) => {
        if (cell.type === TableHead) {
          const width = columnWidths[index];
          const isFirstColumn = index === 0;
          const isLastColumn = index === cells.length - 1;

          return (
            <TableHead
              key={index}
              className={cell.props.className}
              style={{
                ...cell.props.style,
                width: width ? `${width}px` : undefined,
                minWidth: width ? `${width}px` : undefined,
                maxWidth: width ? `${width}px` : undefined,
                position: 'relative',
                userSelect: 'none',
                borderRight: isLastColumn ? 'none' : '1px solid #e5e7eb', // 最后一列不显示右边框
                borderLeft: isFirstColumn ? 'none' : undefined, // 第一列不显示左边框
              }}
            >
              {cell.props.children}
              {/* 只在非最后一列显示拖拽手柄 */}
              {!isLastColumn && (
                <div
                  className="absolute right-0 top-0 bottom-0 cursor-col-resize group"
                  onMouseDown={(e) => handleMouseDown(index, e)}
                  style={{
                    zIndex: 10,
                    width: '8px', // 增加可拖拽区域
                    right: '-4px', // 居中对齐
                  }}
                >
                  {/* 拖拽指示线 */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 transition-all"
                    style={{
                      width: activeColumn === index ? '2px' : '1px',
                      background: activeColumn === index
                        ? '#9ca3af' // 拖拽时: 中灰色
                        : 'transparent', // 默认透明
                    }}
                  />
                  {/* 悬停效果 */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[2px] bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      display: activeColumn === index ? 'none' : 'block'
                    }}
                  />
                </div>
              )}
            </TableHead>
          );
        }
        return cell;
      });

      return React.cloneElement(row, {}, enhancedCells);
    }
    return row;
  };

  return (
    <TableHeader ref={tableRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return enhanceTableRow(child);
        }
        return child;
      })}
    </TableHeader>
  );
};

export { TableBody, TableRow, TableCell };
