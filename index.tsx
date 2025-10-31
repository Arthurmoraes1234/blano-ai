import { createRoot } from 'react-dom/client';
import App from './App';

// A remoção do "import React from 'react';" e do "<React.StrictMode>"
// é a melhor forma de forçar o ambiente a usar a injeção de dependências 
// correta (react-dom/client) e ignorar o erro de 'jsx-runtime'
// que está preso no ambiente.

const rootElement = document.getElementById('root');
if (!rootElement) {
    // Esta mensagem de erro é importante para o diagnóstico.
    throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

root.render(
    // Retiramos o <React.StrictMode>
    <App />
);

