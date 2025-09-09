import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'budget_alert' | 'goal_deadline' | 'bill_due' | 'general';
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return (data as Notification[]) || [];
    },
    enabled: !!user,
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notification,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('Notificação criada');
    },
    onError: (error) => {
      console.error('Error creating notification:', error);
      toast.error('Erro ao criar notificação');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast.error('Erro ao marcar notificação como lida');
    },
  });

  const createNotification = (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    createNotificationMutation.mutate(notification);
  };

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  return {
    notifications,
    loading: isLoading,
    createNotification,
    markAsRead,
    unreadCount: notifications.filter(n => !n.is_read).length,
  };
};
