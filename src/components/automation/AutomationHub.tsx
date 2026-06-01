import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BackHeader } from '@/components/layout/BackHeader';
import { AutoCategorizationManager } from '@/components/advanced/AutoCategorizationManager';
import { AutoRules } from '@/components/automation/AutoRules';
import { DuplicateDetectionManager } from '@/components/advanced/DuplicateDetectionManager';
import { Sparkles, Zap, Copy, ChevronRight } from 'lucide-react';

interface AutomationHubProps {
  onBack?: () => void;
}

type View = 'menu' | 'categorization' | 'rules' | 'duplicates';

export const AutomationHub: React.FC<AutomationHubProps> = ({ onBack }) => {
  const [view, setView] = useState<View>('menu');

  if (view === 'categorization') return <AutoCategorizationManager onBack={() => setView('menu')} />;
  if (view === 'rules')          return <AutoRules onBack={() => setView('menu')} />;
  if (view === 'duplicates')     return <DuplicateDetectionManager onBack={() => setView('menu')} />;

  const items = [
    {
      id: 'categorization' as const,
      icon: <Sparkles size={18} className="text-primary" />,
      title: 'Categorização por IA',
      description: 'Classifica automaticamente seus gastos com inteligência artificial',
      badge: 'IA',
    },
    {
      id: 'rules' as const,
      icon: <Zap size={18} className="text-primary" />,
      title: 'Automação de Regras',
      description: 'Crie ações automáticas que se aplicam em novas transações',
    },
    {
      id: 'duplicates' as const,
      icon: <Copy size={18} className="text-primary" />,
      title: 'Detector de Duplicatas',
      description: 'Identifica lançamentos repetidos e te ajuda a limpá-los',
    },
  ];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Automação"
        subtitle="Inteligência e regras automáticas"
        icon={<Sparkles className="h-6 w-6" />}
        onBack={onBack}
      />
      <div className="grid gap-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setView(item.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.badge && (
                        <span className="text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full leading-none">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>

                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
