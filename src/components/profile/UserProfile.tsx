import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Settings,
  Moon,
  Sun,
  LogOut,
  Edit,
  RefreshCw,
  Phone,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileProps {
  onBack?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startOnboarding, isOnboardingActive } = useOnboarding();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');

  const handleSignOut = async () => {
    try { await signOut(); } catch (error) { console.error(error); }
  };

  const handleRestartTutorial = () => {
    localStorage.removeItem('onboarding_completed');
    toast.success('Tutorial reiniciado!');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  };

  const getUserInitials = (email: string) =>
    email.split('@')[0].substring(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        phone,
        bio,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Perfil atualizado!');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  return (
    <div className="space-y-4">
      <BackHeader title="Perfil" onBack={onBack} />

      {/* Avatar + nome */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 flex-shrink-0">
              <AvatarImage src="" alt="Avatar" />
              <AvatarFallback className="text-base">
                {user?.email ? getUserInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold leading-snug">{fullName || 'Usuário'}</h2>
              <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs truncate">{user?.email}</span>
              </div>
              <Badge variant="secondary" className="mt-2 text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Verificado
              </Badge>
            </div>

            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex-shrink-0">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Editar
              </Button>
            )}
          </div>

          {isEditing && (
            <div className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Sobre você..." rows={2} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="flex-1">Cancelar</Button>
                <Button size="sm" onClick={handleSaveProfile} className="flex-1">Salvar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info da conta */}
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Informações da conta</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Membro desde</p>
              <p className="text-xs text-muted-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">ID do usuário</p>
              <p className="text-xs text-muted-foreground font-mono">{user?.id?.substring(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Telefone</p>
              <p className="text-xs text-muted-foreground">{phone || 'Não informado'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Moeda</p>
              <p className="text-xs text-muted-foreground">Real Brasileiro (R$)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-1 -mx-2">
          <div className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Tema</p>
                <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>Alterar</Button>
          </div>

          <div className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tutorial Interativo</p>
                <p className="text-xs text-muted-foreground">Reiniciar o tour guiado</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRestartTutorial} disabled={isOnboardingActive}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sair */}
      <Button variant="destructive" className="w-full" onClick={handleSignOut}>
        <LogOut className="w-4 h-4 mr-2" />
        Sair da Conta
      </Button>
    </div>
  );
};
