import React, { useState } from 'react';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Zap } from 'lucide-react';
import Spinner from '../../components/Spinner';

// TODO: Replace with your actual Stripe Price IDs
// Fix: Renamed the constant to 'plans' to match its usage in the component.
const plans = {
  standard: 'price_standard_monthly_placeholder',
  unlimited: 'price_unlimited_monthly_placeholder',
};

const PricingPage: React.FC = () => {
    const { user, loading } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);

    const subscription = user?.subscription;
    const currentPlanId = subscription?.plan_id;

    const handleCheckout = async (priceId: string) => {
        setIsRedirecting(priceId);
        // This is where you would call your Supabase Edge Function
        // to create a Stripe Checkout session.
        console.log(`Redirecting to checkout for price ID: ${priceId}`);
        
        // Exemplo de como a chamada da função poderia ser:
        // try {
        //   const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        //     body: { priceId },
        //   })
        //   if (error) throw error;
        //   // Redirect to Stripe's checkout page
        //   window.location.href = data.url;
        // } catch (error) {
        //   console.error('Error creating checkout session:', error);
        //   setIsRedirecting(null);
        // }
        
        // Simulating a delay for demonstration
        setTimeout(() => {
            alert(`Simulação: Redirecionando para o checkout do Stripe para o plano ${priceId}. Em um app real, você seria enviado para a página de pagamento.`);
            setIsRedirecting(null);
        }, 1500);
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    const isSubscribedTo = (planId: string) => {
        return currentPlanId === planId && (subscription?.status === 'active' || subscription?.status === 'trialing');
    };

    return (
        <div className="flex flex-col h-full">
            <Header />
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-4">Escolha o plano que se encaixa na sua agência</h1>
                    <p className="text-lg text-gray-400">Comece com um teste gratuito de 7 dias. Cancele a qualquer momento.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
                    {/* Plano Padrão */}
                    <div className={`glass-panel p-8 rounded-2xl flex flex-col border-2 transition-all ${isSubscribedTo(plans.standard) ? 'border-[var(--btn-grad-from)]' : 'border-transparent'}`}>
                        {isSubscribedTo(plans.standard) && <div className="absolute top-4 right-4 text-xs bg-green-500/20 text-green-300 font-semibold px-3 py-1 rounded-full">Plano Atual</div>}
                        <h2 className="text-2xl font-semibold text-white">Padrão</h2>
                        <p className="text-gray-400 mt-2">Ideal para agências começando e com um volume menor de clientes.</p>
                        <div className="my-8">
                            <span className="text-5xl font-bold text-white">R$29</span>
                            <span className="text-gray-400">/mês</span>
                        </div>
                        <ul className="space-y-4 text-gray-300 flex-grow">
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> <strong>20 projetos</strong> por mês</li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Geração de conteúdo com IA</li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> CRM e Kanban</li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Portal do Cliente</li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Suporte via email</li>
                        </ul>
                        <div className="mt-8">
                           <Button 
                                className="w-full"
                                size="lg"
                                onClick={() => handleCheckout(plans.standard)}
                                isLoading={isRedirecting === plans.standard}
                                disabled={isSubscribedTo(plans.standard) || !!isRedirecting}
                           >
                                {isSubscribedTo(plans.standard) ? 'Você está neste plano' : 'Iniciar Teste Gratuito'}
                           </Button>
                        </div>
                    </div>

                    {/* Plano Ilimitado */}
                    <div className={`glass-panel p-8 rounded-2xl flex flex-col border-2 transition-all relative overflow-hidden ${isSubscribedTo(plans.unlimited) ? 'border-[var(--btn-grad-from)]' : 'border-transparent'}`}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--btn-grad-from)] to-[var(--btn-grad-to)] px-6 py-1 rounded-b-lg text-sm font-bold text-white shadow-lg">Mais Popular</div>
                        {isSubscribedTo(plans.unlimited) && <div className="absolute top-4 right-4 text-xs bg-green-500/20 text-green-300 font-semibold px-3 py-1 rounded-full">Plano Atual</div>}
                        <h2 className="text-2xl font-semibold text-white">Ilimitado</h2>
                        <p className="text-gray-400 mt-2">Para agências que buscam escalar sem se preocupar com limites.</p>
                        <div className="my-8">
                            <span className="text-5xl font-bold text-white">R$49</span>
                            <span className="text-gray-400">/mês</span>
                        </div>
                        <ul className="space-y-4 text-gray-300 flex-grow">
                            <li className="flex items-center"><Zap size={18} className="text-[var(--btn-grad-to)] mr-3" /> <strong>Projetos ilimitados</strong></li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Geração de conteúdo com IA</li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> CRM e Kanban</li>
                            <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Portal do Cliente</li>
                             <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Suporte prioritário</li>
                        </ul>
                        <div className="mt-8">
                             <Button 
                                className="w-full"
                                size="lg"
                                onClick={() => handleCheckout(plans.unlimited)}
                                isLoading={isRedirecting === plans.unlimited}
                                disabled={isSubscribedTo(plans.unlimited) || !!isRedirecting}
                           >
                                {isSubscribedTo(plans.unlimited) ? 'Você está neste plano' : 'Iniciar Teste Gratuito'}
                           </Button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-12 text-gray-500 text-sm">
                    <p>Os pagamentos são processados de forma segura pelo Stripe. Você pode gerenciar sua assinatura a qualquer momento.</p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;