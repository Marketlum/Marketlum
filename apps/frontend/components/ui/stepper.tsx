"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <li
              key={step.id}
              className={cn("relative flex-1", index !== steps.length - 1 && "pr-8 sm:pr-20")}
            >
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "border-2 border-primary bg-background text-primary",
                    !isCompleted && !isCurrent && "border-2 border-muted bg-background text-muted-foreground",
                    isClickable && "cursor-pointer hover:bg-primary/10",
                    !isClickable && "cursor-default"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </button>
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-8 top-4 -ml-px h-0.5 w-full -translate-y-1/2 sm:left-10",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                    style={{ width: "calc(100% - 2rem)" }}
                  />
                )}
              </div>
              <div className="mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
