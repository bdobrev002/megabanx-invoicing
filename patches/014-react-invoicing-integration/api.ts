const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: Record<string, unknown>) => d.msg || d.message || JSON.stringify(d)).join('; ') : 'Request failed';
    throw new Error(msg || 'Request failed');
  }
  return res.json();
}

// Auth
export const authRegister = (name: string, email: string, tos_accepted: boolean = false) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, tos_accepted }) });
export const authLogin = (email: string, tos_accepted: boolean = false, name: string = '') =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, tos_accepted, name }) });
export const authVerify = (email: string, code: string) =>
  request('/api/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
export const authMe = () => request('/api/auth/me');
export const authLogout = () => request('/api/auth/logout', { method: 'POST' });

// Profiles
export const getProfiles = () => request('/api/profiles');
export const createProfile = (name: string) =>
  request('/api/profiles', { method: 'POST', body: JSON.stringify({ name }) });
export const updateProfile = (profileId: string, name: string) =>
  request(`/api/profiles/${profileId}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deleteProfile = (profileId: string) =>
  request(`/api/profiles/${profileId}`, { method: 'DELETE' });

// Companies (profile-scoped)
export const getCompanies = (profileId: string) =>
  request(`/api/profiles/${profileId}/companies`);
export const createCompany = (profileId: string, data: Record<string, unknown>) =>
  request(`/api/profiles/${profileId}/companies`, { method: 'POST', body: JSON.stringify(data) });
export const updateCompany = (profileId: string, companyId: string, data: Record<string, unknown>) =>
  request(`/api/profiles/${profileId}/companies/${companyId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCompany = (profileId: string, companyId: string) =>
  request(`/api/profiles/${profileId}/companies/${companyId}`, { method: 'DELETE' });

// EIK Lookup
export const lookupEik = (eik: string) => request(`/api/lookup-eik/${eik}`);

// Upload & Process
export const uploadFiles = async (
  profileId: string,
  files: FileList | File[],
  onProgress?: (pct: number) => void,
) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/profiles/${profileId}/upload`);
    xhr.withCredentials = true;
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve({}); }
      } else {
        try { const err = JSON.parse(xhr.responseText); reject(new Error(err.detail || 'Upload failed')); }
        catch { reject(new Error('Upload failed')); }
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });
};

export const processInvoices = (profileId: string) =>
  request(`/api/profiles/${profileId}/process`, { method: 'POST' });

export const processInvoicesStreamUrl = (profileId: string) =>
  `${API_BASE}/api/profiles/${profileId}/process-stream`;

// Inbox
export const getInbox = (profileId: string) =>
  request(`/api/profiles/${profileId}/inbox`);
export const clearInbox = (profileId: string) =>
  request(`/api/profiles/${profileId}/inbox`, { method: 'DELETE' });

// Folder Structure
export const getFolderStructure = (profileId: string) =>
  request(`/api/profiles/${profileId}/folder-structure`);

// Invoices
export const getInvoices = (profileId: string) =>
  request(`/api/profiles/${profileId}/invoices`);
export const clearInvoices = (profileId: string) =>
  request(`/api/profiles/${profileId}/invoices`, { method: 'DELETE' });

// Notifications
export const getNotifications = (profileId: string) =>
  request(`/api/profiles/${profileId}/notifications`);
export const deleteNotification = (profileId: string, notifId: string) =>
  request(`/api/profiles/${profileId}/notifications/${notifId}`, { method: 'DELETE' });
export const deleteAllNotifications = (profileId: string) =>
  request(`/api/profiles/${profileId}/notifications`, { method: 'DELETE' });

// File operations
export const downloadFileUrl = (profileId: string, companyName: string, folderType: string, filename: string) =>
  `${API_BASE}/api/profiles/${profileId}/download/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}`;

export const previewFileUrl = (profileId: string, companyName: string, folderType: string, filename: string) =>
  `${API_BASE}/api/profiles/${profileId}/preview/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}`;

export const fileViewerUrl = (profileId: string, companyName: string, folderType: string, filename: string, sortBy: string = 'name', sortOrder: string = 'asc') =>
  `${API_BASE}/api/profiles/${profileId}/file-viewer/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}?sort_by=${sortBy}&sort_order=${sortOrder}`;

export const deleteFile = (profileId: string, companyName: string, folderType: string, filename: string) =>
  request(`/api/profiles/${profileId}/file/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}`, { method: 'DELETE' });

export const downloadBatch = async (profileId: string, files: Array<{company_name: string, folder_type: string, filename: string}>) => {
  const res = await fetch(`${API_BASE}/api/profiles/${profileId}/download-batch`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
};

export const deleteBatch = (profileId: string, files: Array<{company_name: string, folder_type: string, filename: string}>) =>
  request(`/api/profiles/${profileId}/delete-batch`, {
    method: 'POST',
    body: JSON.stringify({ files }),
  });

// Approve pending invoices
export const approveInvoices = (profileId: string, invoiceIds: string[]) =>
  request(`/api/profiles/${profileId}/approve-invoices`, {
    method: 'POST',
    body: JSON.stringify({ invoice_ids: invoiceIds }),
  });

// Duplicate resolution - 3 choices: keep_existing, replace, keep_both
export const resolveDuplicateChoice = (profileId: string, data: Record<string, string>) =>
  request(`/api/profiles/${profileId}/resolve-duplicate-choice`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Billing
export const getBillingPlans = () => request('/api/billing/plans');
export const getBillingSubscription = () => request('/api/billing/subscription');
export const createCheckout = (plan: string) =>
  request('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({ plan }) });
export const activateTrial = (plan: string) =>
  request('/api/billing/activate-trial', { method: 'POST', body: JSON.stringify({ plan }) });
export const cancelSubscription = (immediate = false) =>
  request('/api/billing/cancel', { method: 'POST', body: JSON.stringify({ immediate }) });
export const reactivateSubscription = () =>
  request('/api/billing/reactivate', { method: 'POST' });
export const getBillingPortal = () => request('/api/billing/portal');
export const getBillingPayments = () => request('/api/billing/payments');
export const getBillingUsage = () => request('/api/billing/usage');

// Contact
export const submitContact = (name: string, email: string, message: string) =>
  request('/api/contact', { method: 'POST', body: JSON.stringify({ name, email, message }) });
export const getContactSettings = () => request('/api/contact/settings');

// Bank Verification Details
export const getVerificationBankDetails = () => request('/api/verification/bank-details');

// Pending Verifications
export const getPendingVerifications = (profileId: string) =>
  request(`/api/profiles/${profileId}/pending-verifications`);
export const deletePendingVerification = (profileId: string, requestId: string) =>
  request(`/api/profiles/${profileId}/pending-verifications/${requestId}`, { method: 'DELETE' });

// ID Card + Selfie Verification
export const verifyWithIdCard = async (
  profileId: string,
  verificationRequestId: string,
  idCardFile: File,
  selfieFile: File,
): Promise<Record<string, unknown>> => {
  const formData = new FormData();
  formData.append('id_card', idCardFile);
  formData.append('selfie', selfieFile);
  formData.append('verification_request_id', verificationRequestId);
  const res = await fetch(`${API_BASE}/api/profiles/${profileId}/verify-id-card`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Verification failed');
  }
  return res.json();
};

// Company Sharing
export const shareCompany = (profileId: string, companyId: string, email: string, canUpload: boolean) =>
  request(`/api/profiles/${profileId}/companies/${companyId}/share`, {
    method: 'POST', body: JSON.stringify({ email, can_upload: canUpload })
  });
export const getCompanyShares = (profileId: string, companyId: string) =>
  request(`/api/profiles/${profileId}/companies/${companyId}/shares`);
export const updateShare = (profileId: string, companyId: string, shareId: string, canUpload: boolean) =>
  request(`/api/profiles/${profileId}/companies/${companyId}/shares/${shareId}`, {
    method: 'PUT', body: JSON.stringify({ can_upload: canUpload })
  });
export const revokeShare = (profileId: string, companyId: string, shareId: string) =>
  request(`/api/profiles/${profileId}/companies/${companyId}/shares/${shareId}`, { method: 'DELETE' });
export const getSharedCompanies = () => request('/api/shared-companies');
export const getSharedFolderStructure = (shareId: string) =>
  request(`/api/shared-companies/${shareId}/folder-structure`);
export const getSharedInvoices = (shareId: string) =>
  request(`/api/shared-companies/${shareId}/invoices`);
export const sharedDownloadFileUrl = (shareId: string, companyName: string, folderType: string, filename: string) =>
  `${API_BASE}/api/shared-companies/${shareId}/download/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}`;
export const sharedPreviewFileUrl = (shareId: string, companyName: string, folderType: string, filename: string) =>
  `${API_BASE}/api/shared-companies/${shareId}/preview/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}`;

export const sharedFileViewerUrl = (shareId: string, companyName: string, folderType: string, filename: string, sortBy: string = 'name', sortOrder: string = 'asc') =>
  `${API_BASE}/api/shared-companies/${shareId}/file-viewer/${encodeURIComponent(companyName)}/${folderType}/${encodeURIComponent(filename)}?sort_by=${sortBy}&sort_order=${sortOrder}`;
export const sharedDownloadBatch = async (shareId: string, files: Array<{company_name: string, folder_type: string, filename: string}>) => {
  const res = await fetch(`${API_BASE}/api/shared-companies/${shareId}/download-batch`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
};
export const uploadToSharedCompany = async (shareId: string, files: FileList | File[], onProgress?: (pct: number) => void) => {
  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/shared-companies/${shareId}/upload`);
    xhr.withCredentials = true;
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve({}); }
      } else {
        try { const err = JSON.parse(xhr.responseText); reject(new Error(err.detail || 'Upload failed')); }
        catch { reject(new Error('Upload failed')); }
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });
};

