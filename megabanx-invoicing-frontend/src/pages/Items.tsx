import { useState, useEffect } from "react";
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
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const emptyItem = {
  name: "",
  unit: "бр.",
  default_price: "0.00",
  vat_rate: "20.00",
  description: "",
};

export default function Items() {
  const { company } = useCompany();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyItem);

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Артикули</h1>
          <p className="text-slate-500 mt-1">
            {items.length} артикул{items.length !== 1 ? "а" : ""}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={!company}>
          <Plus className="h-4 w-4" />
          Нов артикул
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Търсене по име..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Име</TableHead>
                <TableHead>Мярка</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead className="text-right">ДДС %</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    {search ? "Няма намерени артикули" : "Няма добавени артикули"}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.default_price).toFixed(2)} EUR
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.vat_rate)}%
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-slate-500">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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
