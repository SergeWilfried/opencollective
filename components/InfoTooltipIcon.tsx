import React from 'react';
import { InfoIcon } from 'lucide-react';

import { cn } from '../lib/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/Tooltip';

export function InfoTooltipIcon({
  children,
  className,
  size = 16,
}: {
  children: React.ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger className="cursor-help" onClick={e => e.preventDefault()}>
        <InfoIcon size={size} className={cn('text-muted-foreground', className)} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" onPointerDownOutside={e => e.preventDefault()}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
