import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.login(email, password);
      // A navegação será tratada automaticamente pelo AuthContext e AppRoutes
      // ao detectar a mudança no estado de autenticação.
    } catch (err) {
      setError((err as Error).message);
      setLoading(false); // Para o spinner apenas se houver um erro.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-12 w-auto" />
            </div>
            <p className="text-gray-400">Bem-vindo de volta! Faça login na sua conta.</p>
        </div>
        
        <div className="glass-panel p-8 rounded-lg">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
                <Input
                id="password"
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
                 <div className="text-sm text-right mt-2">
                    <Link to="/forgot-password" className="font-medium text-gray-400 hover:text-[var(--btn-grad-to)]">
                        Esqueceu sua senha?
                    </Link>
                </div>
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <Button type="submit" className="w-full" isLoading={loading} size="lg">
              Entrar
            </Button>
          </form>
          
          <p className="mt-6 text-center text-gray-400">
            Não tem uma conta?{' '}
            <Link to="/signup" className="font-medium text-[var(--btn-grad-from)] hover:text-[var(--btn-grad-to)]">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;