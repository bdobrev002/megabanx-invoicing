import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, FilePlus, Users, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { invoicesApi } from "@/lib/api";
import type { Invoice } from "@/types";

export default function Dashboard() {
  const { company } = useCompany();
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({ total: 0, monthlyTotal: 0, unpaidCount: 0, unpaidTotal: 0 });

  useEffect(() => {
    if (!company) return;
    invoicesApi
      .list({ company_id: company.id, page_size: 5 })
      .then((data) => {
        setRecentInvoices(data.invoices);
      })
      .catch(() => {});

    // Fetch stats from dedicated backend endpoint
    invoicesApi
      .getStats(company.id)
      .then((data) => {
        setStats({
          total: data.total_invoices,
          monthlyTotal: data.monthly_total,
          unpaidCount: data.unpaid_count,
          unpaidTotal: data.unpaid_total,
        });
      })
      .catch(() => {});
  }, [company]);

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Добре дошли в MegaBanx Фактуриране
        </h2>
        <p className="text-slate-600 mb-6">
          Първо трябва да настроите данните на вашата фирма.
        </p>
        <Link to="/settings">
          <Button size="lg">Настройки на фирмата</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Начало</h1>
          <p className="text-slate-500 mt-1">{company.name}</p>
        </div>
        <Link to="/invoices/new">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            Нова Фактура
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Общо фактури
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Оборот този месец
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.monthlyTotal.toFixed(2)} EUR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Неплатени
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaidCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Неплатена сума
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.unpaidTotal.toFixed(2)} EUR
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/invoices/new" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 hover:border-blue-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FilePlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Нова Фактура</p>
                <p className="text-sm text-slate-500">Издайте нова фактура</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/clients" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-100 hover:border-green-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Клиенти</p>
                <p className="text-sm text-slate-500">Управление на клиенти</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/invoices" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-100 hover:border-purple-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Списък фактури</p>
                <p className="text-sm text-slate-500">Преглед на всички</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Invoices */}
      {recentInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Последни фактури</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        inv.status === "paid"
                          ? "bg-green-500"
                          : inv.status === "overdue"
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {{ invoice: "Фактура", proforma: "Проформа", debit_note: "Дебитно известие", credit_note: "Кредитно известие" }[inv.document_type] || "Фактура"}{" "}
                        №{inv.invoice_number.toString().padStart(10, "0")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {inv.client_name} • {inv.issue_date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {Number(inv.total).toFixed(2)} {inv.currency}
                    </p>
                    <p className="text-xs text-slate-500">
                      {inv.status === "paid"
                        ? "Платена"
                        : inv.status === "overdue"
                        ? "Просрочена"
                        : inv.status === "issued"
                        ? "Издадена"
                        : inv.status === "draft"
                        ? "Чернова"
                        : "Анулирана"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
