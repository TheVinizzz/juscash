import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Publicacao, Status } from '../types';
import { getPublicacoes, updatePublicacaoStatus as updateStatusAPI } from '../services/api';
import toast from 'react-hot-toast';

interface PublicacaoStore {
  publicacoes: Publicacao[];
  searchTerm: string;
  isLoading: boolean;
  paginationData: Record<Status, { page: number; hasMore: boolean; isLoading: boolean }>;
  
  // Actions
  setPublicacoes: (publicacoes: Publicacao[]) => void;
  addPublicacao: (publicacao: Publicacao) => void;
  addPublicacoes: (publicacoes: Publicacao[]) => void;
  updatePublicacaoStatus: (id: string, status: Status) => Promise<void>;
  fetchPublicacoes: () => Promise<void>;
  fetchMorePublicacoes: (status: Status) => Promise<void>;
  setSearchTerm: (term: string) => void;
  setLoading: (loading: boolean) => void;
  resetPagination: () => void;
}

export const usePublicacaoStore = create<PublicacaoStore>()(
  devtools(
    (set, get) => ({
      publicacoes: [],
      isLoading: false,
      searchTerm: '',
      paginationData: {
        nova: { page: 1, hasMore: true, isLoading: false },
        lida: { page: 1, hasMore: true, isLoading: false },
        'enviado para ADV': { page: 1, hasMore: true, isLoading: false },
        'concluída': { page: 1, hasMore: true, isLoading: false },
      },

      setPublicacoes: (publicacoes) => set({ publicacoes }),
      
      addPublicacao: (publicacao) => 
        set((state) => ({ 
          publicacoes: [...state.publicacoes, publicacao] 
        })),

      addPublicacoes: (novasPublicacoes) => 
        set((state) => {
          // Evitar duplicatas
          const existingIds = new Set(state.publicacoes.map(p => p.id));
          const newUniquePublicacoes = novasPublicacoes.filter(p => !existingIds.has(p.id));
          
          return {
            publicacoes: [...state.publicacoes, ...newUniquePublicacoes]
          };
        }),

      setSearchTerm: (searchTerm) => set({ searchTerm }),

      setLoading: (loading) => set({ isLoading: loading }),

      fetchPublicacoes: async () => {
        try {
          set({ isLoading: true });
          
          const response = await getPublicacoes();
          
          if (response.success) {
            set({ publicacoes: response.data });
          } else {
            toast.error('Erro ao carregar publicações');
          }
        } catch (error) {
          console.error('Erro ao buscar publicações:', error);
          toast.error('Erro ao carregar publicações');
        } finally {
          set({ isLoading: false });
        }
      },

      updatePublicacaoStatus: async (id: string, status: Status) => {
        try {
          await updateStatusAPI(id, status);
          
          set((state) => ({
            publicacoes: state.publicacoes.map((pub) =>
              pub.id === id 
                ? { ...pub, status, updatedAt: new Date().toISOString() }
                : pub
            )
          }));
        } catch (error) {
          console.error('Erro ao atualizar status:', error);
          throw error;
        }
      },

      fetchMorePublicacoes: async (status: Status) => {
        const state = get();
        const currentPagination = state.paginationData[status];
        
        if (currentPagination.isLoading || !currentPagination.hasMore) {
          return;
        }

        try {
          // Atualizar estado de loading para essa coluna
          set((state) => ({
            paginationData: {
              ...state.paginationData,
              [status]: { ...state.paginationData[status], isLoading: true }
            }
          }));

          const response = await getPublicacoes({
            status: [status]
          });
          
          if (response.success && response.data.length > 0) {
            // Adicionar novas publicações
            const existingIds = new Set(state.publicacoes.map(p => p.id));
            const newPublicacoes = response.data.filter(p => !existingIds.has(p.id));
            
            set((state) => ({
              publicacoes: [...state.publicacoes, ...newPublicacoes],
              paginationData: {
                ...state.paginationData,
                [status]: {
                  ...state.paginationData[status],
                  page: currentPagination.page + 1,
                  hasMore: response.data.length === 30,
                  isLoading: false
                }
              }
            }));
          } else {
            // Não há mais dados
            set((state) => ({
              paginationData: {
                ...state.paginationData,
                [status]: {
                  ...state.paginationData[status],
                  hasMore: false,
                  isLoading: false
                }
              }
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar mais publicações:', error);
          set((state) => ({
            paginationData: {
              ...state.paginationData,
              [status]: { ...state.paginationData[status], isLoading: false }
            }
          }));
        }
      },

      resetPagination: () => {
        set({
          paginationData: {
            nova: { page: 1, hasMore: true, isLoading: false },
            lida: { page: 1, hasMore: true, isLoading: false },
            'enviado para ADV': { page: 1, hasMore: true, isLoading: false },
            'concluída': { page: 1, hasMore: true, isLoading: false },
          }
        });
      },
    }),
    {
      name: 'publicacao-store',
    }
  )
); 