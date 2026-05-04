import React, { useEffect, useState } from 'react';
import { Plug, Building2, RefreshCw, CheckCircle2, AlertCircle, Trash2, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface BankConnection {
  id: string;
  bank_name: string;
  connection_status: string;
  last_sync_at: string | null;
  account_external_id: string;
  provider: string;
}

declare global {
  interface Window {
    PluggyConnect?: any;
  }
}

export const Integracoes: React.FC<{ onBack?: () => void; onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [pluggyReady, setPluggyReady] = useState(false);

  const loadConnections = async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadConnections error:', error);
      toast.error('Erro ao carregar conexões bancárias');
    } else {
      setConnections(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) {
      loadConnections();
    }
  }, [user?.id]);

  useEffect(() => {
    if (window.PluggyConnect) {
      setPluggyReady(true);
      return;
    }

    const existingScript = document.getElementById('pluggy-connect-script') as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => setPluggyReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'pluggy-connect-script';
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js';
    script.async = true;

    script.onload = () => {
      console.log('Pluggy Connect carregado com sucesso');
      setPluggyReady(true);
    };

    script.onerror = () => {
      console.error('Falha ao carregar script do Pluggy');
      setPluggyReady(false);
      toast.error('Não foi possível carregar o widget do banco');
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  const openPluggyConnect = async () => {
    try {
      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('session error:', sessionError);
        toast.error('Erro ao verificar autenticação');
        return;
      }

      if (!sessionData.session?.access_token) {
        toast.error('Sua sessão expirou. Faça login novamente.');
        return;
      }

      if (!pluggyReady || typeof window.PluggyConnect === 'undefined') {
        toast.error('Widget do Pluggy ainda não carregou');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-bank-data', {
        body: { action: 'get_connect_token' },
      });

      console.log('get_connect_token response:', { data, error });

      if (error) {
        console.error('invoke error:', error);
        toast.error(error.message || 'Erro ao iniciar conexão com banco');
        return;
      }

      if (!data?.connectToken) {
        console.error('connect token ausente:', data);
        toast.error('Token de conexão não retornado');
        return;
      }

      const pluggyConnect = new window.PluggyConnect({
        connectToken: data.connectToken,
        includeSandbox: false,
        onSuccess: async ({ item }: any) => {
          const { error: insertError } = await supabase.from('bank_connections').insert({
            user_id: user.id,
            account_external_id: item.id,
            bank_name: item.connector?.name || 'Banco desconhecido',
            connection_status: 'active',
            provider: 'pluggy',
          });

          if (insertError) {
            console.error('insertError:', insertError);
            toast.error('Erro ao salvar conexão');
            return;
          }

          toast.success(`${item.connector?.name || 'Banco'} conectado com sucesso!`);
          await syncBank(item.id);
          await loadConnections();
        },
        onError: (err: any) => {
          console.error('Pluggy widget error:', err);
          toast.error('Erro ao conectar banco');
        },
      });

      pluggyConnect.init();
    } catch (err: any) {
      console.error('openPluggyConnect error:', err);
      toast.error(err?.message || 'Erro ao iniciar integração');
    }
  };

  const syncBank = async (itemId: string) => {
    setSyncing(itemId);

    try {
      const { data, error } = await supabase.functions.invoke('sync-bank-data', {
        body: { action: 'sync', itemId },
      });

      console.log('sync response:', { data, error });

      if (error) throw error;

      toast.success(`${data?.accounts || 0} conta(s) sincronizada(s) com sucesso!`);
      await loadConnections();
    } catch (err: any) {
      console.error('syncBank error:', err);
      toast.error(err?.message || 'Erro ao sincronizar transações');
    } finally {
      setSyncing(null);
    }
  };

  const removeConnection = async (id: string, bankName: string) => {
    const { error } = await supabase
      .from('bank_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      console.error('removeConnection error:', error);
      toast.error('Erro ao remover conexão');
    } else {
      toast.success(`${bankName} desconectado`);
      await loadConnections();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca sincronizado';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Integrações</p>
          <h1 className="text-2xl font-bold mt-1">Conectar Bancos</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('integrations-config')}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurar credenciais
          </button>

          <button
            onClick={openPluggyConnect}
            disabled={!pluggyReady}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plug className="w-4 h-4" />
            {pluggyReady ? 'Conectar Banco' : 'Carregando widget...'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          Conexão segura via Open Finance Brasil
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Suas credenciais bancárias nunca são armazenadas. A conexão é feita com consentimento direto pelo seu banco.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : connections.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum banco conectado</p>
          <p className="text-xs text-muted-foreground mt-2">
            Conecte sua conta bancária para importar transações automaticamente.
          </p>
          <button
            onClick={openPluggyConnect}
            disabled={!pluggyReady}
            className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pluggyReady ? '+ Conectar meu primeiro banco' : 'Carregando widget...'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{conn.bank_name}</p>
                <p className="text-xs text-muted-foreground">
                  Último sync: {formatDate(conn.last_sync_at)}
                </p>
              </div>

              {conn.connection_status === 'active' ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Erro
                </span>
              )}

              <button
                onClick={() => syncBank(conn.account_external_id)}
                disabled={syncing === conn.account_external_id}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                title="Sincronizar agora"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === conn.account_external_id ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => removeConnection(conn.id, conn.bank_name)}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                title="Remover conexão"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
