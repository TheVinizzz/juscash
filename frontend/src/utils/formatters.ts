import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return 'Data inválida';
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm', { locale: ptBR })}`;
    }
    
    if (isYesterday(date)) {
      return `Ontem às ${format(date, 'HH:mm', { locale: ptBR })}`;
    }
    
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    return 'Data inválida';
  }
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 7) {
    return formatDate(dateString);
  } else if (diffInDays > 0) {
    return `${diffInDays}d atrás`;
  } else if (diffInHours > 0) {
    return `${diffInHours}h atrás`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes}min atrás`;
  } else {
    return 'Agora';
  }
};

export const formatTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'HH:mm', { locale: ptBR });
  } catch (error) {
    return 'Hora inválida';
  }
};

export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: ptBR 
    });
  } catch (error) {
    return 'Data inválida';
  }
};

export const formatToBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const formatNumberToBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const parseBRLToNumber = (value: string): number => {
  const cleanValue = value
    .replace(/R\$\s*/, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
};

export const formatProcessNumber = (processNumber: string): string => {
  // Remove qualquer caractere que não seja número
  const numbers = processNumber.replace(/\D/g, '');
  
  // Verifica se tem 20 dígitos (formato CNJ)
  if (numbers.length === 20) {
    // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
    return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14, 16)}.${numbers.slice(16, 20)}`;
  }
  
  // Retorna o original se não conseguir formatar
  return processNumber;
};

export const formatOAB = (oab: string): string => {
  // Remove espaços e converte para maiúsculo
  const clean = oab.replace(/\s+/g, '').toUpperCase();
  
  // Se já tem barra, retorna como está
  if (clean.includes('/')) {
    return clean;
  }
  
  // Tenta extrair números e letras
  const numbers = clean.replace(/[^\d]/g, '');
  const letters = clean.replace(/[^A-Z]/g, '');
  
  if (numbers.length >= 3 && letters.length >= 2) {
    return `${numbers}/${letters}`;
  }
  
  return oab;
};

export const formatCPF = (cpf: string): string => {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
  
  return cpf;
};

export const formatCNPJ = (cnpj: string): string => {
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length === 14) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  }
  
  return cnpj;
};

export const formatPhone = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    // Celular com DDD
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
  
  if (numbers.length === 10) {
    // Telefone fixo com DDD
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  }
  
  return phone;
};

export const formatCEP = (cep: string): string => {
  const numbers = cep.replace(/\D/g, '');
  
  if (numbers.length === 8) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }
  
  return cep;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength) + '...';
};

export const capitalizeWords = (text: string): string => {
  return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(2)} ${sizes[i]}`;
}; 