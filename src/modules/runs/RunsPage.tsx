import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Panel } from '../../components/Panel'
import { api } from '../../core/services/api'
import type { RunSummary } from '../../core/services/contracts'

const columnHelper = createColumnHelper<RunSummary>()

const columns = [
  columnHelper.accessor('id', {
    header: 'Run ID',
    cell: (info) => {
      const id = info.getValue()
      return (
        <Link to="/workbench/runs/$runId" params={{ runId: id }} className="table-link">
          {id}
        </Link>
      )
    },
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor('detail', {
    header: 'Detail',
    cell: (info) => info.getValue(),
  }),
]

export function RunsPage() {
  const runsQuery = useQuery({
    queryKey: ['runs'],
    queryFn: api.getRuns,
    refetchInterval: 5000,
  })

  const rows = useMemo(() => runsQuery.data ?? [], [runsQuery.data])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="tool-grid tool-grid-single">
      <Panel title="Run History" subtitle="Unified run registry from API endpoint with local fallback.">
        {runsQuery.isLoading ? <p className="muted">Loading run history...</p> : null}
        {rows.length === 0 ? <p className="muted">No runs yet. Execute any module to populate history.</p> : null}

        {rows.length > 0 ? (
          <div className="table-wrap">
            <table className="runs-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
