import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CompanyProvider } from "@/lib/company-context";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import NewInvoice from "@/pages/NewInvoice";
import InvoicesList from "@/pages/InvoicesList";
import InvoiceView from "@/pages/InvoiceView";
import Clients from "@/pages/Clients";
import Items from "@/pages/Items";
import Settings from "@/pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <CompanyProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices/new" element={<NewInvoice />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/invoices/:id" element={<InvoiceView />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/items" element={<Items />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </CompanyProvider>
    </BrowserRouter>
  );
}

export default App;
