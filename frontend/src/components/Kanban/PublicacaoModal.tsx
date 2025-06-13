import React from 'react';
import { Publicacao } from '../../types';
import { formatDateTime, formatToBRL } from '../../utils/formatters';

interface PublicacaoModalProps {
  publicacao: Publicacao;
  isOpen: boolean;
  onClose: () => void;
}

const PublicacaoModal: React.FC<PublicacaoModalProps> = ({ publicacao, isOpen, onClose }) => {
  if (!isOpen) return null;

  const formatAdvogados = (advogados?: string) => {
    if (!advogados) return 'N/A';
    
    return advogados.split('\n').map((adv, index) => (
      <div key={index} className="flex items-start space-x-2">
        <span className="text-gray-600 mt-1">•</span>
        <span>{adv.trim()}</span>
      </div>
    ));
  };

  const getValorDisplay = (valor?: number) => {
    return valor ? formatToBRL(valor) : 'N/A';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-blue-900">
            Publicação - {publicacao.numeroProcesso}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Data de publicação no DJE */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Data de publicação no DJE:</label>
            <p className="text-sm text-gray-900">{formatDateTime(publicacao.dataDisponibilizacao).split(' ')[0]}</p>
          </div>

          {/* Autor(es) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Autor (es):</label>
            <div className="text-sm text-gray-900 flex items-start space-x-2">
              <span className="text-gray-600 mt-1">•</span>
              <span>{publicacao.autores}</span>
            </div>
          </div>

          {/* Réu */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Réu:</label>
            <div className="text-sm text-gray-900 flex items-start space-x-2">
              <span className="text-gray-600 mt-1">•</span>
              <span>Instituto Nacional do Seguro Social - INSS</span>
            </div>
          </div>

          {/* Advogado(s) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Advogado(s):</label>
            <div className="text-sm text-gray-900 space-y-1">
              {formatAdvogados(publicacao.advogados)}
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Valor principal bruto/ líquido</label>
              <p className="text-sm text-gray-900">{getValorDisplay(publicacao.valorPrincipalBruto)}</p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Valor dos juros moratórios:</label>
              <p className="text-sm text-gray-900">{getValorDisplay(publicacao.valorJurosMoratorios)}</p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Valor dos honorários advocatícios:</label>
              <p className="text-sm text-gray-900">{getValorDisplay(publicacao.honorariosAdvocaticios)}</p>
            </div>
          </div>

          {/* Conteúdo da Publicação */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Conteúdo da Publicação:</label>
            <div className="text-sm text-gray-900 leading-relaxed">
              <p>{publicacao.conteudo}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicacaoModal; 