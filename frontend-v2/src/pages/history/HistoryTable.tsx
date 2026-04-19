import Badge from '@/components/ui/Badge'
import { Table, Thead, Th, Td, TrBody } from '@/components/ui/Table'
import { formatDate } from '@/utils/formatters'
import type { InvoiceRecord } from '@/types/file.types'

interface Props {
  records: InvoiceRecord[]
}

const statusVariant = (s: string) => {
  if (s === 'processed') return 'success' as const
  if (s === 'error') return 'danger' as const
  return 'warning' as const
}

export default function HistoryTable({ records }: Props) {
  return (
    <div className="mt-4">
      <Table>
        <Thead>
          <tr>
            <Th>Файл</Th>
            <Th>Тип</Th>
            <Th>Фирма</Th>
            <Th>Номер</Th>
            <Th>Дата</Th>
            <Th>Статус</Th>
          </tr>
        </Thead>
        <tbody>
          {records.map((r) => (
            <TrBody key={r.id}>
              <Td className="max-w-[200px] truncate">{r.original_filename}</Td>
              <Td>{r.invoice_type}</Td>
              <Td>{r.company_name || '—'}</Td>
              <Td>{r.invoice_number || '—'}</Td>
              <Td>{r.date ? formatDate(r.date) : '—'}</Td>
              <Td>
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
              </Td>
            </TrBody>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
