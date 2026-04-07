import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Company } from "@/types";
import { companiesApi } from "@/lib/api";

interface CompanyContextType {
  company: Company | null;
  companies: Company[];
  setCompany: (c: Company) => void;
  refreshCompanies: () => Promise<void>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  companies: [],
  setCompany: () => {},
  refreshCompanies: async () => {},
  loading: true,
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCompanies = async () => {
    try {
      const data = await companiesApi.list();
      setCompanies(data);
      if (data.length > 0 && !company) {
        setCompany(data[0]);
      }
    } catch {
      console.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CompanyContext.Provider
      value={{ company, companies, setCompany, refreshCompanies, loading }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
