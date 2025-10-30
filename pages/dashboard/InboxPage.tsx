import React from 'react';
import Header from '../../components/Header';

const InboxPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6">
        <div className="bg-gray-800 p-8 rounded-lg text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Caixa de Entrada</h2>
          <p className="text-gray-400">Esta funcionalidade está em construção.</p>
        </div>
      </div>
    </div>
  );
};

export default InboxPage;