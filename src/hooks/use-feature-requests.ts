import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoteState } from '@/components/board/UpvoteButton';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: string;
  submitter_id: string;
  created_at: string;
  updated_at: string;
  up_count: number;
  down_count: number;
  vote_state: VoteState;
  submitter_name: string | null;
}

interface UseFeatureRequestsOptions {
  statusFilter?: string | null;
  categoryFilter?: string | null;
  searchQuery?: string;
  sortBy?: 'votes' | 'date';
  userId?: string | null;
}

export function useFeatureRequests(options: UseFeatureRequestsOptions = {}) {
  const { statusFilter, categoryFilter, searchQuery, sortBy = 'votes', userId } = options;
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    let query = supabase.from('feature_requests').select('*');

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data: rawRequests, error } = await query;
    if (error || !rawRequests) {
      setIsLoading(false);
      return;
    }

    // Get aggregated vote counts via security definer function (anonymous)
    const { data: voteCounts } = await supabase.rpc('get_vote_counts');

    // Get only the current user's own votes (RLS restricts to own rows)
    const { data: myVotes } = userId
      ? await supabase.from('votes').select('request_id, vote_type')
      : { data: null };

    const submitterIds = [...new Set(rawRequests.map(r => r.submitter_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', submitterIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) ?? []);

    const upCountMap = new Map<string, number>();
    const downCountMap = new Map<string, number>();
    const userVoteMap = new Map<string, VoteState>();

    voteCounts?.forEach((vc: { request_id: string; up_count: number; down_count: number }) => {
      upCountMap.set(vc.request_id, Number(vc.up_count));
      downCountMap.set(vc.request_id, Number(vc.down_count));
    });

    myVotes?.forEach(v => {
      userVoteMap.set(v.request_id, v.vote_type === -1 ? 'down' : 'up');
    });

    const enriched: FeatureRequest[] = rawRequests.map(r => ({
      ...r,
      up_count: upCountMap.get(r.id) || 0,
      down_count: downCountMap.get(r.id) || 0,
      vote_state: userVoteMap.get(r.id) ?? null,
      submitter_name: profileMap.get(r.submitter_id) ?? null,
    }));

    enriched.sort((a, b) => {
      if (sortBy === 'votes') {
        const netA = a.up_count - a.down_count;
        const netB = b.up_count - b.down_count;
        return netB - netA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setRequests(enriched);
    setIsLoading(false);
  }, [statusFilter, categoryFilter, searchQuery, sortBy, userId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const channel = supabase
      .channel('board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  return { requests, isLoading, refetch: fetchRequests };
}
