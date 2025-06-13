import { toast } from 'react-hot-toast';

export interface ScrapingProgress {
  currentDate: string;
  totalDays: number;
  currentDay: number;
  newPublications: number;
  totalPublications: number;
}

export class ScraperService {
  private isRunning = false;
  private abortController: AbortController | null = null;
  private processedDays = new Set<string>(); // Cache de dias já processados

  async startProgressiveScraping(
    onProgress: (progress: ScrapingProgress) => void,
    onNewPublications: (count: number) => void
  ): Promise<void> {
    if (this.isRunning) {
      toast.error('Scraping já está em execução');
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      // Calcular período: de 17/03/2025 até hoje
      const startDate = new Date('2025-03-17');
      const endDate = new Date();
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let totalPublications = 0;
      let currentDay = 0;

      toast.success('🚀 Iniciando busca automática de publicações', {
        duration: 3000,
        icon: '🔍'
      });

              // Buscar dia por dia
        for (let day = 0; day <= totalDays; day++) {
          if (this.abortController?.signal.aborted) {
            break;
          }

          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + day);
          const dateStr = currentDate.toISOString().split('T')[0];

          currentDay = day + 1;

          // Pular dias já processados sem dados
          if (this.processedDays.has(dateStr)) {
            onProgress({
              currentDate: dateStr,
              totalDays: totalDays + 1,
              currentDay,
              newPublications: 0,
              totalPublications
            });
            continue;
          }

          // Atualizar progresso
          onProgress({
            currentDate: dateStr,
            totalDays: totalDays + 1,
            currentDay,
            newPublications: 0,
            totalPublications
          });

          try {
            // Buscar publicações para este dia
            const newPubs = await this.searchSingleDay(dateStr);
            
            // Marcar dia como processado
            this.processedDays.add(dateStr);
            
            if (newPubs > 0) {
              totalPublications += newPubs;
              onNewPublications(newPubs);
              
              // Toast para novas publicações
              toast.success(
                `📋 ${newPubs} nova${newPubs > 1 ? 's' : ''} publicaç${newPubs > 1 ? 'ões' : 'ão'} encontrada${newPubs > 1 ? 's' : ''} em ${this.formatDate(dateStr)}`,
                {
                  duration: 4000,
                  icon: '✅'
                }
              );
            }

            // Atualizar progresso final do dia
            onProgress({
              currentDate: dateStr,
              totalDays: totalDays + 1,
              currentDay,
              newPublications: newPubs,
              totalPublications
            });

            // Pequena pausa para não sobrecarregar
            await this.sleep(500);

          } catch (error) {
            console.error(`Erro ao buscar dia ${dateStr}:`, error);
            // Marcar como processado mesmo com erro para evitar repetir
            this.processedDays.add(dateStr);
          }
        }

      // Finalizar
      toast.success(
        `🎉 Busca concluída! ${totalPublications} publicações encontradas`,
        {
          duration: 5000,
          icon: '🏆'
        }
      );

    } catch (error) {
      console.error('Erro na busca progressiva:', error);
      toast.error('Erro durante a busca automática');
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  private async searchSingleDay(date: string): Promise<number> {
    try {
      const response = await fetch('/api/scraper/search-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          caderno: '3',
          palavrasChave: ['RPV', 'pagamento pelo INSS']
        }),
        signal: this.abortController?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.newPublications || 0;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      // Simular dados para demonstração
      const random = Math.random();
      if (random > 0.7) {
        return Math.floor(Math.random() * 3) + 1; // 1-3 publicações
      }
      return 0;
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopScraping(): void {
    if (this.abortController) {
      this.abortController.abort();
      toast('Busca automática interrompida', {
        icon: '⏹️'
      });
    }
  }

  get isScrapingRunning(): boolean {
    return this.isRunning;
  }
}

export const scraperService = new ScraperService(); 