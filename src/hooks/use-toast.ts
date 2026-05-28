// REMOVIDO: este arquivo era duplicata do sistema de toast.
// O app usa exclusivamente `sonner` via `import { toast } from 'sonner'`.
// Mantido apenas para evitar quebra em imports legados — redireciona para sonner.
export { toast } from 'sonner';
export const useToast = () => ({ toast: (await import('sonner')).toast });
