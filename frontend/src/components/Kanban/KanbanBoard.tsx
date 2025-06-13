import React, { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';
import PublicacaoCard from './PublicacaoCard';
import PublicacaoModal from './PublicacaoModal';
import SearchAndFilters from './SearchAndFilters';
import { usePublicacaoStore } from '../../store/publicacaoStore';
import { updatePublicacaoStatus, getPublicacoes } from '../../services/api';
import { Publicacao, Status, PublicacaoFilters } from '../../types';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  nova: {
    title: 'Publicações Novas',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    allowedTransitions: ['lida']
  },
  lida: {
    title: 'Lidas',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    allowedTransitions: ['enviado para ADV']
  },
  'enviado para ADV': {
    title: 'Enviadas para ADV',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    allowedTransitions: ['lida', 'concluída']
  },
  'concluída': {
    title: 'Concluídas',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    allowedTransitions: []
  }
};

const ITEMS_PER_PAGE = 30;

const KanbanBoard: React.FC = () => {
  const [filters, setFilters] = useState<PublicacaoFilters>({});
  const [selectedPublicacao, setSelectedPublicacao] = useState<Publicacao | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { searchTerm, setSearchTerm } = usePublicacaoStore();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['publicacoes', filters, searchTerm],
    queryFn: ({ pageParam = 1 }) => getPublicacoes({
      ...filters,
      page: pageParam,
      ...(searchTerm && {
        numeroProcesso: searchTerm.includes('-') ? searchTerm : undefined,
        autor: !searchTerm.includes('-') ? searchTerm : undefined,
        advogado: !searchTerm.includes('-') ? searchTerm : undefined
      })
    }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination?.page && pagination?.totalPages && pagination.page < pagination.totalPages 
        ? pagination.page + 1 
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => 
      updatePublicacaoStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicacoes'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao atualizar status';
      toast.error(message);
    }
  });

  const publicacoes = data?.pages.flatMap(page => page.data) || [];

  const groupedPublicacoes = React.useMemo(() => {
    const groups: Record<Status, Publicacao[]> = {
      nova: [],
      lida: [],
      'enviado para ADV': [],
      'concluída': []
    };

    publicacoes.forEach(publicacao => {
      const status = publicacao.status as Status;
      if (groups[status]) {
        groups[status].push(publicacao);
      }
    });

    return groups;
  }, [publicacoes]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const sourceStatus = source.droppableId as Status;
    const destinationStatus = destination.droppableId as Status;

    if (sourceStatus === destinationStatus) return;

    const allowedTransitions = STATUS_CONFIG[sourceStatus]?.allowedTransitions || [];
    
    if (!allowedTransitions.includes(destinationStatus)) {
      toast.error(
        `Transição inválida: não é possível mover de "${STATUS_CONFIG[sourceStatus]?.title}" para "${STATUS_CONFIG[destinationStatus]?.title}"`
      );
      return;
    }

    updateStatusMutation.mutate({
      id: draggableId,
      status: destinationStatus
    });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handlePublicacaoClick = (publicacao: Publicacao | undefined) => {
    if (publicacao) {
      setSelectedPublicacao(publicacao);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPublicacao(null);
  };

  const handleApplyFilters = (newFilters: PublicacaoFilters) => {
    setFilters(newFilters);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erro ao carregar publicações
          </h2>
          <p className="text-gray-600">
            Tente recarregar a página ou entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <SearchAndFilters
          onApplyFilters={handleApplyFilters}
          isLoading={isLoading}
          totalCount={data?.pages[0]?.pagination?.total || 0}
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <KanbanColumn
                  key={status}
                  status={status as Status}
                  title={config.title}
                  color={config.color}
                  textColor={config.textColor}
                  bgColor={config.bgColor}
                  count={groupedPublicacoes[status as Status]?.length || 0}
                >
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[400px] p-3 rounded-lg transition-colors ${
                          snapshot.isDraggingOver 
                            ? 'bg-gray-100 border-2 border-dashed border-gray-300' 
                            : 'bg-white'
                        }`}
                      >
                        {groupedPublicacoes[status as Status]?.map((publicacao, index) => (
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
                                className={`mb-3 ${
                                  snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                                }`}
                              >
                                <PublicacaoCard
                                  publicacao={publicacao}
                                  onClick={() => handlePublicacaoClick(publicacao)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {status === 'nova' && hasNextPage && (
                          <button
                            onClick={handleLoadMore}
                            disabled={isFetchingNextPage}
                            className="w-full p-3 mt-3 text-blue-600 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isFetchingNextPage ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                Carregando...
                              </div>
                            ) : (
                              'Carregar mais'
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </KanbanColumn>
              ))}
            </div>
          </DragDropContext>
        )}

        {selectedPublicacao && (
          <PublicacaoModal
            publicacao={selectedPublicacao}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default KanbanBoard; 