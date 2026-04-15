import { useState, useEffect, useCallback, useRef } from 'react';
import {
  authRegister, authLogin, authVerify, authMe, authLogout,
  getProfiles,
  getCompanies, createCompany, updateCompany, deleteCompany,
  lookupEik, uploadFiles,
  getInbox, clearInbox, getFolderStructure, getInvoices,
  getNotifications, deleteNotification, deleteAllNotifications,
  downloadFileUrl, deleteFile, previewFileUrl, fileViewerUrl,
  approveInvoices, processInvoicesStreamUrl,
  resolveDuplicateChoice,
  downloadBatch, deleteBatch,
  getBillingPlans, getBillingSubscription, createCheckout, activateTrial, cancelSubscription, reactivateSubscription, getBillingPortal, getBillingPayments,
  getWebSocketUrl,
  submitContact, getContactSettings,
  getVerificationBankDetails,
  getPendingVerifications, deletePendingVerification,
  verifyWithIdCard,
  shareCompany, getCompanyShares, updateShare, revokeShare,
  getSharedCompanies, getSharedFolderStructure,
  sharedDownloadFileUrl, sharedFileViewerUrl,
  getBillingUsage,
  createQrSession, qrCodeImageUrl,
  invListClients, invCreateClient, invUpdateClient, invDeleteClient,
  invListItems, invCreateItem, invUpdateItem, invDeleteItem,
  invGetNextNumber, invCreateInvoice, invUpdateInvoice, invGetInvoice, invListInvoices, invGetPdfUrl,
  invRegistryLookup,
  invGetCompanySettings, invUpdateCompanySettings,
  invGetSyncSettings, invUpdateSyncSettings,
  invListStubs, invCreateStub, invUpdateStub, invDeleteStub,
  invSyncInvoices, invDeleteInvoice, invCheckEditable,
  invSyncSingle,
  sendInvoiceEmail,
} from './api';
import {
  Users, Plus, Building2, Upload, FileText, FolderOpen,
  Bell, Trash2, Download, ChevronDown, ChevronRight,
  Search, Loader2, AlertCircle, CheckCircle, ArrowLeftRight,
  X, LogOut, Clock, Check, Mail, CreditCard, Star, Zap,
  Shield, ArrowRight, Eye, Brain, FolderSync, BarChart3, Lock, Globe, ChevronLeft,
  Home, Monitor, Camera, Rocket, UserCheck, CalendarCheck, Sparkles, TrendingUp, XCircle, ScanLine, FileUp,
  Copy, Banknote, Info, Phone, MessageSquare, Send, Share2, UserPlus, ToggleLeft, ToggleRight,
  Receipt, ExternalLink, RefreshCw, Ban, AlertTriangle, Crown, Menu, HelpCircle, Users2, Smartphone, ArrowUp, ArrowDown, Edit3,
} from 'lucide-react';

interface Profile { id: string; name: string; created_at: string; }
interface Company {
  id: string; name: string; eik: string; vat_number: string;
  address: string; mol: string;
  managers?: string[]; partners?: string[];
}
interface FolderItem {
  company: Company;
  purchases: { count: number; files: string[]; files_info: Array<{name: string; drive_id: string; drive_url: string; cross_copy_status?: string; cross_copied_from?: string; is_credit_note?: boolean; uploaded_at?: string}> };
  sales: { count: number; files: string[]; files_info: Array<{name: string; drive_id: string; drive_url: string; cross_copy_status?: string; cross_copied_from?: string; is_credit_note?: boolean; uploaded_at?: string}> };
  proformas?: { count: number; files: string[]; files_info: Array<{name: string; drive_id: string; drive_url: string; cross_copy_status?: string; cross_copied_from?: string; is_credit_note?: boolean; uploaded_at?: string}> };
  pending?: { count: number; files: string[]; files_info: Array<{name: string; id: string; invoice_type: string; cross_copied_from: string; date: string; issuer_name: string; recipient_name: string; invoice_number: string; over_limit?: boolean}> };
}
interface InvoiceRecord {
  id: string; original_filename: string; new_filename: string;
  invoice_type: string; company_name: string; date: string;
  issuer_name: string; recipient_name: string; invoice_number: string;
  status: string; error_message?: string; cross_copied_from?: string;
  cross_copy_status?: string; is_credit_note?: boolean;
}
interface Notification {
  id: string; type: string; title: string; message: string;
  timestamp: string; filename: string; source: string;
}

interface SubscriptionInfo {
  status: string; plan: string; expires: string;
  max_companies: number; max_invoices: number; trial_days: number;
  prices: { monthly: number; yearly: number; currency: string };
  usage?: { companies: number; invoices: number };
  cancel_at_period_end?: boolean;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
}
interface StripePayment {
  id: string; number: string; amount_paid: number; subtotal: number; tax: number; total: number;
  currency: string; status: string; created: number; period_start: number; period_end: number;
  invoice_pdf: string; hosted_invoice_url: string;
}
interface BillingPlan {
  id: string; name: string; price: number; currency: string;
  interval: string | null; features: string[]; savings?: string; popular?: boolean; contact_us?: boolean; promo?: string; trial_days?: number;
}
interface AuthUser { id: string; name: string; email: string; profile_id: string; subscription?: SubscriptionInfo; }
interface CompanyShare {
  id: string; company_id: string; company_eik: string; company_name: string;
  owner_profile_id: string; owner_user_id: string;
  shared_with_email: string; shared_with_user_id: string;
  can_upload: boolean; created_at: string;
}
interface SharedCompanyInfo {
  share_id: string; company: Company; owner_profile_id: string;
  owner_name: string; owner_email: string; can_upload: boolean; shared_at: string;
}
interface PendingVerification {
  id: string; status: string; created_at: string; verification_code: string;
  eik: string; company_name: string; vat_number: string; address: string; mol: string;
  profile_id: string;
}

