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

  // For now, return empty notifications since the table doesn't exist in types
  // This will be updated once the database types are refreshed
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      // Return empty array for now until notifications table is properly set up
      return [];
    },
    enabled: !!user,
  });

  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    // Placeholder for now
    console.log('Creating notification:', notification);
  };

  const markAsRead = async (id: string) => {
    // Placeholder for now
    console.log('Marking notification as read:', id);
  };

  return {
    notifications,
    loading: isLoading,
    createNotification,
    markAsRead,
    unreadCount: notifications.filter(n => !n.is_read).length,
  };
};
