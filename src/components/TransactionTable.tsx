import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/amountNormalizer';

interface TransactionTableProps {
  transactions: Transaction[];
  categoryFilter: string | null;
}

export function TransactionTable({ transactions, categoryFilter }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = useMemo(() => {
    if (!categoryFilter) return transactions;
    return transactions.filter(t => t.rodzaj === categoryFilter);
  }, [transactions, categoryFilter]);

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'rodzaj',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Rodzaj
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
    },
    {
      accessorKey: 'skad',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Skąd
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
    },
    {
      accessorKey: 'co',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Co
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
    },
    {
      accessorKey: 'zaIle',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Za ile
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => formatCurrency(row.original.zaIle, row.original.zaIleOriginal),
    },
    {
      accessorKey: 'transactionDate',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Data
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => row.original.transactionDate || '—',
    },
    {
      accessorKey: 'oplacone',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Opłacone?
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        row.original.oplacone 
          ? <Check className="w-5 h-5 text-green-600" />
          : <X className="w-5 h-5 text-red-400" />
      ),
    },
    {
      accessorKey: 'gotowka',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Gotówka
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => {
        const val = row.original.gotowka?.toLowerCase();
        const isCash = val === '✅' || val === 'tak' || val === 'yes' || val === 'true';
        return isCash 
          ? <Check className="w-5 h-5 text-green-600" />
          : <X className="w-5 h-5 text-red-400" />;
      },
    },
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 50 },
    },
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-left font-medium text-gray-500">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredData.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No transactions to display</div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            {filteredData.length} rekordów
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Na stronę:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm bg-white"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                {currentPage} / {pageCount}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
