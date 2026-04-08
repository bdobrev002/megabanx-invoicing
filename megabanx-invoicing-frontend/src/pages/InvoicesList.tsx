import { useState, useEffect, useMemo } from "react";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
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

type SortField = "invoice_number" | "document_type" | "client_name" | "issue_date" | "total" | "status";
type SortDir = "asc" | "desc";

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
  const [sortField, setSortField] = useState<SortField>("invoice_number");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const field = sortField;
      if (field === "total" || field === "invoice_number") {
        const aNum = Number(a[field]) || 0;
        const bNum = Number(b[field]) || 0;
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (field === "issue_date") {
        const aDate = new Date(a.issue_date).getTime();
        const bDate = new Date(b.issue_date).getTime();
        return sortDir === "asc" ? aDate - bDate : bDate - aDate;
      }
      const aVal = (a[field] || "").toString().toLowerCase();
      const bVal = (b[field] || "").toString().toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [invoices, sortField, sortDir]);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Фактури</h1>
            <p className="text-slate-500 text-sm">Общо: {total}</p>
          </div>
        </div>
        <Link to="/invoices/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
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
          <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Търсене по клиент..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-white border-slate-200"
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={invoices.length > 0 && selectedIds.size === invoices.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-indigo-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("invoice_number")}>
                      <div className="flex items-center">№ <SortIcon field="invoice_number" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-indigo-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("document_type")}>
                      <div className="flex items-center">Тип <SortIcon field="document_type" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-indigo-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("client_name")}>
                      <div className="flex items-center">Клиент <SortIcon field="client_name" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-indigo-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("issue_date")}>
                      <div className="flex items-center">Дата <SortIcon field="issue_date" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-indigo-600 transition-colors font-semibold text-slate-600 text-right" onClick={() => handleSort("total")}>
                      <div className="flex items-center justify-end">Сума <SortIcon field="total" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-indigo-600 transition-colors font-semibold text-slate-600" onClick={() => handleSort("status")}>
                      <div className="flex items-center">Статус <SortIcon field="status" /></div>
                    </TableHead>
                    <TableHead className="w-36 font-semibold text-slate-600">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-slate-300" />
                          <span>Няма намерени фактури</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedInvoices.map((inv, idx) => (
                      <TableRow
                        key={inv.id}
                        className={`transition-colors hover:bg-indigo-50/50 ${selectedIds.has(inv.id) ? "bg-blue-50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
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
                          <div className="flex gap-0.5">
                            <Link to={`/invoices/${inv.id}`}>
                              <Button variant="ghost" size="sm" title="Преглед" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/invoices/${inv.id}/edit`}>
                              <Button variant="ghost" size="sm" title="Редактирай" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <a
                              href={invoicesApi.getPdfUrl(inv.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" title="Свали PDF" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                                <Download className="h-3.5 w-3.5" />
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
                <div className="flex items-center justify-between pt-4 border-t mt-4 px-4 pb-4">
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
