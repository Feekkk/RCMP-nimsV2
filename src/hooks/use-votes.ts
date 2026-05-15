import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoteState } from '@/components/board/UpvoteButton';

export function useVotes(userId: string | null) {
  const [optimisticVotes, setOptimisticVotes] = useState<Map<string, VoteState>>(new Map());

  const handleVote = useCallback(async (requestId: string, currentState: VoteState, type: 'up' | 'down') => {
    if (!userId) return;

    const voteType = type === 'up' ? 1 : -1;
    const isSameType = (currentState === 'up' && type === 'up') || (currentState === 'down' && type === 'down');
    const newState: VoteState = isSameType ? null : type;

    // Optimistic update
    setOptimisticVotes(prev => new Map(prev).set(requestId, newState));

    try {
      if (isSameType) {
        // Remove the vote
        await supabase.from('votes').delete().eq('user_id', userId).eq('request_id', requestId);
      } else if (currentState) {
        // Switch vote type: update existing row
        await supabase.from('votes').update({ vote_type: voteType }).eq('user_id', userId).eq('request_id', requestId);
      } else {
        // New vote
        await supabase.from('votes').insert({ user_id: userId, request_id: requestId, vote_type: voteType });
      }
    } catch {
      // Revert optimistic update
      setOptimisticVotes(prev => {
        const next = new Map(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [userId]);

  const getVoteState = useCallback((requestId: string, serverState: VoteState): VoteState => {
    return optimisticVotes.has(requestId) ? optimisticVotes.get(requestId)! : serverState;
  }, [optimisticVotes]);

  return { handleVote, getVoteState };
}
