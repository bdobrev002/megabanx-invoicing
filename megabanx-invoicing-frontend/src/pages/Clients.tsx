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
import { clientsApi, registryApi } from "@/lib/api";
import type { Client } from "@/types";
import { Plus, Search, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Users } from "lucide-react";

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

type SortField = "name" | "eik" | "city" | "email" | "phone";
type SortDir = "asc" | "desc";

export default function Clients() {
  const { company } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortField, sortDir]);

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

  const handleEikLookup = async () => {
    const eik = form.eik.trim();
    if (!eik || eik.length < 9) {
      setLookupError("Въведете валиден ЕИК (поне 9 цифри)");
      return;
    }
    setLookingUp(true);
    setLookupError("");
    try {
      const data = await registryApi.lookupEik(eik);
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        eik: data.eik || prev.eik,
        vat_number: data.vat_number || prev.vat_number,
        is_vat_registered: data.is_vat_registered,
        mol: data.mol || prev.mol,
        city: data.city || prev.city,
        address: data.address || prev.address,
        phone: data.phone || prev.phone,
        email: data.email || prev.email,
      }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setLookupError(error.response?.data?.detail || "Грешка при търсене в Търговски регистър");
    } finally {
      setLookingUp(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Клиенти</h1>
            <p className="text-slate-500 text-sm">
              {clients.length} клиент{clients.length !== 1 ? "а" : ""}
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm" disabled={!company}>
          <Plus className="h-4 w-4" />
          Нов клиент
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200/80 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Търсене по име, ЕИК или имейл..."
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
                <TableHead className="cursor-pointer select-none hover:text-blue-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("name")}>
                  <div className="flex items-center">Име <SortIcon field="name" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-blue-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("eik")}>
                  <div className="flex items-center">ЕИК <SortIcon field="eik" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-blue-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("city")}>
                  <div className="flex items-center">Град <SortIcon field="city" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-blue-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("email")}>
                  <div className="flex items-center">Имейл <SortIcon field="email" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-blue-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("phone")}>
                  <div className="flex items-center">Телефон <SortIcon field="phone" /></div>
                </TableHead>
                <TableHead className="w-24 font-semibold text-slate-600">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-slate-300" />
                      <span>{search ? "Няма намерени клиенти" : "Няма добавени клиенти"}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedClients.map((client, idx) => (
                  <TableRow
                    key={client.id}
                    className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                  >
                    <TableCell className="font-medium text-slate-900">{client.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{client.eik || <span className="text-slate-300">—</span>}</TableCell>
                    <TableCell className="text-slate-600">{client.city || <span className="text-slate-300">—</span>}</TableCell>
                    <TableCell>
                      {client.email
                        ? <a href={`mailto:${client.email}`} className="text-blue-600 hover:text-blue-700 hover:underline text-sm">{client.email}</a>
                        : <span className="text-slate-300">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-slate-600">{client.phone || <span className="text-slate-300">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(client)} className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)} className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50">
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
                <div className="flex gap-2">
                  <Input
                    value={form.eik}
                    onChange={(e) => { updateField("eik", e.target.value); setLookupError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEikLookup(); } }}
                    placeholder="123456789"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEikLookup}
                    disabled={lookingUp || !form.eik.trim()}
                    className="shrink-0 gap-1 px-3"
                    title="Попълни от Търговски регистър"
                  >
                    {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    ТР
                  </Button>
                </div>
                {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
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
