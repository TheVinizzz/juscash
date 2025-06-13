import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MagnifyingGlassIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { ClockIcon } from '@heroicons/react/24/solid';
import { Publicacao, Status } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { usePublicacaoStore } from '../../store/publicacaoStore';
import PublicacaoModal from './PublicacaoModal';
import toast from 'react-hot-toast';

// Custom debounce function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const columns = [
  { id: 'nova', title: 'Nova Publicação', count: '1' },
  { id: 'lida', title: 'Publicação Lida', count: '1' },
  { id: 'processada', title: 'Enviar para Advogado Responsável', count: '1' },
  { id: 'concluida', title: 'Concluído', count: '3' },
];

// Função para calcular tempo relativo
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '1h';
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const SimpleDragKanban: React.FC = () => {
  const { publicacoes, updatePublicacaoStatus, fetchPublicacoes, isLoading } = usePublicacaoStore();
  const [selectedPublicacao, setSelectedPublicacao] = useState<Publicacao | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilters, setDateFilters] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      // Search logic aqui se necessário
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Filter publicações
  const filteredPublicacoes = publicacoes.filter((pub) => {
    const searchMatch = !searchTerm || 
      pub.numeroProcesso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.autores?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.advogados?.toLowerCase().includes(searchTerm.toLowerCase());

    const startDateMatch = !dateFilters.start || 
      new Date(pub.dataDisponibilizacao) >= new Date(dateFilters.start);

    const endDateMatch = !dateFilters.end || 
      new Date(pub.dataDisponibilizacao) <= new Date(dateFilters.end);

    return searchMatch && startDateMatch && endDateMatch;
  });

  // Group by status
  const getColumnData = (status: Status) => {
    return filteredPublicacoes.filter(pub => pub.status === status);
  };

  const getColumnStats = (status: Status) => {
    const data = getColumnData(status);
    return { count: data.length };
  };

  // Drag and drop handler
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const publicacaoId = draggableId;
    const newStatus = destination.droppableId as Status;

    // Validation rules
    const publicacao = publicacoes.find(p => p.id === publicacaoId);
    if (!publicacao) return;

    const isValidTransition = validateStatusTransition(publicacao.status, newStatus);
    if (!isValidTransition) {
      toast.error('Movimento inválido! Verifique as regras de transição.');
      return;
    }

    try {
      await updatePublicacaoStatus(publicacaoId, newStatus);
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  // Status validation
  const validateStatusTransition = (currentStatus: Status, newStatus: Status): boolean => {
    const transitions: Record<Status, Status[]> = {
      nova: ['lida'],
      lida: ['enviado para ADV', 'nova'],
              'enviado para ADV': ['concluída', 'lida'],
        'concluída': []
    };

    return transitions[currentStatus]?.includes(newStatus) || false;
  };

  // Modal functions
  const openModal = (publicacao: Publicacao) => {
    setSelectedPublicacao(publicacao);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPublicacao(null);
    setModalOpen(false);
  };

  // Initial load
  useEffect(() => {
    fetchPublicacoes();
  }, [fetchPublicacoes]);

  return (
    <div className="flex-1 px-6">
      {/* Filtros */}
      <div className="mb-6 space-y-4">
        {/* Barra de Pesquisa */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pesquisar
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Digite o número do processo ou nome das partes envolvidas"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filtros de Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do diário
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">De:</span>
              <div className="relative">
                <input
                  type="date"
                  value={dateFilters.start}
                  onChange={(e) => setDateFilters(prev => ({ ...prev, start: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="DD/MM/AAAA"
                />
                <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Até:</span>
              <div className="relative">
                <input
                  type="date"
                  value={dateFilters.end}
                  onChange={(e) => setDateFilters(prev => ({ ...prev, end: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="DD/MM/AAAA"
                />
                <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setDateFilters({ start: '', end: '' });
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center justify-center"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => (
            <div key={column.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm">
                  {column.title}
                </h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  {getColumnStats(column.id as Status).count}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[400px] space-y-3 ${
                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg' : ''
                    }`}
                  >
                    {getColumnData(column.id as Status).map((publicacao, index) => (
                      <Draggable
                        key={publicacao.id}
                        draggableId={publicacao.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => openModal(publicacao)}
                            className={`bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg rotate-3 ring-2 ring-blue-300' : ''
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="font-medium text-gray-900 text-sm">
                                {publicacao.numeroProcesso}
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <ClockIcon className="h-3 w-3" />
                                  <span>{getTimeAgo(publicacao.dataDisponibilizacao)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{formatDateTime(publicacao.dataDisponibilizacao).split(' ')[0]}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Loading indicator para infinite scroll */}
                    {isLoading && column.id === 'nova' && (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    )}

                    {/* Mensagem quando não há cards */}
                    {getColumnData(column.id as Status).length === 0 && !isLoading && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Nenhum card encontrado
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Modal */}
      {selectedPublicacao && (
        <PublicacaoModal
          publicacao={selectedPublicacao}
          isOpen={modalOpen}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default SimpleDragKanban; 