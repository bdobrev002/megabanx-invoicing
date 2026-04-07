import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Начало" },
  { to: "/invoices/new", icon: FilePlus, label: "Нова Фактура" },
  { to: "/invoices", icon: FileText, label: "Фактури" },
  { to: "/clients", icon: Users, label: "Клиенти" },
  { to: "/items", icon: Package, label: "Артикули" },
  { to: "/settings", icon: Settings, label: "Настройки" },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">
            MegaBanx
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Модул Фактуриране</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/invoices"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">v1.0.0 MVP</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
