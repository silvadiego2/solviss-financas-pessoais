import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingTooltipProps {
  steps: OnboardingStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
      const step = steps[currentStep];
      if (!step) return;

      const targetElement = document.querySelector(step.target);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 300;
      const tooltipHeight = 120;

      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'top':
          top = rect.top - tooltipHeight - 10;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 10;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 10;
          break;
      }

      // Ensure tooltip stays within viewport
      top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

      setTooltipPosition({ top, left });
      setIsVisible(true);

      // Add highlight to target element
      targetElement.classList.add('onboarding-highlight');
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      // Remove highlight from all elements
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep, isActive, steps]);

  if (!isActive || !isVisible || !steps[currentStep]) {
    return null;
  }

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (step.action) {
      step.action.onClick();
    }
    
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1); 
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onSkip} />
      
      {/* Tooltip */}
      <div
        className={cn(
          "fixed z-50 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 animate-scale-in",
          "border border-border"
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <p className="text-xs text-muted-foreground">
              {currentStep + 1} de {steps.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="p-1 h-auto"
          >
            <X size={16} />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full",
                  index === currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          <div className="flex space-x-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
              >
                <ChevronLeft size={16} className="mr-1" />
                Anterior
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
            >
              {step.action?.label || (isLastStep ? 'Finalizar' : 'Próximo')}
              {!isLastStep && !step.action && <ChevronRight size={16} className="ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};