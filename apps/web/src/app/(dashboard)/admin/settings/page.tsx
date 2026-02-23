'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Globe } from 'lucide-react';

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const { data: org } = useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile!.organization_id)
        .single();
      return data;
    },
    enabled: !!profile,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations', profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', profile!.organization_id);
      return data;
    },
    enabled: !!profile,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Organization Settings</h1>

      {org && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {org.name}
            </CardTitle>
            <CardDescription>Slug: {org.slug}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Timezone: {org.timezone}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Office Locations</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {locations?.map((loc: any) => (
              <div key={loc.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{loc.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{loc.address}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Radius: {loc.geofence_radius_meters}m</Badge>
                  <Badge variant="outline">TZ: {loc.timezone}</Badge>
                  {loc.allowed_wifi_ssids?.length > 0 && (
                    <Badge variant="outline">WiFi: {loc.allowed_wifi_ssids.join(', ')}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Coords: {loc.latitude}, {loc.longitude}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
