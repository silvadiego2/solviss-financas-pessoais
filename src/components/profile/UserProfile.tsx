import React from 'react';
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
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileProps {
  onBack?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startOnboarding, isOnboardingActive } = useOnboarding();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRestartTutorial = () => {
    localStorage.removeItem('onboarding_completed');
    toast.success('Tutorial reiniciado! Você será redirecionado ao dashboard.');
    
    // Restart onboarding after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {onBack && <BackHeader title="Perfil do Usuário" onBack={onBack} />}
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* User Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-20 h-20 mb-4">
                <AvatarImage src="" alt="User avatar" />
                <AvatarFallback className="text-lg">
                  {user?.email ? getUserInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-semibold mb-2">
                {user?.user_metadata?.full_name || 'Usuário'}
              </h2>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
              
              <Badge variant="secondary" className="mb-4">
                <Shield className="w-3 h-3 mr-1" />
                Conta Verificada
              </Badge>
              
              <Button variant="outline" size="sm" className="mb-4">
                <Edit className="w-4 h-4 mr-2" />
                Editar Perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Membro desde</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.created_at ? 
                      new Date(user.created_at).toLocaleDateString('pt-BR') : 
                      'Data não disponível'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">ID do Usuário</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {user?.id?.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? 
                  <Moon className="w-5 h-5 text-muted-foreground" /> : 
                  <Sun className="w-5 h-5 text-muted-foreground" />
                }
                <div>
                  <p className="text-sm font-medium">Tema</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                Alterar
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tutorial Interativo</p>
                  <p className="text-sm text-muted-foreground">
                    Reiniciar o tour guiado
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRestartTutorial}
                disabled={isOnboardingActive}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Configurações Avançadas</p>
                  <p className="text-sm text-muted-foreground">
                    Backup, segurança e mais
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Abrir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};