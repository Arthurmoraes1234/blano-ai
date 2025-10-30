import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Zap, ShieldCheck } from 'lucide-react';
import Spinner from '../components/Spinner';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';

const plans = {
  standard: 'price_1SDB6OP7wbQf0EBDVlYXGw8d',
  unlimited: 'price_1SDB6i7wbQf0EBDxEHtpi7g',
};

const ActivatePlanPage: React.FC = () => {
    const { user, loading } = useAuth();
    const { addToast } = useToast();
    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
    
    const handleCheckout = async (priceId: string) => {
        setIsRedirecting(priceId);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { priceId },
            });
            if (error) throw error;
            window.location.href = data.url;
        } catch (error) {
            addToast(`Erro ao criar sessão de checkout: ${(error as Error).message}`, 'error');
            setIsRedirecting(null);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-900"><Spinner /></div>;
    }

    if (!user || user.role !== 'owner') {
        return <Navigate to="/login" replace />;
    }

    // CORREÇÃO: Garante que apenas usuários com uma assinatura realmente ativa sejam redirecionados.
    const hasActiveSubscription = user.subscription && (user.subscription.status === 'active' || user.subscription.status === 'trialing');
    if (hasActiveSubscription) {
        return <Navigate to="/dashboard" replace />;
    }

    const featureList = [
      "Planejamentos e conteúdos em um clique",
      "Gerador de imagens realistas integrado",
      "Portal de cliente com sua logo",
      "CRM e dashboard financeiro integrados",
      "Gestão de equipe e permissões",
      "Notificações inteligentes em tempo real",
    ];

    return (
        <div className="min-h-screen text-white bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-3xl mx-auto">
                <div className="flex items-center justify-center mb-4">
                    <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-12 w-auto" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Bem-vindo(a) à Blano AI!</h1>
                <p className="text-lg text-gray-400">Para começar a usar a plataforma, ative seu plano. Você terá 7 dias de teste gratuito.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12 w-full">
                {/* Plano Padrão */}
                <div className="glass-panel p-8 rounded-2xl flex flex-col border-2 border-transparent relative">
                     <div className="absolute top-4 right-4 text-sm bg-blue-500/20 text-blue-300 font-semibold px-4 py-1.5 rounded-full flex items-center gap-2">
                        <ShieldCheck size={18} /> 7 Dias Grátis
                    </div>
                    <h2 className="text-2xl font-semibold text-white">Padrão</h2>
                    <p className="text-gray-400 mt-2">Ideal para agências começando e com um volume menor de clientes.</p>
                    <div className="my-8">
                        <span className="text-5xl font-bold text-white">R$29</span>
                        <span className="text-gray-400">,90/mês</span>
                    </div>
                    <ul className="space-y-3 text-gray-300 flex-grow">
                        <li className="flex items-start"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3 flex-shrink-0 mt-1" /> <strong>20 projetos por mês</strong></li>
                        {featureList.map((feature, index) => (
                           <li key={index} className="flex items-start"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3 flex-shrink-0 mt-1" /> {feature}</li>
                        ))}
                    </ul>
                    <div className="mt-8">
                        <Button 
                            className="w-full !text-gray-900 font-bold"
                            size="lg"
                            onClick={() => handleCheckout(plans.standard)}
                            isLoading={isRedirecting === plans.standard}
                            disabled={!!isRedirecting}
                        >
                            Iniciar Teste Gratuito
                        </Button>
                    </div>
                </div>

                {/* Plano Ilimitado */}
                <div className="glass-panel p-8 rounded-2xl flex flex-col border-2 border-[var(--btn-grad-to)] relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--btn-grad-from)] to-[var(--btn-grad-to)] px-6 py-1 rounded-b-lg text-sm font-bold text-white shadow-lg">Mais Popular</div>
                     <div className="absolute top-4 right-4 text-sm bg-blue-500/20 text-blue-300 font-semibold px-4 py-1.5 rounded-full flex items-center gap-2">
                        <ShieldCheck size={18} /> 7 Dias Grátis
                    </div>
                    <h2 className="text-2xl font-semibold text-white">Ilimitado</h2>
                    <p className="text-gray-400 mt-2">Para agências que buscam escalar sem se preocupar com limites.</p>
                    <div className="my-8">
                        <span className="text-5xl font-bold text-white">R$49</span>
                        <span className="text-gray-400">,90/mês</span>
                    </div>
                    <ul className="space-y-3 text-gray-300 flex-grow">
                        <li className="flex items-start"><Zap size={18} className="text-[var(--btn-grad-to)] mr-3 flex-shrink-0 mt-1" /> <strong>Projetos ilimitados</strong></li>
                        {featureList.map((feature, index) => (
                           <li key={index} className="flex items-start"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3 flex-shrink-0 mt-1" /> {feature}</li>
                        ))}
                    </ul>
                    <div className="mt-8">
                        <Button 
                            className="w-full !text-gray-900 font-bold"
                            size="lg"
                            onClick={() => handleCheckout(plans.unlimited)}
                            isLoading={isRedirecting === plans.unlimited}
                            disabled={!!isRedirecting}
                        >
                            Iniciar Teste Gratuito
                        </Button>
                    </div>
                </div>
            </div>
            <div className="text-center mt-12 text-gray-500 text-sm">
                <p>Os pagamentos são processados de forma segura pelo Stripe. Cancele a qualquer momento.</p>
            </div>
        </div>
    );
};

export default ActivatePlanPage;