import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Publicacao } from '../types';
import { formatDateTime } from '../utils/formatters';

interface PublicacaoModalProps {
  publicacao: Publicacao | null;
  isOpen: boolean;
  onClose: () => void;
}

const PublicacaoModal: React.FC<PublicacaoModalProps> = ({
  publicacao,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !publicacao) return null;

  // Dados reais da publicação
  const modalData = {
    dataPublicacao: formatDateTime(publicacao.dataDisponibilizacao).split(' ')[0] || 'Não informado',
    autores: publicacao.autores ? publicacao.autores.split(',').map(a => a.trim()).filter(a => a) : ['Não informado'],
    reu: publicacao.reu ? publicacao.reu.split(',').map(r => r.trim()).filter(r => r) : ['Não informado'],
    advogados: publicacao.advogados ? publicacao.advogados.split(',').map(adv => adv.trim()).filter(adv => adv) : ['Não informado'],
    valorPrincipalBruto: publicacao.valorPrincipalBruto ? 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(publicacao.valorPrincipalBruto) : 
      'Não informado',
    valorPrincipalLiquido: publicacao.valorPrincipalLiquido ? 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(publicacao.valorPrincipalLiquido) : 
      'Não informado',
    valorJuros: publicacao.valorJurosMoratorios ? 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(publicacao.valorJurosMoratorios) : 
      'Não informado',
    valorHonorarios: publicacao.honorariosAdvocaticios ? 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(publicacao.honorariosAdvocaticios) : 
      'Não informado',
    conteudo: publicacao.conteudo || 'Conteúdo não disponível'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Publicação - {publicacao.numeroProcesso}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Data de publicação */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Data de publicação no DJE:
            </h3>
            <p className="text-sm text-gray-700">{modalData.dataPublicacao}</p>
          </div>

          {/* Autor(es) */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Autor (es):
            </h3>
            <ul className="space-y-1">
              {modalData.autores.map((autor, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-sm text-gray-700 mr-2">•</span>
                  <span className="text-sm text-gray-700">{autor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Réu */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Réu:
            </h3>
            <ul className="space-y-1">
              {modalData.reu.map((reu, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-sm text-gray-700 mr-2">•</span>
                  <span className="text-sm text-gray-700">{reu}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Advogado(s) */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Advogado(s):
            </h3>
            <ul className="space-y-1">
              {modalData.advogados.map((advogado, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-sm text-gray-700 mr-2">•</span>
                  <span className="text-sm text-gray-700">{advogado}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Valor principal bruto */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Valor principal bruto
            </h3>
            <p className="text-sm text-gray-700">{modalData.valorPrincipalBruto}</p>
          </div>

          {/* Valor principal líquido */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Valor principal líquido
            </h3>
            <p className="text-sm text-gray-700">{modalData.valorPrincipalLiquido}</p>
          </div>

          {/* Valor dos juros moratórios */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Valor dos juros moratórios:
            </h3>
            <p className="text-sm text-gray-700">{modalData.valorJuros}</p>
          </div>

          {/* Valor dos honorários advocatícios */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Valor dos honorários advocatícios:
            </h3>
            <p className="text-sm text-gray-700">{modalData.valorHonorarios}</p>
          </div>

          {/* Conteúdo da Publicação */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Conteúdo da Publicação:
            </h3>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {modalData.conteudo}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicacaoModal; 