import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Table, Thead, Th, Td, TrBody } from '@/components/ui/Table'
import DeliveryTicks from '@/components/ui/DeliveryTicks'
import { RefreshCw } from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import type { InvoiceRecord } from '@/types/file.types'

interface Props {
  records: InvoiceRecord[]
  onResync?: (invoiceId: string) => void
}

const statusVariant = (s: string) => {
  if (s === 'processed') return 'success' as const
  if (s === 'error') return 'danger' as const
  return 'warning' as const
}

export default function HistoryTable({ records, onResync }: Props) {
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
            <Th>Доставка</Th>
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
              <Td>
                <span className="inline-flex items-center gap-1">
                  <DeliveryTicks
                    status={r.cross_copy_status}
                    crossCopiedFrom={r.cross_copied_from}
                  />
                  {r.cross_copy_status === 'deleted_by_recipient' && onResync && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResync(r.id)}
                      title="Синхронизирай наново"
                    >
                      <RefreshCw size={14} />
                    </Button>
                  )}
                </span>
              </Td>
            </TrBody>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
