import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import { supabaseService } from '../../services/firestoreService';
import { Save, UserPlus, Trash2, CheckCircle, Zap, ExternalLink, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabaseClient'; // Import supabase client

// Seus IDs de produto reais do Stripe
const plans = {
  standard: 'price_1SDB6OP7wbQf0EBDVlYXGw8d', // Plano Básico
  unlimited: 'price_1SDB6iP7wbQf0EBDxEHtpi7g', // Plano Ilimitado
};

const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agency' | 'subscription'>('agency');
  const { agency, loading: dataLoading } = useData();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  const [agencyName, setAgencyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const subscription = user?.subscription;
  const currentPlanId = subscription?.plan_id;

  useEffect(() => {
    if (agency) {
      setAgencyName(agency.name || '');
      setBrandName(agency.brandName || '');
      setBrandLogo(agency.brandLogo || '');
    }
  }, [agency]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id_agencia) return;
    setIsSaving(true);
    try {
      await supabaseService.updateAgency(user.id_agencia, { name: agencyName, brandName: brandName, brandLogo: brandLogo });
      addToast('Configurações da agência salvas com sucesso!', 'success');
    } catch (error) {
        addToast('Falha ao salvar as configurações.', 'error');
        console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteDesigner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id_agencia || !agency || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await supabaseService.inviteDesigner(user.id_agencia, agency.name, inviteEmail.trim());
      addToast(`Convite enviado para ${inviteEmail.trim()}.`, 'success');
      setInviteEmail('');
    } catch (error) {
        addToast(`Falha ao enviar o convite: ${(error as Error).message}`, 'error');
        console.error(error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveTeamMember = async (emailToRemove: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${emailToRemove} da equipe?`)) {
      return;
    }

    try {
      await supabaseService.removeDesignerFromAgency(emailToRemove);
      addToast(`${emailToRemove} foi removido da equipe. O acesso será revogado em instantes.`, 'success');
      // A UI será atualizada automaticamente pelo listener em tempo real na tabela 'agencies'.
    } catch (error) {
      addToast(`Falha ao remover o membro da equipe: ${(error as Error).message}`, 'error');
      console.error(error);
    }
  };
  
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
  
  const handleManageSubscription = async () => {
    setIsRedirecting('manage');
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-link');
      if (error) throw error;
      window.location.href = data.url;
    } catch (error) {
      addToast(`Erro ao abrir portal de gerenciamento: ${(error as Error).message}`, 'error');
      setIsRedirecting(null);
    }
  };

  const isSubscribedTo = (planId: string) => {
    return currentPlanId === planId && (subscription?.status === 'active' || subscription?.status === 'trialing');
  };

  const isLoading = dataLoading || authLoading;

  if (isLoading) {
    return (
        <div className="flex flex-col h-screen">
            <Header />
            <div className="flex-1 flex items-center justify-center"><Spinner /></div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Conta</h1>
        
        <div className="flex border-b border-white/10 mb-6">
            <button onClick={() => setActiveTab('agency')} className={`py-2 px-4 text-lg ${activeTab === 'agency' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' : 'text-gray-400'}`}>Agência e Equipe</button>
            <button onClick={() => setActiveTab('subscription')} className={`py-2 px-4 text-lg ${activeTab === 'subscription' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' : 'text-gray-400'}`}>Plano e Assinatura</button>
        </div>

        {activeTab === 'agency' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            <div className="glass-panel p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-3">Informações da Agência</h2>
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <Input label="Nome da Agência" value={agencyName} onChange={e => setAgencyName(e.target.value)} required />
                <Input label="Nome da Marca (para o cliente)" value={brandName} onChange={e => setBrandName(e.target.value)} required />
                <Input label="URL do Logo da Marca" value={brandLogo} onChange={e => setBrandLogo(e.target.value)} placeholder="https://imgur.com/logo.png" />
                <div className="pt-2"><Button type="submit" isLoading={isSaving}><Save size={16} className="mr-2"/>Salvar</Button></div>
              </form>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-3">Gerenciar Equipe</h2>
              <form onSubmit={handleInviteDesigner} className="flex gap-2 mb-6">
                <Input label="Convidar Designer por Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@designer.com" required/>
                <div className="self-end shrink-0"><Button type="submit" isLoading={isInviting}><UserPlus size={16} className="mr-2"/>Convidar</Button></div>
              </form>
              <div>
                <h3 className="text-lg font-medium mb-3">Membros da Equipe</h3>
                <ul className="space-y-2">
                  {agency?.team?.map(email => (
                    <li key={email} className="flex justify-between items-center bg-white/5 p-3 rounded-md">
                      <span>{email}</span>
                      <button onClick={() => handleRemoveTeamMember(email)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                    </li>
                  )) || <p className="text-gray-500">Nenhum designer na equipe.</p>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
           <div className="animate-fadeIn">
             <div className="text-center max-w-3xl mx-auto mb-10">
                <h1 className="text-3xl font-bold text-white mb-4">Plano de Assinatura</h1>
                {subscription?.status === 'trialing' && subscription.trial_end && (
                    <p className="text-lg text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">Seu período de teste termina em {new Date(subscription.trial_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                )}
                 {subscription?.status === 'active' && subscription.current_period_end && (
                    <p className="text-lg text-green-400 bg-green-500/10 p-3 rounded-lg">Seu plano está ativo. Próxima renovação em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                 {/* Plano Padrão */}
                 <div className={`glass-panel p-8 rounded-2xl flex flex-col border-2 relative ${isSubscribedTo(plans.standard) ? 'border-[var(--btn-grad-from)]' : 'border-transparent'}`}>
                    {!subscription && <div className="absolute top-4 right-4 text-xs bg-blue-500/20 text-blue-300 font-semibold px-3 py-1 rounded-full flex items-center gap-2"><ShieldCheck size={14} /> 7 Dias Grátis</div>}
                     <h2 className="text-2xl font-semibold text-white">Padrão</h2>
                     <p className="text-gray-400 mt-2">Ideal para agências começando.</p>
                     <div className="my-8"><span className="text-5xl font-bold">R$29</span><span className="text-gray-400">,90/mês</span></div>
                     <ul className="space-y-4 text-gray-300 flex-grow">
                         <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> <strong>20 projetos</strong> por mês</li>
                         <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Geração de conteúdo com IA</li>
                         <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> CRM e Portal do Cliente</li>
                     </ul>
                     <div className="mt-8">
                        <Button className="w-full" size="lg" onClick={() => handleCheckout(plans.standard)} isLoading={isRedirecting === plans.standard} disabled={isSubscribedTo(plans.standard) || !!isRedirecting}>
                            {isSubscribedTo(plans.standard) ? 'Plano Atual' : 'Iniciar Teste'}
                        </Button>
                     </div>
                 </div>
                 {/* Plano Ilimitado */}
                 <div className={`glass-panel p-8 rounded-2xl flex flex-col border-2 relative ${isSubscribedTo(plans.unlimited) ? 'border-[var(--btn-grad-from)]' : 'border-transparent'}`}>
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--btn-grad-from)] to-[var(--btn-grad-to)] px-6 py-1 rounded-b-lg text-sm font-bold text-white">Mais Popular</div>
                      {!subscription && <div className="absolute top-4 right-4 text-xs bg-blue-500/20 text-blue-300 font-semibold px-3 py-1 rounded-full flex items-center gap-2"><ShieldCheck size={14} /> 7 Dias Grátis</div>}
                     <h2 className="text-2xl font-semibold text-white">Ilimitado</h2>
                     <p className="text-gray-400 mt-2">Para agências que buscam escalar.</p>
                     <div className="my-8"><span className="text-5xl font-bold">R$49</span><span className="text-gray-400">,90/mês</span></div>
                     <ul className="space-y-4 text-gray-300 flex-grow">
                         <li className="flex items-center"><Zap size={18} className="text-[var(--btn-grad-to)] mr-3" /> <strong>Projetos ilimitados</strong></li>
                         <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Geração de conteúdo com IA</li>
                         <li className="flex items-center"><CheckCircle size={18} className="text-[var(--btn-grad-from)] mr-3" /> Todos os recursos Padrão</li>
                     </ul>
                     <div className="mt-8">
                          <Button className="w-full" size="lg" onClick={() => handleCheckout(plans.unlimited)} isLoading={isRedirecting === plans.unlimited} disabled={isSubscribedTo(plans.unlimited) || !!isRedirecting}>
                             {isSubscribedTo(plans.unlimited) ? 'Plano Atual' : 'Fazer Upgrade'}
                          </Button>
                     </div>
                 </div>
             </div>
              {subscription && (
                <div className="text-center mt-12">
                     <Button 
                         variant="secondary"
                         onClick={handleManageSubscription}
                         isLoading={isRedirecting === 'manage'}
                         disabled={!!isRedirecting}
                     >
                         <ExternalLink size={16} className="mr-2"/>
                         Gerenciar Assinatura
                     </Button>
                 </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;