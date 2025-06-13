import React, { useState, useCallback } from 'react';
import { SearchAndFiltersProps, PublicacaoFilters } from '../../types';
import { usePublicacaoStore } from '../../store/publicacaoStore';
import { formatNumber } from '../../utils/formatters';

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({ 
  onApplyFilters, 
  isLoading, 
  totalCount 
}) => {
  const { searchTerm, setSearchTerm } = usePublicacaoStore();
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<PublicacaoFilters>({});

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    const searchTimeout = setTimeout(() => {
      onApplyFilters({
        ...filters,
        ...(value.includes('-') ? { numeroProcesso: value } : { autor: value })
      });
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [filters, onApplyFilters, setSearchTerm]);

  const handleFilterChange = (key: keyof PublicacaoFilters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined
    };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    setIsFilterPanelOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    setSearchTerm('');
    onApplyFilters(clearedFilters);
    setIsFilterPanelOpen(false);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por processo, autor ou advogado..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`relative px-4 py-2 border rounded-lg transition-colors ${
              hasActiveFilters 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                Carregando...
              </div>
            ) : (
              `${formatNumber(totalCount)} publicação${totalCount !== 1 ? 'ões' : ''} encontrada${totalCount !== 1 ? 's' : ''}`
            )}
          </div>
        </div>
      </div>

      {isFilterPanelOpen && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número do Processo
              </label>
              <input
                type="text"
                placeholder="Ex: 1234567-89.2023.1.23.4567"
                value={filters.numeroProcesso || ''}
                onChange={(e) => handleFilterChange('numeroProcesso', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autor
              </label>
              <input
                type="text"
                placeholder="Nome do autor"
                value={filters.autor || ''}
                onChange={(e) => handleFilterChange('autor', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advogado
              </label>
              <input
                type="text"
                placeholder="Nome do advogado"
                value={filters.advogado || ''}
                onChange={(e) => handleFilterChange('advogado', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Réu
              </label>
              <input
                type="text"
                placeholder="Nome do réu"
                value={filters.termoBusca || ''}
                onChange={(e) => handleFilterChange('termoBusca', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.dataInicio || ''}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.dataFim || ''}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-2 flex items-end space-x-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Aplicar Filtros
              </button>
              
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilters; 