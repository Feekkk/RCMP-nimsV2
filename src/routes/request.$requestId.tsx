import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoteState } from '@/components/board/UpvoteButton';
import { useAuth } from '@/hooks/use-auth';
import { useVotes } from '@/hooks/use-votes';
import { UpvoteButton } from '@/components/board/UpvoteButton';
import { StatusUpdateDropdown } from '@/components/board/StatusUpdateDropdown';
import { CommentSection } from '@/components/board/CommentSection';
import { EditRequestSheet } from '@/components/board/EditRequestSheet';
import { Toaster } from '@/components/ui/sonner';
import { AuthPage } from '@/components/auth/AuthPage';
import { ArrowLeft, Loader2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

export const Route = createFileRoute('/request/$requestId')({
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { requestId } = Route.useParams();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { handleVote, getVoteState } = useVotes(user?.id ?? null);
  const navigate = useNavigate();

  const [request, setRequest] = useState<any>(null);
  const [upCount, setUpCount] = useState(0);
  const [downCount, setDownCount] = useState(0);
  const [userVoteState, setUserVoteState] = useState<VoteState>(null);
  const [submitterName, setSubmitterName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchDetail = async () => {
      const [reqRes, voteCountsRes, userVoteRes] = await Promise.all([
        supabase.from('feature_requests').select('*').eq('id', requestId).single(),
        supabase.rpc('get_vote_counts'),
        supabase.from('votes').select('vote_type').eq('request_id', requestId).eq('user_id', user.id),
      ]);

      if (reqRes.data) {
        setRequest(reqRes.data);
        const counts = voteCountsRes.data?.find((vc: { request_id: string }) => vc.request_id === requestId);
        setUpCount(counts ? Number(counts.up_count) : 0);
        setDownCount(counts ? Number(counts.down_count) : 0);
        const uv = userVoteRes.data?.[0];
        setUserVoteState(uv ? (uv.vote_type === -1 ? 'down' : 'up') : null);

        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', reqRes.data.submitter_id)
          .single();
        setSubmitterName(profile?.name ?? null);
      }
      setIsLoading(false);
    };

    fetchDetail();

    // Real-time for this request
    const channel = supabase
      .channel(`request-${requestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_requests', filter: `id=eq.${requestId}` }, (payload) => {
        if (payload.new) setRequest(payload.new);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `request_id=eq.${requestId}` }, async () => {
        const [countsRes, myVoteRes] = await Promise.all([
          supabase.rpc('get_vote_counts'),
          supabase.from('votes').select('vote_type').eq('request_id', requestId).eq('user_id', user.id),
        ]);
        const counts = countsRes.data?.find((vc: { request_id: string }) => vc.request_id === requestId);
        setUpCount(counts ? Number(counts.up_count) : 0);
        setDownCount(counts ? Number(counts.down_count) : 0);
        const uv = myVoteRes.data?.[0];
        setUserVoteState(uv ? (uv.vote_type === -1 ? 'down' : 'up') : null);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage />
        <Toaster />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Request not found</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Back to board
        </Link>
      </div>
    );
  }

  const currentVoteState = getVoteState(requestId, userVoteState);

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate({ to: '/' })}
            className="mb-4 sm:mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to board
          </button>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-shrink-0 sm:pt-1">
              <UpvoteButton
                upCount={upCount}
                downCount={downCount}
                voteState={currentVoteState}
                onVote={(type) => handleVote(requestId, currentVoteState, type)}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{request.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <StatusUpdateDropdown
                    requestId={requestId}
                    currentStatus={request.status}
                  />
                  {request.category && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {request.category}
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {submitterName ?? 'Anonymous'} · {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>

              <CommentSection requestId={requestId} userId={user.id} />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete request
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {request && (
        <EditRequestSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          request={request}
        />
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{request?.title}" and all its votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const { error } = await supabase.from('feature_requests').delete().eq('id', requestId);
                if (error) {
                  toast.error('Failed to delete request');
                } else {
                  toast.success('Request deleted');
                  navigate({ to: '/' });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  );
}
