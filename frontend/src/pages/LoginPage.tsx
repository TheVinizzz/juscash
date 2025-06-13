import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { validateEmail, sanitizeString } from '../utils/validators';
import { AuthRequest } from '../types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toLowerCase();
    setEmail(value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
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
      const loginData: AuthRequest = {
        email: email.trim(),
        password: password
      };

      const response = await authAPI.login(loginData);
      
      // Salvar dados no localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success(`Bem-vindo de volta, ${response.user.name}!`);
      navigate('/kanban');
      
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      const errorMessage = error.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(errorMessage);
      
      // Limpar senha em caso de erro
      setPassword('');
      
      if (errorMessage.includes('Credenciais inválidas')) {
        setErrors({ 
          email: 'Email ou senha incorretos',
          password: 'Email ou senha incorretos'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Email Field */}
          <div>
            <label className="block text-base font-medium text-blue-900 mb-2">
              E-mail:
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-base font-medium text-blue-900 mb-2">
              Senha:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base"
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
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Login Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2.5 px-4 rounded-md transition-colors text-base"
            >
              {isLoading ? 'Carregando...' : 'Login'}
            </button>
          </div>
        </form>

        {/* Register Link */}
        <div className="text-center mt-8">
          <Link
            to="/register"
            className="text-base text-blue-900 hover:text-blue-700 underline"
          >
            Não possui uma conta? Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 