import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { UpvoteButton, type VoteState } from './UpvoteButton';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeatureRequest } from '@/hooks/use-feature-requests';
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

interface FeatureRequestCardProps {
  request: FeatureRequest;
  voteState: VoteState;
  onVote: (requestId: string, currentState: VoteState, type: 'up' | 'down') => void;
  onClick: (requestId: string) => void;
  canVote: boolean;
}

export function FeatureRequestCard({ request, voteState, onVote, onClick, canVote }: FeatureRequestCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from('feature_requests').delete().eq('id', request.id);
    if (error) {
      toast.error('Failed to delete request');
    } else {
      toast.success('Request deleted');
    }
    setConfirmOpen(false);
  };

  return (
    <>
      <div
        onClick={() => onClick(request.id)}
        className="group flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 sm:p-5 transition-all duration-150 hover:border-lavender/30 cursor-pointer"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="text-sm sm:text-base font-semibold leading-[1.14] tracking-[-0.02em] text-foreground group-hover:text-[oklch(0.45_0.12_290)] transition-colors line-clamp-2 sm:line-clamp-1">
            {request.title}
          </h3>
          <p className="text-xs sm:text-sm leading-[1.5] text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UpvoteButton
            upCount={request.up_count}
            downCount={request.down_count}
            voteState={voteState}
            onVote={(type) => onVote(request.id, voteState, type)}
            disabled={!canVote}
          />
          <div className="mx-1 h-4 w-px bg-border" />
          <StatusBadge status={request.status} />
          {request.category && (
            <span className="inline-flex items-center rounded-[8px] bg-secondary px-2 py-0.5 text-[10px] sm:text-xs font-medium text-secondary-foreground">
              {request.category}
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {request.submitter_name ?? 'Anonymous'} · {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </span>
          <button
            onClick={handleDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 sm:transition-opacity text-muted-foreground hover:text-destructive p-1.5 sm:p-1 rounded-[8px] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
            title="Delete request"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] rounded-[16px] sm:mx-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{request.title}" and all its votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full rounded-[8px] sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="w-full rounded-[8px] sm:w-auto">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
