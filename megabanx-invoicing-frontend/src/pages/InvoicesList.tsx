import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/company-context";
import { invoicesApi, clientsApi } from "@/lib/api";
import type { Invoice } from "@/types";
import {
  Search,
  FilePlus,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Mail,
  Printer,
  Trash2,
  Ban,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Чернова",
  issued: "Издадена",
  paid: "Платена",
  overdue: "Просрочена",
  cancelled: "Анулирана",
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function InvoicesList() {
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("invoice");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const pageSize = 20;

  const loadInvoices = async () => {
    if (!company) return;
    const params: Record<string, string | number | undefined> = {
      company_id: company.id,
      page,
      page_size: pageSize,
    };
    if (docType === "invoice") params.document_type = "invoice";
    if (docType === "proforma") params.document_type = "proforma";
    if (docType === "debit_note") params.document_type = "debit_note";
    if (docType === "credit_note") params.document_type = "credit_note";
    if (docType === "draft") params.status = "draft";
    if (statusFilter !== "all" && docType !== "draft")
      params.status = statusFilter;
    if (search) params.search = search;

    const data = await invoicesApi.list(params);
    setInvoices(data.invoices);
    setTotal(data.total);
  };

  useEffect(() => {
    loadInvoices();
  }, [company, page, search, docType, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, docType, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((i) => i.id)));
    }
  };

  const selectedInvoices = invoices.filter((i) => selectedIds.has(i.id));

  const handleBulkDownload = async () => {
    for (const inv of selectedInvoices) {
      window.open(invoicesApi.getPdfUrl(inv.id), "_blank");
    }
  };

  const handleBulkPrint = async () => {
    for (const inv of selectedInvoices) {
      const w = window.open(invoicesApi.getPdfUrl(inv.id), "_blank");
      if (w) {
        w.addEventListener("load", () => {
          setTimeout(() => w.print(), 500);
        });
      }
    }
  };

  const handleBulkEmail = async () => {
    setBulkLoading(true);
    let sent = 0;
    let skipped = 0;
    for (const inv of selectedInvoices) {
      try {
        // Fetch client to get email
        const client = await clientsApi.get(inv.client_id);
        if (client.email) {
          await invoicesApi.sendEmail(inv.id, { recipient_email: client.email });
          sent++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }
    setBulkLoading(false);
    alert(`Изпратени: ${sent}, Пропуснати (без имейл): ${skipped}`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете ${selectedIds.size} фактури?`)) return;
    setBulkLoading(true);
    for (const id of selectedIds) {
      try {
        await invoicesApi.delete(id);
      } catch { /* skip */ }
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    loadInvoices();
  };

  const handleBulkCancel = async () => {
    if (!confirm(`Сигурни ли сте, че искате да анулирате ${selectedIds.size} фактури?`)) return;
    setBulkLoading(true);
    for (const id of selectedIds) {
      try {
        await invoicesApi.update(id, { status: "cancelled" });
      } catch { /* skip */ }
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    loadInvoices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Фактури</h1>
          <p className="text-slate-500 mt-1">Общо: {total}</p>
        </div>
        <Link to="/invoices/new">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            Нова Фактура
          </Button>
        </Link>
      </div>

      <Tabs value={docType} onValueChange={(v) => { setDocType(v); setSelectedIds(new Set()); }}>
        <TabsList className="bg-slate-100 p-1 gap-1">
          {([
            { value: "all", label: "Всички" },
            { value: "invoice", label: "Фактури" },
            { value: "proforma", label: "Проформи" },
            { value: "debit_note", label: "Дебитни известия" },
            { value: "credit_note", label: "Кредитни известия" },
            { value: "draft", label: "Чернови" },
          ] as const).map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={docType === tab.value ? "bg-blue-600 text-white shadow-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white" : ""}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={docType} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Търсене по клиент..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {docType !== "draft" && (
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="all">Всички статуси</option>
                      <option value="issued">Издадени</option>
                      <option value="paid">Платени</option>
                      <option value="overdue">Просрочени</option>
                      <option value="cancelled">Анулирани</option>
                    </select>
                  )}
                </div>

                {/* Bulk action buttons — always visible */}
                <div className={`flex items-center gap-2 py-2 px-3 rounded-lg border ${selectedIds.size > 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`text-sm font-medium ${selectedIds.size > 0 ? "text-blue-700" : "text-slate-500"}`}>
                      {selectedIds.size > 0 ? `Избрани: ${selectedIds.size}` : "Действия:"}
                    </span>
                    <div className="flex gap-1 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={handleBulkEmail}
                        disabled={bulkLoading}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Изпрати
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={handleBulkDownload}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Свали
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={handleBulkPrint}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Принтирай
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleBulkDelete}
                        disabled={bulkLoading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Изтрий
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={handleBulkCancel}
                        disabled={bulkLoading}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Анулирай
                      </Button>
                    </div>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={invoices.length > 0 && selectedIds.size === invoices.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>№</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-36">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-slate-500 py-12"
                      >
                        Няма намерени фактури
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className={`hover:bg-slate-50 ${selectedIds.has(inv.id) ? "bg-blue-50" : ""}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.id)}
                            onChange={() => toggleSelect(inv.id)}
                            className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <a
                            href={invoicesApi.getPdfUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {inv.invoice_number.toString().padStart(10, "0")}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {{ invoice: "Фактура", proforma: "Проформа", debit_note: "Дебитно известие", credit_note: "Кредитно известие" }[inv.document_type] || "Фактура"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <a
                            href={invoicesApi.getPdfUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {inv.client_name || "—"}
                          </a>
                        </TableCell>
                        <TableCell>
                          {new Date(inv.issue_date).toLocaleDateString("bg-BG")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(inv.total).toFixed(2)} {inv.currency}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[inv.status] || ""
                            }`}
                          >
                            {statusLabels[inv.status] || inv.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link to={`/invoices/${inv.id}`}>
                              <Button variant="ghost" size="sm" title="Преглед">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/invoices/${inv.id}/edit`}>
                              <Button variant="ghost" size="sm" title="Редактирай">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <a
                              href={invoicesApi.getPdfUrl(inv.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" title="Свали PDF">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-slate-500">
                    Страница {page} от {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
