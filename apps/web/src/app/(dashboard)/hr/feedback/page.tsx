'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HRFeedbackPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anonymous_feedback')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Anonymous Feedback</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !feedback?.length ? (
        <p className="text-muted-foreground">No feedback submitted yet.</p>
      ) : (
        <div className="grid gap-4">
          {feedback.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <Badge variant="outline">{f.category}</Badge>
                    <Badge variant={f.moderation_status === 'APPROVED' ? 'success' : f.moderation_status === 'FLAGGED' ? 'destructive' : 'secondary'}>
                      {f.moderation_status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm">{f.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
