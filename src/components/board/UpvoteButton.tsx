import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';

export type VoteState = 'up' | 'down' | null;

interface VoteButtonsProps {
  upCount: number;
  downCount: number;
  voteState: VoteState;
  onVote: (type: 'up' | 'down') => void;
  disabled?: boolean;
}

export function UpvoteButton({ upCount, downCount, voteState, onVote, disabled }: VoteButtonsProps) {
  const [bouncing, setBouncing] = useState<'up' | 'down' | null>(null);

  const handleClick = (e: React.MouseEvent, type: 'up' | 'down') => {
    e.stopPropagation();
    if (disabled) return;
    setBouncing(type);
    onVote(type);
    setTimeout(() => setBouncing(null), 300);
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <button
        onClick={(e) => handleClick(e, 'up')}
        disabled={disabled}
        className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all duration-150
          ${voteState === 'up'
            ? 'bg-vote-up text-white shadow-sm shadow-vote-up/30'
            : 'bg-vote-up/10 text-vote-up hover:bg-vote-up/20'
          }
          ${bouncing === 'up' ? 'upvote-bounce' : ''}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        title={voteState === 'up' ? 'Remove upvote' : 'Upvote'}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>{upCount}</span>
      </button>
      <button
        onClick={(e) => handleClick(e, 'down')}
        disabled={disabled}
        className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all duration-150
          ${voteState === 'down'
            ? 'bg-vote-down text-white shadow-sm shadow-vote-down/30'
            : 'bg-vote-down/10 text-vote-down hover:bg-vote-down/20'
          }
          ${bouncing === 'down' ? 'upvote-bounce' : ''}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        title={voteState === 'down' ? 'Remove downvote' : 'Downvote'}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        <span>{downCount}</span>
      </button>
    </div>
  );
}
