import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, CheckCircle2, XCircle } from 'lucide-react';

interface SignUpFormProps {
  onToggleForm: () => void;
}

function PasswordStrength({ pwd }: { pwd: string }) {
  const rules = [
    { ok: pwd.length >= 12, label: 'Mínimo 12 caracteres' },
    { ok: /[A-Z]/.test(pwd), label: 'Letra maiúscula' },
    { ok: /[a-z]/.test(pwd), label: 'Letra minúscula' },
    { ok: /[0-9]/.test(pwd), label: 'Número' },
    { ok: /[^A-Za-z0-9]/.test(pwd), label: 'Caractere especial' },
  ];
  if (!pwd) return null;
  return (
    <ul className="mt-2 space-y-1">
      {rules.map(r => (
        <li key={r.label} className="flex items-center gap-1.5 text-xs">
          {r.ok
            ? <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
            : <XCircle size={12} className="text-muted-foreground flex-shrink-0" />}
          <span className={r.ok ? 'text-foreground' : 'text-muted-foreground'}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onToggleForm }) => {
  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (password.length < 12) {
      toast.error('A senha deve ter pelo menos 12 caracteres');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      toast.error('A senha não atende os requisitos de segurança');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      toast.success('Conta criada! Verifique seu e-mail.');
    } catch (error: any) {
      toast.error(error.message || 'Erro no cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Criar conta</h2>
        <p className="text-sm text-muted-foreground mt-1">Grátis, sem cartão de crédito</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrength pwd={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Criando conta...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus size={16} /> Criar conta grátis
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-primary font-medium hover:underline"
        >
          Entrar
        </button>
      </p>
    </div>
  );
};