// QR Mobile Verification
export const createQrSession = (profileId: string, verificationRequestId: string) =>
  request('/api/qr-verify/create-session', { method: 'POST', body: JSON.stringify({ profile_id: profileId, verification_request_id: verificationRequestId }) });
export const getQrStatus = (token: string) =>
  request(`/api/qr-verify/status/${token}`);
export const qrCodeImageUrl = (token: string) =>
  `${API_BASE}/api/qr-verify/qrcode/${token}`;

// WebSocket URL for real-time updates
export const getWebSocketUrl = (profileId: string) => {
  const base = API_BASE || window.location.origin;
  const wsProtocol = base.startsWith('https') ? 'wss' : 'ws';
  const host = base.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}/ws/${profileId}`;
};

// ── Invoicing Module API ─────────────────────────────────────────────────

// Clients
export const invListClients = (companyId: string, profileId: string, search?: string) => {
  const params = new URLSearchParams({ company_id: companyId, profile_id: profileId });
  if (search) params.set('search', search);
  return request(`/api/invoicing/clients?${params}`);
};
export const invCreateClient = (data: Record<string, unknown>) =>
  request('/api/invoicing/clients', { method: 'POST', body: JSON.stringify(data) });
export const invUpdateClient = (clientId: string, data: Record<string, unknown>, companyId: string, profileId: string) =>
  request(`/api/invoicing/clients/${clientId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'PUT', body: JSON.stringify(data) });
