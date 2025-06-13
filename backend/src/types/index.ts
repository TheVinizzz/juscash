export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Publicacao {
  id: string;
  numeroProcesso: string;
  dataDisponibilizacao: Date;
  autores: string;
  reu: string;
  advogados?: string;
  conteudo: string;
  valorPrincipalBruto?: number;
  valorPrincipalLiquido?: number;
  valorJurosMoratorios?: number;
  honorariosAdvocaticios?: number;
  status: 'nova' | 'lida' | 'processada' | 'concluida';
  dataExtracao: Date;
  fonte: string;
  termosEncontrados?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface PublicacaoFilters {
  numeroProcesso?: string;
  autor?: string;
  reu?: string;
  advogado?: string;
  dataInicial?: string;
  dataFinal?: string;
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 