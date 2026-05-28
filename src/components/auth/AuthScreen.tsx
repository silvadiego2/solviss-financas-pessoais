import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import {
  TrendingUp, ShieldCheck, Sparkles, BarChart3,
  ArrowRight, CheckCircle2
} from 'lucide-react';

const FEATURES = [
  { icon: TrendingUp,    text: 'Controle total de receitas e despesas' },
  { icon: BarChart3,     text: 'Relatórios e gráficos em tempo real' },
  { icon: ShieldCheck,   text: 'Dados protegidos com criptografia' },
  { icon: Sparkles,      text: 'Inteligência artificial para suas finanças' },
];

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — branding ────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] relative flex-col justify-between bg-primary text-primary-foreground p-12 overflow-hidden">
        {/* Padrão de grade sutil */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Brilho difuso */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xl shadow-lg">
            S
          </div>
          <span className="text-2xl font-bold tracking-tight">Solviss</span>
        </div>

        {/* Headline */}
        <div className="relative space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Suas finanças,<br />
            sob controle.{' '}
            <span className="opacity-60">Sempre.</span>
          </h1>
          <p className="text-lg opacity-75 leading-relaxed max-w-md">
            Organize receitas, despesas, metas e cartões em um único lugar.
            Simples, visual e inteligente.
          </p>

          <ul className="space-y-3 mt-8">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm opacity-90">
                <CheckCircle2 size={16} className="opacity-70 flex-shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé */}
        <p className="relative text-xs opacity-40">
          © {new Date().getFullYear()} Solviss — Finanças Pessoais
        </p>
      </div>

      {/* ── Painel direito — formulário ───────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12 min-h-screen">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-lg">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">Solviss</span>
        </div>

        <div className="w-full max-w-sm">
          {isLogin ? (
            <LoginForm onToggleForm={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onToggleForm={() => setIsLogin(true)} />
          )}
        </div>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Termos de Uso
          </a>
          {' '}e{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Política de Privacidade
          </a>.
        </p>
      </div>
    </div>
  );
};
