import React from 'react';
import { authService } from '../services/authService';
import Button from '../components/Button';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

const ProfileSetupErrorPage: React.FC = () => {
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl text-center">
                <AlertTriangle size={64} className="mx-auto text-red-500 mb-6" />
                <h1 className="text-3xl font-bold mb-4">Falha ao Carregar seu Perfil</h1>
                <div className="glass-panel p-8 rounded-lg">
                    <p className="text-gray-300 mb-6">
                        Conseguimos autenticar sua conta com sucesso, mas não foi possível carregar os dados do seu perfil do nosso banco de dados. Sem esses dados, o aplicativo não pode funcionar.
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Isso geralmente acontece por um de dois motivos:
                        <ul className="list-disc list-inside text-left mt-2 space-y-1">
                            <li>Houve um atraso na criação do seu perfil durante o cadastro.</li>
                            <li>As políticas de segurança do banco de dados (Row Level Security) podem não estar configuradas corretamente para permitir que você leia seus próprios dados.</li>
                        </ul>
                    </p>
                    <p className="text-gray-300 font-semibold mb-6">
                        O que você pode fazer?
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button onClick={() => window.location.reload()} variant="secondary">
                            <RefreshCw size={16} className="mr-2"/>
                            Tentar Novamente
                        </Button>
                        <Button onClick={() => authService.logout()}>
                             <LogOut size={16} className="mr-2"/>
                            Sair
                        </Button>
                    </div>
                     <p className="text-xs text-gray-500 mt-8">
                        Se o problema persistir, por favor contate o suporte e mencione este erro.
                     </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetupErrorPage;
