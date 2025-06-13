import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface BuscaAutomaticaStatus {
  ativa: boolean;
  dataInicio: string;
  dataAtual: string;
  dataFim: string;
  totalDias: number;
  diasProcessados: number;
  publicacoesEncontradas: number;
  ultimaAtualizacao: string;
  erro: string | null;
}

interface BuscaAutomaticaProps {
  onPublicacoesAtualizadas: () => void;
}

const BuscaAutomatica: React.FC<BuscaAutomaticaProps> = ({ onPublicacoesAtualizadas }) => {
  const [status, setStatus] = useState<BuscaAutomaticaStatus | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [ultimaDataProcessada, setUltimaDataProcessada] = useState<string>('');
  const [velocidadeProcessamento, setVelocidadeProcessamento] = useState<number>(0);

  // Verifica status a cada 2 segundos quando busca está ativa
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (status?.ativa) {
      interval = setInterval(verificarStatus, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.ativa]);

  // Inicia busca automática ao montar o componente
  useEffect(() => {
    iniciarBuscaAutomatica();
  }, []);

  // Calcula velocidade de processamento
  useEffect(() => {
    if (status && ultimaDataProcessada && ultimaDataProcessada !== status.dataAtual) {
      const agora = new Date().getTime();
      const ultimaAtualizacao = new Date(status.ultimaAtualizacao).getTime();
      const tempoDecorrido = (agora - ultimaAtualizacao) / 1000; // em segundos
      
      if (tempoDecorrido > 0) {
        setVelocidadeProcessamento(Math.round(60 / tempoDecorrido)); // datas por minuto
      }
      
      setUltimaDataProcessada(status.dataAtual);
    }
  }, [status?.dataAtual, ultimaDataProcessada]);

  const verificarStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/publicacoes/busca-automatica/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const novoStatus = data.status;
        
        // Se a busca foi concluída, atualiza as publicações
        if (status?.ativa && !novoStatus.ativa && novoStatus.publicacoesEncontradas > 0) {
          onPublicacoesAtualizadas();
          toast.success(`🎉 Busca concluída! ${novoStatus.publicacoesEncontradas} publicações encontradas.`);
        }
        
        // Se encontrou novas publicações, mostra notificação
        if (status && novoStatus.publicacoesEncontradas > status.publicacoesEncontradas) {
          const novasPublicacoes = novoStatus.publicacoesEncontradas - status.publicacoesEncontradas;
          toast(`📄 ${novasPublicacoes} nova(s) publicação(ões) encontrada(s)!`);
          onPublicacoesAtualizadas();
        }
        
        setStatus(novoStatus);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const iniciarBuscaAutomatica = async () => {
    try {
      setIniciando(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/publicacoes/busca-automatica/iniciar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        toast(`🚀 Busca automática iniciada! Buscando publicações desde 17/03/2025...`);
      } else {
        if (data.message?.includes('já está em andamento')) {
          // Busca já está ativa, apenas verifica o status
          verificarStatus();
          toast(`🔄 Busca automática já está em andamento...`);
        } else {
          toast.error(`❌ Erro ao iniciar busca: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('Erro ao iniciar busca automática:', error);
      toast.error('❌ Erro ao iniciar busca automática');
    } finally {
      setIniciando(false);
    }
  };

  const pararBusca = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/publicacoes/busca-automatica/parar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        toast(`⏹️ Busca automática interrompida`);
      } else {
        toast.error(`❌ Erro ao parar busca: ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao parar busca:', error);
      toast.error('❌ Erro ao parar busca automática');
    }
  };

  const calcularProgresso = () => {
    if (!status || status.totalDias === 0) return 0;
    return Math.round((status.diasProcessados / status.totalDias) * 100);
  };

  const calcularTempoRestante = () => {
    if (!status || !velocidadeProcessamento || velocidadeProcessamento === 0) return 'Calculando...';
    
    const diasRestantes = status.totalDias - status.diasProcessados;
    const minutosRestantes = Math.round(diasRestantes / velocidadeProcessamento);
    
    if (minutosRestantes < 60) {
      return `~${minutosRestantes} minutos`;
    } else {
      const horas = Math.floor(minutosRestantes / 60);
      const minutos = minutosRestantes % 60;
      return `~${horas}h ${minutos}m`;
    }
  };

  const formatarData = (dataStr: string) => {
    try {
      return new Date(dataStr).toLocaleString('pt-BR');
    } catch {
      return dataStr;
    }
  };

  const getStatusIcon = () => {
    if (iniciando) return '🚀';
    if (!status) return '⏸️';
    if (status.ativa) return '🔍';
    if (status.diasProcessados > 0) return '✅';
    return '⏸️';
  };

  const getStatusText = () => {
    if (iniciando) return 'Iniciando busca automática...';
    if (!status) return 'Aguardando inicialização...';
    if (status.ativa) return 'Buscando dados no DJE-TJSP...';
    if (status.diasProcessados > 0) return 'Busca automática concluída';
    return 'Busca automática não iniciada';
  };

  if (iniciando) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <div>
            <span className="text-blue-800 font-medium">🚀 Iniciando busca automática...</span>
            <p className="text-blue-600 text-sm mt-1">Configurando sistema para buscar publicações desde 17/03/2025</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-600">⏸️ Busca automática não iniciada</span>
            <p className="text-gray-500 text-sm">Clique para iniciar a busca de publicações</p>
          </div>
          <button
            onClick={iniciarBuscaAutomatica}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar Busca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 mb-4 shadow-sm transition-all duration-300 ${
      status.ativa 
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' 
        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{getStatusIcon()}</span>
          <div>
            <h3 className={`font-semibold ${
              status.ativa ? 'text-blue-800' : 'text-green-800'
            }`}>
              {getStatusText()}
            </h3>
            {status.ativa && (
              <p className="text-sm text-blue-600 mt-1">
                Processando data: <strong>{status.dataAtual}</strong>
              </p>
            )}
          </div>
        </div>
        
        {status.ativa && (
          <button
            onClick={pararBusca}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center"
          >
            ⏹️ Parar
          </button>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progresso</span>
          <span className="font-medium">{calcularProgresso()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              status.ativa 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600'
            }`}
            style={{ width: `${calcularProgresso()}%` }}
          ></div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{status.diasProcessados}</div>
          <div className="text-xs text-gray-600">Dias processados</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{status.publicacoesEncontradas}</div>
          <div className="text-xs text-gray-600">Publicações encontradas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{status.totalDias - status.diasProcessados}</div>
          <div className="text-xs text-gray-600">Dias restantes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-600">{velocidadeProcessamento || 0}</div>
          <div className="text-xs text-gray-600">Datas/min</div>
        </div>
      </div>

      {/* Detalhes */}
      <div className="space-y-2 text-sm border-t pt-3">
        <div className="flex justify-between">
          <span className="text-gray-600">📅 Período:</span>
          <span className="font-medium">{status.dataInicio} até {status.dataFim}</span>
        </div>
        
        {status.ativa && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">⏱️ Tempo estimado:</span>
              <span className="font-medium text-blue-600">{calcularTempoRestante()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">🔄 Última atualização:</span>
              <span className="text-xs text-gray-500">{formatarData(status.ultimaAtualizacao)}</span>
            </div>
          </>
        )}
      </div>

      {/* Indicador de atividade */}
      {status.ativa && (
        <div className="mt-3 flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
          <span className="ml-2 text-xs text-blue-600 font-medium">Buscando dados...</span>
        </div>
      )}

      {status.erro && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          <strong>❌ Erro:</strong> {status.erro}
        </div>
      )}
    </div>
  );
};

export default BuscaAutomatica; 