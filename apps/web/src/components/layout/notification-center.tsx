'use client';

import { Bell } from 'lucide-react';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenter() {
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {(unreadCount ?? 0) > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {(!notifications || notifications.length === 0) ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => !n.is_read && markRead.mutate(n.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-sm font-medium flex-1">{n.title}</span>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className="text-xs text-muted-foreground">{n.message}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
