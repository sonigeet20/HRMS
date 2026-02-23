'use client';

import { Bell, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useUnreadCount } from '@/hooks/use-notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { NotificationCenter } from './notification-center';

export function Header() {
  const { profile, signOut } = useAuth();
  const { data: unreadCount } = useUnreadCount();
  const router = useRouter();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h2 className="text-lg font-semibold">
          Welcome{profile ? `, ${profile.full_name}` : ''}
        </h2>
        {profile && (
          <p className="text-sm text-muted-foreground">
            {profile.role} · {profile.employee_code}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{profile ? getInitials(profile.full_name) : '?'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/employee/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
