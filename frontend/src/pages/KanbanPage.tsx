import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScaleIcon, MagnifyingGlassIcon, CalendarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { usePublicacaoStore } from '../store/publicacaoStore';
import { Publicacao, Status } from '../types';
import { runCustomSearch } from '../services/api';
import PublicacaoModal from '../components/PublicacaoModal';
import { toast } from 'react-hot-toast';

const KanbanPage: React.FC = () => {
  const navigate = useNavigate();
  const { publicacoes, updatePublicacaoStatus, fetchPublicacoes } = usePublicacaoStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedPublicacao, setSelectedPublicacao] = useState<Publicacao | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredPublicacoes, setFilteredPublicacoes] = useState<Publicacao[]>([]);
  const [searchProgress, setSearchProgress] = useState('');
  const [progressInterval, setProgressInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [publicacoes, searchTerm, dateStart, dateEnd]);

  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [progressInterval]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      await fetchPublicacoes();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar publicações');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...publicacoes];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(pub => 
        pub.numeroProcesso.toLowerCase().includes(searchLower) ||
        pub.autores.toLowerCase().includes(searchLower) ||
        pub.reu.toLowerCase().includes(searchLower) ||
        pub.advogados.toLowerCase().includes(searchLower) ||
        pub.conteudo.toLowerCase().includes(searchLower)
      );
    }

    if (dateStart) {
      const startDate = new Date(dateStart);
      if (!isNaN(startDate.getTime())) {
        filtered = filtered.filter(pub => {
          const pubDate = new Date(pub.dataDisponibilizacao);
          return pubDate >= startDate;
        });
      }
    }

    if (dateEnd) {
      const endDate = new Date(dateEnd);
      if (!isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(pub => {
          const pubDate = new Date(pub.dataDisponibilizacao);
          return pubDate <= endDate;
        });
      }
    }

    setFilteredPublicacoes(filtered);
  };

  const formatDateForAPI = (dateStr: string): string => {
    if (dateStr && dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const handleCustomSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite os termos de busca');
      return;
    }

    if (!dateStart || !dateEnd) {
      toast.error('Selecione o período de busca');
      return;
    }

    const startDate = new Date(dateStart);
    const endDate = new Date(dateEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast.error('Formato de data inválido');
      return;
    }

    if (startDate > endDate) {
      toast.error('Data de início deve ser anterior à data fim');
      return;
    }

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      toast.error('Período máximo permitido é de 30 dias');
      return;
    }

    try {
      setIsSearching(true);
      setSearchProgress('Iniciando busca personalizada...');
      
      const toastId = toast.loading('🔍 Buscando publicações...', {
        duration: 0,
        style: {
          background: '#3B82F6',
          color: 'white',
        }
      });

      startProgressTracking();
      
      const dateStartFormatted = formatDateForAPI(dateStart);
      const dateEndFormatted = formatDateForAPI(dateEnd);
      
      const result = await runCustomSearch(searchTerm, dateStartFormatted, dateEndFormatted);
      
      stopProgressTracking();
      
      if (result.success) {
        setSearchProgress('Atualizando dados...');
        await fetchPublicacoes();
        
        toast.success(
          `✅ Busca concluída!\n📊 ${result.data.publicacoesEncontradas} encontradas\n💾 ${result.data.publicacoesSalvas} salvas\n⏱️ ${result.data.tempoExecucao}`,
          { 
            id: toastId,
            duration: 8000,
            style: {
              background: '#10B981',
              color: 'white',
            }
          }
        );
        
        setSearchProgress('');
      } else {
        throw new Error(result.message || 'Erro na busca');
      }
      
    } catch (error: any) {
      console.error('Erro na busca personalizada:', error);
      stopProgressTracking();
      toast.error(`❌ ${error.message || 'Erro na busca personalizada'}`, {
        duration: 6000
      });
      setSearchProgress('');
    } finally {
      setIsSearching(false);
      stopProgressTracking();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateStart('');
    setDateEnd('');
  };

  const handleCardClick = (publicacao: Publicacao) => {
    setSelectedPublicacao(publicacao);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPublicacao(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getColumnData = (status: Status) => {
    return filteredPublicacoes.filter(pub => pub.status === status);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const pubDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '30s';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destStatus = destination.droppableId as Status;
    try {
      await updatePublicacaoStatus(draggableId, destStatus);
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const columns = [
    { id: 'nova', title: 'Nova Publicação' },
    { id: 'lida', title: 'Publicação Lida' },
    { id: 'processada', title: 'Enviar para Advogado Responsável' },
    { id: 'concluida', title: 'Concluído' }
  ];

  const totalFiltered = filteredPublicacoes.length;
  const hasFilters = searchTerm || dateStart || dateEnd;

  const checkProgress = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/publicacoes/scraper/progresso-busca');
      if (response.ok) {
        const progress = await response.json();
        
        if (progress.success && progress.ativa) {
          if (progress.data_atual) {
            setSearchProgress(`Processando: ${progress.data_atual} (${progress.dias_processados}/${progress.total_dias})`);
          } else {
            setSearchProgress(`Iniciando busca... (${progress.porcentagem}%)`);
          }
        } else if (!progress.ativa && isSearching) {
          setSearchProgress('Finalizando...');
          if (progressInterval) {
            clearInterval(progressInterval);
            setProgressInterval(null);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao consultar progresso:', error);
    }
  };

  const startProgressTracking = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    const interval = setInterval(checkProgress, 1000);
    setProgressInterval(interval);
  };

  const stopProgressTracking = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">$</span>
            </div>
            <h1 className="text-xl font-medium text-gray-900">JusCash</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="px-4 md:px-6 py-4 md:py-6 flex-1 flex flex-col">
        <div className="mb-6 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <ScaleIcon className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-medium text-gray-900">Publicações</h2>
              {hasFilters && (
                <span className="text-sm text-gray-500">
                  ({totalFiltered} {totalFiltered === 1 ? 'resultado' : 'resultados'})
                </span>
              )}
            </div>
            
            <div className="hidden md:flex md:items-center space-x-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Pesquisar</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o número do processo ou nome da parte interessada"
                  className="border border-gray-300 rounded px-4 py-2 text-sm w-96 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Data do diário</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">De:</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Até:</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleCustomSearch}
                    disabled={isSearching}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded flex items-center justify-center transition-colors"
                  >
                    {isSearching ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <MagnifyingGlassIcon className="h-4 w-4" />
                    )}
                  </button>
                  
                  {hasFilters && (
                    <button 
                      onClick={clearFilters}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="block md:hidden space-y-4">
              <div className="space-y-2">
                <span className="text-sm text-gray-600 font-medium">Pesquisar</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o número do processo ou nome da parte interessada"
                  className="border border-gray-300 rounded px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-3">
                <span className="text-sm text-gray-600 font-medium">Data do diário</span>
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600">De:</span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600">Até:</span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-7">
                    <button 
                      onClick={handleCustomSearch}
                      disabled={isSearching}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-3 rounded flex items-center justify-center transition-colors min-w-[48px]"
                    >
                      {isSearching ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <MagnifyingGlassIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {hasFilters && (
                  <button 
                    onClick={clearFilters}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors w-full"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        )}

        <div className="kanban-container">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="block md:hidden h-full">
              <div className="flex space-x-4 overflow-x-auto pb-4 mobile-kanban-scroll h-full">
                {columns.map((column) => {
                  const columnData = getColumnData(column.id as Status);
                  const count = columnData.length;
                  
                  return (
                    <div key={column.id} className="bg-white rounded-lg border border-gray-200 flex-shrink-0 w-80 kanban-column">
                      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {column.id === 'concluida' && (
                              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <h3 className="font-medium text-gray-900 text-sm">{column.title}</h3>
                          </div>
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                            {count}
                          </span>
                        </div>
                      </div>
                      <Droppable droppableId={column.id}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="p-4 kanban-column-content space-y-3">
                            {columnData.length === 0 ? (
                              <div className="text-center py-8 text-gray-400 text-sm">
                                Nenhum card encontrado
                              </div>
                            ) : (
                              columnData.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => handleCardClick(item)}
                                      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer kanban-card"
                                    >
                                      <div className="space-y-3">
                                        <div className="font-medium text-gray-900 text-sm break-words">{item.numeroProcesso}</div>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                          <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                            <span>{formatTimeAgo(item.dataDisponibilizacao)}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                            <span>{formatDate(item.dataDisponibilizacao)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden md:grid md:grid-cols-4 gap-6 kanban-grid">
              {columns.map((column) => {
                const columnData = getColumnData(column.id as Status);
                const count = columnData.length;
                
                return (
                  <div key={column.id} className="bg-white rounded-lg border border-gray-200 kanban-column">
                    <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {column.id === 'concluida' && (
                            <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <h3 className="font-medium text-gray-900 text-sm">{column.title}</h3>
                        </div>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                          {count}
                        </span>
                      </div>
                    </div>
                    <Droppable droppableId={column.id}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="p-4 kanban-column-content space-y-3">
                          {columnData.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              Nenhum card encontrado
                            </div>
                          ) : (
                            columnData.map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => handleCardClick(item)}
                                    className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer kanban-card"
                                  >
                                    <div className="space-y-3">
                                      <div className="font-medium text-gray-900 text-sm">{item.numeroProcesso}</div>
                                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <div className="flex items-center space-x-1">
                                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                          <span>{formatTimeAgo(item.dataDisponibilizacao)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                          <span>{formatDate(item.dataDisponibilizacao)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {isSearching && searchProgress && (
          <div className="fixed bottom-6 right-6 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full flex-shrink-0"></div>
            <div className="text-sm">
              <div className="font-medium">Busca Personalizada</div>
              <div className="text-blue-100">{searchProgress}</div>
            </div>
          </div>
        )}
      </main>

      {selectedPublicacao && (
        <PublicacaoModal
          publicacao={selectedPublicacao}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default KanbanPage; 