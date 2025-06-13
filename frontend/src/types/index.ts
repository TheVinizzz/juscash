export type Status = 'nova' | 'lida' | 'enviado para ADV' | 'concluída';

export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
  updatedAt: string
}

export interface Publicacao {
  id: string
  numeroProcesso: string
  dataDisponibilizacao: string
  autores: string
  reu: string
  advogados?: string
  conteudo: string
  valorPrincipalBruto?: number
  valorPrincipalLiquido?: number
  valorJurosMoratorios?: number
  honorariosAdvocaticios?: number
  status: Status
  dataExtracao: string
  fonte: string
  termosEncontrados?: string
  createdAt: string
  updatedAt: string
}

export interface AuthRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PublicacaoFilters {
  numeroProcesso?: string
  autor?: string
  advogado?: string
  status?: Status[]
  dataInicio?: string
  dataFim?: string
  valorMinimo?: number
  valorMaximo?: number
  termoBusca?: string
  page?: number
  limit?: number
}

export interface KanbanColumn {
  id: string
  title: string
  status: Publicacao['status']
  publicacoes: Publicacao[]
}

export interface DragResult {
  draggableId: string
  source: {
    droppableId: string
    index: number
  }
  destination?: {
    droppableId: string
    index: number
  } | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UpdateStatusRequest {
  status: Status
}

export interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
}

export interface PublicacaoStore {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filters: PublicacaoFilters
  setFilters: (filters: PublicacaoFilters) => void
  publicacoes: Publicacao[]
  updatePublicacaoStatus: (id: string, status: Status) => void
}

export interface KanbanColumnProps {
  status: Status
  title: string
  color: string
  textColor: string
  bgColor: string
  count: number
  children: React.ReactNode
}

export interface PublicacaoCardProps {
  publicacao: Publicacao
  onClick: () => void
}

export interface PublicacaoModalProps {
  publicacao: Publicacao
  isOpen: boolean
  onClose: () => void
}

export interface SearchAndFiltersProps {
  onApplyFilters: (filters: PublicacaoFilters) => void
  isLoading: boolean
  totalCount: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PublicacoesResponse {
  data: Publicacao[]
  pagination: PaginationInfo
}

export interface DashboardStats {
  totalPublicacoes: number
  publicacoesNovas: number
  publicacoesLidas: number
  publicacoesProcessadas: number
  publicacoesConcluidas: number
  valorTotalRecuperado: number
  mediaTempoProcessamento: number
}

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  score: number
}

export interface LoadingState {
  isLoading: boolean
  error?: string
  progress?: number
}

export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export interface Theme {
  mode: 'light' | 'dark' | 'system'
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    info: string
  }
}

export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  features: {
    enableDragDrop: boolean
    enableInfiniteScroll: boolean
    enableRealTimeUpdates: boolean
    enablePushNotifications: boolean
  }
  ui: {
    itemsPerPage: number
    debounceDelay: number
    animationDuration: number
  }
} 