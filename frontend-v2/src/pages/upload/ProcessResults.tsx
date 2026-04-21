import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Table, Thead, Th, Td, TrBody } from '@/components/ui/Table'
import { RotateCcw } from 'lucide-react'
import type { InvoiceRecord } from '@/types/file.types'

interface Props {
  results: InvoiceRecord[]
  onReset: () => void
}

export default function ProcessResults({ results, onReset }: Props) {
  if (results.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center">
          <p className="text-gray-500">Няма резултати от качването.</p>
          <Button className="mt-4" variant="outline" onClick={onReset}>
            <RotateCcw size={14} className="mr-1" /> Качи отново
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Качени: {results.length} файла
        </p>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RotateCcw size={14} className="mr-1" /> Нови файлове
        </Button>
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>Файл</Th>
            <Th>Тип</Th>
            <Th>Фирма</Th>
            <Th>Статус</Th>
          </tr>
        </Thead>
        <tbody>
          {results.map((r) => (
            <TrBody key={r.id}>
              <Td>{r.original_filename}</Td>
              <Td>{r.invoice_type}</Td>
              <Td>{r.company_name || '—'}</Td>
              <Td>
                <Badge variant={r.status === 'processed' ? 'success' : 'warning'}>
                  {r.status}
                </Badge>
              </Td>
            </TrBody>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
