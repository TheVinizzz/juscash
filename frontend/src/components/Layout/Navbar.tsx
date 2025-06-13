import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold">JusCash</h1>
          <span className="text-blue-200 text-sm">DJE-SP Manager</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="hover:bg-blue-700 px-3 py-1 rounded">
            Configurações
          </button>
          <button className="hover:bg-blue-700 px-3 py-1 rounded">
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}; 