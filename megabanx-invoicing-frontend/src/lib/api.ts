import axios from "axios";
import type {
  Company,
  Client,
  Item,
  Invoice,
  InvoiceListResponse,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Companies
export const companiesApi = {
  list: () => api.get<Company[]>("/api/companies").then((r) => r.data),
  get: (id: string) => api.get<Company>(`/api/companies/${id}`).then((r) => r.data),
  create: (data: Partial<Company>) =>
    api.post<Company>("/api/companies", data).then((r) => r.data),
  update: (id: string, data: Partial<Company>) =>
    api.put<Company>(`/api/companies/${id}`, data).then((r) => r.data),
  uploadLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<Company>(`/api/companies/${id}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

// Clients
export const clientsApi = {
  list: (params?: { company_id?: string; search?: string }) =>
    api.get<Client[]>("/api/clients", { params }).then((r) => r.data),
  get: (id: string) => api.get<Client>(`/api/clients/${id}`).then((r) => r.data),
  create: (data: Partial<Client>) =>
    api.post<Client>("/api/clients", data).then((r) => r.data),
  update: (id: string, data: Partial<Client>) =>
    api.put<Client>(`/api/clients/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/clients/${id}`).then((r) => r.data),
};

// Items
export const itemsApi = {
  list: (params?: { company_id?: string; search?: string }) =>
    api.get<Item[]>("/api/items", { params }).then((r) => r.data),
  get: (id: string) => api.get<Item>(`/api/items/${id}`).then((r) => r.data),
  create: (data: Partial<Item>) =>
    api.post<Item>("/api/items", data).then((r) => r.data),
  update: (id: string, data: Partial<Item>) =>
    api.put<Item>(`/api/items/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/items/${id}`).then((r) => r.data),
};

// Invoices
export const invoicesApi = {
  list: (params?: {
    company_id?: string;
    document_type?: string;
    status?: string;
    client_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) =>
    api
      .get<InvoiceListResponse>("/api/invoices", { params })
      .then((r) => r.data),
  get: (id: string) =>
    api.get<Invoice>(`/api/invoices/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post<Invoice>("/api/invoices", data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Invoice>(`/api/invoices/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/api/invoices/${id}`).then((r) => r.data),
  getNextNumber: (companyId: string, documentType: string) =>
    api
      .get<{ next_number: number }>("/api/invoices/next-number", {
        params: { company_id: companyId, document_type: documentType },
      })
      .then((r) => r.data),
  getPdfUrl: (id: string) => `${API_URL}/api/invoices/${id}/pdf`,
  sendEmail: (id: string, data: { recipient_email: string; subject?: string; message?: string }) =>
    api.post(`/api/invoices/${id}/send-email`, data).then((r) => r.data),
};

export default api;
