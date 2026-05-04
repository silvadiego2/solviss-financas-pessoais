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

export const Integracoes: React.FC<{ onBack?: () => void; onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Carregar conexões existentes
  const loadConnections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar conexões bancárias');
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadConnections();
  }, [user]);

  // Abrir widget Pluggy Connect
  const openPluggyConnect = async () => {
    try {
      // Gerar connect token via Edge Function
      const { data, error } = await supabase.functions.invoke('sync-bank-data', {
        body: { action: 'get_connect_token' },
      });

      if (error || !data?.connectToken) {
        toast.error('Erro ao iniciar conexão com banco');
        return;
      }

      const pluggyConnect = new (window as any).PluggyConnect({
        connectToken: data.connectToken,
        onSuccess: async ({ item }: any) => {
          // Salvar conexão no banco
          const { error: insertError } = await supabase
            .from('bank_connections')
            .insert({
              user_id: user?.id,
              account_external_id: item.id,
              bank_name: item.connector?.name || 'Banco desconhecido',
              connection_status: 'active',
              provider: 'pluggy',
            });

          if (insertError) {
            toast.error('Erro ao salvar conexão');
            return;
          }

          toast.success(`${item.connector?.name} conectado com sucesso!`);

          // Sincronizar transações imediatamente
          await syncBank(item.id);
          loadConnections();
        },
        onError: (error: any) => {
          console.error('Pluggy error:', error);
          toast.error('Erro ao conectar banco');
        },
      });

      pluggyConnect.init();
    } catch (err) {
      toast.error('Erro ao iniciar integração');
    }
  };

  // Sincronizar transações de uma conexão
  const syncBank = async (itemId: string) => {
    setSyncing(itemId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bank-data', {
        body: { action: 'sync', itemId },
      });

      if (error) throw error;

      toast.success(`${data?.accounts || 0} conta(s) sincronizada(s) com sucesso!`);
      loadConnections();
    } catch (err) {
      toast.error('Erro ao sincronizar transações');
    } finally {
      setSyncing(null);
    }
  };

  // Remover conexão
  const removeConnection = async (id: string, bankName: string) => {
    const { error } = await supabase
      .from('bank_connections')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover conexão');
    } else {
      toast.success(`${bankName} desconectado`);
      loadConnections();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca sincronizado';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plug className="w-4 h-4" />
            Conectar Banco
          </button>
        </div>
      </div>

      {/* Info Open Finance */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          🔒 Conexão segura via Open Finance Brasil
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Suas credenciais bancárias nunca são armazenadas. A conexão é feita com consentimento direto pelo seu banco.
        </p>
      </div>

      {/* Lista de conexões */}
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
            className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Conectar meu primeiro banco
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
              {/* Status */}
              {conn.connection_status === 'active' ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Erro
                </span>
              )}
              {/* Ações */}
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
