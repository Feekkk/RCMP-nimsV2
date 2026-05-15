import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Send, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Comment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  author_name: string | null;
}

interface CommentSectionProps {
  requestId: string;
  userId: string;
}

export function CommentSection({ requestId, userId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data: rawComments } = await supabase
      .from('comments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (!rawComments) {
      setIsLoading(false);
      return;
    }

    // Fetch author profiles
    const userIds = [...new Set(rawComments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) ?? []);

    setComments(rawComments.map(c => ({
      ...c,
      author_name: profileMap.get(c.user_id) ?? null,
    })));
    setIsLoading(false);
  }, [requestId]);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${requestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `request_id=eq.${requestId}` }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchComments, requestId]);

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      request_id: requestId,
      user_id: userId,
      text: trimmed,
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to post comment');
    } else {
      setNewComment('');
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Discussion{comments.length > 0 ? ` (${comments.length})` : ''}
        </h2>
      </div>

      {/* Comment input */}
      <div className="space-y-2">
        <Textarea
          placeholder="Share your thoughts..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="gap-1.5"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="group rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(comment.author_name ?? 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {comment.author_name ?? 'Anonymous'}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {comment.user_id === userId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap pl-9">
                {comment.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