// ── Invoicing types ──
interface InvClient {
  id: string; company_id: string; profile_id: string; name: string; eik?: string;
  vat_number?: string; is_vat_registered?: boolean; is_individual?: boolean;
  mol?: string; city?: string; address?: string; email?: string; phone?: string;
}
interface InvItem {
  id: string; company_id: string; profile_id: string; name: string; unit: string;
  default_price: number; vat_rate: number; description?: string;
}
interface InvStub {
  id: string; company_id: string; profile_id: string; name: string;
  start_number: number; end_number: number; current_number?: number;
}
interface InvLine {
  item_id: string | null; description: string; quantity: string; unit: string;
  unit_price: string; vat_rate: string;
}
interface InvCompanySettings {
  iban?: string; bank_name?: string; bic?: string; default_vat_rate?: number;
}
type InvModal = null | 'clients' | 'items' | 'invoice' | 'settings' | 'stubs' | 'clientForm' | 'itemForm' | 'trLookup' | 'clientPicker' | 'itemPicker';

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authScreen, setAuthScreen] = useState<'loading' | 'landing' | 'login' | 'register' | 'verify' | 'dashboard'>('loading');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authTosAccepted, setAuthTosAccepted] = useState(false);
  const [authNeedsTos, setAuthNeedsTos] = useState(false);
  const [, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, { count: number; color: string; invoice_id: string; is_synced: boolean; cross_copy_status: string }>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inboxFiles, setInboxFiles] = useState<Array<{filename: string; size: number}>>([]);
  const [activeTab, setActiveTab] = useState<'companies' | 'upload' | 'files' | 'history' | 'notifications' | 'billing'>('companies');
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [vatConfirmPlan, setVatConfirmPlan] = useState<BillingPlan | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [billingPayments, setBillingPayments] = useState<StripePayment[]>([]);
  const [billingTab, setBillingTab] = useState<'plans' | 'payments' | 'invoices'>('plans');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'processed' | 'unmatched'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyCompany, setHistoryCompany] = useState('');
  const [historyCompanyInput, setHistoryCompanyInput] = useState('');
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const companySuggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (companySuggestRef.current && !companySuggestRef.current.contains(e.target as Node)) setShowCompanySuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (filesCompanySuggestRef.current && !filesCompanySuggestRef.current.contains(e.target as Node)) setShowFilesCompanySuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (historySearchRef.current && !historySearchRef.current.contains(e.target as Node)) setShowHistorySearchSuggestions(false);
      if (filesSearchRef.current && !filesSearchRef.current.contains(e.target as Node)) setShowFilesSearchSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [filesSearch, setFilesSearch] = useState('');
  const [filesCompany, setFilesCompany] = useState('');
  const [filesCompanyInput, setFilesCompanyInput] = useState('');
  const [showFilesCompanySuggestions, setShowFilesCompanySuggestions] = useState(false);
  const filesCompanySuggestRef = useRef<HTMLDivElement>(null);
  const [filesDateFrom, setFilesDateFrom] = useState('');
  const [filesDateTo, setFilesDateTo] = useState('');
  const [filesSortBy, setFilesSortBy] = useState<'name' | 'date'>('name');
  const [filesSortOrder, setFilesSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showHistorySearchSuggestions, setShowHistorySearchSuggestions] = useState(false);
  const historySearchRef = useRef<HTMLDivElement>(null);
  const [showFilesSearchSuggestions, setShowFilesSearchSuggestions] = useState(false);
  const filesSearchRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', eik: '', vat_number: '', address: '', mol: '', tr_email: '', managers: [] as string[], partners: [] as string[] });
  const [verificationModal, setVerificationModal] = useState<{show: boolean; code: string; companyName: string; eik: string; message: string; verificationId?: string} | null>(null);
  const [idCardVerifyMode, setIdCardVerifyMode] = useState<'choose' | 'bank' | 'idcard' | 'qr'>('choose');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [, setQrPolling] = useState(false);
  const qrTokenRef = useRef<string | null>(null);
  useEffect(() => { qrTokenRef.current = qrToken; }, [qrToken]);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idCardVerifying, setIdCardVerifying] = useState(false);
  const [autoVerifiedModal, setAutoVerifiedModal] = useState<{show: boolean; message: string; companyName: string} | null>(null);
  const [processResultsModal, setProcessResultsModal] = useState<{show: boolean; message: string; results: InvoiceRecord[]; cross_copies?: Array<{target_profile: string; target_company: string; type: string; filename: string}>} | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [duplicateModal, setDuplicateModal] = useState<{show: boolean; duplicates: any[]; source: 'process' | 'approve'; pendingApproveIds?: string[]; nonDuplicateIds?: string[]} | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [duplicateActions, setDuplicateActions] = useState<Record<string, string>>({});
  const [duplicateResolving, setDuplicateResolving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [eikLoading, setEikLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [fileProcessingStatus, setFileProcessingStatus] = useState<Record<string, 'pending' | 'processing' | 'done' | 'error'>>({})
  // @ts-ignore: fileProcessingStartTime used for future progress tracking
  const [fileProcessingStartTime, setFileProcessingStartTime] = useState<Record<string, number>>({});
  const [processResults, setProcessResults] = useState<{message: string; results: InvoiceRecord[]; cross_copies?: Array<{target_profile: string; target_company: string; type: string; filename: string}>} | null>(null);
  const [processProgress, setProcessProgress] = useState<{current: number; total: number; parallel: number; currentFile: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Array<{company_name: string; folder_type: string; filename: string}>>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [landingSection, setLandingSection] = useState<'about' | 'how' | 'screenshots' | 'security' | 'pricing' | 'faq' | 'about_us' | 'contact'>('about');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [landingPlans, setLandingPlans] = useState<BillingPlan[]>([]);
  const [landingPlansLoading, setLandingPlansLoading] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Company Sharing state
  const [sharingCompany, setSharingCompany] = useState<Company | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareCanUpload, setShareCanUpload] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [companyShares, setCompanyShares] = useState<CompanyShare[]>([]);
  const [sharedCompanies, setSharedCompanies] = useState<SharedCompanyInfo[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [bankDetails, setBankDetails] = useState<{iban: string; recipient: string; bank: string; bic: string; amount: string; currency: string} | null>(null);
  const [sharedFolderStructure, setSharedFolderStructure] = useState<FolderItem[]>([]);
  const [companyShareCounts, setCompanyShareCounts] = useState<Record<string, number>>({});
  const [showTosModal, setShowTosModal] = useState(false);
  const [tosContent, setTosContent] = useState('');

  // Monthly invoice usage state
  const [monthlyUsage, setMonthlyUsage] = useState<{monthly_processed: number; monthly_limit: number; monthly_remaining: number; warning_80: boolean; warning_90: boolean; limit_reached: boolean; plan: string; company_limit: number; company_count: number; company_remaining: number} | null>(null);

  // ── Invoicing state ──
  const [invModal, setInvModal] = useState<InvModal>(null);
  const [invCompanyId, setInvCompanyId] = useState('');
  const [invProfileId, setInvProfileId] = useState('');
  const [invCompanyName, setInvCompanyName] = useState('');
  const [invClients, setInvClients] = useState<InvClient[]>([]);
  const [invItems, setInvItems] = useState<InvItem[]>([]);
  const [invStubs, setInvStubs] = useState<InvStub[]>([]);
  const [invSettings, setInvSettings] = useState<InvCompanySettings>({});
  const [invClientsSearch, setInvClientsSearch] = useState('');
  const [invItemsSearch, setInvItemsSearch] = useState('');
  const [invEditClient, setInvEditClient] = useState<InvClient | null>(null);
  const [invEditItem, setInvEditItem] = useState<InvItem | null>(null);
  const [invClientForm, setInvClientForm] = useState<Record<string, string>>({});
  const [invItemForm, setInvItemForm] = useState<Record<string, string>>({});
  const [invSettingsForm, setInvSettingsForm] = useState<Record<string, string>>({});
  const [invStubForm, setInvStubForm] = useState({ name: '', start_number: '', end_number: '' });
  const [invSaving, setInvSaving] = useState(false);
  const [invToast, setInvToast] = useState('');
  const [invToastType, setInvToastType] = useState<'success' | 'error'>('success');
  // Invoice form state
  const [invDocType, setInvDocType] = useState('invoice');
  const [invNumber, setInvNumber] = useState('');
  const [invIssueDate, setInvIssueDate] = useState('');
  const [invTaxEventDate, setInvTaxEventDate] = useState('');
  const [invShowDueDate, setInvShowDueDate] = useState(false);
  const [invDueDate, setInvDueDate] = useState('');
  const [invPaymentMethod, setInvPaymentMethod] = useState('');
  const [invNoVat, setInvNoVat] = useState(false);
  const [invNoVatReason, setInvNoVatReason] = useState('');
  const [invNoVatReasonCustom, setInvNoVatReasonCustom] = useState('');
  const [invDiscount, setInvDiscount] = useState('');
  const [invDiscountType, setInvDiscountType] = useState('EUR');
  const [invNotes, setInvNotes] = useState('');
  const [invInternalNotes, setInvInternalNotes] = useState('');
  const [invComposedBy, setInvComposedBy] = useState('');
  const [invSelectedClient, setInvSelectedClient] = useState<InvClient | null>(null);
  const [invSelectedStub, setInvSelectedStub] = useState('');
  const [invLines, setInvLines] = useState<InvLine[]>([{ item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: '20.00' }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: '20.00' }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: '20.00' }]);
  const [invPriceWithVat, setInvPriceWithVat] = useState(false);
  const [invEditInvoiceId, setInvEditInvoiceId] = useState<string | null>(null);
  const [invSyncMode, setInvSyncMode] = useState('manual');
  const [invDelayMinutes, setInvDelayMinutes] = useState('30');
  const [invTrEik, setInvTrEik] = useState('');
  const [invTrResult, setInvTrResult] = useState<Record<string, string> | null>(null);
  const [invTrLoading, setInvTrLoading] = useState(false);
  const [invPickerSearch, setInvPickerSearch] = useState('');
  const [invSyncing, setInvSyncing] = useState<Record<string, boolean>>({});

  const loadMonthlyUsage = useCallback(async () => {
    try {
      const usage = await getBillingUsage();
      setMonthlyUsage(usage);
    } catch { /* usage endpoint not available */ }
  }, []);

  const loadBillingData = useCallback(async () => {
    try {
      const [plans, sub] = await Promise.all([getBillingPlans(), getBillingSubscription()]);
      setBillingPlans(plans.plans || []);
      setStripeEnabled(plans.stripe_enabled || false);
      setSubscription(sub);
    } catch { /* billing not available yet */ }
  }, []);

  // Load contact public settings (phone) and bank verification details
  useEffect(() => {
    getContactSettings().then(data => {
      if (data.phone) setContactPhone(data.phone);
    }).catch(() => {});
    getVerificationBankDetails().then(data => setBankDetails(data)).catch(() => {});
  }, []);

  // Load plans for landing page pricing section
  useEffect(() => {
    if (landingSection === 'pricing' && landingPlans.length === 0 && !landingPlansLoading) {
      setLandingPlansLoading(true);
      getBillingPlans().then(data => {
        setLandingPlans(data.plans || []);
      }).catch(() => {}).finally(() => setLandingPlansLoading(false));
    }
  }, [landingSection, landingPlans.length, landingPlansLoading]);

  // Auto-fill contact form when user is logged in
  useEffect(() => {
    if (currentUser && landingSection === 'contact') {
      setContactForm(prev => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        email: prev.email || currentUser.email || '',
      }));
    }
  }, [currentUser, landingSection]);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(''); setContactSuccess('');
    if (!contactForm.name.trim()) { setContactError('Моля, въведете вашето име'); return; }
    if (!contactForm.email.trim()) { setContactError('Моля, въведете имейл адрес'); return; }
    if (!contactForm.message.trim()) { setContactError('Моля, въведете вашето съобщение'); return; }
    if (contactForm.message.length > 500) { setContactError('Съобщението не може да надвишава 500 символа'); return; }
    setContactSubmitting(true);
    try {
      await submitContact(contactForm.name.trim(), contactForm.email.trim(), contactForm.message.trim());
      setContactSuccess('Запитването ви е изпратено успешно! Ще получите отговор на посочения имейл.');
      setContactForm({ name: currentUser?.name || '', email: currentUser?.email || '', message: '' });
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Грешка при изпращане');
    } finally { setContactSubmitting(false); }
  };

  // Check session on load + auto-login from email links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoLogin = params.get('login');
    const autoEmail = params.get('email');
    authMe().then(user => {
      setCurrentUser(user);
      setAuthScreen('landing');
    }).catch(() => {
      if (autoLogin === '1' && autoEmail) {
        setAuthEmail(autoEmail);
        setAuthScreen('login');
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setAuthScreen('landing');
      }
    });
  }, []);

  // Auto-load profile when user is authenticated
  useEffect(() => {
    if (currentUser) {
      loadProfiles().then(() => {
        // Set active profile to user's profile
        getProfiles().then(profs => {
          const userProfile = profs.find((p: Profile) => p.id === currentUser.profile_id);
          if (userProfile) setActiveProfile(userProfile);
        }).catch(() => {});
      });
      loadBillingData();
    }
  }, [currentUser, loadBillingData]);

  const handleAuthRegister = async () => {
    if (!authName.trim() || !authEmail.trim()) return;
    if (!authTosAccepted) { setError('Трябва да приемете Общите условия за да се регистрирате'); return; }
    setAuthLoading(true); setError('');
    try {
      await authRegister(authName.trim(), authEmail.trim(), authTosAccepted);
      setAuthScreen('verify');
      setSuccess('Код за вход е изпратен на имейла ви.');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setAuthLoading(false); }
  };

  const handleAuthLogin = async () => {
    if (!authEmail.trim()) return; setAuthLoading(true); setError('');
    try {
      const result = await authLogin(authEmail.trim(), authTosAccepted, authName.trim());
      if (result.needs_tos) {
        setAuthNeedsTos(true);
        setError(result.message || 'Моля, приемете Общите условия и въведете името си.');
        setAuthLoading(false);
        return;
      }
      setAuthScreen('verify');
      setSuccess('Код за вход е изпратен на имейла ви.');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setAuthLoading(false); }
  };

  const handleAuthVerify = async () => {
    if (!authCode.trim()) return; setAuthLoading(true); setError('');
    try {
      const result = await authVerify(authEmail.trim(), authCode.trim());
      setCurrentUser(result.user);
      setAuthCode(''); setAuthEmail(''); setAuthName('');
      setSuccess('Успешно влизане!');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    try { await authLogout(); } catch {} 
    setCurrentUser(null); setActiveProfile(null); setAuthScreen('landing');
    setProfiles([]); setCompanies([]); setFolderStructure([]); setInvoices([]); setNotifications([]);
  };

  // Prevent browser from opening dropped files in new tabs
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('drop', prevent); };
  }, []);

  // Load monthly usage when upload or companies tab is active
  useEffect(() => {
    if (currentUser && (activeTab === 'upload' || activeTab === 'companies')) {
      loadMonthlyUsage();
    }
  }, [currentUser, activeTab, loadMonthlyUsage]);

  const loadProfiles = async () => {
    try { const data = await getProfiles(); setProfiles(data); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error loading profiles'); }
  };

  const loadProfileData = useCallback(async (profileId: string) => {
    try {
      const [co, fo, inv, notif, inbox, pv] = await Promise.all([
        getCompanies(profileId), getFolderStructure(profileId),
        getInvoices(profileId), getNotifications(profileId), getInbox(profileId),
        getPendingVerifications(profileId),
      ]);
      const folders = Array.isArray(fo) ? fo : (fo as any).folders || [];
      if (!Array.isArray(fo) && (fo as any).monthly_usage) setMonthlyUsage((fo as any).monthly_usage);
      setCompanies(co); setFolderStructure(folders); setInvoices(inv);
      setNotifications(notif); setInboxFiles(inbox);
      setPendingVerifications(pv.verifications || []);
      // Load share counts for all companies
      const counts: Record<string, number> = {};
      for (const c of co) {
        try {
          const data = await getCompanyShares(profileId, c.id);
          counts[c.id] = (data.shares || []).length;
        } catch { counts[c.id] = 0; }
      }
      setCompanyShareCounts(counts);
      // Build file status map from invoices per company
      const fStatus: Record<string, { count: number; color: string; invoice_id: string; is_synced: boolean; cross_copy_status: string }> = {};
      for (const c of co) {
        try {
          const companyInvoices = await invListInvoices(c.id, profileId);
          for (const e of companyInvoices) {
            const fname = (e as Record<string, string>).new_filename || (e as Record<string, string>).original_filename || '';
            if (!fname) continue;
            const syncStatus = (e as Record<string, string>).sync_status;
            const isSynced = syncStatus === 'synced' || syncStatus === 'accepted';
            const crossCopy = (e as Record<string, string>).cross_copy_status || 'none';
            let count = 1;
            let color = 'red';
            if (isSynced) {
              if (crossCopy === 'approved') { count = 2; color = 'blue'; }
              else if (crossCopy === 'pending') { count = 2; color = 'gray'; }
              else { count = 1; color = 'gray'; }
            } else { count = 1; color = 'red'; }
            fStatus[`${c.id}|${fname}`] = { count, color, invoice_id: (e as Record<string, string>).invoice_id || (e as Record<string, string>).id, is_synced: isSynced, cross_copy_status: crossCopy };
          }
        } catch { /* ignore */ }
      }
      setFileStatuses(fStatus);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }, []);

  useEffect(() => { if (activeProfile) loadProfileData(activeProfile.id); }, [activeProfile, loadProfileData]);

  const clearMsg = () => { setError(''); setSuccess(''); };
  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };


  const handleLookupEik = async () => {
    if (!companyForm.eik.trim()) return; setEikLoading(true); clearMsg();
    try {
      const data = await lookupEik(companyForm.eik.trim());
      setCompanyForm(prev => ({ ...prev, name: data.name || prev.name, vat_number: data.vat_number || prev.vat_number, address: data.address || prev.address, mol: data.mol || prev.mol, tr_email: data.tr_email || '', managers: data.managers || [], partners: data.partners || [] }));
      ok('Данните са заредени');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setEikLoading(false); }
  };

  const handleCreateCompany = async () => {
    if (!activeProfile || !companyForm.name.trim() || !companyForm.eik.trim()) return; clearMsg();
    try {
      const c = await createCompany(activeProfile.id, { ...companyForm });
      if (c.status === 'pending_verification') {
        // Show verification modal with code and instructions
        setIdCardVerifyMode('choose');
        setIdCardFile(null);
        setSelfieFile(null);
        setVerificationModal({
          show: true,
          code: c.verification_code,
          companyName: c.company_name,
          eik: c.eik,
          message: c.message,
          verificationId: c.verification_id || c.id,
        });
              setCompanyForm({ name: '', eik: '', vat_number: '', address: '', mol: '', tr_email: '', managers: [], partners: [] });
              setShowCompanyForm(false);
              loadProfileData(activeProfile.id);
            } else if (c.auto_verified_message) {
        // Auto-verified via email match
        setAutoVerifiedModal({
          show: true,
          message: c.auto_verified_message,
          companyName: c.name,
        });
        setCompanies(prev => [...prev, c]);
              setCompanyForm({ name: '', eik: '', vat_number: '', address: '', mol: '', tr_email: '', managers: [], partners: [] });
              setShowCompanyForm(false);
              loadProfileData(activeProfile.id);
            } else {
              // Normal company creation (no verification needed)
        setCompanies(prev => [...prev, c]);
                setCompanyForm({ name: '', eik: '', vat_number: '', address: '', mol: '', tr_email: '', managers: [], partners: [] });
                setShowCompanyForm(false); ok('Фирма "' + c.name + '" е добавена');
        loadProfileData(activeProfile.id);
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleUpdateCompany = async () => {
    if (!activeProfile || !editingCompany) return; clearMsg();
    try {
      const payload: Record<string, unknown> = { ...companyForm, refresh_from_tr: true };
      const updated = await updateCompany(activeProfile.id, editingCompany.id, payload);
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? updated : c));
      setEditingCompany(null); setCompanyForm({ name: '', eik: '', vat_number: '', address: '', mol: '', tr_email: '', managers: [], partners: [] });
      setShowCompanyForm(false); ok('Фирмата е обновена'); loadProfileData(activeProfile.id);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleDeletePendingVerification = async (requestId: string) => {
    if (!activeProfile || !confirm('Сигурни ли сте, че искате да отмените заявката за верификация?')) return; clearMsg();
    try {
      await deletePendingVerification(activeProfile.id, requestId);
      setPendingVerifications(prev => prev.filter(v => v.id !== requestId));
      ok('Заявката за верификация е отменена');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!activeProfile || !confirm('Изтриване на фирмата?')) return; clearMsg();
    try {
      await deleteCompany(activeProfile.id, companyId);
      setCompanies(prev => prev.filter(c => c.id !== companyId));
      ok('Фирмата е изтрита'); loadProfileData(activeProfile.id);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProfile || !e.target.files?.length) return; setUploading(true); setUploadProgress(0); clearMsg();
    try {
      await uploadFiles(activeProfile.id, e.target.files, (pct) => setUploadProgress(pct)); ok('Файловете са качени');
      const inbox = await getInbox(activeProfile.id); setInboxFiles(inbox);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!activeProfile || !e.dataTransfer.files.length) return; setUploading(true); setUploadProgress(0); clearMsg();
    try {
      await uploadFiles(activeProfile.id, Array.from(e.dataTransfer.files), (pct) => setUploadProgress(pct)); ok('Файловете са качени');
      const inbox = await getInbox(activeProfile.id); setInboxFiles(inbox);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  const handleProcess = async () => {
    if (!activeProfile) return; setProcessing(true); setProcessResults(null); setProcessProgress(null); clearMsg();
    setFileProcessingStatus(Object.fromEntries(inboxFiles.map(f => [f.filename, 'pending' as const])));
    try {
      const url = processInvoicesStreamUrl(activeProfile.id);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || 'Processing failed');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'start') {
              setProcessProgress({ current: 0, total: data.total, parallel: data.parallel, currentFile: '' });
            } else if (data.type === 'file_processing') {
              setFileProcessingStatus(prev => ({ ...prev, [data.filename]: 'processing' }));
              setFileProcessingStartTime(prev => ({ ...prev, [data.filename]: Date.now() }));
              setProcessProgress(prev => prev ? { ...prev, currentFile: data.filename } : prev);
            } else if (data.type === 'progress') {
              setFileProcessingStatus(prev => ({ ...prev, [data.filename]: data.status === 'error' || data.status === 'unmatched' ? 'error' : 'done' }));
              setProcessProgress(prev => prev ? { ...prev, current: data.current, total: data.total, currentFile: data.filename } : prev);
            } else if (data.type === 'complete') {
              const allResults = data.results || [];
              setProcessResults({ message: data.message, results: allResults, cross_copies: data.cross_copies });
              setProcessResultsModal({ show: true, message: data.message, results: allResults, cross_copies: data.cross_copies });
              setInboxFiles([]);
              loadProfileData(activeProfile.id);
              loadMonthlyUsage();
              // If there are duplicate_pending results, show 3-choice dialog
              const dupResults = allResults.filter((r: Record<string, unknown>) => r.status === 'duplicate_pending');
              if (dupResults.length > 0) {
                setDuplicateActions({});
                setDuplicateModal({
                  show: true,
                  duplicates: dupResults,
                  source: 'process',
                });
              }
            }
          } catch { /* skip invalid JSON */ }
        }
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setProcessing(false); setProcessProgress(null); setFileProcessingStatus({}); setFileProcessingStartTime({}); if (activeProfile) { loadProfileData(activeProfile.id); loadMonthlyUsage(); } }
  };

  const handleDeleteFile = async (companyName: string, folderType: string, filename: string) => {
    if (!activeProfile || !confirm('Изтриване на ' + filename + '?')) return; clearMsg();
    try { await deleteFile(activeProfile.id, companyName, folderType, filename); ok('Файлът е изтрит'); loadProfileData(activeProfile.id); }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      if (msg.includes('одобрена') || msg.includes('approved') || msg.includes('защитен') || msg.includes('protected')) {
        alert(msg);
      } else {
        setError(msg);
      }
    }
  };

  const handleDeleteNotif = async (notifId: string) => {
    if (!activeProfile) return;
    try { await deleteNotification(activeProfile.id, notifId); setNotifications(prev => prev.filter(n => n.id !== notifId)); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleClearNotifs = async () => {
    if (!activeProfile) return;
    try { await deleteAllNotifications(activeProfile.id); setNotifications([]); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleClearInbox = async () => {
    if (!activeProfile || !confirm('Изчистване на всички файлове от входящата папка?')) return; clearMsg();
    try { await clearInbox(activeProfile.id); setInboxFiles([]); ok('Входящата папка е изчистена'); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleApproveInvoices = async (invoiceIds: string[]) => {
    if (!activeProfile || !invoiceIds.length) return; clearMsg();
    try {
      const result = await approveInvoices(activeProfile.id, invoiceIds);
      ok(result.message); loadProfileData(activeProfile.id); loadMonthlyUsage();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleResolveDuplicates = async () => {
    if (!activeProfile || !duplicateModal) return;
    setDuplicateResolving(true);
    try {
      for (const dup of duplicateModal.duplicates) {
        const d = dup as Record<string, string>;
        const dupId = d.id;
        const action = duplicateActions[dupId] || 'keep_existing';
        await resolveDuplicateChoice(activeProfile.id, {
          duplicate_invoice_id: dupId,
          action,
          existing_invoice_id: d.existing_invoice_id || '',
          original_filename: d.original_filename || '',
          new_filename: d.new_filename || '',
          invoice_type: d.invoice_type || '',
          company_id: d.company_id || '',
          company_name: d.company_name || '',
          date: d.date || '',
          issuer_name: d.issuer_name || '',
          recipient_name: d.recipient_name || '',
          invoice_number: d.invoice_number || '',
          destination_path: d.destination_path || '',
        });
      }
      ok('Дубликатите са разрешени успешно');
      loadProfileData(activeProfile.id);
      loadMonthlyUsage();
      setDuplicateModal(null);
      setDuplicateActions({});
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setDuplicateResolving(false); }
  };

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => ({ ...prev, [companyId]: !prev[companyId] }));
  };

  const isFileSelected = (companyName: string, folderType: string, filename: string) =>
    selectedFiles.some(f => f.company_name === companyName && f.folder_type === folderType && f.filename === filename);

  const lastClickedFileRef = useRef<{company_name: string; folder_type: string; filename: string} | null>(null);

  const getAllVisibleFiles = (): Array<{company_name: string; folder_type: string; filename: string}> => {
    const files: Array<{company_name: string; folder_type: string; filename: string}> = [];
    if (!folderStructure) return files;
    for (const item of folderStructure) {
      const companyName = item.company?.name || '';
      if (item.purchases?.files_info) {
        for (const f of item.purchases.files_info) {
          files.push({ company_name: companyName, folder_type: 'purchases', filename: f.name });
        }
      }
      if (item.sales?.files_info) {
        for (const f of item.sales.files_info) {
          files.push({ company_name: companyName, folder_type: 'sales', filename: f.name });
        }
      }
    }
    return files;
  };

  const handleFileClick = (e: React.MouseEvent, companyName: string, folderType: string, filename: string) => {
    const file = { company_name: companyName, folder_type: folderType, filename };
    if (e.ctrlKey || e.metaKey) {
      setSelectedFiles(prev => isFileSelected(companyName, folderType, filename) ? prev.filter(f => !(f.company_name === companyName && f.folder_type === folderType && f.filename === filename)) : [...prev, file]);
    } else if (e.shiftKey && lastClickedFileRef.current) {
      const allFiles = getAllVisibleFiles();
      const lastIdx = allFiles.findIndex(f => f.company_name === lastClickedFileRef.current!.company_name && f.folder_type === lastClickedFileRef.current!.folder_type && f.filename === lastClickedFileRef.current!.filename);
      const curIdx = allFiles.findIndex(f => f.company_name === companyName && f.folder_type === folderType && f.filename === filename);
      if (lastIdx >= 0 && curIdx >= 0) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeFiles = allFiles.slice(start, end + 1);
        setSelectedFiles(prev => {
          const merged = [...prev];
          for (const rf of rangeFiles) {
            if (!merged.some(f => f.company_name === rf.company_name && f.folder_type === rf.folder_type && f.filename === rf.filename)) {
              merged.push(rf);
            }
          }
          return merged;
        });
      } else {
        setSelectedFiles(prev => [...prev, file]);
      }
    } else {
      setSelectedFiles([file]);
    }
    lastClickedFileRef.current = file;
  };

  // Shift+Arrow keyboard navigation for file selection
  useEffect(() => {
    if (activeTab !== 'files') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      const allFiles = getAllVisibleFiles();
      if (allFiles.length === 0) return;

      const last = lastClickedFileRef.current;
      if (!last) {
        // No file selected yet, select first/last
        const file = e.key === 'ArrowDown' ? allFiles[0] : allFiles[allFiles.length - 1];
        setSelectedFiles([file]);
        lastClickedFileRef.current = file;
        return;
      }

      const currentIdx = allFiles.findIndex(f =>
        f.company_name === last.company_name && f.folder_type === last.folder_type && f.filename === last.filename
      );
      if (currentIdx < 0) return;

      const nextIdx = e.key === 'ArrowDown'
        ? Math.min(currentIdx + 1, allFiles.length - 1)
        : Math.max(currentIdx - 1, 0);
      if (nextIdx === currentIdx) return;

      const nextFile = allFiles[nextIdx];
      setSelectedFiles(prev => {
        const already = prev.some(f => f.company_name === nextFile.company_name && f.folder_type === nextFile.folder_type && f.filename === nextFile.filename);
        if (already) {
          // Deselect current file (shrinking selection)
          return prev.filter(f => !(f.company_name === last.company_name && f.folder_type === last.folder_type && f.filename === last.filename));
        }
        return [...prev, nextFile];
      });
      lastClickedFileRef.current = nextFile;

      // Scroll the newly selected file into view
      setTimeout(() => {
        const els = document.querySelectorAll('[data-file-key]');
        const key = `${nextFile.company_name}|${nextFile.folder_type}|${nextFile.filename}`;
        els.forEach(el => {
          if (el.getAttribute('data-file-key') === key) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        });
      }, 50);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, folderStructure, selectedFiles]);

  const handleDownloadSelected = async () => {
    if (!activeProfile || !selectedFiles.length) return;
    try {
      const blob = await downloadBatch(activeProfile.id, selectedFiles);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'invoices.zip'; a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleDeleteSelected = async () => {
    if (!activeProfile || !selectedFiles.length || !confirm(`Изтриване на ${selectedFiles.length} файла?`)) return; clearMsg();
    try {
      const result = await deleteBatch(activeProfile.id, selectedFiles);
      if (result && result.blocked && result.blocked.length > 0) {
        const blockedNames = result.blocked.map((b: Record<string, string>) => b.filename || b.name).join(', ');
        alert(`${result.blocked.length} файл(а) не могат да бъдат изтрити (одобрени от контрагента): ${blockedNames}`);
        if (result.deleted > 0) ok(`${result.deleted} файла са изтрити`);
      } else {
        ok(`${selectedFiles.length} файла са изтрити`);
      }
      setSelectedFiles([]); loadProfileData(activeProfile.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      if (msg.includes('одобрена') || msg.includes('approved') || msg.includes('защитен') || msg.includes('protected')) {
        alert(msg);
      } else {
        setError(msg);
      }
    }
  };

  const handleSubscribe = async (plan: string) => {
    const planData = billingPlans.find(p => p.id === plan);
    // For promo plans (starter/pro with trial), activate directly without Stripe
    if (planData?.promo && planData?.trial_days) {
      setBillingLoading(plan); clearMsg();
      try {
        const result = await activateTrial(plan);
        ok(result.message || `Пробният период от 3 месеца е активиран за план ${planData.name}!`);
        const sub = await getBillingSubscription(); setSubscription(sub);
        loadBillingData();
      } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
      finally { setBillingLoading(null); }
      return;
    }
    // Show VAT confirmation dialog for paid plans (no trial)
    if (planData && !vatConfirmPlan) {
      setVatConfirmPlan(planData);
      return;
    }
    setVatConfirmPlan(null);
    setBillingLoading(plan); clearMsg();
    try {
      const result = await createCheckout(plan);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setBillingLoading(null); }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Спиране на автоматичното подновяване? Абонаментът ще бъде активен до края на текущия период.')) return;
    setCancelLoading(true); clearMsg();
    try {
      const result = await cancelSubscription(false);
      ok(result.message || 'Автоматичното подновяване е спряно');
      const sub = await getBillingSubscription(); setSubscription(sub);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setCancelLoading(false); }
  };

  const handleReactivateSubscription = async () => {
    setCancelLoading(true); clearMsg();
    try {
      const result = await reactivateSubscription();
      ok(result.message || 'Автоматичното подновяване е възстановено');
      const sub = await getBillingSubscription(); setSubscription(sub);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setCancelLoading(false); }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const result = await getBillingPortal();
      if (result.portal_url) window.open(result.portal_url, '_blank');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setPortalLoading(false); }
  };

  const loadPayments = async () => {
    try {
      const result = await getBillingPayments();
      setBillingPayments(result.payments || []);
    } catch { setBillingPayments([]); }
  };

  // --- Company Sharing Handlers ---
  const loadSharedCompanies = useCallback(async () => {
    try {
      const data = await getSharedCompanies();
      const sc = data.shared_companies || [];
      setSharedCompanies(sc);
      // Load folder structures for all shared companies
      const allFolders: FolderItem[] = [];
      for (const s of sc) {
        try {
          const folders = await getSharedFolderStructure(s.share_id);
          allFolders.push(...folders);
        } catch { /* skip */ }
      }
      setSharedFolderStructure(allFolders);
    } catch { setSharedCompanies([]); setSharedFolderStructure([]); }
  }, []);

  useEffect(() => { if (currentUser) loadSharedCompanies(); }, [currentUser, loadSharedCompanies]);

  const openShareDialog = async (company: Company) => {
    setSharingCompany(company);
    setShareEmail('');
    setShareCanUpload(false);
    if (activeProfile) {
      try {
        const data = await getCompanyShares(activeProfile.id, company.id);
        setCompanyShares(data.shares || []);
      } catch { setCompanyShares([]); }
    }
  };

  const handleShareCompany = async () => {
    if (!activeProfile || !sharingCompany || !shareEmail.trim()) return;
    setShareLoading(true); clearMsg();
    try {
      await shareCompany(activeProfile.id, sharingCompany.id, shareEmail.trim(), shareCanUpload);
      ok(`Фирмата е споделена с ${shareEmail.trim()}`);
      setShareEmail(''); setShareCanUpload(false);
      const data = await getCompanyShares(activeProfile.id, sharingCompany.id);
      setCompanyShares(data.shares || []);
      setCompanyShareCounts(prev => ({ ...prev, [sharingCompany.id]: (data.shares || []).length }));
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Грешка при споделяне'); }
    finally { setShareLoading(false); }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!activeProfile || !sharingCompany || !confirm('Прекратяване на споделянето?')) return;
    clearMsg();
    try {
      await revokeShare(activeProfile.id, sharingCompany.id, shareId);
      ok('Споделянето е прекратено');
      const data = await getCompanyShares(activeProfile.id, sharingCompany.id);
      setCompanyShares(data.shares || []);
      setCompanyShareCounts(prev => ({ ...prev, [sharingCompany.id]: (data.shares || []).length }));
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Грешка'); }
  };

  const handleToggleUpload = async (share: CompanyShare) => {
    if (!activeProfile || !sharingCompany) return;
    try {
      await updateShare(activeProfile.id, sharingCompany.id, share.id, !share.can_upload);
      const data = await getCompanyShares(activeProfile.id, sharingCompany.id);
      setCompanyShares(data.shares || []);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Грешка'); }
  };


  // ── Invoicing helpers ──
  const invToastShow = (msg: string, type: 'success' | 'error' = 'success') => {
    setInvToast(msg); setInvToastType(type);
    setTimeout(() => setInvToast(''), 3000);
  };

  const invOpenClients = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvClientsSearch(''); setInvModal('clients');
    try { const c = await invListClients(companyId, profileId); setInvClients(c); } catch { setInvClients([]); }
  };

  const invOpenItems = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvItemsSearch(''); setInvModal('items');
    try { const it = await invListItems(companyId, profileId); setInvItems(it); } catch { setInvItems([]); }
  };

  const invOpenSettings = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvModal('settings');
    try {
      const s = await invGetCompanySettings(companyId, profileId);
      setInvSettings(s);
      setInvSettingsForm({ iban: s.iban || '', bank_name: s.bank_name || '', bic: s.bic || '', default_vat_rate: String(Math.round(Number(s.default_vat_rate || 20))) });
    } catch { setInvSettingsForm({ iban: '', bank_name: '', bic: '', default_vat_rate: '20' }); }
  };

  const invOpenStubs = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvModal('stubs'); setInvStubForm({ name: '', start_number: '', end_number: '' });
    try { const st = await invListStubs(companyId, profileId); setInvStubs(st); } catch { setInvStubs([]); }
  };

  const invOpenInvoice = async (companyId: string, profileId: string, companyName: string, editData?: Record<string, unknown>) => {
    // Edit protection: check if invoice is editable (not synced/approved by counterparty)
    if (editData?.invoice_id) {
      try {
        const check = await invCheckEditable(editData.invoice_id as string);
        if (check && !check.editable) {
          alert(check.reason || 'Тази фактура не може да бъде редактирана — одобрена е от контрагента.');
          return;
        }
      } catch { /* endpoint may not exist yet, proceed */ }
    }
    setInvCompanyId(companyId); setInvProfileId(profileId); setInvCompanyName(companyName);
    setInvModal('invoice'); setInvSaving(false);
    // Reset form
    setInvDocType(editData?.document_type as string || 'invoice');
    setInvSelectedClient(null); setInvSelectedStub('');
    setInvNoVat(false); setInvNoVatReason(''); setInvNoVatReasonCustom('');
    setInvDiscount(''); setInvDiscountType('EUR');
    setInvNotes(''); setInvInternalNotes(''); setInvComposedBy('');
    setInvShowDueDate(false); setInvDueDate(''); setInvPaymentMethod('');
    setInvPriceWithVat(false); setInvSyncMode('manual'); setInvDelayMinutes('30');
    setInvEditInvoiceId(editData?.invoice_id as string || null);
    // Load data
    try {
      const [c, it, st, cs] = await Promise.all([
        invListClients(companyId, profileId),
        invListItems(companyId, profileId),
        invListStubs(companyId, profileId),
        invGetCompanySettings(companyId, profileId),
      ]);
      setInvClients(c); setInvItems(it); setInvStubs(st); setInvSettings(cs);
      const defVat = String(Number(cs.default_vat_rate || 20).toFixed(2));
      // Set next number
      const docType = editData?.document_type as string || 'invoice';
      if (!editData) {
        try {
          const nn = await invGetNextNumber(companyId, profileId, docType);
          setInvNumber(nn.next_number ? String(nn.next_number).padStart(10, '0') : '');
        } catch { setInvNumber(''); }
        const today = new Date().toISOString().split('T')[0];
        setInvIssueDate(today); setInvTaxEventDate(today);
        setInvLines([{ item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }]);
      }
      // Sync settings
      try {
        const ss = await invGetSyncSettings(companyId, profileId);
        setInvSyncMode(ss.sync_mode || 'manual');
        setInvDelayMinutes(String(ss.delay_minutes || 30));
      } catch { /* default */ }
      // Edit mode
      if (editData) {
        setInvNumber(editData.invoice_number ? String(editData.invoice_number).padStart(10, '0') : '');
        setInvIssueDate(editData.issue_date ? String(editData.issue_date).split('T')[0] : '');
        setInvTaxEventDate(editData.tax_event_date ? String(editData.tax_event_date).split('T')[0] : '');
        if (editData.due_date) { setInvShowDueDate(true); setInvDueDate(String(editData.due_date).split('T')[0]); }
        setInvPaymentMethod(editData.payment_method as string || '');
        if (editData.no_vat) { setInvNoVat(true); setInvNoVatReason(editData.no_vat_reason as string || ''); }
        setInvDiscount(editData.discount ? String(editData.discount) : '');
        setInvDiscountType(editData.discount_type as string || 'EUR');
        setInvNotes(editData.notes as string || '');
        setInvInternalNotes(editData.internal_notes as string || '');
        setInvComposedBy(editData.composed_by as string || '');
        if (editData.client_id) {
          const cl = c.find((x: InvClient) => x.id === editData.client_id);
          if (cl) setInvSelectedClient(cl);
        }
        if (editData.lines && Array.isArray(editData.lines)) {
          setInvLines((editData.lines as Array<Record<string, unknown>>).map(l => ({
            item_id: l.item_id as string || null,
            description: l.description as string || '',
            quantity: String(l.quantity || 1),
            unit: l.unit as string || 'бр.',
            unit_price: String(l.unit_price || 0),
            vat_rate: String(Number(l.vat_rate || 20).toFixed(2)),
          })));
        }
      }
    } catch (e) { invToastShow('Грешка при зареждане: ' + (e instanceof Error ? e.message : ''), 'error'); }
  };

  const invSaveInvoice = async (status: string) => {
    if (!invSelectedClient) { invToastShow('Моля, изберете клиент', 'error'); return; }
    const filledLines = invLines.filter(l => l.description.trim());
    if (filledLines.length === 0) { invToastShow('Добавете поне един ред', 'error'); return; }
    setInvSaving(true);
    const lineVatRates = filledLines.map(l => parseFloat(l.vat_rate) || 20);
    const dominantVatRate = lineVatRates.length > 0 ? lineVatRates[0] : 20;
    // Save sync settings
    try { await invUpdateSyncSettings(invCompanyId, invProfileId, { sync_mode: invSyncMode, delay_minutes: parseInt(invDelayMinutes) || 30 }); } catch { /* ignore */ }
    const noVatReason = invNoVat ? (invNoVatReason === 'other' ? invNoVatReasonCustom : invNoVatReason) : '';
    const payload = {
      company_id: invCompanyId, profile_id: invProfileId,
      client_id: invSelectedClient.id, document_type: invDocType,
      invoice_number: invNumber ? parseInt(invNumber) : null,
      issue_date: invIssueDate || null, tax_event_date: invTaxEventDate || null,
      due_date: invShowDueDate ? (invDueDate || null) : null,
      vat_rate: dominantVatRate, no_vat: invNoVat, no_vat_reason: noVatReason || null,
      discount: parseFloat(invDiscount) || 0, discount_type: invDiscountType,
      payment_method: invPaymentMethod || null,
      notes: invNotes || null, internal_notes: invInternalNotes || null,
      currency: 'EUR', status,
      stub_id: invSelectedStub || null, composed_by: invComposedBy || null,
      lines: filledLines.map((l, i) => ({
        item_id: l.item_id, position: i, description: l.description,
        quantity: parseFloat(l.quantity) || 1, unit: l.unit,
        unit_price: parseFloat(l.unit_price) || 0, vat_rate: parseFloat(l.vat_rate) || 20,
      })),
    };
    try {
      if (invEditInvoiceId) {
        const result = await invUpdateInvoice(invEditInvoiceId, payload, invCompanyId, invProfileId);
        invToastShow(`${invDocType === 'proforma' ? 'Проформа' : 'Фактура'} ${result.invoice_number} е обновена`);
      } else {
        const result = await invCreateInvoice(payload);
        invToastShow(`${invDocType === 'proforma' ? 'Проформа' : 'Фактура'} ${result.invoice_number} е ${status === 'issued' ? 'издадена' : 'запазена като чернова'}`);
      }
      setInvModal(null);
      // WebSocket will auto-refresh the file list
      if (activeProfile) loadProfileData(activeProfile.id);
    } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
    finally { setInvSaving(false); }
  };

  const invHandleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете фактура ${invoiceNumber}? Това действие е необратимо.`)) return;
    try {
      await invDeleteInvoice(invoiceId, invCompanyId, invProfileId);
      invToastShow(`Фактура ${invoiceNumber} е изтрита`);
      if (activeProfile) loadProfileData(activeProfile.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Грешка';
      if (msg.includes('одобрена') || msg.includes('approved') || msg.includes('защитен') || msg.includes('protected') || msg.includes('синхронизиран')) {
        alert('Изтриването е блокирано: ' + msg);
      } else {
        invToastShow('Грешка: ' + msg, 'error');
      }
    }
  };

  const invHandleSync = async (companyId: string, profileId: string) => {
    setInvSyncing(prev => ({ ...prev, [companyId]: true }));
    try {
      const result = await invSyncInvoices(companyId, profileId);
      const syncCount = result?.synced_count || 0;
      if (syncCount > 0) {
        invToastShow(`Синхронизирани фактури: ${syncCount}`);
      } else {
        invToastShow('Всички фактури вече са синхронизирани');
      }
      if (activeProfile) loadProfileData(activeProfile.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('вече') || msg.includes('already')) {
        invToastShow('Всички фактури вече са синхронизирани');
      } else {
        invToastShow('Грешка при синхронизация: ' + msg, 'error');
      }
    }
    finally { setInvSyncing(prev => ({ ...prev, [companyId]: false })); }
  };

  const invCalcLineTotal = (line: InvLine) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    return qty * price;
  };

  const invCalcTotals = () => {
    const filled = invLines.filter(l => l.description.trim());
    let subtotal = 0;
    let totalVat = 0;
    filled.forEach(l => {
      const lineTotal = invCalcLineTotal(l);
      const vatRate = parseFloat(l.vat_rate) || 0;
      subtotal += lineTotal;
      if (!invNoVat) totalVat += lineTotal * vatRate / 100;
    });
    let discountAmount = 0;
    const discountVal = parseFloat(invDiscount) || 0;
    if (discountVal > 0) {
      discountAmount = invDiscountType === '%' ? subtotal * discountVal / 100 : discountVal;
    }
    const afterDiscount = subtotal - discountAmount;
    const vatOnDiscount = invNoVat ? 0 : totalVat * (afterDiscount / (subtotal || 1));
    const total = afterDiscount + vatOnDiscount;
    return { subtotal, totalVat: vatOnDiscount, discountAmount, total };
  };

  const invUpdateLine = (idx: number, field: keyof InvLine, value: string) => {
    setInvLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const invAddLine = () => {
    const defVat = String(Number(invSettings.default_vat_rate || 20).toFixed(2));
    setInvLines(prev => [...prev, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }]);
  };

  const invRemoveLine = (idx: number) => {
    setInvLines(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  const invSelectItem = (item: InvItem, lineIdx: number) => {
    setInvLines(prev => prev.map((l, i) => i === lineIdx ? {
      ...l, item_id: item.id, description: item.name,
      unit: item.unit, unit_price: Number(item.default_price).toFixed(2),
      vat_rate: Number(item.vat_rate).toFixed(2),
    } : l));
    setInvModal('invoice');
  };

  // WebSocket connection for real-time updates (no polling)
  useEffect(() => {
    if (!activeProfile) return;
    const profileId = activeProfile.id;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(getWebSocketUrl(profileId));
        ws.onopen = () => {
          console.log('[WS] Connected for profile', profileId);
          // Reload data on reconnect to catch any missed notifications
          loadProfileData(profileId);
          // Send pings every 25s to keep connection alive
          pingTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };
        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'refresh') {
              console.log('[WS] Refresh received:', msg.reason);
              loadProfileData(profileId);
              // Handle QR verification completion via WebSocket
              if (qrTokenRef.current && msg.qr_result) {
                const result = msg.qr_result as Record<string, unknown>;
                setQrPolling(false);
                setVerificationModal(null);
                setIdCardVerifyMode('choose');
                setQrToken(null);
                if (result.status === 'auto_approved') {
                  setAutoVerifiedModal({ show: true, message: (result.message as string) || 'Фирмата е одобрена автоматично!', companyName: '' });
                } else {
                  setSuccess((result.message as string) || 'Заявката е изпратена за преглед от администратор.');
                }
              }
            }
          } catch { /* ignore non-JSON */ }
        };
        ws.onclose = () => {
          console.log('[WS] Disconnected, reconnecting in 3s...');
          if (pingTimer) clearInterval(pingTimer);
          if (!closed) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [activeProfile, loadProfileData]);

  // Check for billing redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      setSuccess('Абонаментът е активиран успешно!');
      setActiveTab('billing');
      window.history.replaceState({}, '', window.location.pathname);
      loadBillingData();
    } else if (billing === 'cancel') {
      setError('Плащането беше отменено.');
      setActiveTab('billing');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadBillingData]);

  // QR verification now uses WebSocket (no polling needed)

  // Viber-style delivery ticks component
  const DeliveryTicks = ({ status, crossCopiedFrom }: { status?: string; crossCopiedFrom?: string }) => {
    if (crossCopiedFrom) {
      // Double red ticks - invoice received from counterparty
      return <span className="inline-flex items-center" title={`Получена от ${crossCopiedFrom}`}><span className="text-red-500 text-xs font-bold" style={{letterSpacing: '-3px'}}>&#10003;&#10003;</span></span>;
    } else if (status === 'approved') {
      // Double blue ticks
      return <span className="inline-flex items-center" title="Одобрена от контрагента"><span className="text-blue-500 text-xs font-bold" style={{letterSpacing: '-3px'}}>&#10003;&#10003;</span></span>;
    } else if (status === 'pending') {
      // Double gray ticks
      return <span className="inline-flex items-center" title="Изпратена, чака одобрение"><span className="text-gray-400 text-xs font-bold" style={{letterSpacing: '-3px'}}>&#10003;&#10003;</span></span>;
    } else if (status === 'no_subscriber') {
      // Single gray tick
      return <span className="inline-flex items-center" title="Обработена"><span className="text-gray-400 text-xs font-bold">&#10003;</span></span>;
    } else if (status === 'none') {
      return <span className="inline-flex items-center" title="Обработена"><span className="text-gray-400 text-xs font-bold">&#10003;</span></span>;
    }
    return null;
  };

  // Sync status badge component - lightning bolt SVG icons (matches production)
  const SyncBadge = ({ count, color }: { count: number; color: string }) => {
    const fill = color === 'blue' ? '#3b82f6' : color === 'red' ? '#ef4444' : '#94a3b8';
    const bolt = <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill, display: 'inline' }}><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" /></svg>;
    return (
      <span className="inline-flex items-center" style={{ gap: 0 }}>
        {bolt}
        {count >= 2 && <span style={{ marginLeft: '-4px' }}>{bolt}</span>}
      </span>
    );
  };

  // Edit protection modal - shown when trying to edit a synced invoice
  const showEditProtectModal = () => {
    const existing = document.getElementById('edit-protect-overlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'edit-protect-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:10000;animation:epFadeIn 0.2s ease-out';
    const md = document.createElement('div');
    md.style.cssText = 'background:#fff;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);max-width:440px;width:90%;overflow:hidden;animation:epSlideIn 0.2s ease-out';
    const hd = document.createElement('div');
    hd.style.cssText = 'padding:24px 24px 0;display:flex;align-items:flex-start;gap:16px';
    const iw = document.createElement('div');
    iw.style.cssText = 'width:48px;height:48px;border-radius:50%;background:#FEF2F2;display:flex;align-items:center;justify-content:center;flex-shrink:0';
    iw.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    const tc = document.createElement('div');
    tc.style.cssText = 'flex:1';
    const ti = document.createElement('h3');
    ti.style.cssText = 'margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b';
    ti.textContent = 'Защита на фактура';
    const ms = document.createElement('p');
    ms.style.cssText = 'margin:0;font-size:14px;line-height:1.5;color:#475569';
    ms.innerHTML = '<span style="color:#dc2626;font-weight:600">Тази фактура не може да бъде редактирана</span>, защото е синхронизирана с контрагента.<br><br><span style="font-size:13px;color:#64748b">За да я редактирате, контрагентът трябва първо да я изтрие от профила си.</span>';
    tc.appendChild(ti); tc.appendChild(ms);
    hd.appendChild(iw); hd.appendChild(tc);
    const ft = document.createElement('div');
    ft.style.cssText = 'padding:20px 24px;display:flex;justify-content:flex-end';
    const cb = document.createElement('button');
    cb.style.cssText = 'padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer';
    cb.textContent = 'Разбрах';
    cb.onclick = () => ov.remove();
    ft.appendChild(cb);
    md.appendChild(hd); md.appendChild(ft);
    ov.appendChild(md);
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
  };

  // Show loading screen while checking session
  if (authScreen === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Screenshots for landing page gallery
  const screenshots = [
    { src: '/screenshots/01-dashboard-companies.png', title: 'Табло с фирми', desc: 'Преглед на всички регистрирани фирми с ЕИК, ДДС номер, адрес и МОЛ. Бързо добавяне на нова фирма с автоматично зареждане от Търговския регистър.' },
    { src: '/screenshots/02-add-company-form.png', title: 'Добавяне на фирма', desc: 'Въведете ЕИК и натиснете "Търси" — системата автоматично попълва всички данни от Търговския регистър: име, ДДС номер, адрес и МОЛ.' },
    { src: '/screenshots/03-upload.png', title: 'Качване на фактури', desc: 'Drag & Drop или избор на файлове — качете PDF, JPG, PNG или ZIP с фактури. Поддържа множество файлове наведнъж.' },
    { src: '/screenshots/04-files-structure.png', title: 'Файлове и сваляне', desc: 'Фактурите се организират автоматично по фирми и тип (покупки/продажби). Лесно сваляне на всеки файл поотделно или групово.' },
    { src: '/screenshots/05-history.png', title: 'История на обработка', desc: 'Пълна история на всяка фактура — дата, номер, фирма, тип и статус. Филтриране по обработени и необработени.' },
    { src: '/screenshots/06-notifications.png', title: 'Известия в реално време', desc: 'Получавате известия при нови фактури от контрагенти, одобрения и промени. WebSocket връзка за мигновени обновявания плюс имейл нотификации.' },
    { src: '/screenshots/07-billing-plans.png', title: 'Гъвкави ценови планове', desc: 'Пет ценови плана — от безплатен до годишен без ограничения. Плащане чрез Stripe.' },
  ];

  // Show auth screens (login/register/verify) as modal overlay
  if (!currentUser && (authScreen === 'login' || authScreen === 'register' || authScreen === 'verify')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4">
              <svg width="64" height="64" viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gLogo)"/><rect x="16" y="12" width="16" height="20" rx="2" fill="white" opacity="0.9"/><line x1="19" y1="18" x2="29" y2="18" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/><line x1="19" y1="22" x2="27" y2="22" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><line x1="19" y1="26" x2="25" y2="26" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/><circle cx="38" cy="8" r="5" fill="#f97316"/><path d="M38 5.5v5M35.5 8h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><defs><linearGradient id="gLogo" x1="2" y1="2" x2="46" y2="46"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Mega<span className="text-indigo-600">Ban</span><span className="text-orange-600 font-extrabold">x</span></h1>
            <p className="text-gray-500 mt-2">Интелигентна система за управление на фактури</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error} <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-green-700 text-sm"><CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}</div>}

          {authScreen === 'verify' ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-600" /> Въведете код</h2>
              <p className="text-sm text-gray-500 mb-4">Код е изпратен на <strong>{authEmail}</strong></p>
              <input type="text" value={authCode} onChange={e => setAuthCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthVerify()} placeholder="Въведете 6-цифрен код" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 text-center text-lg tracking-widest" autoFocus maxLength={6} />
              <button onClick={handleAuthVerify} disabled={authLoading} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Потвърди
              </button>
              <button onClick={() => { setAuthScreen('landing'); setAuthCode(''); setError(''); setSuccess(''); }} className="w-full mt-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Назад към началната страница</button>
            </div>
          ) : authScreen === 'register' ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Регистрация</h2>
              <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Вашето име" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" autoFocus />
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthRegister()} placeholder="Имейл адрес" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" />
              <label className="flex items-start gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={authTosAccepted} onChange={e => setAuthTosAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <span className="text-xs text-gray-600">Приемам <button type="button"               onClick={(e) => { e.preventDefault(); fetch('/api/terms').then(r=>r.json()).then(d=>{setTosContent(d.content);setShowTosModal(true);}); }} className="text-indigo-600 hover:text-indigo-800 underline bg-transparent border-none cursor-pointer p-0 font-inherit text-xs">Общите условия за ползване</button></span>
                            </label>
                            <button onClick={handleAuthRegister} disabled={authLoading || !authTosAccepted} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Регистрация
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">Вече имате акаунт? <button onClick={() => { setAuthScreen('login'); setError(''); setSuccess(''); setAuthTosAccepted(false); setAuthNeedsTos(false); }} className="text-indigo-600 hover:text-indigo-800 font-medium">Влезте</button></p>
              <button onClick={() => { setAuthScreen('landing'); setError(''); setSuccess(''); }} className="w-full mt-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Назад към началната страница</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-600" /> Вход</h2>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && !authNeedsTos && handleAuthLogin()} placeholder="Имейл адрес" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" autoFocus />
              {authNeedsTos && (
                <>
                  <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Вашето име" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" />
                  <label className="flex items-start gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" checked={authTosAccepted} onChange={e => setAuthTosAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-xs text-gray-600">Приемам <button type="button" onClick={(e) => { e.preventDefault(); fetch('/api/terms').then(r=>r.json()).then(d=>{setTosContent(d.content);setShowTosModal(true);}); }} className="text-indigo-600 hover:text-indigo-800 underline bg-transparent border-none cursor-pointer p-0 font-inherit text-xs">Общите условия за ползване</button></span>
                  </label>
                </>
              )}
              <button onClick={handleAuthLogin} disabled={authLoading || (authNeedsTos && !authTosAccepted)} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Изпрати код
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">Нямате акаунт? <button onClick={() => { setAuthScreen('register'); setError(''); setSuccess(''); setAuthTosAccepted(false); setAuthNeedsTos(false); }} className="text-indigo-600 hover:text-indigo-800 font-medium">Регистрирайте се</button></p>
              <button onClick={() => { setAuthScreen('landing'); setError(''); setSuccess(''); }} className="w-full mt-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Назад към началната страница</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Landing page - visible for both logged-in and non-logged-in users
  if (authScreen === 'landing') {
    const sidebarItems: {key: typeof landingSection; label: string; icon: typeof Home}[] = [
      { key: 'about', label: 'За сайта', icon: Home },
      { key: 'how', label: 'Как работи', icon: Monitor },
      { key: 'screenshots', label: 'ScreenShots', icon: Camera },
      { key: 'security', label: 'Сигурност', icon: Shield },
      { key: 'pricing', label: 'Планове и цени', icon: CreditCard },
      { key: 'faq', label: 'Често задавани въпроси', icon: HelpCircle },
      { key: 'about_us', label: 'Кои сме ние', icon: Users2 },
      { key: 'contact', label: 'Контакти', icon: MessageSquare },
    ];

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Navbar - dark blue */}
        <nav className="shadow-md z-50 sticky top-0" style={{background: 'linear-gradient(to right, #0f172a, #1e293b)'}}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => { setAuthScreen('landing'); setLandingSection('about'); }} className="flex items-center gap-2 hover:opacity-80 transition">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gLogoN)"/><rect x="16" y="12" width="16" height="20" rx="2" fill="white" opacity="0.9"/><line x1="19" y1="18" x2="29" y2="18" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/><line x1="19" y1="22" x2="27" y2="22" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><line x1="19" y1="26" x2="25" y2="26" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/><circle cx="38" cy="8" r="5" fill="#f97316"/><path d="M38 5.5v5M35.5 8h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><defs><linearGradient id="gLogoN" x1="2" y1="2" x2="46" y2="46"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>
              <span className="text-xl font-bold text-white">Mega<span className="text-indigo-400">Ban</span><span className="text-orange-400 font-extrabold">x</span></span>
            </button>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-3">
              {currentUser ? (
                <>
                  <button onClick={() => setAuthScreen('dashboard')} className="px-4 py-2 text-sm font-medium text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition">Моят профил</button>
                  <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center gap-1 rounded-lg"><LogOut className="w-4 h-4" /> Изход</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setAuthScreen('login'); setError(''); setSuccess(''); }} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition">Вход</button>
                  <button onClick={() => { setAuthScreen('register'); setError(''); setSuccess(''); }} className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition shadow-sm">Регистрация</button>
                </>
              )}
            </div>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-700 px-4 py-3 space-y-2">
              {sidebarItems.map(item => (
                <button key={item.key} onClick={() => { setLandingSection(item.key); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${landingSection === item.key ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" /> {item.label}
                </button>
              ))}
              <div className="border-t border-gray-700 pt-2 mt-2">
                {currentUser ? (
                  <>
                    <button onClick={() => { setAuthScreen('dashboard'); setMobileMenuOpen(false); }} className="w-full px-3 py-2.5 text-sm font-medium text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition text-left">Моят профил</button>
                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition text-left flex items-center gap-1"><LogOut className="w-4 h-4" /> Изход</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setAuthScreen('login'); setError(''); setSuccess(''); setMobileMenuOpen(false); }} className="w-full px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition text-left">Вход</button>
                    <button onClick={() => { setAuthScreen('register'); setError(''); setSuccess(''); setMobileMenuOpen(false); }} className="w-full px-3 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition text-left">Регистрация</button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        <div className="flex flex-1">
          {/* Left Sidebar - hidden on mobile */}
          <aside className="hidden md:block w-64 bg-gray-50 border-r p-4 flex-shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
            <nav className="space-y-1">
              {sidebarItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setLandingSection(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    landingSection === item.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {/* ========== ЗА САЙТА ========== */}
            {landingSection === 'about' && (
              <div>
                {/* Hero */}
                <section className="py-16 px-6 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
                  <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                      <Zap className="w-4 h-4" /> AI-базирана обработка на фактури
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
                                            Издавайте и управлявайте фактурите си<br />
                                            <span className="text-indigo-600">интелигентно и автоматично</span>
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                                            MegaBanx ви позволява да издавате фактури и да ги изпращате автоматично на контрагентите, да качвате и организирате документи с AI, и да спестявате часове ръчна работа. Без сложни настройки — започнете веднага.
                    </p>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 max-w-3xl mx-auto mb-8 text-left">
                      <h3 className="text-base font-bold text-indigo-800 mb-2 flex items-center gap-2"><Zap className="w-5 h-5" /> Без предварително сортиране!</h3>
                      <p className="text-sm text-indigo-700 leading-relaxed">
                        Издавайте фактури директно от системата или качете готови документи от множество фирми. <strong>Не е нужно да сортирате фактурите предварително!</strong> Просто качете
                        всички сканирани или генерирани фактури (PDF, JPEG, PNG и др.) — без значение за коя ваша фирма се отнасят — и натиснете
                        &quot;Обработка с AI&quot;. Нашият изкуствен интелект автоматично ще:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-indigo-700">
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Разпознае и наименова всяка фактура (дата, номер, издател, получател)</span></li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Разпредели фактурите по съответните фирми в профила ви</span></li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Сортира ги в папки &quot;Покупки&quot; и &quot;Продажби&quot; на всяка фирма</span></li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Предостави копие на контрагента, където автоматично ще се сортират в неговите папки</span></li>
                      </ul>
                      <p className="mt-3 text-sm text-indigo-800 font-semibold">Всичко е 100% автоматизирано с най-модерни AI технологии за максимално улеснение.</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <button onClick={() => { setAuthScreen('register'); setError(''); setSuccess(''); }} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2">
                        Започнете безплатно <ArrowRight className="w-5 h-5" />
                      </button>
                      <button onClick={() => setLandingSection('how')} className="px-8 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition">
                        Как работи?
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-4">Безплатен план — без кредитна карта</p>
                  </div>
                </section>

                {/* Features */}
                <section className="py-14 px-6 bg-white">
                  <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                      <h2 className="text-3xl font-bold text-gray-900 mb-3">Всичко, от което се нуждаете</h2>
                      <p className="text-gray-500 max-w-xl mx-auto">Пълен набор от инструменти за ефективно управление на фактурите на вашия бизнес</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {[
                        { icon: Brain, title: 'AI обработка', desc: 'Изкуственият интелект разпознава данните от фактурите — дата, номер, издател, получател, суми — автоматично и точно.', color: 'bg-purple-100 text-purple-600' },
                        { icon: Building2, title: 'Търговски регистър', desc: 'Въведете ЕИК и данните на фирмата се зареждат автоматично. Без ръчно въвеждане на имена, адреси и ДДС номера.', color: 'bg-blue-100 text-blue-600' },
                        { icon: FolderSync, title: 'Автоматична организация', desc: 'Фактурите се сортират по фирми и типове (покупки/продажби) автоматично. Никога повече хаос в папките.', color: 'bg-green-100 text-green-600' },
                        { icon: Download, title: 'Сваляне на фактури', desc: 'Свалете всяка фактура поотделно или групово. Изберете няколко файла и ги свалете с един клик.', color: 'bg-teal-100 text-teal-600' },
                        { icon: Bell, title: 'Известия и нотификации', desc: 'Мигновени WebSocket известия при нови фактури, одобрения и промени. Плюс имейл нотификации за всяко събитие.', color: 'bg-red-100 text-red-600' },
                        { icon: ArrowLeftRight, title: 'Споделяне с контрагенти', desc: 'Фактурите автоматично се споделят с контрагентите ви в системата. Те получават известие и могат да одобрят.', color: 'bg-orange-100 text-orange-600' },
                        { icon: BarChart3, title: 'Пълна история', desc: 'Детайлна история на всяка фактура — кога е качена, обработена, одобрена. Филтриране и търсене по всички полета.', color: 'bg-cyan-100 text-cyan-600' },
                        { icon: Shield, title: 'Сигурност', desc: 'SSL криптиране, верификация на фирми, GDPR съвместимост. Данните ви са защитени на европейски сървъри.', color: 'bg-emerald-100 text-emerald-600' },
                        { icon: Mail, title: 'Издаване и доставка', desc: 'Издавайте фактури директно в MegaBanx или качете готови документи — контрагентите ви ги получават автоматично по имейл и в системата. Без ръчно изпращане, без прикачени файлове. Всичко е автоматизирано от край до край.', color: 'bg-indigo-100 text-indigo-600' },
                        { icon: Receipt, title: 'Структура на фактурите', desc: 'Ясна и прегледна структура на всяка фактура — редове, количества, мерни единици, ДДС ставки и суми. Кочани с 10-цифрени номера за пълен контрол.', color: 'bg-violet-100 text-violet-600' },
                      ].map((f, i) => (
                        <div key={i} className="bg-gray-50 rounded-2xl p-5 hover:shadow-lg transition-shadow border border-gray-100">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                            <f.icon className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ========== КАК РАБОТИ ========== */}
            {landingSection === 'how' && (
              <section className="py-10 px-6">
                <div className="max-w-5xl mx-auto">

                  {/* ── Hero мотивационен блок ── */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-10 mb-12 text-center shadow-2xl">
                    <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span className="text-white/90 text-sm font-medium tracking-wide">Бъдещето на фактурирането</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight" style={{fontFamily: "'Inter', system-ui, sans-serif"}}>
                        Издавайте, организирайте и доставяйте автоматично.
                      </h2>
                      <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-medium">
                        MegaBanx <span className="underline decoration-yellow-300 decoration-2 underline-offset-4">автоматизира издаването и обмена на фактури</span> между вас и вашите клиенти.
                      </p>
                    </div>
                  </div>

                  {/* ── Втори мотивационен текст ── */}
                  <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-2xl p-8 mb-12 border border-sky-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-200/40 to-transparent rounded-bl-full" />
                    <div className="relative flex items-start gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Globe className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">Вашият цифров мост към всеки контрагент</h3>
                        <p className="text-base text-gray-700 leading-relaxed">
                                                    Издавате или качвате фактура — тя е при клиента и неговия счетоводител <span className="font-bold text-indigo-600">за секунди</span>. Без сканиране, без именуване на файлове — доставката е автоматична.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Таблица: Преди vs MegaBanx ── */}
                  <div className="mb-14">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Преди и след Mega<span className="text-indigo-600">Ban</span><span className="text-orange-600">x</span></h2>
                      <p className="text-gray-500 mt-2">Вижте разликата с числа</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Преди */}
                      <div className="relative bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200 shadow-sm">
                        <div className="absolute -top-3 left-6 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">Преди</div>
                        <div className="mt-3 flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-500" />
                          </div>
                          <div>
                            <div className="text-2xl font-black text-red-600">4 часа</div>
                            <div className="text-xs text-red-400 font-medium">на ден</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          <span className="font-bold">100 фактури/ден</span> = 4 часа сканиране, именуване и ръчно пращане по имейл.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {['Сканиране', 'Именуване', 'Имейли'].map(t => (
                            <span key={t} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">{t}</span>
                          ))}
                        </div>
                      </div>

                      {/* С MegaBanx */}
                      <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-300 shadow-lg ring-2 ring-green-200/50">
                        <div className="absolute -top-3 left-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">С MegaBanx</div>
                        <div className="mt-3 flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Rocket className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-black text-green-600">2 мин</div>
                            <div className="text-xs text-green-500 font-medium">на ден</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          <span className="font-bold">100 фактури/ден</span> = 2 минути за Drag & Drop + AI обработка. Всичко е автоматично.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {['Drag & Drop', 'AI', 'Автоматично'].map(t => (
                            <span key={t} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{t}</span>
                          ))}
                        </div>
                      </div>

                      {/* Резултат */}
                      <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border-2 border-amber-300 shadow-sm">
                        <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">Резултат</div>
                        <div className="mt-3 flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-black text-amber-600">80 часа</div>
                            <div className="text-xs text-amber-500 font-medium">спестени/месец</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          Спестявате <span className="font-bold">80 часа месечно</span> административен труд. Фокусирайте се върху бизнеса.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {['Ефективност', 'Спестявания', 'Растеж'].map(t => (
                            <span key={t} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Анимирана инфографика — 4 стъпки ── */}
                  <div className="mb-14">
                    <div className="text-center mb-10">
                      <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-4 py-1.5 mb-4">
                        <ScanLine className="w-4 h-4" />
                        <span className="text-sm font-bold tracking-wide">Как протича процесът?</span>
                      </div>
                                            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">От издаване до подредена счетоводна папка</h2>
                                            <p className="text-gray-500 mt-2">Издавайте или качвайте. Напълно автоматично.</p>
                    </div>

                    {/* Стъпки с анимирана връзка */}
                    <div className="relative">
                      {/* Пунктирана линия */}
                      <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5" style={{backgroundImage: 'repeating-linear-gradient(90deg, #a78bfa 0px, #a78bfa 8px, transparent 8px, transparent 16px)'}} />

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                          {
                            step: 1,
                            icon: FileUp,
                                                        title: 'Издаване или качване',
                                                        desc: 'Издайте фактура директно в MegaBanx или качете PDF от складовата програма. Drag & Drop или изберете файлове — готово за секунди.',
                            gradient: 'from-blue-500 to-cyan-500',
                            bgLight: 'bg-blue-50',
                            borderColor: 'border-blue-200',
                            textColor: 'text-blue-600',
                            emoji: '📄',
                            delay: '0s',
                          },
                          {
                            step: 2,
                            icon: Brain,
                            title: 'AI разпознаване',
                            desc: 'Системата анализира данните — дата, номер, издател, получател — и именува файла автоматично: yyyy.mm.dd_Име.',
                            gradient: 'from-purple-500 to-pink-500',
                            bgLight: 'bg-purple-50',
                            borderColor: 'border-purple-200',
                            textColor: 'text-purple-600',
                            emoji: '🤖',
                            delay: '0.15s',
                          },
                          {
                            step: 3,
                            icon: UserCheck,
                            title: 'Клиентът одобрява',
                            desc: 'Клиентът получава мигновено известие, преглежда фактурата в системата и натиска „Одобрявам" с един клик.',
                            gradient: 'from-emerald-500 to-green-500',
                            bgLight: 'bg-emerald-50',
                            borderColor: 'border-emerald-200',
                            textColor: 'text-emerald-600',
                            emoji: '✅',
                            delay: '0.3s',
                          },
                          {
                            step: 4,
                            icon: CalendarCheck,
                            title: 'Счетоводителят тегли',
                            desc: 'Счетоводителят сваля всичко подредено — в края на деня, седмицата или месеца. Без хаос, без пропуски.',
                            gradient: 'from-amber-500 to-orange-500',
                            bgLight: 'bg-amber-50',
                            borderColor: 'border-amber-200',
                            textColor: 'text-amber-600',
                            emoji: '📊',
                            delay: '0.45s',
                          },
                        ].map((s) => (
                          <div
                            key={s.step}
                            className={`relative ${s.bgLight} rounded-2xl p-5 border ${s.borderColor} hover:shadow-xl transition-all duration-500 hover:-translate-y-1 group`}
                            style={{animation: `fadeSlideUp 0.6s ease-out ${s.delay} both`}}
                          >
                            {/* Номер на стъпка */}
                            <div className={`absolute -top-4 -left-2 w-9 h-9 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center shadow-lg text-white font-black text-sm`}>
                              {s.step}
                            </div>
                            {/* Емоджи анимация */}
                            <div className="text-3xl mb-3 mt-1" style={{animation: `bounceGentle 2s ease-in-out ${s.delay} infinite`}}>
                              {s.emoji}
                            </div>
                            {/* Икона */}
                            <div className={`w-10 h-10 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                              <s.icon className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-base font-extrabold text-gray-900 mb-2 tracking-tight">{s.title}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                            {/* Стрелка към следващ */}
                            {s.step < 4 && (
                              <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full border-2 border-gray-200 items-center justify-center shadow-sm">
                                <ArrowRight className="w-4 h-4 text-indigo-500" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CSS анимации */}
                    <style>{`
                      @keyframes fadeSlideUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                      @keyframes bounceGentle {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-6px); }
                      }
                      @keyframes pulseGlow {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.3); }
                        50% { box-shadow: 0 0 20px 6px rgba(99,102,241,0.15); }
                      }
                    `}</style>
                  </div>

                  {/* ── Визуална лента: Стар процес vs Нов процес ── */}
                  <div className="mb-12 bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {/* Стар процес */}
                      <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50/30 border-b md:border-b-0 md:border-r">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-900 tracking-tight">Старият начин</h4>
                            <p className="text-xs text-red-400">Бавно, ръчно, досадно</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[
                            'Сканирайте всяка фактура',
                            'Именувайте файла ръчно',
                            'Отворете имейла',
                            'Прикачете файла',
                            'Напишете текст',
                            'Изпратете на клиента',
                            'Повторете × 100 пъти',
                          ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-red-400 text-xs font-bold">{i + 1}</span>
                              </div>
                              <span className="text-gray-600 line-through decoration-red-300">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Нов процес */}
                      <div className="p-6 bg-gradient-to-br from-green-50/30 to-emerald-50">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                            <Rocket className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-900 tracking-tight">С MegaBanx</h4>
                            <p className="text-xs text-green-500">Бързо, автоматично, лесно</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[
                            { text: 'Drag & Drop файловете', icon: Upload },
                            { text: 'AI разпознава и именува', icon: Brain },
                            { text: 'Клиентът получава известие', icon: Bell },
                          ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <step.icon className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="text-gray-800 font-medium">{step.text}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 bg-green-100 rounded-xl p-3 text-center">
                          <span className="text-green-700 font-bold text-sm">Готово! 🎉 Всичко останало е автоматично.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Анимационно филмче ── */}
                  <div className="mb-14">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full px-5 py-2 mb-3">
                        <Monitor className="w-4 h-4" />
                        <span className="text-sm font-bold tracking-wide">Вижте как работи на практика</span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">От издаване до получаване — под 1 минута</h2>
                    </div>

                    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl border border-slate-700">
                      {/* Фонови частици */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="absolute w-1 h-1 bg-white/20 rounded-full" style={{
                            left: `${8 + i * 8}%`, top: `${10 + (i % 3) * 30}%`,
                            animation: `particleFloat 3s ease-in-out ${i * 0.3}s infinite alternate`
                          }} />
                        ))}
                      </div>

                      {/* Брояч на време */}
                      <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 z-20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full" style={{animation: 'pulse 1s ease-in-out infinite'}} />
                          <span className="text-green-400 font-mono text-sm font-bold tracking-wider" style={{animation: 'timerCount 10s linear infinite'}}>⏱ 00:00</span>
                        </div>
                        <div className="text-white/50 text-xs mt-0.5 text-right">от 10 сек</div>
                      </div>

                      {/* Сцена */}
                      <div className="relative flex items-center justify-between gap-2 md:gap-4 min-h-64 md:min-h-80 z-10">

                        {/* ═══ Лява страна: Човече A ═══ */}
                        <div className="flex flex-col items-center gap-3 flex-shrink-0 w-20 md:w-28">
                          {/* Аватар */}
                          <div className="relative">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-blue-300">
                              <span className="text-2xl md:text-3xl">👨‍💼</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-bold text-xs md:text-sm">Фирма А</div>
                            <div className="text-blue-300 text-xs">Изпращач</div>
                          </div>
                          {/* Стопка файлове */}
                          <div className="relative w-16 md:w-20 h-20 md:h-24">
                            {['ФА-001.pdf', 'ФА-002.pdf', 'ФА-003.pdf', 'ФА-004.pdf', 'ФА-005.pdf'].map((name, i) => (
                              <div key={i}
                                className="absolute left-0 right-0 bg-white rounded-md px-1.5 py-1 shadow-md border border-gray-200"
                                style={{
                                  bottom: `${i * 4}px`,
                                  zIndex: 5 - i,
                                  animation: `filePickUp 10s ease-in-out ${i * 0.6}s infinite`,
                                  transformOrigin: 'center bottom',
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-red-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-gray-700 truncate">{name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ═══ Стрелка 1: Качване ═══ */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className="flex items-center">
                            {[0,1,2].map(i => (
                              <div key={i} className="w-2 md:w-3 h-0.5 bg-blue-400 rounded-full mx-0.5" style={{animation: `arrowPulse 1.5s ease-in-out ${i * 0.2}s infinite`}} />
                            ))}
                            <ArrowRight className="w-4 h-4 text-blue-400" style={{animation: 'arrowPulse 1.5s ease-in-out 0.6s infinite'}} />
                          </div>
                          <span className="text-blue-300 text-xs font-medium hidden md:block">Качване</span>
                        </div>

                        {/* ═══ Център: MegaBanx обработка ═══ */}
                        <div className="flex flex-col items-center gap-3 flex-shrink-0">
                          {/* Лого на системата */}
                          <div className="relative">
                            <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex flex-col items-center justify-center shadow-xl border border-white/20"
                              style={{animation: 'processingGlow 3s ease-in-out infinite'}}>
                              <Brain className="w-8 h-8 md:w-10 md:h-10 text-white mb-1" style={{animation: 'spinSlow 4s linear infinite'}} />
                              <span className="text-white font-black text-xs md:text-sm tracking-tight">Mega<span className="text-indigo-300">Ban</span><span className="text-orange-400">x</span></span>
                            </div>
                            {/* Пръстен около */}
                            <div className="absolute -inset-2 border-2 border-dashed border-purple-400/30 rounded-2xl" style={{animation: 'spinSlow 8s linear infinite reverse'}} />
                            {/* Искри */}
                            {[0,1,2,3].map(i => (
                              <div key={i} className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full" style={{
                                top: ['0%','50%','100%','50%'][i],
                                left: ['50%','100%','50%','0%'][i],
                                transform: 'translate(-50%, -50%)',
                                animation: `sparkle 2s ease-in-out ${i * 0.5}s infinite`,
                              }} />
                            ))}
                          </div>

                          {/* Прогрес бар */}
                          <div className="w-24 md:w-36 h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                            <div className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 rounded-full" style={{animation: 'progressFill 10s ease-in-out infinite', backgroundSize: '200% 100%'}} />
                          </div>

                          {/* Хронометър */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <div className="relative overflow-hidden h-5 w-16 flex items-center justify-center">
                              {[...Array(16)].map((_, sec) => (
                                <span key={sec} className="absolute text-cyan-300 font-mono text-sm font-bold tracking-wider" style={{
                                  animation: `chronoDigit${sec} 10s ease-in-out infinite`,
                                  opacity: 0,
                                }}>
                                  {`00:${sec.toString().padStart(2, '0')}`}
                                </span>
                              ))}
                            </div>
                            <span className="text-cyan-400/60 text-xs font-medium">сек</span>
                          </div>

                          {/* Етикети за обработка */}
                          <div className="flex flex-col items-center gap-1">
                            {['📄 Разчитане...', '🏷️ Именуване...', '📁 Сортиране...', '✅ Готово!'].map((label, i) => (
                              <div key={i} className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                                animation: `labelCycle 10s ease-in-out infinite`,
                                animationDelay: `${i * 2.5}s`,
                                opacity: 0,
                                color: i === 3 ? '#4ade80' : '#a5b4fc',
                              }}>
                                {label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ═══ Стрелки: Доставяне (две разклонения) ═══ */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {/* SVG стрелки под ъгъл */}
                          <svg viewBox="0 0 60 100" className="w-10 h-20 md:w-14 md:h-28" fill="none">
                            {/* Горна стрелка - към Фирма А */}
                            <path d="M5 50 Q15 50 30 25 L50 8" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 3" className="animate-pulse" opacity="0.9">
                              <animate attributeName="stroke-dashoffset" values="14;0" dur="1.5s" repeatCount="indefinite" />
                            </path>
                            <polygon points="48,2 55,8 48,14" fill="#60a5fa" opacity="0.9">
                              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
                            </polygon>
                            {/* Долна стрелка - към Фирма Б */}
                            <path d="M5 50 Q15 50 30 75 L50 92" stroke="#34d399" strokeWidth="2" strokeDasharray="4 3" className="animate-pulse" opacity="0.9">
                              <animate attributeName="stroke-dashoffset" values="14;0" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                            </path>
                            <polygon points="48,86 55,92 48,98" fill="#34d399" opacity="0.9">
                              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                            </polygon>
                          </svg>
                          <span className="text-white/60 text-xs font-medium hidden md:block">Доставка</span>
                        </div>

                        {/* ═══ Дясна страна: Фирма А (горе) + Фирма Б (долу) ═══ */}
                        <div className="flex flex-col items-center gap-4 flex-shrink-0 w-24 md:w-32">

                          {/* Фирма А — сортирани документи */}
                          <div className="flex flex-col items-center gap-1.5 w-full">
                            <div className="relative">
                              <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-blue-300">
                                <span className="text-lg md:text-2xl">👨‍💼</span>
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-white font-bold text-xs">Фирма А</div>
                              <div className="text-blue-300 text-xs leading-tight">Сортирани док.</div>
                            </div>
                            {/* Папки с обработени файлове за Фирма А */}
                            <div className="relative w-full h-14 md:h-16">
                              {['Покупки/', 'Продажби/'].map((folder, i) => (
                                <div key={i}
                                  className="absolute left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md px-1 py-1 shadow-md border border-blue-400"
                                  style={{
                                    bottom: `${i * 24}px`,
                                    animation: `folderAppear 10s ease-out ${6 + i * 0.4}s infinite`,
                                    opacity: 0,
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    <FolderOpen className="w-2.5 h-2.5 text-white flex-shrink-0" />
                                    <span className="text-xs font-bold text-white truncate">{folder}</span>
                                  </div>
                                  <div className="flex gap-0.5 mt-0.5">
                                    {[0,1].map(j => (
                                      <div key={j} className="w-2.5 h-2.5 bg-white/30 rounded-sm" style={{animation: `miniFileAppear 10s ease-out ${7 + i * 0.4 + j * 0.2}s infinite`, opacity: 0}} />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Разделител */}
                          <div className="w-16 h-px bg-white/10" />

                          {/* Фирма Б — получател */}
                          <div className="flex flex-col items-center gap-1.5 w-full">
                            <div className="relative">
                              <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-emerald-300">
                                <span className="text-lg md:text-2xl">👩‍💼</span>
                              </div>
                              {/* Нотификация */}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center" style={{animation: 'notifBounce 10s ease-in-out infinite'}}>
                                <Bell className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-white font-bold text-xs">Фирма Б</div>
                              <div className="text-emerald-300 text-xs leading-tight">Получател</div>
                            </div>
                            {/* Получени файлове */}
                            <div className="relative w-full h-14 md:h-16">
                              {['Покупки/', 'Продажби/'].map((folder, i) => (
                                <div key={i}
                                  className="absolute left-0 right-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-md px-1 py-1 shadow-md border border-emerald-400"
                                  style={{
                                    bottom: `${i * 24}px`,
                                    animation: `folderAppear 10s ease-out ${6.5 + i * 0.4}s infinite`,
                                    opacity: 0,
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    <FolderOpen className="w-2.5 h-2.5 text-white flex-shrink-0" />
                                    <span className="text-xs font-bold text-white truncate">{folder}</span>
                                  </div>
                                  <div className="flex gap-0.5 mt-0.5">
                                    {[0,1].map(j => (
                                      <div key={j} className="w-2.5 h-2.5 bg-white/30 rounded-sm" style={{animation: `miniFileAppear 10s ease-out ${7.5 + i * 0.4 + j * 0.2}s infinite`, opacity: 0}} />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Долна лента с резултат */}
                      <div className="mt-6 bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center justify-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-white/80 text-sm"><span className="font-bold text-white">5 файла</span> качени</span>
                        </div>
                        <div className="w-px h-4 bg-white/20 hidden md:block" />
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <span className="text-white/80 text-sm"><span className="font-bold text-white">AI обработка</span></span>
                        </div>
                        <div className="w-px h-4 bg-white/20 hidden md:block" />
                        <div className="flex items-center gap-2">
                          <FolderSync className="w-4 h-4 text-green-400" />
                          <span className="text-white/80 text-sm"><span className="font-bold text-white">Автоматично</span> сортирани</span>
                        </div>
                        <div className="w-px h-4 bg-white/20 hidden md:block" />
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span className="text-white/80 text-sm">за <span className="font-bold text-green-400">&lt; 1 мин</span></span>
                        </div>
                      </div>
                    </div>

                    {/* CSS анимации за филмчето */}
                    <style>{`
                      @keyframes particleFloat {
                        from { transform: translateY(0) scale(1); opacity: 0.2; }
                        to { transform: translateY(-20px) scale(1.5); opacity: 0.5; }
                      }
                      @keyframes filePickUp {
                        0%, 5% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
                        10%, 15% { transform: translateX(40px) translateY(-30px) scale(0.9); opacity: 0.8; }
                        20% { transform: translateX(80px) translateY(-10px) scale(0.7); opacity: 0; }
                        25%, 100% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
                      }
                      @keyframes arrowPulse {
                        0%, 100% { opacity: 0.3; transform: scaleX(1); }
                        50% { opacity: 1; transform: scaleX(1.3); }
                      }
                      @keyframes processingGlow {
                        0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
                        50% { box-shadow: 0 0 30px rgba(168,85,247,0.5), 0 0 80px rgba(168,85,247,0.2); }
                      }
                      @keyframes spinSlow {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      @keyframes sparkle {
                        0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
                        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
                      }
                      @keyframes progressFill {
                        0% { width: 0%; background-position: 0% 0; }
                        40% { width: 70%; }
                        60% { width: 85%; }
                        80%, 100% { width: 100%; background-position: -200% 0; }
                      }
                      @keyframes labelCycle {
                        0%, 15% { opacity: 0; transform: translateY(5px); }
                        20%, 30% { opacity: 1; transform: translateY(0); }
                        35%, 100% { opacity: 0; transform: translateY(-5px); }
                      }
                      @keyframes notifBounce {
                        0%, 55% { transform: scale(0); opacity: 0; }
                        60% { transform: scale(1.3); opacity: 1; }
                        65%, 90% { transform: scale(1); opacity: 1; }
                        95%, 100% { transform: scale(0); opacity: 0; }
                      }
                      @keyframes folderAppear {
                        0%, 55% { opacity: 0; transform: translateX(-20px) scale(0.8); }
                        65% { opacity: 1; transform: translateX(0) scale(1.05); }
                        70%, 90% { opacity: 1; transform: translateX(0) scale(1); }
                        95%, 100% { opacity: 0; transform: translateX(0) scale(0.95); }
                      }
                      @keyframes miniFileAppear {
                        0%, 60% { opacity: 0; transform: scale(0); }
                        70%, 90% { opacity: 1; transform: scale(1); }
                        95%, 100% { opacity: 0; }
                      }
                      @keyframes timerCount {
                        0% { content: '00:00'; }
                        100% { content: '00:45'; }
                      }
                      ${[...Array(16)].map((_, s) => {
                        const pct = (s / 15) * 80;
                        const show = pct;
                        const hide = pct + (80 / 15);
                        return `@keyframes chronoDigit${s} {
                          0%, ${Math.max(0, show - 0.1).toFixed(1)}% { opacity: 0; }
                          ${show.toFixed(1)}%, ${Math.min(hide, 80).toFixed(1)}% { opacity: 1; }
                          ${(Math.min(hide, 80) + 0.1).toFixed(1)}%, 100% { opacity: 0; }
                        }`;
                      }).join('\n                      ')}
                    `}</style>
                  </div>

                  {/* ── Бързи стъпки — оригиналните 3 ── */}
                  <div className="mb-10">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Започнете за 3 минути</h2>
                      <p className="text-gray-500 mt-1">Три прости стъпки до пълен контрол</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        { step: '1', title: 'Регистрирайте фирма', desc: 'Въведете ЕИК номера и данните се зареждат автоматично от Търговския регистър. Добавете колкото фирми желаете.', icon: Building2 },
                        { step: '2', title: 'Качете фактури', desc: 'Drag & drop или изберете файлове — PDF, JPG, PNG, ZIP. Качете десетки фактури наведнъж. AI ги анализира за секунди.', icon: Upload },
                        { step: '3', title: 'Готово!', desc: 'Фактурите са разпознати, сортирани по фирми и типове, и споделени с контрагентите ви. Свалете ги по всяко време.', icon: Check },
                      ].map((s, i) => (
                        <div key={i} className="text-center">
                          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                            <s.icon className="w-8 h-8 text-white" />
                          </div>
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full text-sm font-bold mb-3">Стъпка {s.step}</div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Какво получавате ── */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border">
                    <h3 className="text-xl font-extrabold text-gray-900 mb-4 text-center tracking-tight">Какво получавате?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { icon: Brain, text: 'AI разпознаване на дата, номер, издател, получател и суми от фактурите' },
                        { icon: FolderSync, text: 'Автоматична организация по фирми и тип — покупки и продажби' },
                        { icon: ArrowLeftRight, text: 'Споделяне с контрагенти — те получават известие и одобряват' },
                        { icon: Download, text: 'Сваляне на фактури поотделно или групово с един клик' },
                        { icon: Bell, text: 'Мигновени WebSocket известия + имейл нотификации за всяко събитие' },
                        { icon: BarChart3, text: 'Пълна история и филтриране по всички полета' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <p className="text-sm text-gray-700">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ========== SCREENSHOTS ========== */}
            {landingSection === 'screenshots' && (
              <section className="py-16 px-6">
                <div className="max-w-5xl mx-auto">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Вижте как изглежда</h2>
                    <p className="text-gray-500">Разгледайте интерфейса на MegaBanx в детайли</p>
                  </div>
                  <div className="relative">
                    <div className="bg-gray-50 rounded-2xl border overflow-hidden shadow-xl">
                      <img src={screenshots[galleryIdx].src} alt={screenshots[galleryIdx].title} className="w-full" />
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-xl font-bold text-gray-900">{screenshots[galleryIdx].title}</h3>
                      <p className="text-sm text-gray-600 mt-1 max-w-2xl mx-auto">{screenshots[galleryIdx].desc}</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => setGalleryIdx(prev => prev > 0 ? prev - 1 : screenshots.length - 1)} className="p-2 rounded-lg border hover:bg-gray-50 transition"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                      {screenshots.map((_, i) => (
                        <button key={i} onClick={() => setGalleryIdx(i)} className={`w-3 h-3 rounded-full transition ${i === galleryIdx ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'}`} />
                      ))}
                      <button onClick={() => setGalleryIdx(prev => prev < screenshots.length - 1 ? prev + 1 : 0)} className="p-2 rounded-lg border hover:bg-gray-50 transition"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ========== СИГУРНОСТ И ВЕРИФИКАЦИЯ ========== */}
            {landingSection === 'security' && (
              <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                      <Shield className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Сигурност и верификация</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">Защитаваме вашите финансови данни с многостепенна верификация</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-600" /> Защо е необходима верификация?</h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        Фактурите съдържат чувствителна финансова информация — суми, банкови данни, ДДС номера. Без верификация, някой може да регистрира чужда фирма и да получи достъп до фактурите й.
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Затова MegaBanx изисква потвърждение, че вие сте оправомощено лице да управлявате фактурите на дадена фирма. Това защитава вас и вашите контрагенти.
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><Check className="w-5 h-5 text-green-600" /> Как работи процесът?</h3>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                          <p className="text-sm text-gray-600"><strong>Регистрация:</strong> Създавате акаунт с имейл адрес и потвърждавате с код.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                          <p className="text-sm text-gray-600"><strong>Добавяне на фирма:</strong> Въвеждате ЕИК и данните се зареждат от Търговския регистър.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                          <p className="text-sm text-gray-600"><strong>Верификация:</strong> Превеждате 1 EUR по нашата сметка с уникален код в основанието. Сумата се приспада от бъдещи такси.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                          <p className="text-sm text-gray-600"><strong>Потвърждение:</strong> Проверяваме наредителя на превода с данните от ТР. Ако съвпадат — фирмата е активирана!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 bg-indigo-600 rounded-2xl p-6 text-center text-white">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <Globe className="w-6 h-6" />
                      <Eye className="w-6 h-6" />
                      <Shield className="w-6 h-6" />
                    </div>
                    <p className="text-sm opacity-90 max-w-2xl mx-auto">
                      Всички качени файлове (фактури, PDF, изображения) се криптират на сървъра с AES криптиране (Fernet: AES-128-CBC + HMAC-SHA256).
                      Дори при пробив в системата, файловете са нечетими без криптографския ключ. Използваме SSL за всяка връзка
                      и никога не споделяме данните ви с трети страни. Спазваме GDPR и всички европейски регулации за защита на данни.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* ========== ПЛАНОВЕ И ЦЕНИ ========== */}
            {landingSection === 'pricing' && (
              <section className="py-16 px-6">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Планове и цени</h2>
                    <p className="text-gray-500">Започнете безплатно, надградете когато сте готови</p>
                  </div>
                  {landingPlansLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                  ) : landingPlans.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 items-stretch">
                    {landingPlans.map(plan => (
                      <div key={plan.id} className={'rounded-2xl border-2 p-5 flex flex-col relative ' + (plan.id === 'business' ? 'border-indigo-400 bg-indigo-50' : plan.id === 'corporate' ? 'border-yellow-400 bg-yellow-50' : plan.id === 'personal' ? 'border-purple-400 bg-purple-50' : plan.promo ? 'border-orange-400 bg-orange-50' : plan.id === 'free' ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white')}>
                        {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">Популярен</div>}
                        {plan.id === 'corporate' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs px-3 py-0.5 rounded-full font-medium">Корпоративен</div>}
                        {plan.id === 'personal' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">Персонален</div>}
                        {plan.promo && <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-xl shadow-lg transform rotate-0 z-10 uppercase tracking-wide">{plan.promo}</div>}
                        <div className="text-center mb-5">
                          <div className={'w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ' + (plan.id === 'free' ? 'bg-gray-200' : plan.id === 'starter' ? 'bg-blue-100' : plan.id === 'pro' ? 'bg-indigo-100' : plan.id === 'business' ? 'bg-indigo-200' : plan.id === 'corporate' ? 'bg-yellow-200' : plan.id === 'personal' ? 'bg-purple-200' : 'bg-gray-100')}>
                            {plan.id === 'free' ? <Users className="w-5 h-5 text-gray-500" /> : plan.id === 'starter' ? <Zap className="w-5 h-5 text-blue-600" /> : plan.id === 'pro' ? <Star className="w-5 h-5 text-indigo-600" /> : plan.id === 'business' ? <Zap className="w-5 h-5 text-indigo-700" /> : plan.id === 'corporate' ? <Star className="w-5 h-5 text-yellow-700" /> : <Crown className="w-5 h-5 text-purple-700" />}
                          </div>
                          <h3 className="text-lg font-bold">{plan.name}</h3>
                          <div className="mt-1">
                            {plan.contact_us ? (
                              <div className="text-2xl font-extrabold text-gray-900">По договаряне</div>
                            ) : plan.price === 0 ? (
                              <><div className="text-2xl font-extrabold text-gray-900">0 EUR</div><p className="text-xs text-gray-400">завинаги</p></>
                            ) : (
                              <div className="text-2xl font-extrabold text-gray-900">{plan.price.toFixed(2)} <span className="text-xs font-normal text-gray-400">EUR/{plan.interval === 'month' ? 'мес' : 'год'}</span></div>
                            )}
                          </div>
                        </div>
                        <ul className="space-y-1.5 mb-5 flex-1">
                          {plan.features.map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600"><Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}</li>
                          ))}
                        </ul>
                        {plan.contact_us ? (
                          <button onClick={() => setLandingSection('contact')} className="w-full py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition shadow-lg shadow-purple-200 mt-auto">Свържете се с нас</button>
                        ) : plan.id === 'free' ? (
                          <button onClick={() => { if (currentUser) { setAuthScreen('dashboard'); setActiveTab('billing'); } else { setAuthScreen('register'); setError(''); setSuccess(''); } }} className="w-full py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition mt-auto">Започнете безплатно</button>
                        ) : (
                          <button onClick={() => { if (currentUser) { setAuthScreen('dashboard'); setActiveTab('billing'); handleSubscribe(plan.id); } else { setAuthScreen('register'); setError(''); setSuccess(''); } }} className={'w-full py-2 rounded-xl text-sm font-medium transition mt-auto ' + (plan.id === 'business' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : plan.id === 'corporate' ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-200' : 'bg-gray-900 text-white hover:bg-gray-800')}>Абонирай се</button>
                        )}
                      </div>
                    ))}
                  </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">Не могат да се заредят плановете. Моля, опитайте отново.</div>
                  )}
                  <p className="text-center text-xs text-gray-400 mt-4">Всички цени са без ДДС (20%)</p>
                </div>
              </section>
            )}

            {/* ========== КОИ СМЕ НИЕ ========== */}
            {landingSection === 'about_us' && (
              <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                      <Users2 className="w-4 h-4" /> За нас
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Кои сме ние</h2>
                    <p className="text-gray-500">Историята зад MegaBanx</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 rounded-3xl border border-indigo-100 p-8 md:p-12 mb-10">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Как се роди идеята</h3>
                        <p className="text-gray-600 leading-relaxed">Като собственици на малък бизнес, ежедневно се сблъсквахме с хаос от фактури — десетки PDF файлове разпръснати в имейли, папки и чатове. Изпращането на фактури до клиенти и контрагенти отнемаше часове, а намирането на стара фактура беше като търсене на игла в купа сено.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Създадено изцяло с AI</h3>
                        <p className="text-gray-600 leading-relaxed">Уникалното на MegaBanx е, че целият продукт — от сървърната логика до потребителския интерфейс — е създаден <strong>изцяло с изкуствен интелект</strong>, без участието на екип от програмисти. Това е доказателство, че AI не само обработва вашите фактури, но е създал и самата платформа, която го прави.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Rocket className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Нашата мисия</h3>
                        <p className="text-gray-600 leading-relaxed">Да автоматизираме изцяло управлението на фактури за малкия и среден бизнес в България. Без ръчно сортиране, без изпращане по имейл, без хаос. Качете и готово — AI се грижи за всичко останало.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Фирма</h4>
                      <p className="text-gray-600 text-sm">Д-РЕНТ ЕООД</p>
                      <p className="text-gray-500 text-sm">ЕИК: 200551856</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                        <Globe className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Локация</h4>
                      <p className="text-gray-600 text-sm">гр. София, България</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-500 text-sm mb-4">Имате въпроси? Свържете се с нас!</p>
                    <button onClick={() => setLandingSection('contact')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                      <MessageSquare className="w-4 h-4" /> Свържете се с нас
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ========== FAQ ========== */}
            {landingSection === 'faq' && (
              <section className="py-16 px-6">
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                      <HelpCircle className="w-4 h-4" /> FAQ
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Често задавани въпроси</h2>
                    <p className="text-gray-500">Отговори на най-честите въпроси за издаване, обработка и доставка на фактури</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { q: 'Мога ли да издавам и качвам фактури за различни фирми?', a: 'Да! MegaBanx автоматично разпознава за коя фирма се отнася документът чрез AI и го подрежда в правилната папка (Покупки или Продажби), без нужда от предварително сортиране.', icon: FolderSync },
                      { q: 'Как става споделянето на фактури с контрагенти?', a: 'Системата автоматично разпознава получателя по фактурата. Ако той също е в MegaBanx, документът се появява в неговия профил мигновено. Край на изпращането на фактури по имейл.', icon: Share2 },
                      { q: 'Какво означава \u201cАвтоматично именуване\u201d?', a: 'Нашият AI извлича номера на фактурата, датата и името на доставчика, и преименува файла автоматично. Така архивът ви е винаги подреден и лесен за търсене.', icon: Brain },
                      { q: 'Защитени ли са моите фактури?', a: 'Да! Всички фактури и документи в MegaBanx са криптирани с AES криптиране (Fernet/AES-128-CBC + HMAC-SHA256). Дори при евентуален неоторизиран достъп до сървъра, файловете са напълно нечетими без криптографския ключ. Вашите данни са защитени от чужди очи.', icon: Lock },
                      { q: 'Защо е необходима верификация при въвеждане на фирма?', a: 'Верификацията е създадена за защита на самите потребители. Чрез нея гарантираме, че никой не може да използва данните на чужда фирма без съгласието на легитимните собственици. Процесът е прост — еднократен превод от фирмената сметка, който потвърждава, че вие сте оторизирано лице за тази фирма. Така всички данни и фактури остават достъпни само за истинските им собственици.', icon: Shield },
                      { q: 'Колко време се съхраняват фактурите ми?', a: 'Фактурите ви се съхраняват неограничено време в MegaBanx. Няма срок на изтичане — документите остават достъпни докато имате активен акаунт. Всички файлове са криптирани и безопасно съхранени на нашите сървъри.', icon: Clock },
                      { q: 'Мога ли да споделям фактури с други потребители?', a: 'Да! MegaBanx автоматично споделя фактурите с контрагентите ви. Когато качите фактура, системата разпознава получателя и ако той е регистриран в MegaBanx, документът се появява в неговия профил мигновено. Без ръчно изпращане на имейли.', icon: Share2 },
                      { q: 'Безплатен ли е MegaBanx?', a: 'Да, MegaBanx предлага безплатен план, който включва управление на до 3 фирми. За повече фирми или разширени функции, можете да преминете към платен абонамент. Вижте секция "Планове и цени" за повече информация.', icon: CreditCard },
                      { q: 'Как се регистрирам в системата?', a: 'Регистрацията е бърза и лесна — просто въведете имейл адреса си и ще получите код за вход. Не е нужна парола! При всяко влизане получавате еднократен код на имейла си, което е по-сигурно от традиционните пароли.', icon: UserPlus },
                      { q: 'Какви формати на фактури се поддържат?', a: 'MegaBanx поддържа PDF формат за фактури. Просто качете вашия PDF файл и системата автоматично ще извлече номера, датата, сумата и данните на контрагента чрез AI разпознаване. Файлът се преименува автоматично за лесно търсене.', icon: FileText },
                      { q: 'Мога ли да изтрия качена фактура?', a: 'Да, можете да изтриете всяка фактура, която сте качили. При изтриване, фактурата се премахва и от профила на контрагента, ако е била споделена. Изтриването е окончателно и не може да бъде отменено.', icon: Trash2 },
                      { q: 'Как работи автоматичното разпознаване на фактури?', a: 'Нашият AI анализира качения PDF файл и автоматично извлича ключова информация: номер на фактура, дата на издаване, име на издател/получател, ЕИК, ДДС номер и обща сума. Файлът се преименува и категоризира автоматично.', icon: ScanLine },
                      { q: 'Какво се случва ако контрагентът ми не е в MegaBanx?', a: 'Ако контрагентът ви не е регистриран в системата, можете да му изпратите фактурата по имейл директно от MegaBanx. Той ще получи линк за сваляне на фактурата и покана да се регистрира безплатно, за да получава фактури автоматично в бъдеще.', icon: Mail },
                    ].map((faq, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                        <button
                          onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                          className="w-full flex items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${openFaqIndex === idx ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                            <faq.icon className="w-5 h-5" />
                          </div>
                          <span className="flex-1 font-semibold text-gray-900">{faq.q}</span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ${openFaqIndex === idx ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="px-6 pb-5 pl-20">
                            <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-10">
                    <p className="text-gray-500 text-sm mb-3">Не намерихте отговор на вашия въпрос?</p>
                    <button onClick={() => setLandingSection('contact')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                      <MessageSquare className="w-4 h-4" /> Свържете се с нас
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ========== КОНТАКТИ ========== */}
            {landingSection === 'contact' && (
              <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                      <MessageSquare className="w-4 h-4" /> Свържете се с нас
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Контакти</h2>
                    <p className="text-gray-500">Имате въпрос? Изпратете ни запитване и ще ви отговорим възможно най-бързо.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
                          <Mail className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Имейл</h3>
                        <a href="mailto:info@megabanx.com" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">info@megabanx.com</a>
                      </div>
                      {contactPhone && (
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
                            <Phone className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1">Телефон</h3>
                          <a href={`tel:${contactPhone}`} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">{contactPhone}</a>
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Работно време</h3>
                        <p className="text-gray-600 text-sm">Пон - Пет: 9:00 - 18:00</p>
                      </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                      <form onSubmit={handleSubmitContact} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <Send className="w-5 h-5 text-indigo-600" /> Изпратете запитване
                        </h3>

                        {contactSuccess && (
                          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" /> {contactSuccess}
                          </div>
                        )}
                        {contactError && (
                          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {contactError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Вашето име *</label>
                            <input
                              type="text"
                              value={contactForm.name}
                              onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                              placeholder="Иван Иванов"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Имейл адрес *</label>
                            <input
                              type="email"
                              value={contactForm.email}
                              onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                              placeholder="ivan@example.com"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                              required
                            />
                          </div>
                        </div>
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Вашето съобщение *</label>
                          <textarea
                            value={contactForm.message}
                            onChange={e => { if (e.target.value.length <= 500) setContactForm({ ...contactForm, message: e.target.value }); }}
                            placeholder="Опишете вашия въпрос или запитване..."
                            rows={5}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                            required
                          />
                          <div className="flex justify-between items-center mt-1.5">
                            <p className="text-xs text-gray-400">Максимум 500 символа</p>
                            <p className={`text-xs font-medium ${contactForm.message.length > 450 ? 'text-amber-500' : 'text-gray-400'} ${contactForm.message.length >= 500 ? 'text-red-500' : ''}`}>
                              {contactForm.message.length}/500
                            </p>
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={contactSubmitting}
                          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                        >
                          {contactSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          {contactSubmitting ? 'Изпращане...' : 'Изпрати запитване'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>

        {/* Footer */}
        <footer className="py-6 px-4 bg-gray-900 mt-auto">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gLogoF)"/><rect x="16" y="12" width="16" height="20" rx="2" fill="white" opacity="0.9"/><line x1="19" y1="18" x2="29" y2="18" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/><line x1="19" y1="22" x2="27" y2="22" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><circle cx="38" cy="8" r="5" fill="#f97316"/><path d="M38 5.5v5M35.5 8h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><defs><linearGradient id="gLogoF" x1="2" y1="2" x2="46" y2="46"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>
              <span className="text-sm font-bold text-white">Mega<span className="text-indigo-400">Ban</span><span className="text-orange-400 font-extrabold">x</span></span>
            </div>
            <p className="text-sm text-gray-400">&copy; 2026 MegaBanx. Всички права запазени.</p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <button onClick={() => { fetch('/api/terms').then(r=>r.json()).then(d=>{setTosContent(d.content);setShowTosModal(true);}); }} className="hover:text-white transition bg-transparent border-none cursor-pointer text-gray-400 text-sm">Общи условия</button>
              <span className="text-gray-600">|</span>
              <a href="mailto:info@megabanx.com" className="hover:text-white transition">info@megabanx.com</a>
            </div>
          </div>
        </footer>

        {/* TOS Modal */}
        {showTosModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowTosModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{background: 'linear-gradient(to right, #0f172a, #1e293b)', borderRadius: '16px 16px 0 0'}}>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Mega<span className="text-indigo-400">Ban</span><span className="text-orange-400">x</span> - Общи условия</h2>
                </div>
                <button onClick={() => setShowTosModal(false)} className="text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {tosContent ? tosContent.split('\n').map((line, i) => {
                  const s = line.trim();
                  if (!s) return <div key={i} className="h-3" />;
                  if (s.startsWith('━')) return <hr key={i} className="border-t-2 border-gray-200 my-5" />;
                  if (s.includes('ОБЩИ УСЛОВИЯ')) return <h1 key={i} className="text-xl font-extrabold text-gray-900 text-center mb-1">{s}</h1>;
                  if (s.startsWith('Версия')) return <p key={i} className="text-center text-gray-500 text-sm mb-5">{s}</p>;
                  if (s.startsWith('Операторът на платформата')) return <p key={i} className="text-gray-600 text-sm leading-relaxed mb-4 italic">{s}</p>;
                  if (s.length > 2 && s[0] >= '0' && s[0] <= '9' && s[1] === '.' && s[2] === ' ') return <h2 key={i} className="text-base font-bold text-gray-900 mt-5 mb-2">{s}</h2>;
                  if (s.length > 3 && s[0] >= '0' && s[0] <= '9' && s[1] === '.' && s[2] >= '0' && s[2] <= '9' && s[3] === '.') return <p key={i} className="text-gray-700 text-sm leading-relaxed ml-4 my-1">{s}</p>;
                  if (/^[a-f]\)/.test(s)) return <p key={i} className="text-gray-600 text-sm leading-relaxed ml-9 my-0.5">{s}</p>;
                  if (s.startsWith('Дата на последна')) return <p key={i} className="text-center text-gray-400 text-xs mt-5">{s}</p>;
                  if (s.startsWith('За въпроси') || s.startsWith('Д-РЕНТ') || s.startsWith('ЕИК:') || s.startsWith('Имейл:') || s.startsWith('Уебсайт:')) return <p key={i} className="text-gray-600 text-sm ml-4 my-0.5">{s}</p>;
                  return <p key={i} className="text-gray-700 text-sm leading-relaxed my-1">{s}</p>;
                }) : <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
                <button onClick={() => setShowTosModal(false)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">Затвори</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If logged in but no active profile yet
  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const unreadNotifs = notifications.length;
  const totalFiles = folderStructure.reduce((sum, item) => sum + item.purchases.count + item.sales.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-width dark blue header */}
      <header className="fixed top-0 left-0 right-0 z-30 shadow-md" style={{background: 'linear-gradient(to right, #0f172a, #1e293b)'}}>
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-gray-300 hover:text-white flex-shrink-0">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button onClick={() => setAuthScreen('landing')} className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gLogoD)"/><rect x="16" y="12" width="16" height="20" rx="2" fill="white" opacity="0.9"/><line x1="19" y1="18" x2="29" y2="18" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/><line x1="19" y1="22" x2="27" y2="22" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><line x1="19" y1="26" x2="25" y2="26" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/><circle cx="38" cy="8" r="5" fill="#f97316"/><path d="M38 5.5v5M35.5 8h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><defs><linearGradient id="gLogoD" x1="2" y1="2" x2="46" y2="46"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>
              <h1 className="hidden sm:block text-lg font-bold text-white">Mega<span className="text-indigo-400">Ban</span><span className="text-orange-400 font-extrabold">x</span></h1>
            </button>
            <span className="hidden md:inline text-gray-500">|</span>
            <span className="text-xs md:text-sm font-medium text-indigo-300 truncate">{activeProfile.name}</span>
          </div>
          {/* Desktop nav buttons */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-400">{currentUser?.email}</span>
            <button onClick={() => setAuthScreen('landing')} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition"><Home className="w-4 h-4" /> Начална страница</button>
            {currentUser?.email === 'bdobrev002@gmail.com' && (
              <a href="/admin/" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-orange-400 hover:text-white hover:bg-white/10 rounded-lg transition"><Crown className="w-4 h-4" /> Admin Panel</a>
            )}
            <button onClick={handleLogout} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"><LogOut className="w-4 h-4" /> Изход</button>
          </div>
          {/* Mobile: just logout icon */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={() => setAuthScreen('landing')} className="p-1.5 text-indigo-300 hover:text-white"><Home className="w-4 h-4" /></button>
            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-white"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 pt-[49px]" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-64 h-full bg-white border-r overflow-y-auto" onClick={e => e.stopPropagation()}>
            <nav className="space-y-1 p-3">
              {([
                { key: 'about' as const, label: 'За сайта', icon: Home },
                { key: 'how' as const, label: 'Как работи', icon: Monitor },
                { key: 'screenshots' as const, label: 'ScreenShots', icon: Camera },
                { key: 'security' as const, label: 'Сигурност', icon: Shield },
                { key: 'pricing' as const, label: 'Планове и цени', icon: CreditCard },
                              { key: 'faq' as const, label: 'Често задавани въпроси', icon: HelpCircle },
                              { key: 'about_us' as const, label: 'Кои сме ние', icon: Users2 },
                              { key: 'contact' as const, label: 'Контакти', icon: MessageSquare },
                            ]).map(item => (
                              <button key={item.key} onClick={() => { setAuthScreen('landing'); setLandingSection(item.key); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-gray-600 hover:bg-gray-200 hover:text-gray-900">
                  <item.icon className="w-4 h-4 flex-shrink-0" /> {item.label}
                </button>
              ))}
            </nav>
            <div className="border-t p-3 space-y-1">
              <div className="text-xs text-gray-400 px-3 mb-2 truncate">{currentUser?.email}</div>
              {currentUser?.email === 'bdobrev002@gmail.com' && (
                <a href="/admin/" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 transition"><Crown className="w-4 h-4" /> Admin Panel</a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed left sidebar - desktop only */}
      <aside className="hidden md:block fixed top-[57px] left-0 w-52 h-[calc(100vh-57px)] bg-gray-50 border-r z-20 overflow-y-auto pt-3">
        <nav className="space-y-1 px-3">
          {([
            { key: 'about' as const, label: 'За сайта', icon: Home },
            { key: 'how' as const, label: 'Как работи', icon: Monitor },
            { key: 'screenshots' as const, label: 'ScreenShots', icon: Camera },
            { key: 'security' as const, label: 'Сигурност', icon: Shield },
            { key: 'pricing' as const, label: 'Планове и цени', icon: CreditCard },
                      { key: 'faq' as const, label: 'Често задавани въпроси', icon: HelpCircle },
                      { key: 'about_us' as const, label: 'Кои сме ние', icon: Users2 },
                      { key: 'contact' as const, label: 'Контакти', icon: MessageSquare },
                    ]).map(item => (
                      <button
                        key={item.key}
                        onClick={() => { setAuthScreen('landing'); setLandingSection(item.key); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area offset by sidebar width and header height */}
      <div className="md:ml-52 pt-[49px] md:pt-[57px]">
        {/* Sticky top section: stats + tabs */}
        <div className="sticky top-[49px] md:top-[57px] z-10 bg-gray-50">

          <div className="max-w-7xl mx-auto px-4 mt-3">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center gap-2 text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error} <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}
            {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 flex items-center gap-2 text-green-700 text-sm"><CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}</div>}
          </div>

          <div className="max-w-7xl mx-auto px-2 md:px-4 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-indigo-600">{companies.length}</div><div className="text-xs text-gray-500">Фирми</div></div>
                        <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-green-600">{totalFiles}</div><div className="text-xs text-gray-500">Фактури</div></div>
                        <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-orange-600">{inboxFiles.length}</div><div className="text-xs text-gray-500">За обработка</div></div>
                        <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-red-600">{unreadNotifs}</div><div className="text-xs text-gray-500">Известия</div></div>
          </div>

          <div className="max-w-7xl mx-auto px-2 md:px-4 mt-3 md:mt-4 pb-3">
            <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
              {([
                { key: 'companies' as const, label: 'Фирми', icon: Building2, color: 'text-indigo-500' },
                { key: 'upload' as const, label: 'Качване', icon: Upload, color: 'text-green-500' },
                { key: 'files' as const, label: 'Фактури', icon: Receipt, color: 'text-orange-500' },
                { key: 'history' as const, label: 'История', icon: FileText, color: 'text-blue-500' },
                { key: 'notifications' as const, label: 'Известия' + (unreadNotifs ? ' (' + unreadNotifs + ')' : ''), icon: Bell, color: 'text-rose-500' },
                { key: 'billing' as const, label: 'Абонамент', icon: CreditCard, color: 'text-purple-500' },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={'flex-1 min-w-0 flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-2 text-xs md:text-sm rounded-md transition whitespace-nowrap cursor-pointer ' + (activeTab === tab.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100')}>
                  <tab.icon className={'w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0' + (activeTab === tab.key ? '' : ' ' + tab.color)} /><span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-2 md:px-4 py-3 md:py-4">
        {activeTab === 'companies' && (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h2 className="text-base md:text-lg font-semibold">Фирми в профил &quot;{activeProfile.name}&quot;</h2>
              <button onClick={() => { setShowCompanyForm(true); setEditingCompany(null); setCompanyForm({ name: '', eik: '', vat_number: '', address: '', mol: '', tr_email: '', managers: [], partners: [] }); }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 self-start sm:self-auto"><Plus className="w-4 h-4" /> Добави фирма</button>
            </div>
            {monthlyUsage && (() => {
              const compLimit = monthlyUsage.company_limit || 0;
              const compCount = monthlyUsage.company_count || 0;
              const compRemaining = monthlyUsage.company_remaining || 0;
              const compWarn = compLimit > 0 && compLimit < 999999 ? (compCount >= compLimit ? 'limit' : compCount >= compLimit * 0.9 ? '90' : compCount >= compLimit * 0.8 ? '80' : 'none') : 'none';
              return (
              <div className={`mb-4 p-4 rounded-lg border ${compWarn === 'limit' ? 'bg-red-50 border-red-300' : compWarn === '90' ? 'bg-red-50 border-red-200' : compWarn === '80' ? 'bg-yellow-50 border-yellow-200' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="space-y-1 text-sm">
                  <div className={`font-medium ${compWarn === 'limit' || compWarn === '90' ? 'text-red-800' : compWarn === '80' ? 'text-yellow-800' : 'text-indigo-800'}`}>
                    <Building2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Абонамент {compLimit >= 999999 ? 'Неограничен' : compLimit} фирми
                  </div>
                  <div className={compWarn === 'limit' || compWarn === '90' ? 'text-red-700' : compWarn === '80' ? 'text-yellow-700' : 'text-indigo-700'}>
                    <BarChart3 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Текущо {compCount} фирми
                  </div>
                  <div className={compWarn === 'limit' || compWarn === '90' ? 'text-red-700' : compWarn === '80' ? 'text-yellow-700' : 'text-indigo-700'}>
                    <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Остатък {compLimit >= 999999 ? 'Неограничен' : compRemaining} фирми
                  </div>
                </div>
                {compWarn === '80' && (
                  <div className="mt-2 text-xs font-medium text-yellow-800 bg-yellow-100 rounded px-2 py-1">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Близо сте до лимита на фирмите
                  </div>
                )}
                {compWarn === '90' && (
                  <div className="mt-2 text-xs font-medium text-red-800 bg-red-100 rounded px-2 py-1">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Достигнахте 90% от лимита на фирмите
                  </div>
                )}
                {compWarn === 'limit' && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs font-medium text-red-800 bg-red-100 rounded px-2 py-1">
                      <Ban className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Достигнахте лимита на фирмите. Моля, обновете абонамента.
                    </div>
                    <button onClick={() => { setActiveTab('billing'); setBillingTab('plans'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
                      <Zap className="w-3.5 h-3.5" /> Обнови абонамент
                    </button>
                  </div>
                )}
              </div>
              );
            })()}
            {showCompanyForm && (
                            <div className="rounded-lg p-4 mb-4 bg-gray-50 shadow-sm">
                              <h3 className="font-medium mb-3">{editingCompany ? 'Редактиране на фирма' : 'Нова фирма'}</h3>
                {editingCompany && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Данните на фирмата не могат да се редактират ръчно. Използвайте бутона &quot;Търси&quot; за обновяване от Търговския регистър.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">ЕИК *</label>
                    <div className="flex gap-2">
                      <input type="text" value={companyForm.eik} onChange={e => !editingCompany && setCompanyForm(prev => ({ ...prev, eik: e.target.value }))} placeholder="Въведете ЕИК" readOnly={!!editingCompany} className={'flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' + (editingCompany ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : '')} />
                      <button onClick={handleLookupEik} disabled={eikLoading} className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {eikLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Търси
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">Име на фирмата *</label><input type="text" value={companyForm.name} onChange={e => !editingCompany && setCompanyForm(prev => ({ ...prev, name: e.target.value }))} readOnly={!!editingCompany} className={'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' + (editingCompany ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : '')} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">ДДС номер</label><input type="text" value={companyForm.vat_number} onChange={e => !editingCompany && setCompanyForm(prev => ({ ...prev, vat_number: e.target.value }))} readOnly={!!editingCompany} className={'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' + (editingCompany ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : '')} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">МОЛ</label><input type="text" value={companyForm.mol} onChange={e => !editingCompany && setCompanyForm(prev => ({ ...prev, mol: e.target.value }))} readOnly={!!editingCompany} className={'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' + (editingCompany ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : '')} /></div>
                  <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">Адрес</label><input type="text" value={companyForm.address} onChange={e => !editingCompany && setCompanyForm(prev => ({ ...prev, address: e.target.value }))} readOnly={!!editingCompany} className={'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' + (editingCompany ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : '')} /></div>
                  {/* Managers/Representatives */}
                  {companyForm.managers && companyForm.managers.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Управител/и (Представляващ/и)</label>
                      {companyForm.managers.map((m, idx) => (
                        <input key={idx} type="text" value={m} readOnly className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed mb-1" />
                      ))}
                    </div>
                  )}
                  {/* Partners/Owners */}
                  {companyForm.partners && companyForm.partners.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Съдружник/ци (Собственик/ци)</label>
                      {companyForm.partners.map((p, idx) => (
                        <input key={idx} type="text" value={p} readOnly className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed mb-1" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  {editingCompany ? (
                    <button onClick={handleUpdateCompany} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Обнови от ТР</button>
                  ) : (
                    <button onClick={handleCreateCompany} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Добави</button>
                  )}
                  <button onClick={() => { setShowCompanyForm(false); setEditingCompany(null); }} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">Отказ</button>
                </div>
              </div>
            )}
            {/* Pending verifications - unconfirmed companies */}
            {pendingVerifications.length > 0 && (
              <div className="space-y-3 mb-4">
                {pendingVerifications.map(v => (
                  <div key={v.id} className="bg-amber-50 border-2 border-amber-300 border-dashed rounded-xl p-5 relative">
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-300">
                        <Clock className="w-3 h-3" /> Чака верификация
                      </span>
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-base text-gray-900">{v.company_name}</h3>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-x-8">
                        {v.eik && <div><span className="text-gray-500">ЕИК: </span><span className="font-bold text-gray-800">{v.eik}</span></div>}
                        {v.vat_number && <div><span className="text-gray-500">ДДС: </span>{v.vat_number}</div>}
                      </div>
                      {v.mol && <div><span className="text-gray-500">МОЛ: </span>{v.mol}</div>}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => { setIdCardVerifyMode('choose'); setIdCardFile(null); setSelfieFile(null); setVerificationModal({ show: true, code: v.verification_code, companyName: v.company_name, eik: v.eik, message: '', verificationId: v.id }); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        <Shield className="w-4 h-4" /> Верификация
                      </button>
                      <button
                        onClick={() => handleDeletePendingVerification(v.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" /> Откажи се
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {companies.length === 0 && pendingVerifications.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Няма добавени фирми.</p>
            ) : companies.length > 0 ? (
              <div className="space-y-3">
                {companies.map(c => {
                  const emailMatch = c.address ? c.address.match(/[\w.-]+@[\w.-]+\.\w+/) : null;
                  const emailAddr = emailMatch ? emailMatch[0] : '';
                  const addrNoEmail = emailAddr ? c.address.replace(emailAddr, '').replace(/\s*Адрес на електронна поща:\s*/i, '').trim() : (c.address || '');
                  // Split address into lines by key phrases
                  const addrLines: string[] = [];
                  if (addrNoEmail) {
                    const parts = addrNoEmail.split(/(Населено място:|Община:|бул\.\/?ул\.|р-н )/i);
                    let current = '';
                    for (const part of parts) {
                      if (/^(Населено място:|бул\.\/?ул\.)/i.test(part)) {
                        if (current.trim()) addrLines.push(current.trim());
                        current = part;
                      } else {
                        current += part;
                      }
                    }
                    if (current.trim()) addrLines.push(current.trim());
                    // If no splits happened, try splitting by comma groups (max ~80 chars per line)
                    if (addrLines.length <= 1 && addrNoEmail.length > 80) {
                      addrLines.length = 0;
                      const commas = addrNoEmail.split(', ');
                      let line = '';
                      for (const seg of commas) {
                        if (line.length + seg.length > 80 && line) {
                          addrLines.push(line.trim());
                          line = seg;
                        } else {
                          line += (line ? ', ' : '') + seg;
                        }
                      }
                      if (line) addrLines.push(line.trim());
                    }
                  }
                  return (
                  <div key={c.id} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-gray-900">{c.name}</h3>
                      <div className="flex flex-col items-start sm:items-end flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <button onClick={() => openShareDialog(c)} className="px-2 md:px-3 py-1 text-xs md:text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Споделяне</span></button>
                          <button onClick={() => { setEditingCompany(c); setCompanyForm({ name: c.name, eik: c.eik, vat_number: c.vat_number, address: c.address, mol: c.mol, tr_email: '', managers: c.managers || [], partners: c.partners || [] }); setShowCompanyForm(true); }} className="px-2 md:px-3 py-1 text-xs md:text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"><span className="hidden sm:inline">Редактирай</span><span className="sm:hidden">Ред.</span></button>
                          <button onClick={() => handleDeleteCompany(c.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-0.5" style={{paddingLeft: '2px'}}>Споделена с {companyShareCounts[c.id] ?? 0} сътрудник{(companyShareCounts[c.id] ?? 0) === 1 ? '' : 'а'}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-x-8">
                        {c.eik && <div><span className="text-gray-500">ЕИК: </span><span className="font-bold text-gray-800">{c.eik}</span></div>}
                        {c.vat_number && <div><span className="text-gray-500">ДДС: </span>{c.vat_number}</div>}
                      </div>
                      {addrLines.length > 0 && (
                        <div>
                          <span className="text-gray-500">Адрес: </span>
                          {addrLines.map((line, idx) => (
                            <span key={idx}>{idx > 0 && <br />}{idx > 0 && <span className="inline-block w-12" />}{line}</span>
                          ))}
                        </div>
                      )}
                      {emailAddr && <div><span className="text-gray-500">Имейл: </span><span className="font-bold text-gray-800">{emailAddr}</span></div>}
                      {c.mol && <div><span className="text-gray-500">МОЛ: </span>{c.mol}</div>}
                      {c.managers && c.managers.length > 0 && <div><span className="text-gray-500">Управител/и: </span><span className="text-gray-800">{c.managers.join(', ')}</span></div>}
                      {c.partners && c.partners.length > 0 && <div><span className="text-gray-500">Съдружник/ци: </span><span className="text-gray-800">{c.partners.join(', ')}</span></div>}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : null}

            {/* Shared companies section */}
            {sharedCompanies.length > 0 && (
              <div className="mt-6 pt-4">
                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2"><Share2 className="w-4 h-4 text-green-600" /> Споделени с мен фирми</h3>
                <div className="space-y-3">
                  {sharedCompanies.map(sc => {
                    const c = sc.company;
                    const emailMatch = c.address ? c.address.match(/[\w.-]+@[\w.-]+\.\w+/) : null;
                    const emailAddr = emailMatch ? emailMatch[0] : '';
                    const addrNoEmail = emailAddr ? c.address.replace(emailAddr, '').replace(/\s*Адрес на електронна поща:\s*/i, '').trim() : (c.address || '');
                    const addrLines: string[] = [];
                    if (addrNoEmail) {
                      const parts = addrNoEmail.split(/(Населено място:|Община:|бул\.\/?ул\.|р-н )/i);
                      let current = '';
                      for (const part of parts) {
                        if (/^(Населено място:|бул\.\/?ул\.)/i.test(part)) {
                          if (current.trim()) addrLines.push(current.trim());
                          current = part;
                        } else {
                          current += part;
                        }
                      }
                      if (current.trim()) addrLines.push(current.trim());
                      if (addrLines.length <= 1 && addrNoEmail.length > 80) {
                        addrLines.length = 0;
                        const commas = addrNoEmail.split(', ');
                        let line = '';
                        for (const seg of commas) {
                          if (line.length + seg.length > 80 && line) { addrLines.push(line.trim()); line = seg; }
                          else { line += (line ? ', ' : '') + seg; }
                        }
                        if (line) addrLines.push(line.trim());
                      }
                    }
                    return (
                    <div key={sc.share_id} className="bg-green-50 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-base text-gray-900 flex items-center gap-2"><Share2 className="w-4 h-4 text-green-600" /> {c.name}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{sc.can_upload ? 'с право на качване' : 'само преглед'}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-x-8">
                          {c.eik && <div><span className="text-gray-500">ЕИК: </span><span className="font-bold text-gray-800">{c.eik}</span></div>}
                          {c.vat_number && <div><span className="text-gray-500">ДДС: </span>{c.vat_number}</div>}
                        </div>
                        {addrLines.length > 0 && (
                          <div>
                            <span className="text-gray-500">Адрес: </span>
                            {addrLines.map((line, idx) => (
                              <span key={idx}>{idx > 0 && <br />}{idx > 0 && <span className="inline-block w-12" />}{line}</span>
                            ))}
                          </div>
                        )}
                        {emailAddr && <div><span className="text-gray-500">Имейл: </span><span className="font-bold text-gray-800">{emailAddr}</span></div>}
                        {c.mol && <div><span className="text-gray-500">МОЛ: </span>{c.mol}</div>}
                        <div className="text-xs text-green-700 mt-1">Споделена от: <span className="font-medium">{sc.owner_name || sc.owner_email}</span></div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
                        <div className="bg-white rounded-xl shadow-sm p-6">
                          <h2 className="text-lg font-semibold mb-4">Качване и обработка на фактури</h2>
              {monthlyUsage && (() => {
                const warnLevel = monthlyUsage.limit_reached ? 'limit' : monthlyUsage.warning_90 ? '90' : monthlyUsage.warning_80 ? '80' : 'none';
                return (
                <div className={`mb-4 p-4 rounded-lg border ${warnLevel === 'limit' ? 'bg-red-50 border-red-300' : warnLevel === '90' ? 'bg-red-50 border-red-200' : warnLevel === '80' ? 'bg-yellow-50 border-yellow-200' : 'bg-indigo-50 border-indigo-200'}`}>
                  <div className="space-y-1 text-sm">
                    <div className={`font-medium ${warnLevel === 'limit' || warnLevel === '90' ? 'text-red-800' : warnLevel === '80' ? 'text-yellow-800' : 'text-indigo-800'}`}>
                      <Receipt className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                      Абонамент {monthlyUsage.monthly_limit >= 999999 ? 'Неограничен' : monthlyUsage.monthly_limit} фактури
                    </div>
                    <div className={warnLevel === 'limit' || warnLevel === '90' ? 'text-red-700' : warnLevel === '80' ? 'text-yellow-700' : 'text-indigo-700'}>
                      <BarChart3 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                      Обработени за месеца {monthlyUsage.monthly_processed} фактури
                    </div>
                    <div className={warnLevel === 'limit' || warnLevel === '90' ? 'text-red-700' : warnLevel === '80' ? 'text-yellow-700' : 'text-indigo-700'}>
                      <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                      Остатък за месеца {monthlyUsage.monthly_limit >= 999999 ? 'Неограничен' : monthlyUsage.monthly_remaining} фактури
                    </div>
                  </div>
                  {warnLevel === '80' && (
                    <div className="mt-2 text-xs font-medium text-yellow-800 bg-yellow-100 rounded px-2 py-1">
                      <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Близо сте до лимита си за този месец
                    </div>
                  )}
                  {warnLevel === '90' && (
                    <div className="mt-2 text-xs font-medium text-red-800 bg-red-100 rounded px-2 py-1">
                      <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Достигнахте 90% от лимита си за този месец
                    </div>
                  )}
                  {warnLevel === 'limit' && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs font-medium text-red-800 bg-red-100 rounded px-2 py-1">
                        <Ban className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                        Достигнахте лимита си. Моля, обновете абонамента за да продължите.
                      </div>
                      <button onClick={() => { setActiveTab('billing'); setBillingTab('plans'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
                        <Zap className="w-3.5 h-3.5" /> Обнови абонамент
                      </button>
                    </div>
                  )}
                </div>
                );
              })()}
              <div className="border-2 border-dashed rounded-lg p-8 text-center" onDrop={handleDrop} onDragOver={handleDragOver}>
                <Upload className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">Изберете файлове за качване или ги пуснете тук</p>
                <p className="text-xs text-gray-400 mb-4">PDF, JPG, PNG, ZIP</p>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif,.zip" onChange={handleUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className={'inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer ' + (uploading ? 'opacity-50 pointer-events-none' : '')}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Качване...' : 'Изберете файлове'}
                </label>
                {uploading && (
                  <div className="mt-4 w-full max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-indigo-700">Качване на файлове...</span>
                      <span className="text-sm font-bold text-indigo-700">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-indigo-600 h-3 rounded-full transition-all duration-200" style={{width: `${uploadProgress}%`}} />
                    </div>
                  </div>
                )}
              </div>
              {inboxFiles.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Файлове за обработка ({inboxFiles.length})</h3>
                    <div className="flex gap-2">
                      <button onClick={handleProcess} disabled={processing || companies.length === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {processing ? 'Обработка...' : 'Обработи с AI'}
                      </button>
                      <button onClick={handleClearInbox} disabled={processing} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50">
                        <Trash2 className="w-4 h-4" /> Изчисти
                      </button>
                    </div>
                  </div>
                  {companies.length === 0 && <p className="text-xs text-orange-600 mb-2">Добавете поне една фирма преди обработка</p>}
                  {processProgress && (
                    <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-indigo-800">
                          Обработка: {processProgress.current} / {processProgress.total} ({processProgress.total > 0 ? Math.round((processProgress.current / processProgress.total) * 100) : 0}%)
                        </span>
                        <span className="text-xs text-indigo-600">
                          Паралелни: {processProgress.parallel}
                        </span>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{width: `${processProgress.total > 0 ? (processProgress.current / processProgress.total) * 100 : 0}%`}} />
                      </div>
                      {processProgress.currentFile && (
                        <p className="text-xs text-indigo-600 mt-1 truncate">Текущ файл: {processProgress.currentFile}</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    {inboxFiles.map((f, i) => {
                      const fStatus = fileProcessingStatus[f.filename];
                      return (
                      <div key={i} className={'relative overflow-hidden rounded text-sm ' + (fStatus === 'processing' ? 'bg-indigo-50 border border-indigo-200' : fStatus === 'done' ? 'bg-green-50 border border-green-200' : fStatus === 'error' ? 'bg-red-50 border border-red-200' : 'bg-gray-50')}>
                        {fStatus === 'processing' && (
                          <div className="absolute inset-0 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200 opacity-40" style={{animation: 'fileProgressBar 8s ease-in-out forwards', backgroundSize: '200% 100%'}} />
                          </div>
                        )}
                        {fStatus === 'done' && <div className="absolute inset-0 bg-green-200 opacity-20" />}
                        <div className="relative flex items-center gap-2 p-2">
                          {fStatus === 'processing' ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> : fStatus === 'done' ? <Check className="w-4 h-4 text-green-500" /> : fStatus === 'error' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <FileText className="w-4 h-4 text-gray-400" />}
                          <span className={'truncate flex-1 ' + (fStatus === 'processing' ? 'text-indigo-700 font-medium' : fStatus === 'done' ? 'text-green-700' : fStatus === 'error' ? 'text-red-600' : '')}>{f.filename}</span>
                          <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                          {fStatus === 'processing' && <span className="text-xs text-indigo-500 font-medium whitespace-nowrap">Обработва се...</span>}
                          {fStatus === 'done' && <span className="text-xs text-green-600 font-medium">Готово</span>}
                          {fStatus === 'error' && <span className="text-xs text-red-500 font-medium">Грешка</span>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {processResults && (
                            <div className="bg-white rounded-xl shadow-sm p-4">
                              <h3 className="font-semibold mb-3">{processResults.message}</h3>
                {processResults.cross_copies && processResults.cross_copies.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 flex items-center gap-1 mb-2"><ArrowLeftRight className="w-4 h-4" /> Кръстосано копирани фактури</h4>
                    {processResults.cross_copies.map((cc, i) => (
                      <div key={i} className="text-sm text-blue-700">{cc.filename} → профил &quot;{cc.target_profile}&quot; / {cc.target_company} ({cc.type === 'purchase' ? 'покупка' : 'продажба'})</div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {processResults.results.map((r, i) => (
                    <div key={i} className={'p-2 rounded text-sm flex items-start gap-2 ' + (r.status === 'processed' ? 'bg-green-50 text-green-800' : r.status === 'unmatched' ? 'bg-orange-50 text-orange-800' : 'bg-red-50 text-red-800')}>
                      {r.status === 'processed' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      <div>
                        <div className="font-medium">{r.new_filename || r.original_filename}</div>
                        {r.company_name && <div className="text-xs opacity-75">{r.company_name} - {r.invoice_type === 'sale' ? 'Продажба' : 'Покупка'}</div>}
                        {r.error_message && <div className="text-xs">{r.error_message}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
                    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col" style={{maxHeight: 'calc(100vh - 230px)'}}>
                      <div className="flex-shrink-0">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Структура на файловете</h2>
              {selectedFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{selectedFiles.length} избрани</span>
                  <button onClick={handleDownloadSelected} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"><Download className="w-3 h-3" /> Свали</button>
                  <button onClick={handleDeleteSelected} className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"><Trash2 className="w-3 h-3" /> Изтрий</button>
                  <button onClick={() => setSelectedFiles([])} className="text-xs text-gray-500 hover:text-gray-700">Отмени</button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]" ref={filesSearchRef}>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Търсене по файл..." value={filesSearch} onChange={e => { setFilesSearch(e.target.value); setShowFilesSearchSuggestions(true); }} onFocus={() => { if (filesSearch) setShowFilesSearchSuggestions(true); }} className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                {filesSearch && <button onClick={() => { setFilesSearch(''); setShowFilesSearchSuggestions(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                {showFilesSearchSuggestions && filesSearch && filesSearch.length >= 2 && (() => {
                  const q = filesSearch.toLowerCase();
                  const allFileNames = [...new Set([...folderStructure, ...sharedFolderStructure].flatMap(item => [...item.purchases.files_info.map(f => f.name), ...item.sales.files_info.map(f => f.name), ...(item.pending?.files_info.map(f => f.name) || [])]))].filter(n => n.toLowerCase().includes(q)).slice(0, 8);
                  return allFileNames.length > 0 ? (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {allFileNames.map((name, i) => <button key={i} onClick={() => { setFilesSearch(name); setShowFilesSearchSuggestions(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition truncate">{name}</button>)}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="relative min-w-[200px]" ref={filesCompanySuggestRef}>
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Филтър по фирма..." value={filesCompanyInput} onChange={e => { setFilesCompanyInput(e.target.value); setFilesCompany(''); setShowFilesCompanySuggestions(true); }} onFocus={() => setShowFilesCompanySuggestions(true)} className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                {filesCompanyInput && <button onClick={() => { setFilesCompanyInput(''); setFilesCompany(''); setShowFilesCompanySuggestions(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                {showFilesCompanySuggestions && filesCompanyInput && (() => {
                  const q = filesCompanyInput.toLowerCase();
                  const allNames = [...new Set([...folderStructure, ...sharedFolderStructure].map(item => item.company.name))].sort();
                  const matches = allNames.filter(n => n.toLowerCase().includes(q));
                  return matches.length > 0 ? (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {matches.map(name => <button key={name} onClick={() => { setFilesCompany(name); setFilesCompanyInput(name); setShowFilesCompanySuggestions(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition">{name}</button>)}
                    </div>
                  ) : null;
                })()}
              </div>
              <select className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" value="" onChange={e => { const t = e.target.value; const now = new Date(); if (t === 'today') { const d = now.toISOString().slice(0,10); setFilesDateFrom(d); setFilesDateTo(d); } else if (t === 'week') { const day = now.getDay() || 7; const mon = new Date(now); mon.setDate(now.getDate() - day + 1); setFilesDateFrom(mon.toISOString().slice(0,10)); setFilesDateTo(now.toISOString().slice(0,10)); } else if (t === 'month') { setFilesDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)); setFilesDateTo(now.toISOString().slice(0,10)); } else if (t === 'last_month') { setFilesDateFrom(new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10)); setFilesDateTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10)); } else if (t === 'quarter') { const qm = Math.floor(now.getMonth()/3)*3; setFilesDateFrom(new Date(now.getFullYear(), qm, 1).toISOString().slice(0,10)); setFilesDateTo(now.toISOString().slice(0,10)); } else if (t === 'year') { setFilesDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10)); setFilesDateTo(now.toISOString().slice(0,10)); } else if (t === 'last_year') { setFilesDateFrom(new Date(now.getFullYear()-1, 0, 1).toISOString().slice(0,10)); setFilesDateTo(new Date(now.getFullYear()-1, 11, 31).toISOString().slice(0,10)); } else if (t === 'all') { setFilesDateFrom(''); setFilesDateTo(''); } }}>
                <option value="">Времева рамка...</option>
                <option value="today">Днес</option>
                <option value="week">Тази седмица</option>
                <option value="month">Този месец</option>
                <option value="last_month">Миналия месец</option>
                <option value="quarter">Това тримесечие</option>
                <option value="year">Тази година</option>
                <option value="last_year">Миналата година</option>
                <option value="all">Всички</option>
              </select>
              <input type="date" value={filesDateFrom} onChange={e => setFilesDateFrom(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" title="От дата" />
              <input type="date" value={filesDateTo} onChange={e => setFilesDateTo(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" title="До дата" />
              {(filesSearch || filesCompany || filesCompanyInput || filesDateFrom || filesDateTo) && (
                <button onClick={() => { setFilesSearch(''); setFilesCompany(''); setFilesCompanyInput(''); setFilesDateFrom(''); setFilesDateTo(''); setShowFilesCompanySuggestions(false); }} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition">Изчисти</button>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-gray-500">Сортирай:</span>
                <button onClick={() => { if (filesSortBy === 'name') { setFilesSortOrder(o => o === 'asc' ? 'desc' : 'asc'); } else { setFilesSortBy('name'); setFilesSortOrder('asc'); }}} className={'px-2 py-1 text-xs rounded-lg border transition flex items-center gap-1 ' + (filesSortBy === 'name' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                  <FileText className="w-3 h-3" /> Име {filesSortBy === 'name' && (filesSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
                <button onClick={() => { if (filesSortBy === 'date') { setFilesSortOrder(o => o === 'asc' ? 'desc' : 'asc'); } else { setFilesSortBy('date'); setFilesSortOrder('desc'); }}} className={'px-2 py-1 text-xs rounded-lg border transition flex items-center gap-1 ' + (filesSortBy === 'date' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                  <Clock className="w-3 h-3" /> Дата {filesSortBy === 'date' && (filesSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </div>
            </div>
            </div>
            <div className="flex-1 overflow-y-auto">
            {folderStructure.length === 0 && sharedFolderStructure.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Няма фирми с файлове</p>
            ) : (() => {
              const filesQ = filesSearch.toLowerCase();
              const hasDateFilter = filesDateFrom || filesDateTo;
              const fileMatchesDate = (filename: string, companyName: string) => {
                if (!hasDateFilter) return true;
                const inv = invoices.find(i => i.new_filename === filename && i.company_name === companyName);
                if (!inv || !inv.date) return false;
                const d = inv.date.replace(/\./g, '-');
                if (filesDateFrom && d < filesDateFrom) return false;
                if (filesDateTo && d > filesDateTo) return false;
                return true;
              };
              // Merge owned and shared folder structures
              const ownedItems = folderStructure.map(item => ({ ...item, _shared: false as const, _shareId: '' }));
              const sharedItems = sharedFolderStructure.map(item => {
                const sc = sharedCompanies.find(s => s.company.name === item.company.name);
                return { ...item, _shared: true as const, _shareId: sc?.share_id || '' };
              });
              const allItems = [...ownedItems, ...sharedItems];
              const filteredFolders = allItems.filter(item => {
                if (filesCompany && item.company.name !== filesCompany) return false;
                if (!filesCompany && filesCompanyInput && !item.company.name.toLowerCase().includes(filesCompanyInput.toLowerCase())) return false;
                if (filesSearch || hasDateFilter) {
                  const hasMatchingPurchase = item.purchases.files_info.some(f => (!filesSearch || f.name.toLowerCase().includes(filesQ)) && fileMatchesDate(f.name, item.company.name));
                  const hasMatchingSale = item.sales.files_info.some(f => (!filesSearch || f.name.toLowerCase().includes(filesQ)) && fileMatchesDate(f.name, item.company.name));
                  const hasMatchingPending = item.pending?.files_info.some(f => (!filesSearch || f.name.toLowerCase().includes(filesQ)) && (!hasDateFilter || (f.date && (!filesDateFrom || f.date.replace(/\./g, '-') >= filesDateFrom) && (!filesDateTo || f.date.replace(/\./g, '-') <= filesDateTo))));
                  if (!hasMatchingPurchase && !hasMatchingSale && !hasMatchingPending) return false;
                }
                return true;
              });
              return filteredFolders.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Няма намерени резултати</p>
              ) : (
              <div className="space-y-2">
                {filteredFolders.map(item => (
                  <div key={(item._shared ? 'shared-' : '') + item.company.id} className={item._shared ? 'border border-green-200 rounded-lg' : ''}>
                    <div className={'w-full flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer bg-white border-b border-gray-100' + (item._shared ? ' bg-green-50/50' : '')} style={{position: 'sticky', top: 0, zIndex: 10}}>
                      <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => toggleCompany((item._shared ? 'shared-' : '') + item.company.id)}>
                        {expandedCompanies[(item._shared ? 'shared-' : '') + item.company.id] ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                        {item._shared ? <Share2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                        <span className="font-medium truncate">{item.company.name}</span>
                        {item._shared && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">споделена</span>}
                        <span className="text-xs text-gray-500 flex-shrink-0">{item.purchases.count} покупки, {item.sales.count} продажби{item.proformas && item.proformas.count > 0 ? `, ${item.proformas.count} проформи` : ''}{item.pending && item.pending.count > 0 ? `, ${item.pending.count} за одобрение` : ''}</span>
                      </div>
                      {!item._shared && activeProfile && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); invOpenInvoice(item.company.id, activeProfile.id, item.company.name); }} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 cursor-pointer"><Plus className="w-3 h-3" /> Нова фактура</button>
                          <button onClick={(e) => { e.stopPropagation(); invOpenClients(item.company.id, activeProfile.id); }} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 cursor-pointer"><Users className="w-3 h-3" /> Клиенти</button>
                          <button onClick={(e) => { e.stopPropagation(); invOpenItems(item.company.id, activeProfile.id); }} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 cursor-pointer"><FileText className="w-3 h-3" /> Артикули</button>
                          <button onClick={(e) => { e.stopPropagation(); invHandleSync(item.company.id, activeProfile.id); }} disabled={invSyncing[item.company.id]} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50 cursor-pointer">{invSyncing[item.company.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Синхронизирай</button>
                          <button onClick={(e) => { e.stopPropagation(); invOpenSettings(item.company.id, activeProfile.id); }} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 cursor-pointer"><RefreshCw className="w-3 h-3" /> Настройки</button>
                        </div>
                      )}
                    </div>
                    {expandedCompanies[(item._shared ? 'shared-' : '') + item.company.id] && (
                      <div className="border-t px-3 pb-3">
                        {!item._shared && item.pending && item.pending.count > 0 && (() => {
                          const filteredPending = item.pending.files_info.filter(f => {
                            if (filesSearch && !f.name.toLowerCase().includes(filesQ)) return false;
                            if (hasDateFilter) {
                              if (!f.date) return false;
                              const d = f.date.replace(/\./g, '-');
                              if (filesDateFrom && d < filesDateFrom) return false;
                              if (filesDateTo && d > filesDateTo) return false;
                            }
                            return true;
                          });
                          const overLimitCount = filteredPending.filter(f => f.over_limit).length;
                          const approvable = filteredPending.filter(f => !f.over_limit);
                          return filteredPending.length > 0 ? (
                          <div className="mt-3">
                            <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Фактури за одобрение ({filteredPending.length})</h4>
                            {overLimitCount > 0 && (
                              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <div className="flex-1 text-xs text-red-700">
                                  Имате {overLimitCount} фактур{overLimitCount === 1 ? 'а' : 'и'} за фирма <strong>{item.company.name}</strong> чакащ{overLimitCount === 1 ? 'а' : 'и'} за одобрение, но месечният лимит е изчерпан.
                                </div>
                                <button onClick={() => setActiveTab('billing')} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 whitespace-nowrap">Преминете на по-висок план</button>
                              </div>
                            )}
                            <div className="space-y-1">
                              {filteredPending.map((f, fi) => (
                                <div key={fi} className={'flex items-center gap-2 p-2 rounded text-sm group cursor-default ' + (f.over_limit ? 'bg-red-50 border border-red-200 opacity-75' : 'bg-orange-50')} onDoubleClick={() => { if (f.over_limit) { setError('Лимитът на фактури за този месец е изчерпан. Преминете на по-висок план.'); return; } window.open(previewFileUrl(activeProfile.id, item.company.name, 'pending', f.name), '_blank'); }}>
                                  <FileText className={'w-3.5 h-3.5 ' + (f.over_limit ? 'text-red-500' : 'text-orange-500')} />
                                  <div className="truncate flex-1">
                                    <span className={'truncate ' + (f.over_limit ? 'text-red-600' : '')}>{f.name}</span>
                                    <div className={'text-xs ' + (f.over_limit ? 'text-red-500' : 'text-orange-600')}>от {f.cross_copied_from} | {f.issuer_name} → {f.recipient_name}</div>
                                  </div>
                                  {f.over_limit ? (
                                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Лимит</span>
                                  ) : (
                                    <button onClick={() => handleApproveInvoices([f.id])} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"><Check className="w-3 h-3" /> Одобри</button>
                                  )}
                                </div>
                              ))}
                              {approvable.length > 1 && (
                                <button onClick={() => handleApproveInvoices(approvable.map(f => f.id))} className="mt-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex items-center gap-1"><Check className="w-3 h-3" /> Одобри всички ({approvable.length})</button>
                              )}
                            </div>
                          </div>
                          ) : null;
                        })()}
                        <div className="mt-3">
                          {(() => {
                            const filteredPurchases = item.purchases.files_info.filter(f => {
                              if (filesSearch && !f.name.toLowerCase().includes(filesQ)) return false;
                              if (hasDateFilter && !fileMatchesDate(f.name, item.company.name)) return false;
                              return true;
                            });
                            return <>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-4">Фактури покупки ({filteredPurchases.length})<span className="ml-auto flex items-center gap-3"><span className="text-xs text-gray-400">Дата</span><span className="text-xs text-gray-400">Статус</span></span></h4>
                          {filteredPurchases.length === 0 ? <p className="text-xs text-gray-400 ml-4">Няма файлове</p> : (
                            <div className="space-y-1">
                              {[...filteredPurchases].sort((a, b) => { if (filesSortBy === 'date') { const da = a.uploaded_at || ''; const db = b.uploaded_at || ''; return filesSortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da); } return filesSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name); }).map((f, fi) => (
                                <div key={fi} data-file-key={`${item.company.name}|purchases|${f.name}`} className={'flex items-center gap-2 p-1.5 rounded text-sm group cursor-default ' + (isFileSelected(item.company.name, 'purchases', f.name) ? 'bg-indigo-100' : 'hover:bg-gray-50')} onClick={(e) => !item._shared && handleFileClick(e, item.company.name, 'purchases', f.name)} onDoubleClick={() => window.open(item._shared ? sharedFileViewerUrl(item._shareId, item.company.name, 'purchases', f.name, filesSortBy, filesSortOrder) : fileViewerUrl(activeProfile.id, item.company.name, 'purchases', f.name, filesSortBy, filesSortOrder), '_blank')}>
                                  <FileText className={'w-3.5 h-3.5 ' + (f.is_credit_note ? 'text-red-500' : 'text-gray-400')} />
                                  <span className={'truncate flex-1 ' + (f.is_credit_note ? 'text-red-600 font-medium' : '')}>{f.name}</span>
                                  {f.uploaded_at && <span className="text-xs text-gray-400 whitespace-nowrap">{f.uploaded_at}</span>}
                                  {!item._shared && (fileStatuses[`${item.company.id}|${f.name}`] ? <SyncBadge count={fileStatuses[`${item.company.id}|${f.name}`].count} color={fileStatuses[`${item.company.id}|${f.name}`].color} /> : <DeliveryTicks status={f.cross_copy_status} crossCopiedFrom={f.cross_copied_from} />)}
                                  <span className="flex items-center gap-1" style={{ width: '90px', justifyContent: 'center' }}>
                                    {!item._shared && fileStatuses[`${item.company.id}|${f.name}`] && (<>
                                      <span className="text-blue-500 hover:text-blue-700 cursor-pointer" title="Редактирай фактурата" onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (!fs?.invoice_id) return; invCheckEditable(fs.invoice_id).then((d: Record<string, unknown>) => { if (d.editable === false) { showEditProtectModal(); } else if (activeProfile) { invOpenInvoice(item.company.id, activeProfile.id, item.company.name, { invoice_id: fs.invoice_id } as Record<string, unknown>); } }).catch(() => { if (activeProfile) invOpenInvoice(item.company.id, activeProfile.id, item.company.name, { invoice_id: fs.invoice_id } as Record<string, unknown>); }); }}><Edit3 className="w-4 h-4" /></span>
                                      <span className={(fileStatuses[`${item.company.id}|${f.name}`]?.is_synced ? 'text-green-500 hover:text-green-700' : 'text-amber-500 hover:text-amber-700') + ' cursor-pointer'} title={fileStatuses[`${item.company.id}|${f.name}`]?.is_synced ? 'Синхронизирана' : 'Синхронизирай фактурата'} onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (!fs?.is_synced && fs?.invoice_id && activeProfile) { invSyncSingle(fs.invoice_id, activeProfile.id).then(() => { if (activeProfile) loadProfileData(activeProfile.id); }).catch(() => { if (activeProfile) invSyncInvoices(item.company.id, activeProfile.id); }); } }}><RefreshCw className="w-4 h-4" /></span>
                                      <span className="text-purple-500 hover:text-purple-700 cursor-pointer" title="Изпрати по имейл" onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (fs?.invoice_id && activeProfile) { sendInvoiceEmail(activeProfile.id, { invoice_id: fs.invoice_id } as Record<string, unknown>).then(() => invToastShow('Фактурата е изпратена по имейл')).catch((err: Error) => setError(err.message || 'Грешка при изпращане')); } }}><Mail className="w-4 h-4" /></span>
                                    </>)}
                                    <a href={item._shared ? sharedDownloadFileUrl(item._shareId, item.company.name, 'purchases', f.name) : downloadFileUrl(activeProfile.id, item.company.name, 'purchases', f.name)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600" onClick={(e) => e.stopPropagation()} download><Download className="w-3.5 h-3.5" /></a>
                                    {!item._shared && <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(item.company.name, 'purchases', f.name); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          </>;
                          })()}
                        </div>
                        <div className="mt-3">
                          {(() => {
                            const filteredSales = item.sales.files_info.filter(f => {
                              if (filesSearch && !f.name.toLowerCase().includes(filesQ)) return false;
                              if (hasDateFilter && !fileMatchesDate(f.name, item.company.name)) return false;
                              return true;
                            });
                            return <>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-4">Фактури продажби ({filteredSales.length})<span className="ml-auto flex items-center gap-3"><span className="text-xs text-gray-400">Дата</span><span className="text-xs text-gray-400">Статус</span></span></h4>
                          {filteredSales.length === 0 ? <p className="text-xs text-gray-400 ml-4">Няма файлове</p> : (
                            <div className="space-y-1">
                              {[...filteredSales].sort((a, b) => { if (filesSortBy === 'date') { const da = a.uploaded_at || ''; const db = b.uploaded_at || ''; return filesSortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da); } return filesSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name); }).map((f, fi) => (
                                <div key={fi} data-file-key={`${item.company.name}|sales|${f.name}`} className={'flex items-center gap-2 p-1.5 rounded text-sm group cursor-default ' + (isFileSelected(item.company.name, 'sales', f.name) ? 'bg-indigo-100' : 'hover:bg-gray-50')} onClick={(e) => !item._shared && handleFileClick(e, item.company.name, 'sales', f.name)} onDoubleClick={() => window.open(item._shared ? sharedFileViewerUrl(item._shareId, item.company.name, 'sales', f.name, filesSortBy, filesSortOrder) : fileViewerUrl(activeProfile.id, item.company.name, 'sales', f.name, filesSortBy, filesSortOrder), '_blank')}>
                                  <FileText className={'w-3.5 h-3.5 ' + (f.is_credit_note ? 'text-red-500' : 'text-gray-400')} />
                                  <span className={'truncate flex-1 ' + (f.is_credit_note ? 'text-red-600 font-medium' : '')}>{f.name}</span>
                                  {f.uploaded_at && <span className="text-xs text-gray-400 whitespace-nowrap">{f.uploaded_at}</span>}
                                  {!item._shared && (fileStatuses[`${item.company.id}|${f.name}`] ? <SyncBadge count={fileStatuses[`${item.company.id}|${f.name}`].count} color={fileStatuses[`${item.company.id}|${f.name}`].color} /> : <DeliveryTicks status={f.cross_copy_status} crossCopiedFrom={f.cross_copied_from} />)}
                                  <span className="flex items-center gap-1" style={{ width: '90px', justifyContent: 'center' }}>
                                    {!item._shared && fileStatuses[`${item.company.id}|${f.name}`] && (<>
                                      <span className="text-blue-500 hover:text-blue-700 cursor-pointer" title="Редактирай фактурата" onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (!fs?.invoice_id) return; invCheckEditable(fs.invoice_id).then((d: Record<string, unknown>) => { if (d.editable === false) { showEditProtectModal(); } else if (activeProfile) { invOpenInvoice(item.company.id, activeProfile.id, item.company.name, { invoice_id: fs.invoice_id } as Record<string, unknown>); } }).catch(() => { if (activeProfile) invOpenInvoice(item.company.id, activeProfile.id, item.company.name, { invoice_id: fs.invoice_id } as Record<string, unknown>); }); }}><Edit3 className="w-4 h-4" /></span>
                                      <span className={(fileStatuses[`${item.company.id}|${f.name}`]?.is_synced ? 'text-green-500 hover:text-green-700' : 'text-amber-500 hover:text-amber-700') + ' cursor-pointer'} title={fileStatuses[`${item.company.id}|${f.name}`]?.is_synced ? 'Синхронизирана' : 'Синхронизирай фактурата'} onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (!fs?.is_synced && fs?.invoice_id && activeProfile) { invSyncSingle(fs.invoice_id, activeProfile.id).then(() => { if (activeProfile) loadProfileData(activeProfile.id); }).catch(() => { if (activeProfile) invSyncInvoices(item.company.id, activeProfile.id); }); } }}><RefreshCw className="w-4 h-4" /></span>
                                      <span className="text-purple-500 hover:text-purple-700 cursor-pointer" title="Изпрати по имейл" onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (fs?.invoice_id && activeProfile) { sendInvoiceEmail(activeProfile.id, { invoice_id: fs.invoice_id } as Record<string, unknown>).then(() => invToastShow('Фактурата е изпратена по имейл')).catch((err: Error) => setError(err.message || 'Грешка при изпращане')); } }}><Mail className="w-4 h-4" /></span>
                                    </>)}
                                    <a href={item._shared ? sharedDownloadFileUrl(item._shareId, item.company.name, 'sales', f.name) : downloadFileUrl(activeProfile.id, item.company.name, 'sales', f.name)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600" onClick={(e) => e.stopPropagation()} download><Download className="w-3.5 h-3.5" /></a>
                                    {!item._shared && <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(item.company.name, 'sales', f.name); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          </>;
                          })()}
                        </div>
                        {/* Proformas section */}
                        {item.proformas && item.proformas.files_info && (() => {
                          const filteredProformas = item.proformas!.files_info.filter(f => {
                            if (filesSearch && !f.name.toLowerCase().includes(filesQ)) return false;
                            if (hasDateFilter && !fileMatchesDate(f.name, item.company.name)) return false;
                            return true;
                          });
                          return filteredProformas.length > 0 || item.proformas!.count > 0 ? (
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-orange-500 uppercase mb-2 flex items-center gap-4">Проформи фактури ({filteredProformas.length})<span className="ml-auto flex items-center gap-3"><span className="text-xs text-gray-400">Дата</span><span className="text-xs text-gray-400">Статус</span></span></h4>
                          {filteredProformas.length === 0 ? <p className="text-xs text-gray-400 ml-4">Няма файлове</p> : (
                            <div className="space-y-1">
                              {[...filteredProformas].sort((a, b) => { if (filesSortBy === 'date') { const da = a.uploaded_at || ''; const db = b.uploaded_at || ''; return filesSortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da); } return filesSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name); }).map((f, fi) => (
                                <div key={fi} data-file-key={`${item.company.name}|proformas|${f.name}`} className={'flex items-center gap-2 p-1.5 rounded text-sm group cursor-default ' + (isFileSelected(item.company.name, 'proformas', f.name) ? 'bg-indigo-100' : 'hover:bg-gray-50')} onClick={(e) => !item._shared && handleFileClick(e, item.company.name, 'proformas', f.name)} onDoubleClick={() => window.open(item._shared ? sharedFileViewerUrl(item._shareId, item.company.name, 'proformas', f.name, filesSortBy, filesSortOrder) : fileViewerUrl(activeProfile.id, item.company.name, 'proformas', f.name, filesSortBy, filesSortOrder), '_blank')}>
                                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                                  <span className="truncate flex-1">{f.name}</span>
                                  {f.uploaded_at && <span className="text-xs text-gray-400 whitespace-nowrap">{f.uploaded_at}</span>}
                                  {!item._shared && (fileStatuses[`${item.company.id}|${f.name}`] ? <SyncBadge count={fileStatuses[`${item.company.id}|${f.name}`].count} color={fileStatuses[`${item.company.id}|${f.name}`].color} /> : <DeliveryTicks status={f.cross_copy_status} crossCopiedFrom={f.cross_copied_from} />)}
                                  <span className="flex items-center gap-1" style={{ width: '90px', justifyContent: 'center' }}>
                                    {!item._shared && fileStatuses[`${item.company.id}|${f.name}`] && (<>
                                      <span className="text-blue-500 hover:text-blue-700 cursor-pointer" title="Редактирай фактурата" onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (!fs?.invoice_id) return; invCheckEditable(fs.invoice_id).then((d: Record<string, unknown>) => { if (d.editable === false) { showEditProtectModal(); } else if (activeProfile) { invOpenInvoice(item.company.id, activeProfile.id, item.company.name, { invoice_id: fs.invoice_id } as Record<string, unknown>); } }).catch(() => { if (activeProfile) invOpenInvoice(item.company.id, activeProfile.id, item.company.name, { invoice_id: fs.invoice_id } as Record<string, unknown>); }); }}><Edit3 className="w-4 h-4" /></span>
                                      <span className={(fileStatuses[`${item.company.id}|${f.name}`]?.is_synced ? 'text-green-500 hover:text-green-700' : 'text-amber-500 hover:text-amber-700') + ' cursor-pointer'} title={fileStatuses[`${item.company.id}|${f.name}`]?.is_synced ? 'Синхронизирана' : 'Синхронизирай фактурата'} onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (!fs?.is_synced && fs?.invoice_id && activeProfile) { invSyncSingle(fs.invoice_id, activeProfile.id).then(() => { if (activeProfile) loadProfileData(activeProfile.id); }).catch(() => { if (activeProfile) invSyncInvoices(item.company.id, activeProfile.id); }); } }}><RefreshCw className="w-4 h-4" /></span>
                                      <span className="text-purple-500 hover:text-purple-700 cursor-pointer" title="Изпрати по имейл" onClick={(t) => { t.stopPropagation(); const fs = fileStatuses[`${item.company.id}|${f.name}`]; if (fs?.invoice_id && activeProfile) { sendInvoiceEmail(activeProfile.id, { invoice_id: fs.invoice_id } as Record<string, unknown>).then(() => invToastShow('Проформата е изпратена по имейл')).catch((err: Error) => setError(err.message || 'Грешка при изпращане')); } }}><Mail className="w-4 h-4" /></span>
                                    </>)}
                                    <a href={item._shared ? sharedDownloadFileUrl(item._shareId, item.company.name, 'proformas', f.name) : downloadFileUrl(activeProfile.id, item.company.name, 'proformas', f.name)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600" onClick={(e) => e.stopPropagation()} download><Download className="w-3.5 h-3.5" /></a>
                                    {!item._shared && <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(item.company.name, 'proformas', f.name); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              );
            })()}
            </div>
          </div>
        )}

        {activeTab === 'history' && (() => {
          const historyCompanyNames = [...new Set(invoices.map(inv => inv.company_name).filter(Boolean))].sort();
          const filteredInvoices = invoices.filter(inv => {
            if (historyFilter === 'processed' && inv.status !== 'processed') return false;
            if (historyFilter === 'unmatched' && inv.status !== 'unmatched' && inv.status !== 'error') return false;
            if (historyCompany) { if (inv.company_name !== historyCompany) return false; }
            else if (historyCompanyInput) { if (!inv.company_name?.toLowerCase().includes(historyCompanyInput.toLowerCase())) return false; }
            if ((historyDateFrom || historyDateTo) && inv.date) {
              const d = inv.date.replace(/\./g, '-');
              if (historyDateFrom && d < historyDateFrom) return false;
              if (historyDateTo && d > historyDateTo) return false;
            } else if ((historyDateFrom || historyDateTo) && !inv.date) return false;
            if (historySearch) {
              const q = historySearch.toLowerCase();
              const searchable = [inv.new_filename, inv.original_filename, inv.company_name, inv.issuer_name, inv.recipient_name, inv.invoice_number, inv.date].join(' ').toLowerCase();
              if (!searchable.includes(q)) return false;
            }
            return true;
          });
          const processedCount = invoices.filter(inv => inv.status === 'processed').length;
          const unmatchedCount = invoices.filter(inv => inv.status === 'unmatched' || inv.status === 'error').length;
          return (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">История на фактурите</h2>
            </div>
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setHistoryFilter('all')} className={'flex-1 px-3 py-1.5 text-sm rounded-md transition ' + (historyFilter === 'all' ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900')}>Всички ({invoices.length})</button>
              <button onClick={() => setHistoryFilter('processed')} className={'flex-1 px-3 py-1.5 text-sm rounded-md transition ' + (historyFilter === 'processed' ? 'bg-white shadow-sm font-medium text-green-700' : 'text-gray-600 hover:text-gray-900')}>Обработени ({processedCount})</button>
              <button onClick={() => setHistoryFilter('unmatched')} className={'flex-1 px-3 py-1.5 text-sm rounded-md transition ' + (historyFilter === 'unmatched' ? 'bg-white shadow-sm font-medium text-orange-700' : 'text-gray-600 hover:text-gray-900')}>Необработени ({unmatchedCount})</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]" ref={historySearchRef}>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Търсене по файл, фирма, номер..." value={historySearch} onChange={e => { setHistorySearch(e.target.value); setShowHistorySearchSuggestions(true); }} onFocus={() => { if (historySearch) setShowHistorySearchSuggestions(true); }} className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                {historySearch && <button onClick={() => { setHistorySearch(''); setShowHistorySearchSuggestions(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                {showHistorySearchSuggestions && historySearch && historySearch.length >= 2 && (() => {
                  const q = historySearch.toLowerCase();
                  const allNames = [...new Set(invoices.flatMap(inv => [inv.new_filename, inv.original_filename, inv.company_name, inv.issuer_name, inv.recipient_name, inv.invoice_number].filter(Boolean)))].filter(n => n.toLowerCase().includes(q)).slice(0, 8);
                  return allNames.length > 0 ? (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {allNames.map((name, i) => <button key={i} onClick={() => { setHistorySearch(name); setShowHistorySearchSuggestions(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition truncate">{name}</button>)}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="relative min-w-[200px]" ref={companySuggestRef}>
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Филтър по фирма..." value={historyCompanyInput} onChange={e => { setHistoryCompanyInput(e.target.value); setHistoryCompany(''); setShowCompanySuggestions(true); }} onFocus={() => setShowCompanySuggestions(true)} className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                {historyCompanyInput && <button onClick={() => { setHistoryCompanyInput(''); setHistoryCompany(''); setShowCompanySuggestions(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                {showCompanySuggestions && historyCompanyInput && (() => {
                  const q = historyCompanyInput.toLowerCase();
                  const matches = historyCompanyNames.filter(n => n.toLowerCase().includes(q));
                  return matches.length > 0 ? (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {matches.map(name => <button key={name} onClick={() => { setHistoryCompany(name); setHistoryCompanyInput(name); setShowCompanySuggestions(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition">{name}</button>)}
                    </div>
                  ) : null;
                })()}
              </div>
              <input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" title="От дата" />
              <input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" title="До дата" />
              {(historySearch || historyCompany || historyCompanyInput || historyDateFrom || historyDateTo) && (
                <button onClick={() => { setHistorySearch(''); setHistoryCompany(''); setHistoryCompanyInput(''); setHistoryDateFrom(''); setHistoryDateTo(''); setShowCompanySuggestions(false); }} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition">Изчисти</button>
              )}
            </div>
            {(historySearch || historyCompany || historyCompanyInput || historyDateFrom || historyDateTo) && (
              <div className="text-xs text-gray-500 mb-3">Намерени: {filteredInvoices.length} от {invoices.length} фактури</div>
            )}
            {filteredInvoices.length === 0 ? (
              <p className="text-gray-400 text-center py-8">{historyFilter === 'all' ? 'Няма обработени фактури' : historyFilter === 'processed' ? 'Няма обработени фактури' : 'Няма необработени фактури'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 uppercase border-b"><th className="pb-2 pr-3">Файл</th><th className="pb-2 pr-3">Фирма</th><th className="pb-2 pr-3">Тип</th><th className="pb-2 pr-3">Дата</th><th className="pb-2 pr-3">Номер</th><th className="pb-2 pr-3">Статус</th></tr></thead>
                  <tbody>
                    {filteredInvoices.slice().reverse().map(inv => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-3"><div className={'truncate max-w-48 ' + (inv.is_credit_note ? 'text-red-600 font-medium' : '')}>{inv.new_filename || inv.original_filename}</div>{inv.cross_copied_from && <div className="text-xs text-blue-600 flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" /> от {inv.cross_copied_from}</div>}</td>
                        <td className="py-2 pr-3 text-gray-600">{inv.company_name || '-'}</td>
                        <td className="py-2 pr-3">{inv.invoice_type === 'sale' ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Продажба</span> : inv.invoice_type === 'purchase' ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Покупка</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">?</span>}</td>
                        <td className="py-2 pr-3 text-gray-600">{inv.date || '-'}</td>
                        <td className="py-2 pr-3 text-gray-600">{inv.invoice_number || '-'}</td>
                        <td className="py-2 pr-3">{inv.status === 'processed' ? <span className="text-green-600 flex items-center gap-1"><DeliveryTicks status={inv.cross_copy_status || 'none'} crossCopiedFrom={inv.cross_copied_from} /> OK</span> : inv.status === 'unmatched' ? <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Без съвп.</span> : <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Грешка</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          );
        })()}

        {activeTab === 'notifications' && (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Известия</h2>
              {notifications.length > 0 && <button onClick={handleClearNotifs} className="text-sm text-red-600 hover:text-red-800">Изчисти всички</button>}
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Няма известия</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice().reverse().map(n => (
                  <div key={n.id} className={'p-3 rounded-lg border flex items-start gap-3 ' + (n.type === 'cross_copy' ? 'bg-blue-50 border-blue-200' : n.type === 'unmatched' ? 'bg-orange-50 border-orange-200' : n.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50')}>
                    {n.type === 'cross_copy' ? <ArrowLeftRight className="w-4 h-4 text-blue-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-gray-600 whitespace-pre-line mt-1">{n.message}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString('bg-BG')}</div>
                    </div>
                    <button onClick={() => handleDeleteNotif(n.id)} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Абонамент</h2>
            
            {/* Current subscription status */}
            {subscription && (
              <div className={'rounded-lg p-4 mb-6 border ' + (subscription.status === 'active' ? 'bg-green-50 border-green-200' : subscription.status === 'trial' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200')}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {subscription.status === 'active' && <span className="text-green-700">Активен абонамент</span>}
                      {subscription.status === 'trial' && <span className="text-blue-700">Пробен период</span>}
                      {subscription.status === 'expired' && <span className="text-orange-700">Изтекъл абонамент</span>}
                      {subscription.status === 'cancelled' && <span className="text-orange-700">Отменен абонамент</span>}
                      {!['active', 'trial', 'expired', 'cancelled'].includes(subscription.status) && <span className="text-gray-700">Безплатен план</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {subscription.plan !== 'free' && subscription.plan !== '' ? `План: ${{starter: 'Стартов', pro: 'Професионален', business: 'Бизнес', corporate: 'Корпоративен', personal: 'Персонален'}[subscription.plan] || subscription.plan}` : 'Безплатен план'}
                      {subscription.expires && (() => { try { return ` · Валиден до: ${new Date(subscription.expires).toLocaleDateString('bg-BG')}`; } catch { return ''; } })()}
                    </div>
                    {subscription.cancel_at_period_end && (
                      <div className="text-xs text-orange-600 mt-1 font-medium">Автоматичното подновяване е спряно</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {subscription.status === 'active' && <Star className="w-6 h-6 text-yellow-500" />}
                    {subscription.status === 'trial' && <Clock className="w-6 h-6 text-blue-500" />}
                    {(subscription.status === 'expired' || subscription.status === 'cancelled') && <AlertCircle className="w-6 h-6 text-orange-500" />}
                  </div>
                </div>
                {subscription.usage && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                                        <div className="bg-white rounded-lg p-2 shadow-sm">
                                          <div className="text-xs text-gray-500">Фирми</div>
                      <div className="font-bold text-sm">{subscription.usage.companies} / {subscription.max_companies >= 999999 ? '∞' : subscription.max_companies}</div>
                    </div>
                                        <div className="bg-white rounded-lg p-2 shadow-sm">
                                          <div className="text-xs text-gray-500">Фактури</div>
                      <div className="font-bold text-sm">{subscription.usage.invoices} / {subscription.max_invoices >= 999999 ? '∞' : subscription.max_invoices}</div>
                    </div>
                  </div>
                )}
                {/* Subscription management buttons */}
                {subscription.status === 'active' && subscription.stripe_subscription_id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!subscription.cancel_at_period_end ? (
                      <button onClick={handleCancelSubscription} disabled={cancelLoading} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition flex items-center gap-1">
                        {cancelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />} Спри автоматично подновяване
                      </button>
                    ) : (
                      <button onClick={handleReactivateSubscription} disabled={cancelLoading} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition flex items-center gap-1">
                        {cancelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Възстанови автоматично подновяване
                      </button>
                    )}
                    <button onClick={handleOpenPortal} disabled={portalLoading} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition flex items-center gap-1">
                      {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />} Управление на плащания (Stripe)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Billing sub-tabs */}
            <div className="flex gap-1 mb-4 border-b">
              {[
                { key: 'plans' as const, label: 'Планове', icon: CreditCard },
                { key: 'payments' as const, label: 'История на плащанията', icon: Receipt },
                { key: 'invoices' as const, label: 'Фактури', icon: FileText },
              ].map(t => (
                <button key={t.key} onClick={() => { setBillingTab(t.key); if (t.key !== 'plans' && billingPayments.length === 0) loadPayments(); }} className={'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition ' + (billingTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {/* Plans sub-tab */}
            {billingTab === 'plans' && (
              <>
                <h3 className="font-medium text-sm text-gray-700 mb-3">Налични планове</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                  {billingPlans.map(plan => {
                    const isActivePlan = subscription?.status === 'active' && subscription?.plan === plan.id;
                    return (
                    <div key={plan.id} className={'rounded-2xl border-2 p-4 transition flex flex-col relative ' + (plan.id === 'business' ? 'border-indigo-400 bg-indigo-50' : plan.id === 'corporate' ? 'border-yellow-400 bg-yellow-50' : plan.id === 'personal' ? 'border-purple-400 bg-purple-50' : plan.promo ? 'border-orange-400 bg-orange-50' : plan.id === 'free' ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white')}>
                      {plan.id === 'business' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">Популярен</div>}
                      {plan.id === 'corporate' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs px-3 py-0.5 rounded-full font-medium">Корпоративен</div>}
                      {plan.promo && <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-xl shadow-lg z-10 uppercase tracking-wide">{plan.promo}</div>}
                      <div className="text-center mb-4">
                        <div className={'inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ' + (plan.id === 'free' ? 'bg-gray-200' : plan.id === 'starter' ? 'bg-blue-100' : plan.id === 'pro' ? 'bg-indigo-100' : plan.id === 'business' ? 'bg-indigo-200' : plan.id === 'corporate' ? 'bg-yellow-200' : plan.id === 'personal' ? 'bg-purple-200' : 'bg-gray-100')}>
                          {plan.id === 'free' ? <Users className="w-5 h-5 text-gray-500" /> : plan.id === 'starter' ? <Zap className="w-5 h-5 text-blue-600" /> : plan.id === 'pro' ? <Star className="w-5 h-5 text-indigo-600" /> : plan.id === 'business' ? <Zap className="w-5 h-5 text-indigo-700" /> : plan.id === 'corporate' ? <Star className="w-5 h-5 text-yellow-700" /> : <Star className="w-5 h-5 text-purple-700" />}
                        </div>
                        <h4 className="font-bold text-lg">{plan.name}</h4>
                        <div className="mt-1">
                          {plan.contact_us ? (
                            <><span className="text-lg font-extrabold text-gray-900">По договаряне</span><p className="text-xs text-gray-400">свържете се с нас</p></>
                          ) : plan.price === 0 ? (
                            <><span className="text-2xl font-extrabold text-gray-900">0 EUR</span><p className="text-xs text-gray-400">завинаги</p></>
                          ) : (
                            <><span className="text-2xl font-extrabold text-gray-900">{plan.price.toFixed(2)}</span><span className="text-xs text-gray-400 ml-1">EUR/{plan.interval === 'month' ? 'мес' : 'год'}</span>{plan.savings && <p className="text-xs text-green-600 font-medium mt-0.5">{plan.savings}</p>}</>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1.5 mb-4 flex-1">
                        {plan.features.map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-gray-600"><Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}</li>
                        ))}
                      </ul>
                      {plan.contact_us ? (
                        <button onClick={() => { setAuthScreen('landing'); setLandingSection('contact'); }} className="w-full py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition mt-auto">Свържете се с нас</button>
                      ) : plan.id !== 'free' && (stripeEnabled || (plan.promo && plan.trial_days)) && (
                        isActivePlan ? (
                          <button className="w-full py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 cursor-default mt-auto">Текущ план</button>
                        ) : (
                          <button onClick={() => handleSubscribe(plan.id)} disabled={billingLoading !== null} className={'w-full py-2 rounded-xl text-sm font-medium transition mt-auto ' + (plan.id === 'business' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50' : plan.id === 'corporate' ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-200 disabled:opacity-50' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50')}>
                            {billingLoading === plan.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : subscription?.status === 'active' ? 'Преминете' : 'Абонирай се'}
                          </button>
                        )
                      )}
                      {plan.id !== 'free' && !plan.contact_us && !stripeEnabled && !(plan.promo && plan.trial_days) && (
                        <div className="text-center text-xs text-gray-400 py-2 mt-auto">Плащанията ще бъдат активирани скоро</div>
                      )}
                      {plan.id === 'free' && !isActivePlan && (
                        <button className="w-full py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 cursor-default mt-auto">Безплатен</button>
                      )}
                      {plan.id === 'free' && isActivePlan && (
                        <button className="w-full py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 cursor-default mt-auto">Текущ план</button>
                      )}
                    </div>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-gray-400 mt-4">Всички цени са без ДДС (20%)</p>
              </>
            )}

            {/* Payments sub-tab */}
            {billingTab === 'payments' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm text-gray-700">История на плащанията</h3>
                  <button onClick={loadPayments} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Обнови</button>
                </div>
                {billingPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Няма плащания</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-gray-500">
                          <th className="pb-2 pr-3">Дата</th>
                          <th className="pb-2 pr-3">Номер</th>
                          <th className="pb-2 pr-3">Сума без ДДС</th>
                          <th className="pb-2 pr-3">ДДС</th>
                          <th className="pb-2 pr-3">Общо</th>
                          <th className="pb-2 pr-3">Статус</th>
                          <th className="pb-2">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingPayments.map(p => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 pr-3 text-xs">{new Date(p.created * 1000).toLocaleDateString('bg-BG')}</td>
                            <td className="py-2 pr-3 text-xs font-mono">{p.number || '-'}</td>
                            <td className="py-2 pr-3 text-xs">{(p.subtotal / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                            <td className="py-2 pr-3 text-xs">{(p.tax / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                            <td className="py-2 pr-3 text-xs font-medium">{(p.total / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                            <td className="py-2 pr-3">
                              <span className={'text-xs px-2 py-0.5 rounded-full ' + (p.status === 'paid' ? 'bg-green-100 text-green-700' : p.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700')}>{p.status === 'paid' ? 'Платена' : p.status === 'open' ? 'Очаква плащане' : p.status}</span>
                            </td>
                            <td className="py-2 text-xs">
                              <div className="flex gap-1">
                                {p.hosted_invoice_url && <a href={p.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800"><ExternalLink className="w-3.5 h-3.5" /></a>}
                                {p.invoice_pdf && <a href={p.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800"><Download className="w-3.5 h-3.5" /></a>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Invoices sub-tab */}
            {billingTab === 'invoices' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm text-gray-700">Фактури от MegaBanx</h3>
                  <button onClick={loadPayments} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Обнови</button>
                </div>
                {billingPayments.filter(p => p.status === 'paid').length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Няма издадени фактури</div>
                ) : (
                  <div className="space-y-3">
                    {billingPayments.filter(p => p.status === 'paid').map(p => (
                      <div key={p.id} className="rounded-lg p-3 hover:bg-gray-50 transition shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{p.number || 'Фактура'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(p.created * 1000).toLocaleDateString('bg-BG')}
                              {' · '}Период: {new Date(p.period_start * 1000).toLocaleDateString('bg-BG')} - {new Date(p.period_end * 1000).toLocaleDateString('bg-BG')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm">{(p.total / 100).toFixed(2)} {p.currency.toUpperCase()}</div>
                            <div className="text-xs text-gray-400">с ДДС {(p.tax / 100).toFixed(2)} {p.currency.toUpperCase()}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {p.invoice_pdf && (
                            <a href={p.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1">
                              <Download className="w-3 h-3" /> Изтегли PDF
                            </a>
                          )}
                          {p.hosted_invoice_url && (
                            <a href={p.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Виж онлайн
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VAT Confirmation Modal */}
            {vatConfirmPlan && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setVatConfirmPlan(null)}>
                <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Потвърждение на абонамент</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">План:</span><span className="font-medium">{vatConfirmPlan.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Цена без ДДС:</span><span>{vatConfirmPlan.price.toFixed(2)} EUR/{vatConfirmPlan.interval === 'month' ? 'мес' : 'год'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">ДДС (20%):</span><span>{(vatConfirmPlan.price * 0.2).toFixed(2)} EUR</span></div>
                    <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Общо за плащане:</span><span className="text-indigo-600">{(vatConfirmPlan.price * 1.2).toFixed(2)} EUR/{vatConfirmPlan.interval === 'month' ? 'мес' : 'год'}</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setVatConfirmPlan(null)} className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Отказ</button>
                    <button onClick={() => { const planId = vatConfirmPlan.id; setVatConfirmPlan(null); setBillingLoading(planId); clearMsg(); createCheckout(planId).then(r => { if (r.checkout_url) window.location.href = r.checkout_url; }).catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Error'); }).finally(() => setBillingLoading(null)); }} className="flex-1 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                      {billingLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Продължи към плащане'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Verification Modal - Choose Method */}
      {verificationModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {}}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Верификация на фирма</h3>
                <p className="text-sm text-gray-500">{verificationModal.companyName} (ЕИК: {verificationModal.eik})</p>
              </div>
            </div>

            {/* Method Selection */}
            {idCardVerifyMode === 'choose' && (
              <>
                <p className="text-sm text-gray-600 mb-4">Изберете метод за верификация на собствеността:</p>
                <div className="space-y-3 mb-4">
                  {bankDetails?.iban && (<>
                  <button onClick={() => setIdCardVerifyMode('bank')} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition text-left">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0"><Banknote className="w-5 h-5 text-amber-600" /></div>
                    <div><div className="font-semibold text-gray-900">Банков превод</div><div className="text-xs text-gray-500">Преведете {bankDetails?.amount || '1.00'} {bankDetails?.currency || 'EUR'} от фирмената сметка. Сумата се кредитира.</div></div>
                  </button>
                  <div className="text-center text-xs text-gray-400 font-medium">или</div>
                  </>)}
                  <button onClick={() => {
                    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    if (isMobile) {
                      setIdCardVerifyMode('idcard');
                    } else {
                      setIdCardVerifyMode('qr');
                      // Create QR session
                      if (activeProfile && verificationModal.verificationId) {
                        createQrSession(activeProfile.id, verificationModal.verificationId).then((res: Record<string, unknown>) => {
                          setQrToken(res.token as string);
                          setQrPolling(true);
                        }).catch(() => setIdCardVerifyMode('idcard'));
                      }
                    }
                  }} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition text-left">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5 text-green-600" /></div>
                    <div><div className="font-semibold text-gray-900">Лична карта + Селфи</div><div className="text-xs text-gray-500">Снимка на ЛК на управителя + селфи. Автоматично одобрение при съвпадение с ТР.</div></div>
                  </button>
                </div>
                <button onClick={() => setVerificationModal(null)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">Затвори</button>
              </>
            )}

            {/* Bank Transfer Method */}
            {idCardVerifyMode === 'bank' && (
              <>
                <button onClick={() => setIdCardVerifyMode('choose')} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-3"><ChevronLeft className="w-4 h-4" /> Назад</button>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Направете банков превод на стойност <strong>{bankDetails?.amount || '1.00'} {bankDetails?.currency || 'EUR'}</strong> с посоченото основание.
                      Тази сума ще бъде кредитирана по сметката Ви и <strong>не се губи</strong>.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 border rounded-xl p-4 mb-4">
                  <div className="text-center mb-3">
                    <p className="text-xs text-gray-500 mb-1">Основание за превод (код за верификация)</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-bold text-indigo-700 tracking-wider">{verificationModal.code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(verificationModal.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Копирай кода">
                        {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3 space-y-1.5 text-sm text-gray-600">
                    {bankDetails?.iban && <div className="flex justify-between"><span className="text-gray-500">IBAN:</span><span className="font-medium font-mono">{bankDetails.iban}</span></div>}
                    {bankDetails?.recipient && <div className="flex justify-between"><span className="text-gray-500">Получател:</span><span className="font-medium">{bankDetails.recipient}</span></div>}
                    {bankDetails?.bank && <div className="flex justify-between"><span className="text-gray-500">Банка:</span><span className="font-medium">{bankDetails.bank}</span></div>}
                    {bankDetails?.bic && <div className="flex justify-between"><span className="text-gray-500">BIC:</span><span className="font-medium font-mono">{bankDetails.bic}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Сума:</span><span className="font-medium">{bankDetails?.amount || '1.00'} {bankDetails?.currency || 'EUR'}</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">След извършване на превода, заявката ще бъде прегледана от администратор.</p>
                  </div>
                </div>
                <button onClick={() => setVerificationModal(null)} className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition">Разбрах</button>
              </>
            )}

            {/* QR Code Method (Desktop) */}
            {idCardVerifyMode === 'qr' && (
              <>
                <button onClick={() => { setIdCardVerifyMode('choose'); setQrPolling(false); setQrToken(null); }} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-3"><ChevronLeft className="w-4 h-4" /> Назад</button>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-800">
                      <p className="font-semibold mb-1">Верификация от телефон</p>
                      <p>Сканирайте QR кода с камерата на телефона си. Ще се отвори страница, където трябва да:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5 text-xs">
                        <li>Снимате <strong>личната карта</strong> на управителя (предна страна)</li>
                        <li>Направите <strong>селфи</strong> (снимката трябва да е направена в момента)</li>
                      </ol>
                      <p className="mt-1 text-xs">При съвпадение на името с данните от ТР, фирмата се одобрява <strong>автоматично</strong>.</p>
                    </div>
                  </div>
                </div>

                {qrToken ? (
                  <div className="flex flex-col items-center mb-4">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm mb-3">
                      <img src={qrCodeImageUrl(qrToken)} alt="QR код за верификация" className="w-56 h-56" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Очакване на верификация от телефон...</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Не затваряйте този прозорец. Резултатът ще се покаже автоматично.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center mb-4 py-8">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                    <p className="text-sm text-gray-500">Генериране на QR код...</p>
                  </div>
                )}

                <button onClick={() => { setIdCardVerifyMode('choose'); setQrPolling(false); setQrToken(null); }} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">Затвори</button>
              </>
            )}

            {/* ID Card + Selfie Method */}
            {idCardVerifyMode === 'idcard' && (
              <>
                <button onClick={() => setIdCardVerifyMode('choose')} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-3"><ChevronLeft className="w-4 h-4" /> Назад</button>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">
                      Качете снимка на <strong>лична карта</strong> на управителя/представляващия и <strong>селфи</strong>.
                      При съвпадение на името с данните от Търговския регистър, фирмата се одобрява <strong>автоматично</strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Снимка на лична карта (предна страна)</label>
                    <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition">
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setIdCardFile(e.target.files[0]); }} />
                      {idCardFile ? (
                        <div className="flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">{idCardFile.name}</span></div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500"><Camera className="w-5 h-5" /><span className="text-sm">Натиснете за снимка или изберете файл</span></div>
                      )}
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Селфи на управителя</label>
                    <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition">
                      <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSelfieFile(e.target.files[0]); }} />
                      {selfieFile ? (
                        <div className="flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">{selfieFile.name}</span></div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500"><Camera className="w-5 h-5" /><span className="text-sm">Натиснете за селфи или изберете файл</span></div>
                      )}
                    </label>
                  </div>
                </div>

                {idCardVerifying && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700">Обработка... AI анализира личната карта и сравнява с данните от Търговския регистър.</span>
                  </div>
                )}

                <button
                  disabled={!idCardFile || !selfieFile || idCardVerifying}
                  onClick={async () => {
                    if (!activeProfile || !idCardFile || !selfieFile || !verificationModal.verificationId) return;
                    setIdCardVerifying(true);
                    try {
                      const result = await verifyWithIdCard(activeProfile.id, verificationModal.verificationId, idCardFile, selfieFile);
                      setVerificationModal(null);
                      setIdCardVerifying(false);
                      if (result.status === 'auto_approved') {
                        setAutoVerifiedModal({ show: true, message: result.message as string, companyName: verificationModal.companyName });
                        loadProfileData(activeProfile.id);
                      } else {
                        ok(result.message as string || 'Заявката е изпратена за преглед от администратор.');
                        loadProfileData(activeProfile.id);
                      }
                    } catch (err: unknown) {
                      setIdCardVerifying(false);
                      setError(err instanceof Error ? err.message : 'Грешка при верификация');
                    }
                  }}
                  className="w-full py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {idCardVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  {idCardVerifying ? 'Обработка...' : 'Изпрати за верификация'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Auto-Verified Modal */}
      {autoVerifiedModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Фирмата е добавена!</h3>
                <p className="text-sm text-gray-500">{autoVerifiedModal.companyName}</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{autoVerifiedModal.message}</p>
              </div>
            </div>

            <button
              onClick={() => setAutoVerifiedModal(null)}
              className="w-full py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Invoice Processing Results Modal */}
      {processResultsModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Резултати от обработка</h3>
                <p className="text-sm text-gray-500">{processResultsModal.message}</p>
              </div>
            </div>

            {(() => {
              const results = processResultsModal.results || [];
              const approved = results.filter(r => r.status === 'processed' || r.status === 'approved');
              const failed = results.filter(r => r.status === 'error' || r.status === 'unmatched');
              const duplicates = results.filter(r => r.status === 'duplicate_pending');
              const crossCopies = processResultsModal.cross_copies || [];
              return (
                <>
                  {/* Summary stats */}
                  <div className={'grid gap-3 mb-4 ' + (duplicates.length > 0 ? 'grid-cols-4' : 'grid-cols-3')}>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-800">{results.length}</div>
                      <div className="text-xs text-gray-500">Общо</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{approved.length}</div>
                      <div className="text-xs text-green-600">Обработени</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{failed.length}</div>
                      <div className="text-xs text-red-600">Грешки</div>
                    </div>
                    {duplicates.length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600">{duplicates.length}</div>
                        <div className="text-xs text-amber-600">Дубликати</div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {results.map((r, idx) => (
                      <div key={idx} className={'border rounded-lg p-3 ' + (r.status === 'duplicate_pending' ? 'bg-amber-50 border-amber-200' : r.status === 'error' || r.status === 'unmatched' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200')}>
                        <div className="flex items-start gap-2">
                          {r.status === 'duplicate_pending' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : r.status === 'error' || r.status === 'unmatched' ? (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{r.original_filename}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {r.new_filename && r.new_filename !== r.original_filename && <span>{r.new_filename}</span>}
                              {r.company_name && <span className="ml-2 text-indigo-600">{r.company_name}</span>}
                              {r.invoice_number && <span className="ml-2">#{r.invoice_number}</span>}
                            </div>
                            {r.error_message && <div className="text-xs text-red-600 mt-1">{r.error_message}</div>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {crossCopies.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><ArrowLeftRight className="w-4 h-4" /> Крос-копия</h4>
                        {crossCopies.map((cc, idx) => (
                          <div key={idx} className="border border-blue-200 bg-blue-50 rounded-lg p-2 mb-1">
                            <div className="text-xs text-blue-800">
                              <span className="font-medium">{cc.filename}</span>
                              <span className="mx-1">&rarr;</span>
                              <span>{cc.target_company}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <button
              onClick={() => setProcessResultsModal(null)}
              className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Resolution Dialog - 3 choices per duplicate */}
      {duplicateModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Открити дублиращи се фактури</h3>
                <p className="text-sm text-gray-500">
                  {duplicateModal.duplicates.length === 1 ? 'Открита е 1 дублираща се фактура' : `Открити са ${duplicateModal.duplicates.length} дублиращи се фактури`}. Моля, изберете какво да направим.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {duplicateModal.duplicates.map((dup: Record<string, unknown>, idx: number) => {
                const dupId = dup.id as string;
                const invNum = (dup.invoice_number as string) || '';
                const companyName = (dup.company_name as string) || '';
                const currentAction = duplicateActions[dupId] || 'keep_existing';

                return (
                  <div key={idx} className="border-2 border-amber-200 rounded-xl p-4 bg-amber-50/50">
                    <div className="flex items-start gap-2 mb-3">
                      <Copy className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Фактура #{invNum} — {companyName}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {(dup.error_message as string) || `Дублирана фактура за ${companyName}`}
                        </div>
                      </div>
                    </div>

                    {/* 3 action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setDuplicateActions(prev => ({ ...prev, [dupId]: 'keep_existing' }))}
                        className={'px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all flex items-center gap-1.5 ' +
                          (currentAction === 'keep_existing'
                            ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50')}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Запази текущата
                      </button>
                      <button
                        onClick={() => setDuplicateActions(prev => ({ ...prev, [dupId]: 'replace' }))}
                        className={'px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all flex items-center gap-1.5 ' +
                          (currentAction === 'replace'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50')}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Замени с новата
                      </button>
                      <button
                        onClick={() => setDuplicateActions(prev => ({ ...prev, [dupId]: 'keep_both' }))}
                        className={'px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all flex items-center gap-1.5 ' +
                          (currentAction === 'keep_both'
                            ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50')}
                      >
                        <Copy className="w-3.5 h-3.5" /> Запази и двете
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setDuplicateModal(null); setDuplicateActions({}); }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
                disabled={duplicateResolving}
              >
                Отказ
              </button>
              <button
                onClick={handleResolveDuplicates}
                disabled={duplicateResolving}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {duplicateResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Потвърди
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Dialog Modal */}
      {sharingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Share2 className="w-5 h-5 text-green-600" /> Споделяне на &quot;{sharingCompany.name}&quot;</h3>
              <button onClick={() => setSharingCompany(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Add new share */}
                        <div className="rounded-lg p-4 mb-4 bg-gray-50 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><UserPlus className="w-4 h-4" /> Добави сътрудник</h4>
              <div className="flex gap-2 mb-2">
                <input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleShareCompany()} placeholder="Имейл на сътрудника" className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <button onClick={handleShareCompany} disabled={shareLoading || !shareEmail.trim()} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                  {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Сподели
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <button onClick={() => setShareCanUpload(!shareCanUpload)} className="flex items-center">
                  {shareCanUpload ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                Право на качване на фактури
              </label>
            </div>

            {/* Existing shares */}
            {companyShares.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Споделена с ({companyShares.length})</h4>
                <div className="space-y-2">
                  {companyShares.map(s => (
                    <div key={s.id} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{s.shared_with_email}</div>
                          <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('bg-BG')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            <div className="text-[10px] font-semibold text-gray-500 mb-0.5">Право за Качване на Ф-ри</div>
                            <div className="flex items-center gap-1.5">
                              <span className={'text-[10px] font-bold ' + (!s.can_upload ? 'text-gray-700' : 'text-gray-400')}>OFF</span>
                              <button onClick={() => handleToggleUpload(s)} className={'relative inline-flex items-center h-5 rounded-full w-10 transition-colors duration-200 focus:outline-none ' + (s.can_upload ? 'bg-green-500' : 'bg-gray-300')}>
                                <span className={'inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform duration-200 ' + (s.can_upload ? 'translate-x-5' : 'translate-x-0.5')} />
                              </button>
                              <span className={'text-[10px] font-bold ' + (s.can_upload ? 'text-green-600' : 'text-gray-400')}>ON</span>
                            </div>
                          </div>
                          <button onClick={() => handleRevokeShare(s.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Прекрати споделянето"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Фирмата не е споделена с никого.</p>
            )}
          </div>
        </div>
      )}
      {/* ── Invoicing Toast ── */}
      {invToast && (
        <div className={'fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-lg text-white text-sm ' + (invToastType === 'error' ? 'bg-red-600' : 'bg-emerald-600')}>{invToast}</div>
      )}

      {/* ── Clients Modal ── */}
      {invModal === 'clients' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Клиенти</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setInvEditClient(null); setInvClientForm({ name: '', eik: '', vat_number: '', mol: '', city: '', address: '', email: '', phone: '' }); setInvModal('clientForm'); }} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Нов клиент</button>
                <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-3 border-b">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Търсене по име или ЕИК..." value={invClientsSearch} onChange={e => { setInvClientsSearch(e.target.value); invListClients(invCompanyId, invProfileId, e.target.value).then(setInvClients).catch(() => {}); }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {invClients.length === 0 ? (
                <p className="text-center text-gray-400 py-8">{invClientsSearch ? 'Няма намерени клиенти' : 'Няма добавени клиенти'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="pb-2">Име</th><th className="pb-2">ЕИК</th><th className="pb-2">ДДС №</th><th className="pb-2">МОЛ</th><th className="pb-2">Град</th><th className="pb-2 text-right">Действия</th></tr></thead>
                  <tbody>
                    {invClients.map(c => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2 text-gray-500 font-mono text-xs">{c.eik || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{c.vat_number || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{c.mol || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{c.city || '—'}</td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setInvEditClient(c); setInvClientForm({ name: c.name || '', eik: c.eik || '', vat_number: c.vat_number || '', mol: c.mol || '', city: c.city || '', address: c.address || '', email: c.email || '', phone: c.phone || '', is_vat_registered: c.is_vat_registered ? 'true' : 'false', is_individual: c.is_individual ? 'true' : 'false' }); setInvModal('clientForm'); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Редактирай"><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (!confirm('Изтриване на клиент ' + c.name + '?')) return; try { await invDeleteClient(c.id, invCompanyId, invProfileId); invToastShow('Клиентът е изтрит'); const list = await invListClients(invCompanyId, invProfileId); setInvClients(list); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Изтрий"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Client Form Modal ── */}
      {invModal === 'clientForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal('clients')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{invEditClient ? 'Редактирай клиент' : 'Нов клиент'}</h2>
              <button onClick={() => setInvModal('clients')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 mb-1"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invClientForm.is_individual === 'true'} onChange={e => setInvClientForm(p => ({ ...p, is_individual: e.target.checked ? 'true' : 'false' }))} /> Физическо лице</label></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Наименование *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.name || ''} onChange={e => setInvClientForm(p => ({ ...p, name: e.target.value }))} placeholder="Име на фирмата или лицето" /></div>
              <div className="flex items-center gap-2">
                <div className="flex-1"><label className="block text-xs font-medium text-gray-600 mb-1">ЕИК</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.eik || ''} onChange={e => setInvClientForm(p => ({ ...p, eik: e.target.value }))} placeholder="000000000" /></div>
                <button onClick={async () => { if (!invClientForm.eik) { invToastShow('Въведете ЕИК', 'error'); return; } try { const r = await invRegistryLookup(invClientForm.eik); if (r.name) setInvClientForm(p => ({ ...p, name: r.name || p.name, address: r.address || p.address, city: r.city || p.city, mol: r.mol || p.mol, vat_number: r.vat_number || p.vat_number, is_vat_registered: r.is_vat_registered ? 'true' : 'false' })); invToastShow('Данните са заредени от ТР'); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="mt-5 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap"><Search className="w-3.5 h-3.5" /> Търсене в ТР</button>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">ДДС номер</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.vat_number || ''} onChange={e => setInvClientForm(p => ({ ...p, vat_number: e.target.value }))} placeholder="BG000000000" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">МОЛ</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.mol || ''} onChange={e => setInvClientForm(p => ({ ...p, mol: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Град</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.city || ''} onChange={e => setInvClientForm(p => ({ ...p, city: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Адрес</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.address || ''} onChange={e => setInvClientForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.email || ''} onChange={e => setInvClientForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.phone || ''} onChange={e => setInvClientForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Имейл адреси за уведомления</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.notify_emails || ''} onChange={e => setInvClientForm(p => ({ ...p, notify_emails: e.target.value }))} placeholder="email1@example.com, email2@example.com" /><p className="text-xs text-gray-400 mt-0.5">Изпращай уведомления на тези адреси (разделени със запетая)</p></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invClientForm.is_vat_registered === 'true'} onChange={e => setInvClientForm(p => ({ ...p, is_vat_registered: e.target.checked ? 'true' : 'false' }))} /> Регистриран по ДДС</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInvModal('clients')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
                <button onClick={async () => {
                  if (!invClientForm.name) { invToastShow('Въведете име', 'error'); return; }
                  const data = { ...invClientForm, company_id: invCompanyId, profile_id: invProfileId, is_vat_registered: invClientForm.is_vat_registered === 'true', is_individual: invClientForm.is_individual === 'true' };
                  try {
                    if (invEditClient) { await invUpdateClient(invEditClient.id, data, invCompanyId, invProfileId); invToastShow('Клиентът е обновен'); }
                    else { await invCreateClient(data); invToastShow('Клиентът е създаден'); }
                    const list = await invListClients(invCompanyId, invProfileId); setInvClients(list); setInvModal('clients');
                  } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{invEditClient ? 'Запази' : 'Създай'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Items Modal ── */}
      {invModal === 'items' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-purple-600" /> Артикули</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setInvEditItem(null); setInvItemForm({ name: '', unit: 'бр.', default_price: '0.00', vat_rate: '20.00', description: '' }); setInvModal('itemForm'); }} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Нов артикул</button>
                <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-3 border-b">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Търсене по име..." value={invItemsSearch} onChange={e => { setInvItemsSearch(e.target.value); invListItems(invCompanyId, invProfileId, e.target.value).then(setInvItems).catch(() => {}); }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {invItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">{invItemsSearch ? 'Няма намерени артикули' : 'Няма добавени артикули'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="pb-2">Име</th><th className="pb-2">Мярка</th><th className="pb-2 text-right">Цена</th><th className="pb-2 text-right">ДДС %</th><th className="pb-2">Описание</th><th className="pb-2 text-right">Действия</th></tr></thead>
                  <tbody>
                    {invItems.map(it => (
                      <tr key={it.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 font-medium">{it.name}</td>
                        <td className="py-2 text-gray-500">{it.unit}</td>
                        <td className="py-2 text-right font-mono text-xs">{Number(it.default_price).toFixed(2)} EUR</td>
                        <td className="py-2 text-right text-gray-500">{Number(it.vat_rate)}%</td>
                        <td className="py-2 text-gray-400 truncate max-w-[200px]">{it.description || '—'}</td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setInvEditItem(it); setInvItemForm({ name: it.name, unit: it.unit, default_price: Number(it.default_price).toFixed(2), vat_rate: Number(it.vat_rate).toFixed(2), description: it.description || '' }); setInvModal('itemForm'); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Редактирай"><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (!confirm('Изтриване на артикул ' + it.name + '?')) return; try { await invDeleteItem(it.id, invCompanyId, invProfileId); invToastShow('Артикулът е изтрит'); const list = await invListItems(invCompanyId, invProfileId); setInvItems(list); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Изтрий"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Item Form Modal ── */}
      {invModal === 'itemForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal('items')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{invEditItem ? 'Редактирай артикул' : 'Нов артикул'}</h2>
              <button onClick={() => setInvModal('items')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Име *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={invItemForm.name || ''} onChange={e => setInvItemForm(p => ({ ...p, name: e.target.value }))} placeholder="Консултантска услуга" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Мярка</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={invItemForm.unit || ''} onChange={e => setInvItemForm(p => ({ ...p, unit: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Цена</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" type="number" step="0.01" value={invItemForm.default_price || ''} onChange={e => setInvItemForm(p => ({ ...p, default_price: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">ДДС %</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" type="number" step="0.01" value={invItemForm.vat_rate || ''} onChange={e => setInvItemForm(p => ({ ...p, vat_rate: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Баркод</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={invItemForm.barcode || ''} onChange={e => setInvItemForm(p => ({ ...p, barcode: e.target.value }))} placeholder="Баркод на артикула (незадължително)" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Описание</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" rows={2} value={invItemForm.description || ''} onChange={e => setInvItemForm(p => ({ ...p, description: e.target.value }))} placeholder="Опционално описание" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInvModal('items')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
                <button onClick={async () => {
                  if (!invItemForm.name) { invToastShow('Въведете име', 'error'); return; }
                  const vals = { name: invItemForm.name, unit: invItemForm.unit || 'бр.', default_price: parseFloat(invItemForm.default_price) || 0, vat_rate: parseFloat(invItemForm.vat_rate) || 20, description: invItemForm.description || '', company_id: invCompanyId, profile_id: invProfileId };
                  try {
                    if (invEditItem) { await invUpdateItem(invEditItem.id, vals, invCompanyId, invProfileId); invToastShow('Артикулът е обновен'); }
                    else { await invCreateItem(vals); invToastShow('Артикулът е създаден'); }
                    const list = await invListItems(invCompanyId, invProfileId); setInvItems(list); setInvModal('items');
                  } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{invEditItem ? 'Запази' : 'Създай'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {invModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><RefreshCw className="w-5 h-5 text-gray-600" /> Настройки за фактуриране</h2>
              <span className="text-xs text-gray-400">Настройки за синхронизация</span>
              <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Банкови данни</h3>
                <div className="space-y-2">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">ДДС % по подразбиране</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.default_vat_rate || '20'} onChange={e => setInvSettingsForm(p => ({ ...p, default_vat_rate: e.target.value }))}>
                      <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                    </select>
                  </div><div><label className="block text-xs font-medium text-gray-600 mb-1">Режим на цените:</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.price_mode || 'without_vat'} onChange={e => setInvSettingsForm(p => ({ ...p, price_mode: e.target.value }))}>
                      <option value="without_vat">Цена без ДДС</option><option value="with_vat">Цена с ДДС</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">IBAN</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.iban || ''} onChange={e => setInvSettingsForm(p => ({ ...p, iban: e.target.value }))} placeholder="BG00XXXX00000000000000" /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Име на банката</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.bank_name || ''} onChange={e => setInvSettingsForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="Банка ООД" /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">BIC код</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.bic || ''} onChange={e => setInvSettingsForm(p => ({ ...p, bic: e.target.value }))} placeholder="XXXXBGSF" /></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">ДДС по подразбиране</h3>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.default_vat_rate || '20'} onChange={e => setInvSettingsForm(p => ({ ...p, default_vat_rate: e.target.value }))}>
                  <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                </select>
              </div>
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Кочани (серии номера)</h3>
                <p className="text-xs text-gray-500 mb-2">Управлявайте кочаните за фактури с 10-цифрени номера.</p>
                <button onClick={() => invOpenStubs(invCompanyId, invProfileId)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Управление на кочани</button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInvModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
                <button onClick={async () => {
                  try {
                    await invUpdateCompanySettings(invCompanyId, invProfileId, { iban: invSettingsForm.iban, bank_name: invSettingsForm.bank_name, bic: invSettingsForm.bic, default_vat_rate: parseFloat(invSettingsForm.default_vat_rate) || 20 });
                    invToastShow('Настройките са запазени'); setInvModal(null);
                  } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Запази</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stubs Modal ── */}
      {invModal === 'stubs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal('settings')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Управление на кочани</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Редактирай кочан</span>
                <button onClick={() => setInvModal('settings')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">Кочаните определят диапазона от номера за фактури. Всеки кочан съдържа 10-цифрени номера.</p>
              {invStubs.length > 0 && (
                <div className="space-y-2 mb-4">
                  {invStubs.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                      <div>
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-gray-500">{String(s.start_number).padStart(10, '0')} — {String(s.end_number).padStart(10, '0')} <span className="text-gray-400">(следващият свободен №)</span></div>
                      </div>
                      <button onClick={async () => { if (!confirm('Изтриване на кочан ' + s.name + '?')) return; try { await invDeleteStub(s.id, invCompanyId, invProfileId); invToastShow('Кочанът е изтрит'); const list = await invListStubs(invCompanyId, invProfileId); setInvStubs(list); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
                            <div className="rounded-lg p-3 bg-gray-50 shadow-sm">
                              <h3 className="text-sm font-semibold mb-2">Нов кочан</h3>
                <div className="space-y-2">
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Име на кочана" value={invStubForm.name} onChange={e => setInvStubForm(p => ({ ...p, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="От номер (10 цифри)" value={invStubForm.start_number} onChange={e => setInvStubForm(p => ({ ...p, start_number: e.target.value }))} />
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="До номер (10 цифри)" value={invStubForm.end_number} onChange={e => setInvStubForm(p => ({ ...p, end_number: e.target.value }))} />
                  </div>
                  <button onClick={async () => {
                    if (!invStubForm.name || !invStubForm.start_number || !invStubForm.end_number) { invToastShow('Попълнете всички полета', 'error'); return; }
                    try {
                      await invCreateStub({ company_id: invCompanyId, profile_id: invProfileId, name: invStubForm.name, start_number: parseInt(invStubForm.start_number), end_number: parseInt(invStubForm.end_number) });
                      invToastShow('Кочанът е създаден');
                      setInvStubForm({ name: '', start_number: '', end_number: '' });
                      const list = await invListStubs(invCompanyId, invProfileId); setInvStubs(list);
                    } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                  }} className="w-full px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Създай кочан</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Form Modal ── */}
      {invModal === 'invoice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600" /> {invEditInvoiceId ? ('Редакция на ' + (invDocType === 'proforma' ? 'проформа фактура' : invDocType === 'credit_note' ? 'кредитно известие' : invDocType === 'debit_note' ? 'дебитно известие' : 'фактура')) : ('Нов' + (invDocType === 'proforma' ? 'а проформа фактура' : invDocType === 'credit_note' ? 'о кредитно известие' : invDocType === 'debit_note' ? 'о дебитно известие' : 'а фактура'))} от {invCompanyName}</h2>
              <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Document type */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Тип документ:</span>
                {[{v: 'invoice', l: 'Фактура'}, {v: 'proforma', l: 'Проформа'}, {v: 'credit_note', l: 'Кредитно известие'}, {v: 'debit_note', l: 'Дебитно известие'}].map(dt => (
                  <label key={dt.v} className="flex items-center gap-1 text-sm"><input type="radio" name="invDocType" value={dt.v} checked={invDocType === dt.v} onChange={() => { setInvDocType(dt.v); if (!invEditInvoiceId) { invGetNextNumber(invCompanyId, invProfileId, dt.v).then(nn => setInvNumber(nn.next_number ? String(nn.next_number).padStart(10, '0') : '')).catch(() => setInvNumber('')); } }} /> {dt.l}</label>
                ))}
              </div>
              {/* Number + Dates */}
              <div className={invDocType === 'proforma' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-4 gap-3'}>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Номер</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invNumber} onChange={e => setInvNumber(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Дата на издаване</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invIssueDate} onChange={e => setInvIssueDate(e.target.value)} /></div>
                {invDocType !== 'proforma' && <div><label className="block text-xs font-medium text-gray-600 mb-1">Дата на данъчно събитие</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invTaxEventDate} onChange={e => setInvTaxEventDate(e.target.value)} /></div>}
                {invDocType !== 'proforma' && <div><label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><input type="checkbox" checked={invShowDueDate} onChange={e => setInvShowDueDate(e.target.checked)} /> Падеж</label>{invShowDueDate && <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} />}</div>}
              </div>
              {/* Stub selector — hidden for proforma */}
              {invDocType !== 'proforma' && invStubs.length > 0 && (
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Кочан</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invSelectedStub} onChange={e => setInvSelectedStub(e.target.value)}>
                    <option value="">— няма кочан —</option>
                    {invStubs.map(s => <option key={s.id} value={s.id}>{s.name} ({String(s.start_number).padStart(10, '0')} — {String(s.end_number).padStart(10, '0')})</option>)}
                  </select>
                </div>
              )}
              {/* Client */}
                            <div className="rounded-lg p-3 bg-gray-50 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">Клиент</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setInvPickerSearch(''); setInvModal('clientPicker'); }} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Избери клиент</button>
                    <button onClick={() => { setInvTrEik(''); setInvTrResult(null); setInvModal('trLookup'); }} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 flex items-center gap-1"><Search className="w-3 h-3" /> ТР</button>
                  </div>
                </div>
                {invSelectedClient ? (
                  <div className="text-sm">
                    <div className="font-medium">{invSelectedClient.name}</div>
                    <div className="text-gray-500 text-xs">ЕИК: {invSelectedClient.eik || '—'} | ДДС: {invSelectedClient.vat_number || '—'} | МОЛ: {invSelectedClient.mol || '—'}</div>
                    <div className="text-gray-500 text-xs">{invSelectedClient.address || ''} {invSelectedClient.city || ''}</div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Не е избран клиент</p>
                )}
              </div>
              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Редове</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" checked={invPriceWithVat} onChange={e => setInvPriceWithVat(e.target.checked)} /> Цена с ДДС</label>
                    <button onClick={() => { if (invItems.length > 0) { invSelectItem(invItems[0], invLines.length); } }} className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 flex items-center gap-1" title="Избери от каталога"><FileText className="w-3 h-3" /> Избери от каталога</button>
                    <button onClick={invAddLine} className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Нов ред</button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 uppercase"><th className="pb-1 text-left">Описание</th><th className="pb-1 w-16 text-right">Кол.</th><th className="pb-1 w-16">Мярка</th><th className="pb-1 w-24 text-right">{invPriceWithVat ? 'Цена с ДДС' : 'Ед. цена'}</th><th className="pb-1 w-16 text-right">ДДС%</th><th className="pb-1 w-24 text-right">Сума</th><th className="pb-1 w-8"></th></tr></thead>
                  <tbody>
                    {invLines.map((line, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-1"><div className="flex items-center gap-1"><input className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" value={line.description} onChange={e => invUpdateLine(idx, 'description', e.target.value)} placeholder="Описание на услугата..." />{invItems.length > 0 && <button onClick={() => { const sel = invItems.find(it => it.name === line.description); if (!sel) { invSelectItem(invItems[0], idx); } }} className="p-1 text-purple-500 hover:text-purple-700" title="Избор на артикул"><FileText className="w-3.5 h-3.5" /></button>}</div></td>
                        <td className="py-1"><input className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" value={line.quantity} onChange={e => invUpdateLine(idx, 'quantity', e.target.value)} /></td>
                        <td className="py-1"><input className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" value={line.unit} onChange={e => invUpdateLine(idx, 'unit', e.target.value)} /></td>
                        <td className="py-1"><input className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" value={line.unit_price} onChange={e => invUpdateLine(idx, 'unit_price', e.target.value)} /></td>
                        <td className="py-1"><input className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" value={line.vat_rate} onChange={e => invUpdateLine(idx, 'vat_rate', e.target.value)} /></td>
                        <td className="py-1 text-right font-mono text-xs pr-1">{invCalcLineTotal(line).toFixed(2)}</td>
                        <td className="py-1"><button onClick={() => invRemoveLine(idx)} className="p-0.5 text-red-400 hover:text-red-600" title="Премахни ред"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totals */}
              {(() => { const t = invCalcTotals(); return (
                <div className="flex justify-end">
                  <div className="w-72 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Сума (без отстъпка):</span><span className="font-mono">{t.subtotal.toFixed(2)} EUR</span></div>
                    {t.discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Отстъпка:</span><span className="font-mono">-{t.discountAmount.toFixed(2)} EUR</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Данъчна основа:</span><span className="font-mono">{(t.subtotal - t.discountAmount).toFixed(2)} EUR</span></div>
                    {!invNoVat && <div className="flex justify-between"><span className="text-gray-500">ДДС ({invLines.length > 0 ? (parseFloat(invLines[0].vat_rate) || 20) : 20}%):</span><span className="font-mono">{t.totalVat.toFixed(2)} EUR</span></div>}
                    <div className="flex justify-between font-bold border-t pt-1"><span>Сума за плащане:</span><span className="font-mono">{t.total.toFixed(2)} EUR</span></div>
                  </div>
                </div>
              ); })()}
              {/* Discount + Payment + VAT */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Отстъпка</label>
                  <div className="flex gap-1">
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" type="number" step="0.01" value={invDiscount} onChange={e => setInvDiscount(e.target.value)} placeholder="0" />
                    <select className="border rounded-lg px-2 py-2 text-sm focus:outline-none" value={invDiscountType} onChange={e => setInvDiscountType(e.target.value)}>
                      <option value="EUR">EUR</option><option value="%">%</option>
                    </select>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Начин на плащане</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invPaymentMethod} onChange={e => setInvPaymentMethod(e.target.value)}>
                    <option value="">—</option><option value="bank_transfer">Банков превод</option><option value="cash">В брой</option><option value="card">С карта</option><option value="cod">Наложен платеж</option><option value="payment_order">Платежно нареждане</option><option value="money_transfer">Паричен превод</option><option value="postal_transfer">Пощенски паричен превод</option><option value="offset">С насрещно прихващане</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1"><input type="checkbox" checked={invNoVat} onChange={e => setInvNoVat(e.target.checked)} /> Не начислявай ДДС по тази фактура</label>
                  {invNoVat && <select className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none" value={invNoVatReason} onChange={e => setInvNoVatReason(e.target.value)}>
                    <option value="">Изберете или въведете основание...</option><option value="чл. 113, ал. 9 от ЗДДС — Нерегистрирано по ЗДДС лице">чл. 113, ал. 9 от ЗДДС — Нерегистрирано по ЗДДС лице</option><option value="чл. 7 от ЗДДС — ВОД">чл. 7 от ЗДДС — ВОД</option><option value="чл. 21, ал. 2 от ЗДДС — Място на изпълнение извън България">чл. 21, ал. 2 от ЗДДС — Място на изпълнение извън България</option><option value="чл. 28 от ЗДДС — Доставка свързана с международен транспорт">чл. 28 от ЗДДС — Доставка свързана с международен транспорт</option><option value="чл. 41 от ЗДДС — Освободена доставка">чл. 41 от ЗДДС — Освободена доставка</option><option value="other">Друга</option>
                  </select>}
                  {invNoVat && invNoVatReason === 'other' && <input className="w-full mt-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none" placeholder="Причина..." value={invNoVatReasonCustom} onChange={e => setInvNoVatReasonCustom(e.target.value)} />}
                </div>
              </div>
              {/* Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Бележки (за клиента)</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} value={invNotes} onChange={e => setInvNotes(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Вътрешни бележки</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} value={invInternalNotes} onChange={e => setInvInternalNotes(e.target.value)} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Съставил</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={invComposedBy} onChange={e => setInvComposedBy(e.target.value)} /></div>
              {/* Sync settings */}
                            <div className="rounded-lg p-3 bg-gray-50 shadow-sm">
                              <span className="text-sm font-semibold text-gray-700">Синхронизация</span>
                <div className="flex items-center gap-4 mt-2">
                  {[{v: 'manual', l: 'Ръчно'}, {v: 'auto', l: 'Автоматично'}, {v: 'delayed', l: 'С отложение'}].map(m => (
                    <label key={m.v} className="flex items-center gap-1 text-sm"><input type="radio" name="invSync" value={m.v} checked={invSyncMode === m.v} onChange={() => setInvSyncMode(m.v)} /> {m.l}</label>
                  ))}
                  {invSyncMode === 'delayed' && <input className="w-20 border rounded px-2 py-1 text-sm" type="number" value={invDelayMinutes} onChange={e => setInvDelayMinutes(e.target.value)} />}
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setInvModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
              <button onClick={() => invSaveInvoice('draft')} disabled={invSaving} className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">{invSaving ? 'Запазване...' : (invEditInvoiceId ? 'Запази като чернова' : 'Създай чернова')}</button>
              <button onClick={() => invSaveInvoice('issued')} disabled={invSaving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{invSaving ? 'Запазване...' : (invEditInvoiceId ? 'Обнови фактурата' : 'Създай фактурата')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Client Picker Modal ── */}
      {invModal === 'clientPicker' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setInvModal('invoice')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-semibold">Избери клиент</h2>
              <button onClick={() => setInvModal('invoice')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 border-b">
              <input className="w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Търсене..." value={invPickerSearch} onChange={e => { setInvPickerSearch(e.target.value); invListClients(invCompanyId, invProfileId, e.target.value).then(setInvClients).catch(() => {}); }} />
            </div>
            <div className="flex-1 overflow-y-auto">
              {invClients.map(c => (
                <button key={c.id} onClick={() => { setInvSelectedClient(c); setInvModal('invoice'); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">ЕИК: {c.eik || '—'} | {c.city || ''}</div>
                </button>
              ))}
              {invClients.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">Няма клиенти</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── TR Lookup Modal ── */}
      {invModal === 'trLookup' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setInvModal('invoice')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-indigo-600" /> Търговски регистър</h2>
              <button onClick={() => setInvModal('invoice')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Въведете ЕИК..." value={invTrEik} onChange={e => setInvTrEik(e.target.value)} />
                <button onClick={async () => {
                  if (!invTrEik) return;
                  setInvTrLoading(true); setInvTrResult(null);
                  try { const r = await invRegistryLookup(invTrEik); setInvTrResult(r); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                  finally { setInvTrLoading(false); }
                }} disabled={invTrLoading} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">{invTrLoading ? 'Търсене...' : 'Търси'}</button>
              </div>
              {invTrResult && (
                <div className="rounded-lg p-3 bg-gray-50 shadow-sm text-sm space-y-1">
                  <div><span className="text-gray-500">Име:</span> <strong>{invTrResult.name}</strong></div>
                  <div><span className="text-gray-500">ЕИК:</span> {invTrResult.eik}</div>
                  {invTrResult.vat_number && <div><span className="text-gray-500">ДДС:</span> {invTrResult.vat_number}</div>}
                  {invTrResult.address && <div><span className="text-gray-500">Адрес:</span> {invTrResult.address}</div>}
                  {invTrResult.city && <div><span className="text-gray-500">Град:</span> {invTrResult.city}</div>}
                  {invTrResult.mol && <div><span className="text-gray-500">МОЛ:</span> {invTrResult.mol}</div>}
                  <button onClick={async () => {
                    const data = { name: invTrResult!.name, eik: invTrResult!.eik, vat_number: invTrResult!.vat_number || '', address: invTrResult!.address || '', city: invTrResult!.city || '', mol: invTrResult!.mol || '', is_vat_registered: !!invTrResult!.vat_number, company_id: invCompanyId, profile_id: invProfileId };
                    try {
                      const created = await invCreateClient(data);
                      invToastShow('Клиентът е добавен');
                      setInvSelectedClient(created);
                      setInvModal('invoice');
                      invListClients(invCompanyId, invProfileId).then(setInvClients).catch(() => {});
                    } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                  }} className="mt-2 w-full px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Добави като клиент</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
