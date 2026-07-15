// Thin fetch wrapper around the FastAPI backend.
const API = (() => {
  const base = '';

  async function req(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(base + path, opts);
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
    return data;
  }

  return {
    // config
    config: () => req('GET', '/api/config'),
    // products
    listProducts: (search) => req('GET', `/api/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getProduct: (id) => req('GET', `/api/products/${id}`),
    createProduct: (data) => req('POST', '/api/products', data),
    updateProduct: (id, data) => req('PUT', `/api/products/${id}`, data),
    deleteProduct: (id) => req('DELETE', `/api/products/${id}`),
    async uploadImage(file) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/products/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      return data.image_path;
    },
    // companies
    listCompanies: () => req('GET', '/api/companies'),
    getCompany: (id) => req('GET', `/api/companies/${id}`),
    createCompany: (data) => req('POST', '/api/companies', data),
    updateCompany: (id, data) => req('PUT', `/api/companies/${id}`, data),
    deleteCompany: (id) => req('DELETE', `/api/companies/${id}`),
    async uploadCompanyLogo(file) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/companies/upload-logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      return data.logo_path;
    },
    // templates
    listTemplates: () => req('GET', '/api/templates'),
    getTemplate: (id) => req('GET', `/api/templates/${id}`),
    createTemplate: (data) => req('POST', '/api/templates', data),
    updateTemplate: (id, data) => req('PUT', `/api/templates/${id}`, data),
    deleteTemplate: (id) => req('DELETE', `/api/templates/${id}`),
    // quotations
    listQuotations: (filters = {}) => {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) qs.append(k, v); });
      const s = qs.toString();
      return req('GET', `/api/quotations${s ? `?${s}` : ''}`);
    },
    exportUrl: (ids) => `/api/quotations/export?ids=${ids.join(',')}`,
    getQuotation: (id) => req('GET', `/api/quotations/${id}`),
    createQuotation: (data) => req('POST', '/api/quotations', data),
    updateQuotation: (id, data) => req('PUT', `/api/quotations/${id}`, data),
    deleteQuotation: (id) => req('DELETE', `/api/quotations/${id}`),
    pdfUrl: (id) => `/api/quotations/${id}/pdf`,
    previewUrl: (id) => `/api/quotations/${id}/preview`,
  };
})();
