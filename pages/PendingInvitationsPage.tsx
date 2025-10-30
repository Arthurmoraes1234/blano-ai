import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { Invitation } from '../types';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { Hourglass, MailCheck, LogOut } from 'lucide-react';

const InvitationCard: React.FC<{
    invitation: Invitation;
    onAccept: (invitation: Invitation) => void;
    isAccepting: boolean;
    isDisabled: boolean;
}> = ({ invitation, onAccept, isAccepting, isDisabled }) => (
    <li className="flex flex-col sm:flex-row justify-between items-center bg-white/5 p-4 rounded-lg animate-fadeInSlideUp">
        <div className="text-center sm:text-left mb-4 sm:mb-0">
            <p className="font-bold text-xl text-white">{invitation.nome_agencia}</p>
            <p className="text-sm text-gray-400">Convidou você para se juntar à equipe.</p>
        </div>
        <Button 
            onClick={() => onAccept(invitation)}
            isLoading={isAccepting}
            disabled={isDisabled}
            className="w-full sm:w-auto"
        >
            <MailCheck size={16} className="mr-2"/>
            Aceitar Convite
        </Button>
    </li>
);

const WaitingForInvitation: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="text-center text-gray-400 py-10 flex flex-col items-center animate-fadeIn">
            <div className="relative mb-6">
                <Hourglass size={48} className="mx-auto text-gray-500 animate-pulse"/>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Quase lá!</h2>
            <p>Sua conta está pronta e aguardando um convite.</p>
            <p className="text-sm mt-2">
                Peça para o dono da agência enviar um convite para o email: <br/>
                <span className="font-semibold text-gray-300 block mt-1">{user?.email}</span>
            </p>
             <p className="text-xs text-gray-600 mt-6">A página será atualizada automaticamente assim que o convite chegar.</p>
        </div>
    );
};

const PendingInvitationsPage: React.FC = () => {
    const { invitations, loading } = useData();
    const { user } = useAuth();
    const [acceptingId, setAcceptingId] = React.useState<number | null>(null);

    const handleAcceptInvitation = async (invitation: Invitation) => {
        if (!user) return;
        setAcceptingId(invitation.id);
        try {
            await supabaseService.acceptInvitation(invitation);
            window.location.reload(); 
        } catch (error) {
            console.error("Failed to accept invitation:", error);
            alert("Ocorreu um erro ao aceitar o convite.");
            setAcceptingId(null);
        }
    };
    
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <header className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-12 w-auto" />
                    </div>
                    <p className="text-xl text-gray-300">Bem-vindo(a), <span className="font-semibold text-white">{user?.name || 'Designer'}</span>!</p>
                </header>

                <main className="glass-panel rounded-lg p-6 sm:p-8">
                    {loading ? (
                        <div className="flex justify-center p-10"><Spinner/></div>
                    ) : invitations.length > 0 ? (
                        <div>
                            <h2 className="text-2xl font-semibold mb-6 text-center text-white">Você recebeu um convite!</h2>
                            <ul className="space-y-4">
                                {invitations.map(inv => (
                                    <InvitationCard 
                                        key={inv.id}
                                        invitation={inv}
                                        onAccept={handleAcceptInvitation}
                                        isAccepting={acceptingId === inv.id}
                                        isDisabled={!!acceptingId}
                                    />
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <WaitingForInvitation />
                    )}
                </main>

                <footer className="mt-8 text-center">
                    <Button variant="ghost" onClick={() => authService.logout()}>
                        <LogOut size={16} className="mr-2"/>
                        Sair
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default PendingInvitationsPage;