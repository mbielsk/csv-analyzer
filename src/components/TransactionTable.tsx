import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Check, X } from 'lucide-react';
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
  });

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
      {filteredData.length === 0 && (
        <div className="p-8 text-center text-gray-500">No transactions to display</div>
      )}
    </div>
  );
}
