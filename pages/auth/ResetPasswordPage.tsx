import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isRecoveringPassword, exitRecoveryMode } = useAuth();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authService.updatePassword(password);
      setMessage('Sua senha foi redefinida com sucesso! Redirecionando para o login em 3 segundos...');
      setTimeout(() => {
        authService.logout(); // Clear the temporary recovery session
        exitRecoveryMode();   // Reset the auth context state
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-12 w-auto" />
            </div>
            <h1 className="text-2xl font-bold">Crie uma Nova Senha</h1>
        </div>
        
        <div className="glass-panel p-8 rounded-lg">
          {message ? (
             <div className="text-center text-green-400 bg-green-900/30 p-4 rounded-md border border-green-500/50">
                <p>{message}</p>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <Input
                id="password"
                label="Nova Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" isLoading={loading} size="lg" disabled={!isRecoveringPassword || loading}>
                Salvar Nova Senha
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;