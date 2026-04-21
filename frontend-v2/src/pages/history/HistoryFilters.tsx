import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Search } from 'lucide-react'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  typeFilter: string
  onTypeChange: (v: string) => void
}

const typeOptions = [
  { value: '', label: 'Всички типове' },
  { value: 'purchase', label: 'Покупка' },
  { value: 'sale', label: 'Продажба' },
  { value: 'proforma', label: 'Проформа' },
  { value: 'credit_note', label: 'Кредитно известие' },
]

export default function HistoryFilters({ search, onSearchChange, typeFilter, onTypeChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Търси по файл, фирма, номер..."
          className="pl-9"
        />
      </div>
      <div className="w-48">
        <Select
          options={typeOptions}
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
        />
      </div>
    </div>
  )
}
