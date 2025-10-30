import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'designer' | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Criar Conta');
  const { user, refreshUser, setIsSigningUp } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError('Por favor, selecione seu perfil.');
      return;
    }
    if (role === 'owner' && !agencyName.trim()) {
        setError('Por favor, informe o nome da agência.');
        return;
    }
    setError(null);
    setLoading(true);
    setLoadingMessage('Criando sua conta...');
    
    // Sinaliza ao AuthContext que um processo de cadastro está começando.
    // Isso impede que o listener de auth dispare um erro de perfil não encontrado prematuramente.
    setIsSigningUp(true);

    try {
        await authService.signUp({ name, email, password, role, agencyName });
        
        setLoadingMessage('Finalizando configuração...');

        let attempts = 0;
        const maxAttempts = 8;
        const delay = 1000;

        const pollForProfile = async () => {
          while (attempts < maxAttempts) {
            attempts++;
            const profileFound = await refreshUser();
            if (profileFound) {
              return; 
            }
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          throw new Error("Não foi possível carregar seu perfil após o cadastro. Por favor, tente fazer login ou contate o suporte.");
        };

        await pollForProfile();

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setLoading(false);
    } finally {
        // Garante que o sinalizador de cadastro seja desativado,
        // independentemente do resultado (sucesso ou falha).
        setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-12 w-auto" />
            </div>
            <p className="text-gray-400">Crie sua conta para começar.</p>
        </div>
        
        <div className="glass-panel p-8 rounded-lg">
          <form onSubmit={handleSignUp} className="space-y-6">
            <Input
              id="name"
              label="Nome Completo"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Senha (mínimo 6 caracteres)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Qual o seu perfil?</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`w-full p-3 rounded-md text-sm font-semibold transition ${role === 'owner' ? 'btn-premium' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Dono de Agência
                </button>
                <button
                  type="button"
                  onClick={() => setRole('designer')}
                  className={`w-full p-3 rounded-md text-sm font-semibold transition ${role === 'designer' ? 'btn-premium' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Designer / Freelancer
                </button>
              </div>
            </div>

            {role === 'owner' && (
              <div className="animate-fadeIn">
                <Input
                  id="agencyName"
                  label="Nome da sua Agência"
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  required
                />
              </div>
            )}
            
            {error && (
              <div className="text-red-400 text-sm text-left bg-red-900/30 p-3 rounded-md border border-red-500/50">
                  <pre className="whitespace-pre-wrap font-sans">{error}</pre>
              </div>
            )}
            
            <Button type="submit" className="w-full" isLoading={loading} size="lg" disabled={!role || (role === 'owner' && !agencyName)}>
              {loading ? loadingMessage : 'Criar Conta'}
            </Button>
          </form>
          
          <p className="mt-6 text-center text-gray-400">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-[var(--btn-grad-from)] hover:text-[var(--btn-grad-to)]">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;