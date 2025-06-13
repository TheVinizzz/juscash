import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ScrapingProgress as ScrapingProgressType } from '../services/scraperService';

interface ScrapingProgressProps {
  progress: ScrapingProgressType | null;
  isRunning: boolean;
  onStop: () => void;
}

const ScrapingProgress: React.FC<ScrapingProgressProps> = ({ 
  progress, 
  isRunning, 
  onStop 
}) => {
  if (!isRunning || !progress) return null;

  const progressPercentage = (progress.currentDay / progress.totalDays) * 100;

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 text-blue-500 mr-2 animate-spin" />
          <h3 className="text-sm font-medium text-gray-900">Buscando Publicações</h3>
        </div>
        <button
          onClick={onStop}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Parar busca"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Informações */}
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Progresso:</span>
            <span className="font-medium">
              {progress.currentDay} / {progress.totalDays} dias
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Data atual:</span>
            <span className="font-medium">
              {new Date(progress.currentDate).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Publicações encontradas:</span>
            <span className="font-medium text-green-600">
              {progress.totalPublications}
            </span>
          </div>

          {progress.newPublications > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
              <span className="text-green-800 text-xs font-medium">
                ✅ {progress.newPublications} nova{progress.newPublications > 1 ? 's' : ''} hoje
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrapingProgress; 