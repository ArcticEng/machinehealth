const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token management
let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => authToken;

// Generic fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await fetchAPI<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string) => {
    const data = await fetchAPI<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    setAuthToken(data.token);
    return data;
  },

  logout: () => {
    setAuthToken(null);
  },

  getMe: () => fetchAPI<any>('/auth/me'),

  updateProfile: (data: { firstName?: string; lastName?: string }) =>
    fetchAPI<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Companies API
export const companiesAPI = {
  getAll: () => fetchAPI<any[]>('/companies'),
  
  getOne: (id: string) => fetchAPI<any>(`/companies/${id}`),
  
  create: (data: { name: string; description?: string }) =>
    fetchAPI<any>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { name?: string; description?: string; status?: string }) =>
    fetchAPI<any>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<any>(`/companies/${id}`, { method: 'DELETE' }),
};

// Factories API
export const factoriesAPI = {
  getAll: (companyId?: string) => 
    fetchAPI<any[]>(`/factories${companyId ? `?companyId=${companyId}` : ''}`),
  
  getOne: (id: string) => fetchAPI<any>(`/factories/${id}`),
  
  create: (data: { companyId: string; name: string; location?: string; description?: string }) =>
    fetchAPI<any>('/factories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { name?: string; location?: string; description?: string; status?: string }) =>
    fetchAPI<any>(`/factories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<any>(`/factories/${id}`, { method: 'DELETE' }),
};

// Machines API
export const machinesAPI = {
  getAll: (filters?: { factoryId?: string; companyId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.factoryId) params.append('factoryId', filters.factoryId);
    if (filters?.companyId) params.append('companyId', filters.companyId);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return fetchAPI<any[]>(`/machines${query ? `?${query}` : ''}`);
  },
  
  getOne: (id: string) => fetchAPI<any>(`/machines/${id}`),
  
  create: (data: { 
    factoryId: string; 
    name: string; 
    type?: string; 
    model?: string; 
    serialNumber?: string;
    description?: string 
  }) =>
    fetchAPI<any>('/machines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { 
    name?: string; 
    type?: string; 
    model?: string;
    serialNumber?: string;
    description?: string; 
    status?: string;
    healthScore?: number;
  }) =>
    fetchAPI<any>(`/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<any>(`/machines/${id}`, { method: 'DELETE' }),
};

// Samples API
export const samplesAPI = {
  getAll: (machineId: string, limit?: number) => 
    fetchAPI<any[]>(`/samples?machineId=${machineId}${limit ? `&limit=${limit}` : ''}`),
  
  getOne: (id: string) => fetchAPI<any>(`/samples/${id}`),

  // Get raw data from S3
  getRawData: (id: string) => fetchAPI<{
    metadata: any;
    metrics: any;
    rawData: any[];
  }>(`/samples/${id}/rawdata`),
  
  create: (data: {
    machineId: string;
    name: string;
    notes?: string;
    durationSeconds: number;
    sampleRate?: number;
    metrics: any;
    rawData: any[];
    isBaseline?: boolean;
  }) =>
    fetchAPI<any>('/samples', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<any>(`/samples/${id}`, { method: 'DELETE' }),
  
  export: (id: string) => `${API_BASE_URL}/samples/${id}/export`,
};

// Baselines API
export const baselinesAPI = {
  getAll: (machineId: string) => 
    fetchAPI<any[]>(`/baselines?machineId=${machineId}`),
  
  getActive: (machineId: string) => 
    fetchAPI<any>(`/baselines/active/${machineId}`),
  
  setActive: (machineId: string, sampleId: string) =>
    fetchAPI<any>('/baselines/set-active', {
      method: 'POST',
      body: JSON.stringify({ machineId, sampleId }),
    }),
};

// Alerts API
export const alertsAPI = {
  getAll: (filters?: { machineId?: string; resolved?: boolean; severity?: string }) => {
    const params = new URLSearchParams();
    if (filters?.machineId) params.append('machineId', filters.machineId);
    if (filters?.resolved !== undefined) params.append('resolved', String(filters.resolved));
    if (filters?.severity) params.append('severity', filters.severity);
    const query = params.toString();
    return fetchAPI<any[]>(`/alerts${query ? `?${query}` : ''}`);
  },
  
  acknowledge: (id: string) =>
    fetchAPI<any>(`/alerts/${id}/acknowledge`, { method: 'PUT' }),
  
  resolve: (id: string) =>
    fetchAPI<any>(`/alerts/${id}/resolve`, { method: 'PUT' }),
  
  getSummary: () => fetchAPI<any>('/alerts/summary'),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => fetchAPI<any>('/analytics/dashboard'),
  
  getHealthTrends: (machineId?: string, period?: string) => {
    const params = new URLSearchParams();
    if (machineId) params.append('machineId', machineId);
    if (period) params.append('period', period);
    const query = params.toString();
    return fetchAPI<any[]>(`/analytics/health-trends${query ? `?${query}` : ''}`);
  },
  
  compareSample: (sampleId: string) =>
    fetchAPI<any>(`/analytics/compare/${sampleId}`),
  
  getMaintenanceDue: () => fetchAPI<any[]>('/analytics/maintenance-due'),
};

// AI API - Claude-powered analysis
export const aiAPI = {
  // Analyze vibration comparison with AI
  analyzeComparison: (data: { 
    sampleId?: string;
    machineId: string; 
    baselineMetrics: any; 
    currentMetrics: any 
  }) =>
    fetchAPI<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      summary: string;
      findings: string[];
      possibleCauses: string[];
      recommendations: string[];
      predictedTimeToFailure?: string;
      confidenceScore: number;
      generatedAt: string;
    }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Save comparison analysis as PDF to S3
  saveComparison: (data: {
    machineId: string;
    baselineSampleId?: string;
    currentSampleId?: string;
    baselineMetrics: any;
    currentMetrics: any;
    analysis: any;
  }) =>
    fetchAPI<{
      success: boolean;
      s3Key: string;
      downloadUrl: string;
      message: string;
    }>('/ai/analyze/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get saved comparisons
  getComparisons: (machineId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (machineId) params.append('machineId', machineId);
    if (limit) params.append('limit', String(limit));
    const query = params.toString();
    return fetchAPI<Array<{
      id: string;
      machineId: string;
      machineName: string;
      severity: string;
      title: string;
      summary: string;
      createdAt: string;
      s3Key: string;
    }>>(`/ai/comparisons${query ? `?${query}` : ''}`);
  },
  
  // Generate comprehensive report with AI
  generateReport: (data: { companyId?: string; factoryId?: string; period: string }) =>
    fetchAPI<{
      title: string;
      executiveSummary: string;
      healthOverview: string;
      criticalFindings: string[];
      recommendations: string[];
      maintenancePriorities: string[];
      predictiveInsights: string;
      machineHealth: {
        total: number;
        healthy: number;
        warning: number;
        critical: number;
        averageScore: number;
      };
      alerts: {
        total: number;
        critical: number;
      };
      machines: Array<{
        name: string;
        factory: string;
        health: number;
        status: string;
        trend: string;
      }>;
      generatedAt: string;
    }>('/ai/report', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Interpret raw vibration data pattern
  interpretPattern: (data: { rawData: any[]; machineType: string }) =>
    fetchAPI<{
      pattern: string;
      interpretation: string;
      concerns: string[];
    }>('/ai/interpret', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Quick health assessment for a machine
  assessMachine: (machineId: string) =>
    fetchAPI<{
      machine: {
        name: string;
        type: string;
        factory: string;
        currentHealth: number;
      };
      assessment: {
        severity: string;
        title: string;
        summary: string;
        recommendations: string[];
      };
    }>('/ai/assess', {
      method: 'POST',
      body: JSON.stringify({ machineId }),
    }),
};

// Reports API - PDF reports stored in S3
export const reportsAPI = {
  // Generate and save a new report as PDF
  generate: (data: { 
    companyId?: string; 
    factoryId?: string; 
    machineId?: string;
    period: string;
    includeAiAnalysis?: boolean;
  }) =>
    fetchAPI<any>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // List saved reports
  getAll: (filters?: { 
    companyId?: string; 
    factoryId?: string; 
    machineId?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.companyId) params.append('companyId', filters.companyId);
    if (filters?.factoryId) params.append('factoryId', filters.factoryId);
    if (filters?.machineId) params.append('machineId', filters.machineId);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString();
    return fetchAPI<Array<{
      id: string;
      filename: string;
      period: string;
      summary: string;
      companyName: string;
      factoryName?: string;
      machineName?: string;
      createdAt: string;
      downloadUrl: string;
    }>>(`/reports${query ? `?${query}` : ''}`);
  },
  
  // Get a specific report
  getOne: (id: string) => fetchAPI<any>(`/reports/${id}`),
  
  // Delete a report
  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/reports/${id}`, { method: 'DELETE' }),
  
  // Get download URL
  getDownloadUrl: (id: string) => `${API_BASE_URL}/reports/${id}/download`,
};

export default {
  auth: authAPI,
  companies: companiesAPI,
  factories: factoriesAPI,
  machines: machinesAPI,
  samples: samplesAPI,
  baselines: baselinesAPI,
  alerts: alertsAPI,
  analytics: analyticsAPI,
  ai: aiAPI,
  reports: reportsAPI,
};