export const invDeleteClient = (clientId: string, companyId: string, profileId: string) =>
  request(`/api/invoicing/clients/${clientId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'DELETE' });

// Items
export const invListItems = (companyId: string, profileId: string, search?: string) => {
  const params = new URLSearchParams({ company_id: companyId, profile_id: profileId });
  if (search) params.set('search', search);
  return request(`/api/invoicing/items?${params}`);
};
export const invCreateItem = (data: Record<string, unknown>) =>
  request('/api/invoicing/items', { method: 'POST', body: JSON.stringify(data) });
export const invUpdateItem = (itemId: string, data: Record<string, unknown>, companyId: string, profileId: string) =>
  request(`/api/invoicing/items/${itemId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'PUT', body: JSON.stringify(data) });
export const invDeleteItem = (itemId: string, companyId: string, profileId: string) =>
  request(`/api/invoicing/items/${itemId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'DELETE' });

// Invoices
export const invGetNextNumber = (companyId: string, profileId: string, documentType: string = 'invoice') =>
  request(`/api/invoicing/next-number?company_id=${companyId}&profile_id=${profileId}&document_type=${documentType}`);
export const invCreateInvoice = (data: Record<string, unknown>) =>
  request('/api/invoicing/invoices', { method: 'POST', body: JSON.stringify(data) });
export const invUpdateInvoice = (invoiceId: string, data: Record<string, unknown>, companyId: string, profileId: string) =>
  request(`/api/invoicing/invoices/${invoiceId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'PUT', body: JSON.stringify(data) });
export const invGetInvoice = (invoiceId: string, companyId: string, profileId: string) =>
  request(`/api/invoicing/invoices/${invoiceId}?company_id=${companyId}&profile_id=${profileId}`);
export const invListInvoices = (companyId: string, profileId: string) =>
  request(`/api/invoicing/invoices?company_id=${companyId}&profile_id=${profileId}`);
export const invGetPdfUrl = (invoiceId: string) =>
  `${API_BASE}/api/invoicing/invoices/${invoiceId}/pdf`;

// Trade Registry Lookup
export const invRegistryLookup = (eik: string) =>
  request(`/api/invoicing/registry/lookup/${eik}`);

// Company Settings (bank, VAT)
export const invGetCompanySettings = (companyId: string) =>
  request(`/api/invoicing/company-settings/${companyId}`);
export const invUpdateCompanySettings = (companyId: string, profileId: string, data: Record<string, unknown>) =>
  request(`/api/invoicing/company-settings/${companyId}?profile_id=${profileId}`, { method: 'PUT', body: JSON.stringify(data) });

// Sync Settings
export const invGetSyncSettings = (companyId: string) =>
  request(`/api/invoicing/sync-settings/${companyId}`);
export const invUpdateSyncSettings = (companyId: string, profileId: string, data: Record<string, unknown>) =>
  request(`/api/invoicing/sync-settings/${companyId}?profile_id=${profileId}`, { method: 'PUT', body: JSON.stringify(data) });

// Stubs (кочани)
export const invListStubs = (companyId: string, profileId: string) =>
  request(`/api/invoicing/stubs?company_id=${companyId}&profile_id=${profileId}`);
export const invCreateStub = (data: Record<string, unknown>) =>
  request('/api/invoicing/stubs', { method: 'POST', body: JSON.stringify(data) });
export const invUpdateStub = (stubId: string, data: Record<string, unknown>, companyId: string, profileId: string) =>
  request(`/api/invoicing/stubs/${stubId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'PUT', body: JSON.stringify(data) });
export const invDeleteStub = (stubId: string, companyId: string, profileId: string) =>
  request(`/api/invoicing/stubs/${stubId}?company_id=${companyId}&profile_id=${profileId}`, { method: 'DELETE' });

// Sync invoices to megabanx folder
export const invSyncInvoices = (companyId: string, profileId: string) =>
  request(`/api/invoicing/sync/${companyId}?profile_id=${profileId}`, { method: 'POST' });
