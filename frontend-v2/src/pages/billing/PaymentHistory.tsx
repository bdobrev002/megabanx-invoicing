import { Table, Thead, Th, Td, TrBody } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { useBillingStore } from '@/stores/billingStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

export default function PaymentHistory() {
  const payments = useBillingStore((s) => s.payments)

  if (payments.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">История на плащанията</h2>
      <Table>
        <Thead>
          <tr>
            <Th>Номер</Th>
            <Th>Дата</Th>
            <Th>Сума</Th>
            <Th>Статус</Th>
            <Th>Действия</Th>
          </tr>
        </Thead>
        <tbody>
          {payments.map((p) => (
            <TrBody key={p.id}>
              <Td>{p.number}</Td>
              <Td>{formatDate(new Date(p.created * 1000))}</Td>
              <Td>{formatCurrency(p.total / 100, p.currency.toUpperCase())}</Td>
              <Td>
                <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>
                  {p.status === 'paid' ? 'Платена' : p.status}
                </Badge>
              </Td>
              <Td>
                {p.invoice_pdf && (
                  <a
                    href={p.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    PDF
                  </a>
                )}
              </Td>
            </TrBody>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
