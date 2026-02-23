'use client';

import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getInitials } from '@/lib/utils';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const { data: fullProfile } = useQuery({
    queryKey: ['full-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, departments(name), locations(name)')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  if (!fullProfile) return <div className="flex justify-center p-12 text-muted-foreground">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{getInitials(fullProfile.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{fullProfile.full_name}</h2>
              <p className="text-muted-foreground">{fullProfile.designation ?? 'Employee'}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{fullProfile.employee_code}</Badge>
                <Badge>{fullProfile.role}</Badge>
                <Badge variant="secondary">{fullProfile.employment_type}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Personal Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Email" value={fullProfile.email} />
            <DetailRow label="Phone" value={fullProfile.phone ?? '—'} />
            <DetailRow label="Joining Date" value={fullProfile.joining_date} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Organization</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Department" value={fullProfile.departments?.name ?? '—'} />
            <DetailRow label="Location" value={fullProfile.locations?.name ?? '—'} />
            <DetailRow label="Employment Type" value={fullProfile.employment_type} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
