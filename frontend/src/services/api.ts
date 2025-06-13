import axios, { AxiosResponse } from 'axios'
import { 
  AuthRequest, 
  RegisterRequest, 
  AuthResponse, 
  ApiResponse, 
  Publicacao, 
  PublicacaoFilters,
  User,
  Status,
  UpdateStatusRequest
} from '@/types'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: async (credentials: AuthRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await api.post('/auth/login', credentials)
    return response.data.data!
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await api.post('/auth/register', userData)
    return response.data.data!
  },
}

export const publicacoesAPI = {
  getPublicacoes: async (filters: PublicacaoFilters = {}): Promise<ApiResponse<Publicacao[]>> => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })

    const response: AxiosResponse<ApiResponse<Publicacao[]>> = await api.get(`/publicacoes?${params.toString()}`)
    return response.data
  },

  getPublicacao: async (id: string): Promise<Publicacao> => {
    const response: AxiosResponse<ApiResponse<Publicacao>> = await api.get(`/publicacoes/${id}`)
    return response.data.data!
  },

  updateStatus: async (id: string, status: Status): Promise<Publicacao> => {
    const response: AxiosResponse<ApiResponse<Publicacao>> = await api.patch(`/publicacoes/${id}/status`, { status })
    return response.data.data!
  },

  createPublicacao: async (publicacao: Omit<Publicacao, 'id' | 'createdAt' | 'updatedAt'>): Promise<Publicacao> => {
    const response: AxiosResponse<ApiResponse<Publicacao>> = await api.post('/publicacoes', publicacao)
    return response.data.data!
  },
}

export const getPublicacoes = publicacoesAPI.getPublicacoes
export const updatePublicacaoStatus = publicacoesAPI.updateStatus
export const getPublicacao = publicacoesAPI.getPublicacao

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface PublicacoesResponse {
  success: boolean;
  data: Publicacao[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScraperStats {
  total_publicacoes: number;
  total_inseridas: number;
  dates_processed: number;
  errors: number;
}

export interface ScraperResponse {
  success: boolean;
  message?: string;
  stats?: ScraperStats;
  output?: string;
  error?: string;
  details?: string;
}

export interface ScraperStatusResponse {
  success: boolean;
  data?: {
    totalPublicacoes: number;
    publicacoesHoje: number;
    ultimaExecucao: string | null;
  };
  error?: string;
}

export interface ScraperAdvancedRequest {
  dataInicio?: string; // formato DD/MM/YYYY
  dataFim?: string;    // formato DD/MM/YYYY
}

export interface ScraperAdvancedResponse {
  success: boolean;
  date_range: string;
  total_found: number;
  total_processed: number;
  total_sent: number;
  total_filtered: number;
  execution_time: number;
  errors: string[];
}

// Scraper
export const runScraper = async (daysBack: number = 7): Promise<ScraperResponse> => {
  const response = await api.post('/publicacoes/scraper/run', { daysBack });
  return response.data;
};

export const runAdvancedScraper = async (params: ScraperAdvancedRequest = {}): Promise<ScraperAdvancedResponse> => {
  const scraperAPI = axios.create({
    baseURL: 'http://localhost:5001',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const response = await scraperAPI.post('/run-advanced-search', params);
  return response.data;
};

export const getScraperStatus = async (): Promise<ScraperStatusResponse> => {
  const response = await api.get('/publicacoes/scraper/status');
  return response.data;
};

export const runScraperSinceMarch = async (): Promise<ScraperResponse> => {
  const response = await api.post('/publicacoes/scraper/run-since-march');
  return response.data;
};

export const runCustomSearch = async (termos: string, dataInicio: string, dataFim: string) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Token não encontrado');
  }

  const response = await fetch(`${API_BASE_URL}/publicacoes/scraper/busca-personalizada`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      termos,
      dataInicio,
      dataFim
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Erro na busca personalizada');
  }

  return response.json();
};

export default api 