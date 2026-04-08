import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/company-context";
import { itemsApi } from "@/lib/api";
import type { Item } from "@/types";
import { Plus, Search, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Package } from "lucide-react";

const emptyItem = {
  name: "",
  unit: "бр.",
  default_price: "0.00",
  vat_rate: "20.00",
  description: "",
};

type SortField = "name" | "unit" | "default_price" | "vat_rate" | "description";
type SortDir = "asc" | "desc";

export default function Items() {
  const { company } = useCompany();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const loadItems = async () => {
    if (!company) return;
    const data = await itemsApi.list({
      company_id: company.id,
      search: search || undefined,
    });
    setItems(data);
  };

  useEffect(() => {
    loadItems();
  }, [company, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const field = sortField;
      if (field === "default_price" || field === "vat_rate") {
        const aNum = Number(a[field]) || 0;
        const bNum = Number(b[field]) || 0;
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      const aVal = (a[field] || "").toString().toLowerCase();
      const bVal = (b[field] || "").toString().toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-blue-600" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 text-blue-600" />;
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyItem);
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      unit: item.unit,
      default_price: String(item.default_price),
      vat_rate: String(item.vat_rate),
      description: item.description || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!company) return;
    const payload = {
      name: form.name,
      unit: form.unit,
      default_price: parseFloat(form.default_price),
      vat_rate: parseFloat(form.vat_rate),
      description: form.description || null,
    };
    if (editingId) {
      await itemsApi.update(editingId, payload);
    } else {
      await itemsApi.create({ ...payload, company_id: company.id });
    }
    setDialogOpen(false);
    loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете този артикул?")) return;
    await itemsApi.delete(id);
    loadItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Артикули</h1>
            <p className="text-slate-500 text-sm">
              {items.length} артикул{items.length !== 1 ? "а" : ""}
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm" disabled={!company}>
          <Plus className="h-4 w-4" />
          Нов артикул
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200/80 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Търсене по име..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="cursor-pointer select-none hover:text-emerald-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("name")}>
                  <div className="flex items-center">Име <SortIcon field="name" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-emerald-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("unit")}>
                  <div className="flex items-center">Мярка <SortIcon field="unit" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-emerald-600 transition-colors font-semibold text-slate-600 text-right" onClick={() => handleSort("default_price")}>
                  <div className="flex items-center justify-end">Цена <SortIcon field="default_price" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-emerald-600 transition-colors font-semibold text-slate-600 text-right" onClick={() => handleSort("vat_rate")}>
                  <div className="flex items-center justify-end">ДДС % <SortIcon field="vat_rate" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-emerald-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("description")}>
                  <div className="flex items-center">Описание <SortIcon field="description" /></div>
                </TableHead>
                <TableHead className="w-24 font-semibold text-slate-600">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-slate-300" />
                      <span>{search ? "Няма намерени артикули" : "Няма добавени артикули"}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    className={`transition-colors hover:bg-emerald-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                  >
                    <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                    <TableCell className="text-slate-600">{item.unit}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-slate-700">
                      {Number(item.default_price).toFixed(2)} EUR
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {Number(item.vat_rate)}%
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-slate-500">
                      {item.description || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактиране на артикул" : "Нов артикул"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Име *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Консултантска услуга"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Мярка</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="бр."
                />
              </div>
              <div>
                <Label>Цена</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.default_price}
                  onChange={(e) =>
                    setForm({ ...form, default_price: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>ДДС %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.vat_rate}
                  onChange={(e) =>
                    setForm({ ...form, vat_rate: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Опционално описание"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отказ
              </Button>
              <Button onClick={handleSave} disabled={!form.name}>
                {editingId ? "Запази" : "Създай"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
