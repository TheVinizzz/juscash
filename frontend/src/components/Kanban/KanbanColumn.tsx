import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Publicacao, Status } from '../../types';

interface KanbanColumnProps {
  title: string;
  status: Status;
  publicacoes?: Publicacao[];
  onPublicacaoClick?: (publicacao: Publicacao) => void;
  color: string;
  textColor?: string;
  bgColor?: string;
  count?: number;
  children?: React.ReactNode;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  publicacoes = [],
  onPublicacaoClick,
  color,
  count,
  children
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          header: 'bg-blue-500',
          count: 'bg-blue-100 text-blue-800'
        };
      case 'yellow':
        return {
          header: 'bg-yellow-500',
          count: 'bg-yellow-100 text-yellow-800'
        };
      case 'purple':
        return {
          header: 'bg-purple-500',
          count: 'bg-purple-100 text-purple-800'
        };
      case 'green':
        return {
          header: 'bg-green-500',
          count: 'bg-green-100 text-green-800'
        };
      default:
        return {
          header: 'bg-gray-500',
          count: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className={`${colorClasses.header} p-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium text-sm">
            {title}
          </h3>
          <span className={`${colorClasses.count} text-xs font-semibold px-2 py-1 rounded-full`}>
            {count !== undefined ? count : publicacoes.length}
          </span>
        </div>
      </div>

      {/* Content */}
      {children ? (
        children
      ) : (
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 min-h-[200px] ${
                snapshot.isDraggingOver ? 'bg-gray-50' : ''
              }`}
            >
              {publicacoes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Nenhum card encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {publicacoes.map((publicacao, index) => (
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
                          onClick={() => onPublicacaoClick?.(publicacao)}
                          className={`bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {publicacao.numeroProcesso}
                              </h4>
                              <div className="flex items-center text-xs text-gray-500">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {new Date(publicacao.dataDisponibilizacao).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              {publicacao.autores.length > 30 
                                ? `${publicacao.autores.substring(0, 30)}...` 
                                : publicacao.autores
                              }
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">
                                {new Date(publicacao.updatedAt).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-blue-600 hover:text-blue-800">
                                Ver mais →
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
};

export default KanbanColumn; 