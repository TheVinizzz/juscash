import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { validateEmail, validatePassword, validateFullName, sanitizeString } from '../utils/validators';
import { RegisterRequest } from '../types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'name' ? sanitizeString(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nome completo
    const nameValidation = validateFullName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error!;
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Email inválido';
    }

    // Validar senha
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    // Validar confirmação de senha
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setIsLoading(true);
    
    try {
      const registerData: RegisterRequest = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      };

      const response = await authAPI.register(registerData);
      
      // Salvar dados no localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success('Conta criada com sucesso! Bem-vindo ao JusCash!');
      navigate('/kanban');
      
    } catch (error: any) {
      console.error('Erro no registro:', error);
      
      const errorMessage = error.response?.data?.error || 'Erro ao criar conta. Tente novamente.';
      toast.error(errorMessage);
      
      // Se o erro for email já cadastrado, limpar o campo
      if (errorMessage.includes('já cadastrado')) {
        setErrors({ email: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!formData.password) return null;
    return validatePassword(formData.password);
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Logo JusCash - Exatamente como na imagem */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center relative">
              <span className="text-white text-lg font-bold">$</span>
            </div>
            <h1 className="text-4xl font-bold text-blue-900">JusCash</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome Field */}
          <div>
            <label className="block text-base font-medium text-blue-900 mb-2">
              Seu nome completo: <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: João Silva Santos"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 text-base transition-colors ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              maxLength={100}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            {formData.name && !errors.name && formData.name.trim().includes(' ') && (
              <p className="mt-1 text-sm text-green-600">✓ Nome completo válido</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-base font-medium text-blue-900 mb-2">
              E-mail: <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu.email@exemplo.com"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 text-base transition-colors ${
                errors.email 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              maxLength={100}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
            {formData.email && !errors.email && validateEmail(formData.email.trim()) && (
              <p className="mt-1 text-sm text-green-600">✓ Email válido</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-base font-medium text-blue-900 mb-2">
              Senha: <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 8 caracteres"
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-1 text-base transition-colors ${
                  errors.password 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                maxLength={128}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {passwordStrength && formData.password && (
              <div className="mt-2">
                <div className="flex space-x-1 mb-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 w-full rounded ${
                        passwordStrength.score >= level * 2
                          ? passwordStrength.strength === 'weak' ? 'bg-red-500'
                          : passwordStrength.strength === 'medium' ? 'bg-yellow-500'
                          : passwordStrength.strength === 'strong' ? 'bg-blue-500'
                          : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-sm ${
                  passwordStrength.strength === 'weak' ? 'text-red-600'
                  : passwordStrength.strength === 'medium' ? 'text-yellow-600'
                  : passwordStrength.strength === 'strong' ? 'text-blue-600'
                  : 'text-green-600'
                }`}>
                  Força da senha: {
                    passwordStrength.strength === 'weak' ? 'Fraca'
                    : passwordStrength.strength === 'medium' ? 'Média'
                    : passwordStrength.strength === 'strong' ? 'Forte'
                    : 'Muito Forte'
                  }
                </p>
              </div>
            )}
            
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-base font-medium text-blue-900 mb-2">
              Confirme sua senha: <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Digite a senha novamente"
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-1 text-base transition-colors ${
                  errors.confirmPassword 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                maxLength={128}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
            {formData.confirmPassword && !errors.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
              <p className="mt-1 text-sm text-green-600">✓ Senhas coincidem</p>
            )}
          </div>

          {/* Login Link */}
          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-base text-blue-900 hover:text-blue-700 underline"
            >
              Já possui uma conta? Fazer o login
            </Link>
          </div>

          {/* Create Account Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2.5 px-4 rounded-md transition-colors text-base"
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage; 