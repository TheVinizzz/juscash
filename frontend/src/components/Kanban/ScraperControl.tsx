import React, { useState, useEffect } from 'react';
import { PlayIcon, ClockIcon, DocumentTextIcon, ExclamationTriangleIcon, CalendarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { runScraper, getScraperStatus, ScraperStats, ScraperStatusResponse, runAdvancedScraper, ScraperAdvancedResponse, runCustomSearch } from '../../services/api';
import toast from 'react-hot-toast';

interface ScraperControlProps {
  onScrapingComplete?: () => void;
}

const ScraperControl: React.FC<ScraperControlProps> = ({ onScrapingComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isAdvancedRunning, setIsAdvancedRunning] = useState(false);
  const [status, setStatus] = useState<ScraperStatusResponse['data'] | null>(null);
  const [lastStats, setLastStats] = useState<ScraperStats | null>(null);
  const [lastAdvancedStats, setLastAdvancedStats] = useState<ScraperAdvancedResponse | null>(null);
  const [daysBack, setDaysBack] = useState(7);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Estados para pesquisa avançada
  const [dataInicio, setDataInicio] = useState('17/03/2025');
  const [dataFim, setDataFim] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR');
  });

  // Carregar status inicial
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await getScraperStatus();
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar status do scraper:', error);
    }
  };

  const handleRunScraper = async () => {
    if (isRunning) return;

    setIsRunning(true);
    const loadingToast = toast.loading('Executando scraper... Isso pode levar alguns minutos.');

    try {
      const response = await runScraper(daysBack);
      
      if (response.success) {
        toast.success(`Scraper executado com sucesso! ${response.stats?.total_inseridas || 0} novas publicações encontradas.`);
        setLastStats(response.stats || null);
        
        // Recarregar status
        await loadStatus();
        
        // Notificar componente pai
        if (onScrapingComplete) {
          onScrapingComplete();
        }
      } else {
        toast.error(`Erro no scraper: ${response.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao executar scraper:', error);
      toast.error(`Erro ao executar scraper: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsRunning(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleRunAdvancedScraper = async () => {
    if (isAdvancedRunning) return;

    // Validar datas
    if (!dataInicio || !dataFim) {
      toast.error('Por favor, preencha as datas de início e fim.');
      return;
    }

    setIsAdvancedRunning(true);
    const loadingToast = toast.loading('Executando pesquisa avançada... Isso pode levar alguns minutos.');

    try {
      const response = await runCustomSearch('INSS', dataInicio, dataFim);
      
      if (response.success) {
        toast.success(`Pesquisa avançada concluída! ${response.data?.publicacoesSalvas || 0} publicações salvas no banco de dados.`);
        
        // Adaptar resposta para o formato esperado
        const adaptedStats = {
          success: true,
          date_range: `${dataInicio} até ${dataFim}`,
          total_found: response.data?.publicacoesEncontradas || 0,
          total_processed: response.data?.publicacoesEncontradas || 0,
          total_sent: response.data?.publicacoesSalvas || 0,
          total_filtered: 0,
          execution_time: parseFloat(response.data?.tempoExecucao?.replace('s', '') || '0'),
          errors: []
        };
        
        setLastAdvancedStats(adaptedStats);
        
        // Recarregar status
        await loadStatus();
        
        // Notificar componente pai
        if (onScrapingComplete) {
          onScrapingComplete();
        }
      } else {
        toast.error(`Erro na pesquisa avançada: ${response.message || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao executar pesquisa avançada:', error);
      toast.error(`Erro na pesquisa avançada: ${error.message}`);
    } finally {
      setIsAdvancedRunning(false);
      toast.dismiss(loadingToast);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatExecutionTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
          Scraper DJE-TJSP
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              showAdvanced
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Pesquisa Avançada</span>
          </button>
        </div>
      </div>

      {/* Pesquisa Avançada */}
      {showAdvanced && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
          <h4 className="text-md font-semibold text-blue-900 mb-3 flex items-center">
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Pesquisa Avançada por Período
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Data de Início
              </label>
              <input
                type="text"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                placeholder="DD/MM/AAAA"
                disabled={isAdvancedRunning}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Data de Fim
              </label>
              <input
                type="text"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                placeholder="DD/MM/AAAA"
                disabled={isAdvancedRunning}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <button
                onClick={handleRunAdvancedScraper}
                disabled={isAdvancedRunning}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isAdvancedRunning
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isAdvancedRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    <span>Buscar Período</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-blue-700">
            <p><strong>Configuração atual:</strong> Busca publicações de RPV e pagamentos do INSS no Caderno 3 - Judicial - 1ª Instância - Capital - Parte I</p>
          </div>
        </div>
      )}

      {/* Scraper Simples */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-gray-700">Scraper Simples (Últimos Dias)</h4>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Dias:</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(parseInt(e.target.value))}
              disabled={isRunning}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1 dia</option>
              <option value={3}>3 dias</option>
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </div>
          
          <button
            onClick={handleRunScraper}
            disabled={isRunning}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isRunning
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Executando...</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                <span>Executar Scraper</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total de Publicações</p>
              <p className="text-2xl font-bold text-blue-900">
                {status?.totalPublicacoes || 0}
              </p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Publicações Hoje</p>
              <p className="text-2xl font-bold text-green-900">
                {status?.publicacoesHoje || 0}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Última Execução</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(status?.ultimaExecucao || null)}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Estatísticas da Pesquisa Avançada */}
      {lastAdvancedStats && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <MagnifyingGlassIcon className="h-4 w-4 mr-1 text-blue-600" />
            Última Pesquisa Avançada:
          </h4>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Período:</span>
                <p className="text-blue-900 font-medium">{lastAdvancedStats.date_range}</p>
              </div>
              <div>
                <span className="text-blue-600">Encontradas:</span>
                <span className="ml-2 font-medium text-blue-900">{lastAdvancedStats.total_found}</span>
              </div>
              <div>
                <span className="text-blue-600">Processadas:</span>
                <span className="ml-2 font-medium text-blue-900">{lastAdvancedStats.total_processed}</span>
              </div>
              <div>
                <span className="text-blue-600">Salvas:</span>
                <span className="ml-2 font-medium text-green-600">{lastAdvancedStats.total_sent}</span>
              </div>
              <div>
                <span className="text-blue-600">Tempo:</span>
                <span className="ml-2 font-medium text-blue-900">{formatExecutionTime(lastAdvancedStats.execution_time)}</span>
              </div>
            </div>
            {lastAdvancedStats.errors.length > 0 && (
              <div className="mt-2 text-sm">
                <span className="text-red-600 font-medium">Erros:</span>
                <ul className="text-red-700 ml-4 list-disc">
                  {lastAdvancedStats.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Últimas Estatísticas do Scraper Simples */}
      {lastStats && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Última Execução (Scraper Simples):</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Encontradas:</span>
              <span className="ml-2 font-medium">{lastStats.total_publicacoes}</span>
            </div>
            <div>
              <span className="text-gray-600">Inseridas:</span>
              <span className="ml-2 font-medium text-green-600">{lastStats.total_inseridas}</span>
            </div>
            <div>
              <span className="text-gray-600">Datas:</span>
              <span className="ml-2 font-medium">{lastStats.dates_processed}</span>
            </div>
            <div>
              <span className="text-gray-600">Erros:</span>
              <span className={`ml-2 font-medium ${lastStats.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {lastStats.errors}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Aviso */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Importante:</p>
            <p>
              <strong>Pesquisa Avançada:</strong> Busca publicações de RPV e pagamentos do INSS no período especificado (desde 17/03/2025).<br/>
              <strong>Scraper Simples:</strong> Busca publicações dos últimos dias selecionados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScraperControl; 