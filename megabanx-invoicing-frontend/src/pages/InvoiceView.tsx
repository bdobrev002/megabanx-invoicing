import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { invoicesApi } from "@/lib/api";
import type { Invoice } from "@/types";
import {
  Download,
  Mail,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
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

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipient_email: "",
    subject: "",
    message: "",
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!id) return;
    invoicesApi
      .get(id)
      .then(setInvoice)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;
    await invoicesApi.update(invoice.id, { status: newStatus });
    setInvoice({ ...invoice, status: newStatus as Invoice["status"] });
  };

  const handleSendEmail = async () => {
    if (!invoice || !emailForm.recipient_email) return;
    setSendingEmail(true);
    try {
      await invoicesApi.sendEmail(invoice.id, emailForm);
      setEmailDialogOpen(false);
      alert("Имейлът е изпратен успешно!");
    } catch {
      alert("Грешка при изпращане на имейла");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12 text-slate-500">
        Фактурата не е намерена
      </div>
    );
  }

  const docTypeLabel =
    { invoice: "Фактура", proforma: "Проформа", debit_note: "Дебитно известие", credit_note: "Кредитно известие" }[invoice.document_type] || "Фактура";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {docTypeLabel} №
              {invoice.invoice_number.toString().padStart(10, "0")}
            </h1>
            <p className="text-slate-500 mt-1">
              {invoice.client_name} •{" "}
              {new Date(invoice.issue_date).toLocaleDateString("bg-BG")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={invoicesApi.getPdfUrl(invoice.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </a>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setEmailForm({
                recipient_email: "",
                subject: `${docTypeLabel} №${invoice.invoice_number}`,
                message: "",
              });
              setEmailDialogOpen(true);
            }}
          >
            <Mail className="h-4 w-4" />
            Изпрати
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Детайли</CardTitle>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[invoice.status] || ""
                }`}
              >
                {statusLabels[invoice.status]}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span className="text-slate-500">Тип:</span>
                <span className="ml-2 font-medium">{docTypeLabel}</span>
              </div>
              <div>
                <span className="text-slate-500">Номер:</span>
                <span className="ml-2 font-mono">
                  {invoice.invoice_number.toString().padStart(10, "0")}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Дата на издаване:</span>
                <span className="ml-2">
                  {new Date(invoice.issue_date).toLocaleDateString("bg-BG")}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Дата на дан. събитие:</span>
                <span className="ml-2">
                  {new Date(invoice.tax_event_date).toLocaleDateString("bg-BG")}
                </span>
              </div>
              {invoice.due_date && (
                <div>
                  <span className="text-slate-500">Дата на падеж:</span>
                  <span className="ml-2">
                    {new Date(invoice.due_date).toLocaleDateString("bg-BG")}
                  </span>
                </div>
              )}
              {invoice.payment_method && (
                <div>
                  <span className="text-slate-500">Начин на плащане:</span>
                  <span className="ml-2">{invoice.payment_method}</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Line Items Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead className="text-center">Мярка</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Ед. цена</TableHead>
                  <TableHead className="text-right">Стойност</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line, i) => (
                  <TableRow key={line.id || i}>
                    <TableCell className="text-slate-500">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {line.description}
                    </TableCell>
                    <TableCell className="text-center">{line.unit}</TableCell>
                    <TableCell className="text-right">
                      {Number(line.quantity).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(line.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Number(line.line_total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Междинна сума:</span>
                  <span className="font-semibold">
                    {Number(invoice.subtotal).toFixed(2)} {invoice.currency}
                  </span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Отстъпка:</span>
                      <span className="font-semibold">
                        -{Number(invoice.discount).toFixed(2)} {invoice.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Данъчна основа:</span>
                      <span className="font-semibold">
                        {(Number(invoice.subtotal) - Number(invoice.discount)).toFixed(2)} {invoice.currency}
                      </span>
                    </div>
                  </>
                )}
                {!invoice.no_vat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      ДДС ({Number(invoice.vat_rate)}%):
                    </span>
                    <span className="font-semibold">
                      {Number(invoice.vat_amount).toFixed(2)} {invoice.currency}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Сума за плащане:</span>
                  <span className="font-bold text-blue-600">
                    {Number(invoice.total).toFixed(2)} {invoice.currency}
                  </span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                  Забележки
                </p>
                <p className="text-sm text-slate-700">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.status === "issued" && (
                <Button
                  className="w-full gap-2"
                  variant="default"
                  onClick={() => handleStatusChange("paid")}
                >
                  <CheckCircle className="h-4 w-4" />
                  Маркирай като платена
                </Button>
              )}
              {invoice.status === "paid" && (
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => handleStatusChange("issued")}
                >
                  <Clock className="h-4 w-4" />
                  Маркирай като неплатена
                </Button>
              )}
              {invoice.status !== "cancelled" && (
                <Button
                  className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  variant="outline"
                  onClick={() => handleStatusChange("cancelled")}
                >
                  <XCircle className="h-4 w-4" />
                  Анулирай
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Клиент</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-slate-900">
                {invoice.client_name}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Изпрати по имейл</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Имейл на получателя *</Label>
              <Input
                type="email"
                value={emailForm.recipient_email}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, recipient_email: e.target.value })
                }
                placeholder="client@firma.bg"
              />
            </div>
            <div>
              <Label>Тема</Label>
              <Input
                value={emailForm.subject}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, subject: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Съобщение</Label>
              <Textarea
                value={emailForm.message}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, message: e.target.value })
                }
                placeholder="Опционално съобщение..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
              >
                Отказ
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailForm.recipient_email}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {sendingEmail ? "Изпращане..." : "Изпрати"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
