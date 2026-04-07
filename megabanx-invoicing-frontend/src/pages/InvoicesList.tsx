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
import { invoicesApi } from "@/lib/api";
import type { Invoice } from "@/types";
import {
  Search,
  FilePlus,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
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
  const [docType, setDocType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
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
  }, [search, docType, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

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

      <Tabs value={docType} onValueChange={setDocType}>
        <TabsList>
          <TabsTrigger value="all">Всички</TabsTrigger>
          <TabsTrigger value="invoice">Фактури</TabsTrigger>
          <TabsTrigger value="proforma">Проформи</TabsTrigger>
          <TabsTrigger value="draft">Чернови</TabsTrigger>
        </TabsList>

        <TabsContent value={docType} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
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
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-28">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-slate-500 py-12"
                      >
                        Няма намерени фактури
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm">
                          {inv.invoice_number.toString().padStart(10, "0")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {inv.document_type === "invoice"
                              ? "Фактура"
                              : "Проформа"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {inv.client_name || "—"}
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
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <a
                              href={invoicesApi.getPdfUrl(inv.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm">
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
