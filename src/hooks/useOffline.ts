import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OfflineQueue {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retries: number;
}

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueue[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restabelecida');
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Modo offline ativado');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToOfflineQueue = (action: string, data: any) => {
    const queueItem: OfflineQueue = {
      id: Date.now().toString(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    const newQueue = [...offlineQueue, queueItem];
    setOfflineQueue(newQueue);
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
    
    toast.info('Ação salva para sincronização posterior');
  };

  const processOfflineQueue = async () => {
    if (!isOnline || offlineQueue.length === 0) return;

    const processedIds: string[] = [];
    const failedItems: OfflineQueue[] = [];

    for (const item of offlineQueue) {
      try {
        await processQueueItem(item);
        processedIds.push(item.id);
        toast.success(`${item.action} sincronizado`);
      } catch (error) {
        console.error(`Failed to process ${item.action}:`, error);
        
        if (item.retries < 3) {
          failedItems.push({
            ...item,
            retries: item.retries + 1,
          });
        } else {
          toast.error(`Falha ao sincronizar ${item.action} após 3 tentativas`);
        }
      }
    }

    // Update queue - remove processed items and update failed items
    const newQueue = failedItems;
    setOfflineQueue(newQueue);
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));

    // Invalidate queries to refresh data
    queryClient.invalidateQueries();
  };

  const processQueueItem = async (item: OfflineQueue) => {
    // Import the hooks needed for API calls
    const { supabase } = await import('@/integrations/supabase/client');
    
    switch (item.action) {
      case 'CREATE_TRANSACTION':
        const { error: createError } = await supabase
          .from('transactions')
          .insert([item.data]);
        if (createError) throw createError;
        break;
        
      case 'UPDATE_TRANSACTION':
        const { error: updateError } = await supabase
          .from('transactions')
          .update(item.data.updates)
          .eq('id', item.data.id);
        if (updateError) throw updateError;
        break;
        
      case 'DELETE_TRANSACTION':
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', item.data.id);
        if (deleteError) throw deleteError;
        break;
        
      case 'CREATE_BUDGET':
        const { error: budgetError } = await supabase
          .from('budgets')
          .insert([item.data]);
        if (budgetError) throw budgetError;
        break;
        
      case 'CREATE_ACCOUNT':
        const { error: accountError } = await supabase
          .from('accounts')
          .insert([item.data]);
        if (accountError) throw accountError;
        break;
        
      default:
        throw new Error(`Unknown action: ${item.action}`);
    }
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('offlineQueue');
    toast.success('Fila offline limpa');
  };

  const removeFromQueue = (id: string) => {
    const newQueue = offlineQueue.filter(item => item.id !== id);
    setOfflineQueue(newQueue);
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
  };

  // Cache management
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.error('Error getting cached data:', error);
    }
    return null;
  };

  const setCachedData = (key: string, data: any, ttlMinutes = 60) => {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000, // Convert to milliseconds
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  };

  const clearCache = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
    toast.success('Cache limpo');
  };

  return {
    isOnline,
    offlineQueue,
    addToOfflineQueue,
    processOfflineQueue,
    clearOfflineQueue,
    removeFromQueue,
    getCachedData,
    setCachedData,
    clearCache,
    queueLength: offlineQueue.length,
  };
};