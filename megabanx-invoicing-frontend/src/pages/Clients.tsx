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
import { clientsApi } from "@/lib/api";
import type { Client } from "@/types";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const emptyClient = {
  name: "",
  eik: "",
  vat_number: "",
  is_vat_registered: false,
  is_individual: false,
  mol: "",
  city: "",
  address: "",
  email: "",
  phone: "",
};

export default function Clients() {
  const { company } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClient);

  const loadClients = async () => {
    if (!company) return;
    const data = await clientsApi.list({
      company_id: company.id,
      search: search || undefined,
    });
    setClients(data);
  };

  useEffect(() => {
    loadClients();
  }, [company, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setEditingId(null);
    setForm(emptyClient);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      eik: client.eik || "",
      vat_number: client.vat_number || "",
      is_vat_registered: client.is_vat_registered,
      is_individual: client.is_individual,
      mol: client.mol || "",
      city: client.city || "",
      address: client.address || "",
      email: client.email || "",
      phone: client.phone || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!company) return;
    if (editingId) {
      await clientsApi.update(editingId, form);
    } else {
      await clientsApi.create({ ...form, company_id: company.id });
    }
    setDialogOpen(false);
    loadClients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете този клиент?")) return;
    await clientsApi.delete(id);
    loadClients();
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Клиенти</h1>
          <p className="text-slate-500 mt-1">
            {clients.length} клиент{clients.length !== 1 ? "а" : ""}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={!company}>
          <Plus className="h-4 w-4" />
          Нов клиент
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Търсене по име, ЕИК или имейл..."
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
                <TableHead>ЕИК</TableHead>
                <TableHead>Град</TableHead>
                <TableHead>Имейл</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    {search ? "Няма намерени клиенти" : "Няма добавени клиенти"}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.eik || "—"}</TableCell>
                    <TableCell>{client.city || "—"}</TableCell>
                    <TableCell>{client.email || "—"}</TableCell>
                    <TableCell>{client.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
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

      {/* Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактиране на клиент" : "Нов клиент"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Име на фирмата / лицето *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Клиент ООД"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_individual}
                  onChange={(e) => updateField("is_individual", e.target.checked)}
                  className="rounded border-slate-300"
                />
                Физическо лице
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_vat_registered}
                  onChange={(e) =>
                    updateField("is_vat_registered", e.target.checked)
                  }
                  className="rounded border-slate-300"
                />
                Регистрация по ЗДДС
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ЕИК</Label>
                <Input
                  value={form.eik}
                  onChange={(e) => updateField("eik", e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label>ДДС номер</Label>
                <Input
                  value={form.vat_number}
                  onChange={(e) => updateField("vat_number", e.target.value)}
                  placeholder="BG123456789"
                />
              </div>
            </div>
            <div>
              <Label>МОЛ</Label>
              <Input
                value={form.mol}
                onChange={(e) => updateField("mol", e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Град</Label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="София"
                />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+359 888 123 456"
                />
              </div>
            </div>
            <div>
              <Label>Адрес</Label>
              <Textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="ул. Примерна 1"
                rows={2}
              />
            </div>
            <div>
              <Label>Имейл</Label>
              <Input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="client@firma.bg"
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
