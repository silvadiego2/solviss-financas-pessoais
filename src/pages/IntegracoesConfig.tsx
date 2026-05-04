import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { z } from 'zod';

const credentialsSchema = z.object({
  client_id: z.string().trim().min(8, 'Client ID muito curto').max(200, 'Client ID muito longo'),
  client_secret: z.string().trim().min(8, 'Client Secret muito curto').max(200, 'Client Secret muito longo'),
});

type Status = 'untested' | 'valid' | 'invalid';

interface Integration {
  id: string;
  client_id: string;
  client_secret: string;
  status: Status;
  last_tested_at: string | null;
  last_error: string | null;
}

interface Props {
  onBack?: () => void;
}

export const IntegracoesConfig: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState<{ client_id?: string; client_secret?: string }>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'pluggy')
      .maybeSingle();

    if (error) {
      toast.error('Erro ao carregar integração');
    } else if (data) {
      setIntegration(data as Integration);
      setClientId(data.client_id);
      setClientSecret(data.client_secret);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleTestAndSave = async (saveAfter: boolean) => {
    setErrors({});
    const parsed = credentialsSchema.safeParse({ client_id: clientId, client_secret: clientSecret });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as keyof typeof errors] = i.message;
      });
      setErrors(fieldErrors);
      toast.error('Verifique os campos do formulário');
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-pluggy-credentials', {
        body: { client_id: parsed.data.client_id, client_secret: parsed.data.client_secret, save: saveAfter },
      });

      if (error) throw error;

      if (data?.valid) {
        toast.success(saveAfter ? 'Credenciais válidas e salvas!' : 'Credenciais válidas!');
      } else {
        toast.error(data?.message || 'Credenciais inválidas');
      }

      if (saveAfter) await load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao testar credenciais');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!integration) return;
    if (!confirm('Remover credenciais Pluggy salvas?')) return;
    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('id', integration.id);
    if (error) {
      toast.error('Erro ao remover');
    } else {
      toast.success('Credenciais removidas');
      setIntegration(null);
      setClientId('');
      setClientSecret('');
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)) : '—';

  const StatusBadge = ({ status }: { status: Status }) => {
    if (status === 'valid') return <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Válido</Badge>;
    if (status === 'invalid') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Inválido</Badge>;
    return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Não testado</Badge>;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <p className="text-sm text-muted-foreground">Integrações</p>
          <h1 className="text-2xl font-bold">Configurar Pluggy (Open Finance)</h1>
        </div>
      </div>

      {/* Status atual */}
      {!loading && integration && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="w-5 h-5" />
                Credenciais salvas
              </CardTitle>
              <StatusBadge status={integration.status} />
            </div>
            <CardDescription>Último teste: {formatDate(integration.last_tested_at)}</CardDescription>
          </CardHeader>
          {integration.last_error && integration.status === 'invalid' && (
            <CardContent>
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {integration.last_error}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais Pluggy</CardTitle>
          <CardDescription>
            Suas credenciais ficam vinculadas ao seu usuário e protegidas por RLS.
            <a
              href="https://dashboard.pluggy.ai/applications"
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
            >
              Obter no painel Pluggy <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Ex.: a1b2c3d4-..."
              disabled={testing || loading}
            />
            {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Client Secret</Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••••••"
                disabled={testing || loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.client_secret && <p className="text-sm text-destructive">{errors.client_secret}</p>}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => handleTestAndSave(false)} disabled={testing || loading}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Testar conexão
            </Button>
            <Button onClick={() => handleTestAndSave(true)} disabled={testing || loading}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Testar e salvar
            </Button>
            {integration && (
              <Button variant="destructive" onClick={handleDelete} disabled={testing}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aviso de segurança */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        🔒 Suas credenciais são salvas via Edge Function com Service Role e protegidas por Row-Level Security — apenas você pode visualizá-las.
      </div>
    </div>
  );
};

export default IntegracoesConfig;
