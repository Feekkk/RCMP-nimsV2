import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureRequests } from '@/hooks/use-feature-requests';
import { useVotes } from '@/hooks/use-votes';
import { Header } from '@/components/board/Header';
import { FilterBar } from '@/components/board/FilterBar';
import { FeatureRequestCard } from '@/components/board/FeatureRequestCard';
import { SubmitRequestModal } from '@/components/board/SubmitRequestModal';
import { EmptyState } from '@/components/board/EmptyState';
import { LandingPage } from '@/components/landing/LandingPage';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { user, isLoading: authLoading, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('votes');
  const [submitOpen, setSubmitOpen] = useState(false);

  const { requests, isLoading } = useFeatureRequests({
    statusFilter,
    categoryFilter,
    searchQuery,
    sortBy,
    userId: user?.id ?? null,
  });

  const { handleVote, getVoteState } = useVotes(user?.id ?? null);

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
        <LandingPage />
        <Toaster />
      </>
    );
  }

  const hasFilters = Boolean(statusFilter || categoryFilter || searchQuery);

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header
          userName={profile?.name ?? null}
          isAdmin={isAdmin}
          onSubmitClick={() => setSubmitOpen(true)}
          onSignOut={signOut}
        />

        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Feature ideas</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Upvote the ideas you support. Submit new ideas to help prioritize what we build next.
            </p>
          </div>

          <FilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                hasFilters={hasFilters}
                onClearFilters={() => {
                  setStatusFilter(null);
                  setCategoryFilter(null);
                  setSearchQuery('');
                }}
                onSubmit={() => setSubmitOpen(true)}
              />
            ) : (
              requests.map(request => (
                <FeatureRequestCard
                  key={request.id}
                  request={request}
                  voteState={getVoteState(request.id, request.vote_state)}
                  onVote={handleVote}
                  onClick={(id) => navigate({ to: '/request/$requestId', params: { requestId: id } })}
                  canVote={true}
                />
              ))
            )}
          </div>
        </main>

        <SubmitRequestModal
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          userId={user.id}
        />
      </div>
      <Toaster />
    </>
  );
}
