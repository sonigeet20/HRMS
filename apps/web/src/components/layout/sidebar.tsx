'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Clock, CalendarOff, Receipt, User,
  MessageSquare, Users, Shield, Banknote, BarChart3,
  Settings, FileText, Building2, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { NAV_ITEMS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Clock, CalendarOff, Receipt, User,
  MessageSquare, Users, Shield, Banknote, BarChart3,
  Settings, FileText, Download,
};

export function Sidebar() {
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <aside className="flex h-full w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">HRMS</span>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  if (!profile) return null;

  const employeeItems = NAV_ITEMS.EMPLOYEE;
  const hrItems = profile.role === 'HR' || profile.role === 'ADMIN' ? NAV_ITEMS.HR : [];
  const adminItems = profile.role === 'ADMIN' ? NAV_ITEMS.ADMIN : [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">HRMS</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Employee</p>
        {employeeItems.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                pathname === item.href && 'bg-accent text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {hrItems.length > 0 && (
          <>
            <Separator className="my-3" />
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">HR Management</p>
            {hrItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    pathname === item.href && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}

        {adminItems.length > 0 && (
          <>
            <Separator className="my-3" />
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Admin</p>
            {adminItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    pathname === item.href && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
