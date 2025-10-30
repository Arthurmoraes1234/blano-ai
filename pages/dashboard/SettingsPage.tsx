import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import { supabaseService } from '../../services/firestoreService';
import { Save, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const SettingsPage: React.FC = () => {
  const { agency, loading: dataLoading } = useData();
  const { agencyId } = useAuth();
  const { addToast } = useToast();
  
  const [agencyName, setAgencyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (agency) {
      setAgencyName(agency.name || '');
      setBrandName(agency.brandName || '');
      setBrandLogo(agency.brandLogo || '');
    }
  }, [agency]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) return;

    setIsSaving(true);
    try {
      await supabaseService.updateAgency(agencyId, {
        name: agencyName,
        brandName: brandName,
        brandLogo: brandLogo,
      });
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
    if (!agencyId || !agency || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await supabaseService.inviteDesigner(agencyId, agency.name, inviteEmail.trim());
      addToast(`Convite enviado para ${inviteEmail.trim()}. O designer verá o convite ao criar ou acessar sua conta.`, 'success');
      setInviteEmail('');
    } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('duplicate key value violates unique constraint')) {
            addToast('Um convite para este email já está pendente.', 'warning');
        } else {
            addToast(`Falha ao enviar o convite: ${errorMessage}`, 'error');
        }
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

  if (dataLoading) {
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
        <h1 className="text-3xl font-bold text-white mb-8">Configurações da Agência</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Agency Details Form */}
          <div className="glass-panel p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-3">Informações da Agência</h2>
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <Input label="Nome da Agência" value={agencyName} onChange={e => setAgencyName(e.target.value)} required />
              <Input label="Nome da Marca (para o cliente)" value={brandName} onChange={e => setBrandName(e.target.value)} required />
              <Input label="URL do Logo da Marca" value={brandLogo} onChange={e => setBrandLogo(e.target.value)} placeholder="https://imgur.com/logo.png" />
              <div className="pt-2">
                <Button type="submit" isLoading={isSaving}><Save size={16} className="mr-2"/>Salvar Alterações</Button>
              </div>
            </form>
          </div>

          {/* Team Management */}
          <div className="glass-panel p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-3">Gerenciar Equipe</h2>
            
            <form onSubmit={handleInviteDesigner} className="flex flex-col sm:flex-row gap-2 mb-6">
              <div className="flex-grow">
                <Input
                    label="Convidar Designer por Email"
                    type="email"
                    id="invite-email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@designer.com"
                    required
                />
              </div>
              <div className="self-end shrink-0">
                <Button type="submit" isLoading={isInviting}><UserPlus size={16} className="mr-2"/>Convidar</Button>
              </div>
            </form>

            <div>
              <h3 className="text-lg font-medium mb-3">Membros da Equipe</h3>
              <ul className="space-y-2">
                {agency?.team && agency.team.length > 0 ? agency.team.map(email => (
                  <li key={email} className="flex justify-between items-center bg-white/5 p-3 rounded-md">
                    <span className="text-gray-300">{email}</span>
                    <button onClick={() => handleRemoveTeamMember(email)} className="text-red-500 hover:text-red-400 p-1 rounded-full"><Trash2 size={16}/></button>
                  </li>
                )) : (
                  <p className="text-gray-500">Nenhum designer na equipe ainda.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;