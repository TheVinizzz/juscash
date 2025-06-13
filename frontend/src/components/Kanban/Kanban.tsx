import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { toast } from 'react-hot-toast';
import KanbanColumn from './KanbanColumn';
import PublicacaoModal from './PublicacaoModal';
import { Publicacao, Status } from '../../types';

const Kanban: React.FC = () => {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPublicacao, setSelectedPublicacao] = useState<Publicacao | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Carrega publicações
  const fetchPublicacoes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/publicacoes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPublicacoes(data.data || []);
      } else {
        toast.error('Erro ao carregar publicações');
      }
    } catch (error) {
      console.error('Erro ao carregar publicações:', error);
      toast.error('Erro ao carregar publicações');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega publicações na inicialização
  useEffect(() => {
    fetchPublicacoes();
  }, [fetchPublicacoes]);

  // Atualiza status da publicação
  const updatePublicacaoStatus = async (id: string, newStatus: Status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/publicacoes/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setPublicacoes(prev => 
          prev.map(pub => 
            pub.id === id ? { ...pub, status: newStatus } : pub
          )
        );
        toast.success('Status atualizado com sucesso');
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Manipula drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Status;
    updatePublicacaoStatus(draggableId, newStatus);
  };

  // Filtra publicações
  const filteredPublicacoes = publicacoes.filter(pub => {
    const matchesSearch = !searchTerm || 
      pub.numeroProcesso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.autores.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.advogados?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Agrupa publicações por status
  const groupedPublicacoes = {
    nova: filteredPublicacoes.filter(pub => pub.status === 'nova'),
    lida: filteredPublicacoes.filter(pub => pub.status === 'lida'),
    'enviado para ADV': filteredPublicacoes.filter(pub => pub.status === 'enviado para ADV'),
    'concluída': filteredPublicacoes.filter(pub => pub.status === 'concluída')
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Título com ícone */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Publicações</h1>
          </div>

          {/* Controles do lado direito */}
          <div className="flex items-center space-x-4">
            {/* Campo de pesquisa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Data do diário */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Data do diário</span>
              <select className="border border-gray-300 rounded px-2 py-1 text-xs">
                <option>De:</option>
              </select>
              <select className="border border-gray-300 rounded px-2 py-1 text-xs">
                <option>ATÉ:</option>
              </select>
              <select className="border border-gray-300 rounded px-2 py-1 text-xs">
                <option>COMARCA</option>
              </select>
              <button className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600">
                🔍
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-6">
            <KanbanColumn
              title="Nova Publicação"
              status="nova"
              publicacoes={groupedPublicacoes.nova}
              onPublicacaoClick={setSelectedPublicacao}
              color="blue"
            />
            <KanbanColumn
              title="Publicação Lida"
              status="lida"
              publicacoes={groupedPublicacoes.lida}
              onPublicacaoClick={setSelectedPublicacao}
              color="yellow"
            />
            <KanbanColumn
              title="Enviar para Advogado Responsável"
              status="enviado para ADV"
              publicacoes={groupedPublicacoes['enviado para ADV']}
              onPublicacaoClick={setSelectedPublicacao}
              color="purple"
            />
            <KanbanColumn
              title="Concluído"
              status="concluída"
              publicacoes={groupedPublicacoes['concluída']}
              onPublicacaoClick={setSelectedPublicacao}
              color="green"
            />
          </div>
        </DragDropContext>
      </div>

      {/* Modal de Detalhes */}
      {selectedPublicacao && (
        <PublicacaoModal
          publicacao={selectedPublicacao}
          isOpen={true}
          onClose={() => setSelectedPublicacao(null)}
        />
      )}
    </div>
  );
};

export default Kanban; 