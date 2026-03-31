'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building2, Globe, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface OfficeLocation {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  timezone: string;
  allowed_wifi_ssids: string[];
}

interface LocationFormState {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  geofence_radius_meters: string;
  timezone: string;
  allowed_wifi_ssids: string;
}

const EMPTY_FORM: LocationFormState = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  geofence_radius_meters: '200',
  timezone: 'Asia/Kolkata',
  allowed_wifi_ssids: '',
};

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);

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
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as OfficeLocation[];
    },
    enabled: !!profile,
  });

  const upsertLocation = useMutation({
    mutationFn: async (payload: Omit<OfficeLocation, 'id'> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase
          .from('locations')
          .update(payload)
          .eq('id', payload.id)
          .eq('organization_id', profile!.organization_id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('locations').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', profile?.organization_id] });
      setOpen(false);
      setEditingLocation(null);
      setForm(EMPTY_FORM);
      toast.success('Office location saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)
        .eq('organization_id', profile!.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', profile?.organization_id] });
      toast.success('Office location deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditingLocation(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (loc: OfficeLocation) => {
    setEditingLocation(loc);
    setForm({
      name: loc.name,
      address: loc.address ?? '',
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      geofence_radius_meters: String(loc.geofence_radius_meters),
      timezone: loc.timezone,
      allowed_wifi_ssids: (loc.allowed_wifi_ssids ?? []).join(', '),
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!profile) return;
    if (!form.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius = Number(form.geofence_radius_meters);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error('Latitude and longitude must be valid numbers');
      return;
    }

    if (Number.isNaN(radius) || radius <= 0) {
      toast.error('Geofence radius must be greater than 0');
      return;
    }

    upsertLocation.mutate({
      id: editingLocation?.id,
      organization_id: profile.organization_id,
      name: form.name.trim(),
      address: form.address.trim() || null,
      latitude,
      longitude,
      geofence_radius_meters: radius,
      timezone: form.timezone.trim() || 'Asia/Kolkata',
      allowed_wifi_ssids: form.allowed_wifi_ssids
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    });
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Office Locations</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLocation ? 'Edit Office Location' : 'Add Office Location'}</DialogTitle>
                <DialogDescription>
                  Configure geofence coordinates, radius, timezone, and allowed office Wi-Fi SSIDs.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Location Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="HQ Office"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Business Park, Mumbai"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      value={form.latitude}
                      onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                      placeholder="19.0760"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      value={form.longitude}
                      onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                      placeholder="72.8777"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="radius">Geofence Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min="1"
                      value={form.geofence_radius_meters}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, geofence_radius_meters: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={form.timezone}
                      onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                      placeholder="Asia/Kolkata"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wifi">Allowed Wi-Fi SSIDs (comma-separated)</Label>
                  <Input
                    id="wifi"
                    value={form.allowed_wifi_ssids}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, allowed_wifi_ssids: e.target.value }))
                    }
                    placeholder="Office-5G, Office-2G"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={upsertLocation.isPending}>
                  {upsertLocation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!locations?.length ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No office locations configured yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {locations.map((loc) => (
                <div key={loc.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{loc.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{loc.address}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteLocation.isPending}
                        onClick={() => deleteLocation.mutate(loc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
