"use client";

import { useMemo, useState, Fragment } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ExpandedState,
  Row,
} from "@tanstack/react-table";

// Types
interface Grade {
  on_topic: number;
  grounded: number;
  no_contradiction: number;
  understandability: number;
  overall: number;
  average: number;
}

interface ModelResult {
  response: string;
  latency_ms: number;
  cost: number;
  grade: Grade;
  error: string | null;
}

interface Comparison {
  id: number;
  question: string;
  context: string;
  model1: ModelResult;
  model2: ModelResult;
}

interface ComparisonTableProps {
  comparisons: Comparison[];
  model1Name: string;
  model2Name: string;
}

// Helper components
function TruncatedText({ text, maxLength = 80 }: { text: string; maxLength?: number }) {
  if (text.length <= maxLength) return <span>{text}</span>;
  return (
    <span title="Double-click row to expand" className="cursor-help">
      {text.slice(0, maxLength)}<span className="text-white/30">...</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let colors = "bg-[#E5484D]/15 text-[#E5484D]";
  if (score >= 4) colors = "bg-[#4CAF79]/15 text-[#4CAF79]";
  else if (score >= 3) colors = "bg-[#F59E0B]/15 text-[#F59E0B]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${colors}`}>
      {score.toFixed(1)}
    </span>
  );
}

function TimingBadge({ ms }: { ms: number }) {
  let colors = "bg-[#4CAF79]/15 text-[#4CAF79]";
  if (ms > 5000) colors = "bg-[#E5484D]/15 text-[#E5484D]";
  else if (ms > 2000) colors = "bg-[#F59E0B]/15 text-[#F59E0B]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${colors}`}>
      {ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`}
    </span>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") {
    return (
      <svg className="w-3.5 h-3.5 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg className="w-3.5 h-3.5 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function ModelBadge({ name, color }: { name: string; color: "blue" | "purple" }) {
  const colors = {
    blue: "bg-[#5E6AD2]/15 text-[#5E6AD2]",
    purple: "bg-[#9D5BD2]/15 text-[#9D5BD2]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${colors[color]}`}>
      {name}
    </span>
  );
}

