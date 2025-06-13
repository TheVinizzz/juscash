import React, { useEffect, useRef, useCallback } from 'react';
import { Status } from '../../types';
import { usePublicacaoStore } from '../../store/publicacaoStore';

interface InfiniteScrollColumnProps {
  children: React.ReactNode;
  status: Status;
  className?: string;
}

const InfiniteScrollColumn: React.FC<InfiniteScrollColumnProps> = ({
  children,
  status,
  className = ''
}) => {
  const { fetchMorePublicacoes, paginationData } = usePublicacaoStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);

  const handleScroll = useCallback(async () => {
    const element = scrollRef.current;
    if (!element || loadingRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Carregar mais quando estiver a 90% do final
    if (scrollPercentage > 0.9) {
      const currentPagination = paginationData[status];
      
      if (currentPagination.hasMore && !currentPagination.isLoading) {
        loadingRef.current = true;
        try {
          await fetchMorePublicacoes(status);
        } finally {
          loadingRef.current = false;
        }
      }
    }
  }, [status, fetchMorePublicacoes, paginationData]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const currentPagination = paginationData[status];

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight: '70vh' }}
    >
      {children}
      
      {/* Loading indicator */}
      {currentPagination.isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* End of list indicator */}
      {!currentPagination.hasMore && (
        <div className="text-center py-4 text-gray-500 text-sm">
          {/* Não há mais publicações para carregar */}
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollColumn; 