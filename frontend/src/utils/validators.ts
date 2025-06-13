import { PasswordValidation } from '../types';

/**
 * Validação de email com regex robusta
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Validação de CPF brasileiro
 */
export const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  
  if (parseInt(cpf.charAt(9)) !== digit) {
    return false;
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  
  return parseInt(cpf.charAt(10)) === digit;
};

/**
 * Validação de CNPJ brasileiro
 */
export const validateCNPJ = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cnpj.charAt(12)) !== digit) {
    return false;
  }
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cnpj.charAt(13)) === digit;
};

/**
 * Validação robusta de senha com critérios específicos
 */
export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;
  
  // Critério 1: Mínimo 8 caracteres
  if (password.length < 8) {
    errors.push('Deve ter pelo menos 8 caracteres');
  } else {
    score += 1;
  }
  
  // Critério 2: Pelo menos 1 letra maiúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('Deve conter pelo menos 1 letra maiúscula');
  } else {
    score += 1;
  }
  
  // Critério 3: Pelo menos 1 letra minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('Deve conter pelo menos 1 letra minúscula');
  } else {
    score += 1;
  }
  
  // Critério 4: Pelo menos 1 número
  if (!/\d/.test(password)) {
    errors.push('Deve conter pelo menos 1 número');
  } else {
    score += 1;
  }
  
  // Critério 5: Pelo menos 1 caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Deve conter pelo menos 1 caractere especial (!@#$%^&*()_+-=[]{}|;\':",./<>?)');
  } else {
    score += 1;
  }
  
  // Pontuações extras
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) score += 1;
  
  // Determina força da senha
  let strength: PasswordValidation['strength'];
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else if (score <= 6) strength = 'strong';
  else strength = 'very-strong';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(score, 8)
  };
};

/**
 * Validação de número de processo judicial brasileiro
 */
export const validateProcessNumber = (processNumber: string): boolean => {
  const cleanNumber = processNumber.replace(/[^\d]/g, '');
  
  // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
  // 20 dígitos no total
  if (cleanNumber.length !== 20) {
    return false;
  }
  
  // Validação do dígito verificador (simplificada)
  const sequencial = cleanNumber.substring(0, 7);
  const dv = cleanNumber.substring(7, 9);
  const ano = cleanNumber.substring(9, 13);
  const segmento = cleanNumber.substring(13, 14);
  const tribunal = cleanNumber.substring(14, 16);
  const origem = cleanNumber.substring(16, 20);
  
  // Verifica se todos os segmentos são numéricos válidos
  return /^\d{7}$/.test(sequencial) &&
         /^\d{2}$/.test(dv) &&
         /^\d{4}$/.test(ano) &&
         /^\d{1}$/.test(segmento) &&
         /^\d{2}$/.test(tribunal) &&
         /^\d{4}$/.test(origem);
};

/**
 * Validação de OAB
 */
export const validateOAB = (oab: string): boolean => {
  const oabRegex = /^\d{3,6}\/[A-Z]{2}$/;
  return oabRegex.test(oab.trim().toUpperCase());
};

/**
 * Validação de telefone brasileiro
 */
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Celular com DDD: 11 dígitos (11987654321)
  // Fixo com DDD: 10 dígitos (1133334444)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

/**
 * Validação de CEP brasileiro
 */
export const validateCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return cleanCEP.length === 8 && /^\d{8}$/.test(cleanCEP);
};

/**
 * Validação de data no formato brasileiro (DD/MM/AAAA)
 */
export const validateBrazilianDate = (date: string): boolean => {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Validação mais específica por mês
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Ano bissexto
  if (month === 2 && isLeapYear(year)) {
    return day <= 29;
  }
  
  return day <= daysInMonth[month - 1];
};

/**
 * Verifica se é ano bissexto
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Sanitização de string removendo caracteres especiais mas preservando espaços
 */
export const sanitizeString = (str: string): string => {
  // Remove apenas caracteres perigosos, preserva espaços e acentos
  return str.replace(/[<>\"'%;()&+]/g, '');
};

/**
 * Validação de nome completo
 */
export const validateFullName = (name: string): { isValid: boolean; error?: string } => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Nome é obrigatório' };
  }
  
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }
  
  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Nome deve ter no máximo 100 caracteres' };
  }
  
  // Verifica se contém pelo menos um espaço (nome e sobrenome)
  if (!trimmedName.includes(' ')) {
    return { isValid: false, error: 'Digite seu nome completo (nome e sobrenome)' };
  }
  
  // Verifica se contém apenas letras, espaços e acentos
  const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Nome deve conter apenas letras e espaços' };
  }
  
  // Verifica se não há espaços duplos
  if (trimmedName.includes('  ')) {
    return { isValid: false, error: 'Nome não pode ter espaços duplos' };
  }
  
  return { isValid: true };
};

/**
 * Validação de URL
 */
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validação de valor monetário brasileiro
 */
export const validateMonetaryValue = (value: string): boolean => {
  const monetaryRegex = /^R\$\s*\d{1,3}(\.\d{3})*,\d{2}$/;
  return monetaryRegex.test(value);
};

/**
 * Converte valor monetário brasileiro para número
 */
export const parseMonetaryValue = (value: string): number => {
  const cleanValue = value
    .replace(/R\$\s*/, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
};

/**
 * Formata número para valor monetário brasileiro
 */
export const formatToBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Debounce para otimizar buscas
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}; 