export function ComparisonTable({ comparisons, model1Name, model2Name }: ComparisonTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<Comparison, unknown>[]>(
    () => [
        {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-1 hover:bg-white/[0.06] rounded transition-colors"
          >
            <ExpandIcon expanded={row.getIsExpanded()} />
          </button>
        ),
        size: 40,
      },
      {
        accessorKey: "question",
        header: "Question",
        cell: ({ getValue }) => (
          <TruncatedText text={getValue() as string} maxLength={50} />
        ),
      },
      {
        id: "model1_response",
        header: () => <ModelBadge name={model1Name} color="blue" />,
        cell: ({ row }) => (
          <TruncatedText text={row.original.model1.response} maxLength={40} />
        ),
      },
      {
        id: "model1_timing",
        header: "Time",
        cell: ({ row }) => <TimingBadge ms={row.original.model1.latency_ms} />,
        size: 90,
      },
      {
        id: "model1_score",
        header: "Score",
        accessorFn: (row) => row.model1.grade.average,
        cell: ({ row }) => <ScoreBadge score={row.original.model1.grade.average} />,
        size: 70,
      },
      {
        id: "model2_response",
        header: () => <ModelBadge name={model2Name} color="purple" />,
        cell: ({ row }) => (
          <TruncatedText text={row.original.model2.response} maxLength={40} />
        ),
      },
      {
        id: "model2_timing",
        header: "Time",
        cell: ({ row }) => <TimingBadge ms={row.original.model2.latency_ms} />,
        size: 90,
      },
      {
        id: "model2_score",
        header: "Score",
        accessorFn: (row) => row.model2.grade.average,
        cell: ({ row }) => <ScoreBadge score={row.original.model2.grade.average} />,
        size: 70,
      },
    ],
    [model1Name, model2Name]
  );

  const table = useReactTable({
    data: comparisons,
    columns,
    state: { sorting, globalFilter, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const renderExpandedRow = (row: Row<Comparison>) => {
    const item = row.original;
    return (
      <div className="p-6 space-y-5 bg-[#0C0C0D]">
        {/* Full Question */}
        <div>
          <h4 className="text-[12px] font-medium text-white/50 mb-2 flex items-center gap-2 uppercase tracking-wider">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Full Question
          </h4>
          <p className="text-[13px] text-white/70 bg-[#141517] p-4 rounded-lg border border-white/[0.06]">
            {item.question}
          </p>
        </div>

        {/* Side by side responses */}
        <div className="grid grid-cols-2 gap-5">
          {/* Model 1 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <ModelBadge name={model1Name} color="blue" />
              <div className="flex items-center gap-2">
                <TimingBadge ms={item.model1.latency_ms} />
                <span className="text-[11px] text-white/40">${item.model1.cost.toFixed(5)}</span>
              </div>
            </div>
            <div className="bg-[#141517] p-4 rounded-lg border border-[#5E6AD2]/20 min-h-[100px]">
              <p className="text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed">
                {item.model1.response}
              </p>
            </div>
            <div className="bg-[#5E6AD2]/5 rounded-lg p-3 border border-[#5E6AD2]/10">
              <div className="text-[10px] font-medium text-[#5E6AD2] mb-2 uppercase tracking-wider">Quality Scores</div>
              <div className="grid grid-cols-5 gap-2 text-[11px]">
                <div className="text-center">
                  <div className="text-white/40 mb-1">On Topic</div>
                  <ScoreBadge score={item.model1.grade.on_topic} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1">Grounded</div>
                  <ScoreBadge score={item.model1.grade.grounded} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1">No Contra.</div>
                  <ScoreBadge score={item.model1.grade.no_contradiction} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1">Clarity</div>
                  <ScoreBadge score={item.model1.grade.understandability} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1 font-medium">Overall</div>
                  <ScoreBadge score={item.model1.grade.overall} />
                </div>
              </div>
            </div>
          </div>

          {/* Model 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <ModelBadge name={model2Name} color="purple" />
              <div className="flex items-center gap-2">
                <TimingBadge ms={item.model2.latency_ms} />
                <span className="text-[11px] text-white/40">${item.model2.cost.toFixed(5)}</span>
              </div>
            </div>
            <div className="bg-[#141517] p-4 rounded-lg border border-[#9D5BD2]/20 min-h-[100px]">
              <p className="text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed">
                {item.model2.response}
              </p>
            </div>
            <div className="bg-[#9D5BD2]/5 rounded-lg p-3 border border-[#9D5BD2]/10">
              <div className="text-[10px] font-medium text-[#9D5BD2] mb-2 uppercase tracking-wider">Quality Scores</div>
              <div className="grid grid-cols-5 gap-2 text-[11px]">
                <div className="text-center">
                  <div className="text-white/40 mb-1">On Topic</div>
                  <ScoreBadge score={item.model2.grade.on_topic} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1">Grounded</div>
                  <ScoreBadge score={item.model2.grade.grounded} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1">No Contra.</div>
                  <ScoreBadge score={item.model2.grade.no_contradiction} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1">Clarity</div>
                  <ScoreBadge score={item.model2.grade.understandability} />
                </div>
                <div className="text-center">
                  <div className="text-white/40 mb-1 font-medium">Overall</div>
                  <ScoreBadge score={item.model2.grade.overall} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Winner indicator */}
        {item.model1.grade.average !== item.model2.grade.average && (
          <div className={`text-center p-3 rounded-lg text-[13px] ${
            item.model1.grade.average > item.model2.grade.average 
              ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
              : "bg-[#9D5BD2]/10 text-[#9D5BD2] border border-[#9D5BD2]/20"
          }`}>
            <span className="font-medium">
              🏆 {item.model1.grade.average > item.model2.grade.average ? model1Name : model2Name}
            </span>
            {" "}wins this question by{" "}
            <span className="font-semibold">
              {Math.abs(item.model1.grade.average - item.model2.grade.average).toFixed(1)}
            </span>
            {" "}points
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Info Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search questions, answers, timings..."
            className="pl-10 pr-4 py-2.5 bg-[#141517] border border-white/[0.08] rounded-lg focus:ring-1 focus:ring-[#5E6AD2] focus:border-[#5E6AD2] w-full text-[13px] text-white placeholder:text-white/30 transition-colors"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-white/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-[13px] text-white/40">
          Showing <span className="font-medium text-white/60">{table.getRowModel().rows.length}</span> of {comparisons.length} results
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#141517]">
        <table className="min-w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/[0.06]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-[11px] font-medium text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon direction={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <Fragment key={row.id}>
                <tr
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${
                    row.getIsExpanded() ? "bg-white/[0.03]" : ""
                  } ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                  onDoubleClick={() => row.toggleExpanded()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[13px] text-white/70 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length} className="p-0 border-b border-white/[0.06]">
                      {renderExpandedRow(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-[#141517] border border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-[#141517] border border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-[#141517] border border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-[#141517] border border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Last
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-white/40">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-2 py-1.5 text-[13px] bg-[#141517] border border-white/[0.08] rounded-md text-white/60 focus:ring-1 focus:ring-[#5E6AD2]"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hint */}
      <p className="text-[11px] text-white/25 text-center">
        Double-click a row to expand and see full question, responses, and detailed scores
      </p>
    </div>
  );
}
