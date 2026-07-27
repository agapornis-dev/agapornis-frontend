import type { ReactNode } from 'react';

import { cn } from '../ui';

interface DashboardPageProps {
  children: ReactNode;
  className?: string;
}

export function DashboardPage({ children, className }: DashboardPageProps) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full min-w-0 max-w-[1800px] gap-8 pb-12 lg:gap-10',
        className,
      )}
    >
      {children}
    </div>
  );
}
