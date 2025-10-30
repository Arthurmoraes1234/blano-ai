import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Set message immediately for better UX and security (prevents user enumeration)
    setMessage('Se uma conta com este e-mail existir, um link para redefinir a senha foi enviado.');
    
    try {
      await authService.resetPasswordForEmail(email);
    } catch (err) {
      // Errors are logged in the service, no need to show specific errors to the user here.
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
            <h1 className="text-2xl font-bold">Redefinir Senha</h1>
            <p className="text-gray-400 mt-2">Digite seu e-mail para receber as instruções.</p>
        </div>
        
        <div className="glass-panel p-8 rounded-lg">
          {message ? (
            <div className="text-center text-green-400 bg-green-900/30 p-4 rounded-md border border-green-500/50">
                <p>{message}</p>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-6">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" isLoading={loading} size="lg">
                Enviar Link de Redefinição
              </Button>
            </form>
          )}
          
          <p className="mt-6 text-center text-gray-400">
            Lembrou da senha?{' '}
            <Link to="/login" className="font-medium text-[var(--btn-grad-from)] hover:text-[var(--btn-grad-to)]">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
