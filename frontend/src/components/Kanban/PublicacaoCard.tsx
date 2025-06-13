import React from 'react';
import { PublicacaoCardProps } from '../../types';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/formatters';

const PublicacaoCard: React.FC<PublicacaoCardProps> = ({ publicacao, onClick }) => {
    const totalValue = (publicacao.valorPrincipalBruto || 0) +
                    (publicacao.valorJurosMoratorios || 0) +
                    (publicacao.honorariosAdvocaticios || 0);

  const hasValues = publicacao.valorPrincipalBruto || publicacao.valorJurosMoratorios || publicacao.honorariosAdvocaticios;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200 hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {publicacao.numeroProcesso}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            DJE: {formatDate(publicacao.dataDisponibilizacao)}
          </p>
        </div>
        
        <div className="ml-2 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {formatRelativeDate(publicacao.updatedAt)}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {publicacao.autores && (
          <div>
            <span className="text-xs font-medium text-gray-600">Autor(es):</span>
            <p className="text-xs text-gray-700 line-clamp-2">
              {publicacao.autores}
            </p>
          </div>
        )}

        {publicacao.advogados && (
          <div>
            <span className="text-xs font-medium text-gray-600">Advogado(s):</span>
            <p className="text-xs text-gray-700 line-clamp-2">
              {publicacao.advogados}
            </p>
          </div>
        )}
      </div>

      {hasValues && (
        <div className="bg-gray-50 rounded-md p-2 mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Valores:</div>
          <div className="space-y-1">
            {publicacao.valorPrincipalBruto && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Principal:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(publicacao.valorPrincipalBruto)}
                </span>
              </div>
            )}
            {publicacao.valorJurosMoratorios && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Juros:</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(publicacao.valorJurosMoratorios)}
                </span>
              </div>
            )}
            {publicacao.honorariosAdvocaticios && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Honorários:</span>
                <span className="font-medium text-purple-600">
                  {formatCurrency(publicacao.honorariosAdvocaticios)}
                </span>
              </div>
            )}
            {totalValue > 0 && (
              <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {publicacao.reu}
        </span>
        
        <div className="flex items-center text-xs text-blue-600">
          <span>Ver detalhes</span>
          <svg 
            className="w-3 h-3 ml-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5l7 7-7 7" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PublicacaoCard; 