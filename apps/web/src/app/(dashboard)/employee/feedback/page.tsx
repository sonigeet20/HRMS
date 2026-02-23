'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageSquare, Shield } from 'lucide-react';

export default function FeedbackPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    setSubmitting(true);
    try {
      // Create anonymized hash
      const { data: org } = await supabase
        .from('organizations')
        .select('org_salt')
        .eq('id', profile!.organization_id)
        .single();

      const encoder = new TextEncoder();
      const data = encoder.encode(user!.id + (org?.org_salt ?? ''));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const userHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Rate limit check
      const { data: recent } = await supabase
        .from('anonymous_feedback')
        .select('id')
        .eq('user_hash', userHash)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recent && recent.length > 0) {
        toast.error('You can only submit feedback once every 24 hours');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('anonymous_feedback').insert({
        organization_id: profile!.organization_id,
        user_hash: userHash,
        category,
        content: content.trim(),
      });

      if (error) throw error;
      toast.success('Feedback submitted anonymously');
      setContent('');
      setCategory('general');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Anonymous Feedback</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Submit Feedback
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Your identity is protected. Feedback is anonymized using a one-way hash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="workplace">Workplace</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Your Feedback</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length}/2000</p>
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Anonymously'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
