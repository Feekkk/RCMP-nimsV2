import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Heart, Rocket, ArrowRight, Lightbulb, Menu, X, Zap, BarChart3, Shield, Users } from 'lucide-react';
import { AuthPage } from '@/components/auth/AuthPage';
import { UpvoteLogo } from '@/components/brand/UpvoteLogo';



function MockCard({ title, votes, status, category }: {
  title: string;
  votes: number;
  status: string;
  category: string;
}) {
  const statusColors: Record<string, string> = {
    'New': 'bg-muted text-muted-foreground',
    'Planned': 'bg-lavender/15 text-[oklch(0.45_0.12_290)]',
    'In progress': 'bg-lavender/15 text-[oklch(0.45_0.12_290)]',
    'Shipped': 'bg-status-shipped/10 text-status-shipped',
  };

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-border/60 bg-white p-3">
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-[6px] bg-vote-up/10 px-2 py-0.5 text-[10px] font-semibold text-vote-up">
          <ThumbsUp className="h-2.5 w-2.5" />
          <span>{votes}</span>
        </div>
        <div className="flex items-center gap-1 rounded-[6px] bg-vote-down/10 px-2 py-0.5 text-[10px] font-semibold text-vote-down">
          <ThumbsDown className="h-2.5 w-2.5" />
          <span>0</span>
        </div>
        <div className="mx-0.5 h-3 w-px bg-border/60" />
        <span className={`inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[9px] font-medium ${statusColors[status] ?? 'bg-muted text-muted-foreground'}`}>
          {status}
        </span>
        <span className="inline-flex items-center rounded-[6px] bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-secondary-foreground">
          {category}
        </span>
      </div>
    </div>
  );
}

function AppMockup() {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-[16px] border border-border/50 bg-background shadow-[0_20px_60px_-12px_rgba(0,0,0,0.12)]">
        <div className="space-y-2 bg-background p-4">
          <div className="mb-2">
            <p className="text-[13px] font-semibold text-foreground">Feature ideas</p>
            <p className="text-[10px] text-muted-foreground">Upvote the ideas you support</p>
          </div>
          <MockCard title="Dark mode for the dashboard" votes={24} status="Planned" category="Design" />
          <MockCard title="API rate-limit monitoring" votes={18} status="In progress" category="Backend" />
          <MockCard title="Slack integration for notifications" votes={12} status="New" category="Integrations" />
          <MockCard title="CSV export for analytics data" votes={9} status="Shipped" category="Analytics" />
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    num: '01',
    icon: Lightbulb,
    title: 'Submit an idea',
    description: 'Anyone on the team can propose a feature. Add a title, description, and category.',
  },
  {
    num: '02',
    icon: ThumbsUp,
    title: 'Vote and discuss',
    description: 'Upvote or downvote ideas. Leave comments to refine proposals and add context.',
  },
  {
    num: '03',
    icon: Rocket,
    title: 'Watch it ship',
    description: 'Track status from "New" to "Shipped." The most-wanted features rise to the top.',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Instant feedback loops',
    description: 'Get signal on what your team actually wants — no more guessing or spreadsheet polls.',
  },
  {
    icon: BarChart3,
    title: 'Priority by consensus',
    description: 'The most popular ideas surface automatically. Build with confidence, backed by real votes.',
  },
  {
    icon: Shield,
    title: 'Role-based access',
    description: 'Admins manage statuses and moderate. Team members submit, vote, and comment freely.',
  },
  {
    icon: Users,
    title: 'Built for teams',
    description: 'See who submitted what, track discussions, and keep everyone aligned on the roadmap.',
  },
];

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToAuth = () => {
    setShowAuth(true);
    setMobileNavOpen(false);
    setTimeout(() => {
      document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToHowItWorks = () => {
    setMobileNavOpen(false);
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav — appears on scroll */}
      <nav className={`fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-4 sm:px-8 md:px-12 transition-all duration-300 ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="mx-auto flex max-w-6xl h-8 items-center justify-between">
          <UpvoteLogo size="md" variant="light" />

          <div className="hidden items-center gap-8 sm:flex">
            <button onClick={scrollToHowItWorks} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </button>
            <button
              onClick={scrollToAuth}
              className="rounded-[10px] bg-foreground px-5 py-1.5 text-sm font-semibold text-background transition-all hover:opacity-90"
            >
              Get started
            </button>
          </div>

          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="mx-auto max-w-6xl space-y-3 px-1 pt-4 sm:hidden">
            <button onClick={scrollToHowItWorks} className="block w-full py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </button>
            <button
              onClick={scrollToAuth}
              className="w-full rounded-[10px] bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Get started
            </button>
          </div>
        )}
      </nav>

      {/* Content */}
      <div className="relative">
        {/* Gradient mesh */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]">
          <div className="absolute -top-[200px] right-[10%] h-[600px] w-[600px] rounded-full bg-lavender/[0.12] blur-[100px]" />
          <div className="absolute -top-[100px] -left-[200px] h-[500px] w-[500px] rounded-full bg-[oklch(0.65_0.20_350)]/[0.08] blur-[80px]" />
          <div className="absolute top-[60%] left-[40%] h-[300px] w-[300px] rounded-full bg-lavender/[0.06] blur-[80px]" />
        </div>

        {/* Dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* ━━━ HERO ━━━ */}
        <section className="relative">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24 md:py-32">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
              {/* Left copy */}
              <div className="flex-1 max-w-xl">
                <div className="mb-8">
                  <UpvoteLogo size="lg" variant="light" />
                </div>

                <h1 className="text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl md:text-5xl lg:text-[56px]">
                  Let your team decide what gets built next
                </h1>

                <p className="mt-6 max-w-md text-base leading-[1.6] text-muted-foreground sm:mt-8 sm:text-lg">
                  Submit feature ideas, upvote what matters most, and let the best ideas rise to the top — so you always ship the right thing.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button
                    onClick={scrollToAuth}
                    className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-lavender px-8 py-3 text-base font-semibold text-foreground transition-all hover:shadow-lg hover:shadow-lavender/25"
                  >
                    Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    onClick={scrollToHowItWorks}
                    className="inline-flex items-center justify-center rounded-[10px] border border-border bg-white px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    See how it works
                  </button>
                </div>
              </div>

              {/* Right mockup — clean, no bubbles cluttering */}
              <div className="w-full max-w-md lg:max-w-lg flex-shrink-0">
                {/* Decorative floating accents — 3 small, tasteful */}
                <div className="relative">
                  <div className="pointer-events-none absolute -top-6 -left-6 z-10 h-12 w-12 rounded-full bg-lavender shadow-lg shadow-lavender/20 animate-[float_6s_ease-in-out_infinite] flex items-center justify-center">
                    <ThumbsUp className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="pointer-events-none absolute -top-4 -right-4 z-10 h-10 w-10 rounded-full bg-[oklch(0.65_0.20_350)] shadow-lg shadow-[oklch(0.65_0.20_350)]/20 animate-[float_5s_ease-in-out_1s_infinite] flex items-center justify-center">
                    <Heart className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="pointer-events-none absolute -bottom-5 -right-5 z-10 h-11 w-11 rounded-full bg-foreground shadow-lg shadow-foreground/20 animate-[float_7s_ease-in-out_2s_infinite] flex items-center justify-center">
                    <ThumbsUp className="h-4.5 w-4.5 text-background" />
                  </div>
                  <AppMockup />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ HOW IT WORKS — dark section ━━━ */}
        <section id="how-it-works" className="relative">
          <div className="mx-6 rounded-[24px] bg-foreground text-background sm:mx-10">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
            <div className="mb-14 max-w-lg">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lavender">How it works</p>
              <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.01em] sm:text-4xl">Three steps from idea to shipped feature</h2>
            </div>

            <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-10">
              {steps.map((step, i) => {
                const iconColors = [
                  'bg-lavender text-foreground',
                  'bg-[oklch(0.85_0.12_155)] text-foreground',
                  'bg-[oklch(0.85_0.10_55)] text-foreground',
                ];
                return (
                  <div key={i} className="relative">
                    
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] ${iconColors[i]}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-[1.6] text-white/70">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </section>

        {/* ━━━ FEATURES — light with left header ━━━ */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
              {/* Sticky header on left */}
              <div className="lg:w-80 lg:flex-shrink-0">
                <div className="lg:sticky lg:top-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lavender">Features</p>
                  <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.01em] text-foreground sm:text-4xl">Everything you need to prioritize well</h2>
                  <p className="mt-4 text-base leading-[1.6] text-muted-foreground">
                    Simple tools that give your product decisions a foundation of real team input.
                  </p>
                </div>
              </div>

              {/* Feature cards on right */}
              <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {features.map((feature, i) => (
                  <div key={i} className="group rounded-[16px] border border-border p-7 transition-all hover:border-lavender/30 hover:shadow-lg hover:shadow-lavender/5 sm:p-8">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-lavender/10 transition-colors group-hover:bg-lavender/15">
                      <feature.icon className="h-5 w-5 text-lavender" />
                    </div>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ CTA — gradient bg ━━━ */}
        <section id="auth-section" className="relative">
          <div className="mx-6 mb-4 rounded-[24px] bg-foreground px-6 py-16 sm:mx-10 sm:px-12 sm:py-24 md:py-28">

            <div className="relative mx-auto max-w-2xl">
              {!showAuth ? (
                <div className="text-center">
                  <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.01em] text-white sm:text-4xl">Ready to shape what's next?</h2>
                  <p className="mx-auto mt-4 max-w-lg text-base leading-[1.6] text-white/60">
                    Sign in to start submitting ideas, voting on features, and helping your team prioritize what matters.
                  </p>
                  <button
                    onClick={scrollToAuth}
                    className="group mt-10 inline-flex items-center justify-center gap-2 rounded-[10px] bg-lavender px-8 py-3 text-base font-semibold text-foreground transition-all hover:shadow-lg hover:shadow-lavender/25"
                  >
                    Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              ) : (
                <div className="rounded-[16px] bg-background p-6 sm:p-8 shadow-2xl">
                  <AuthPage />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-4 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <UpvoteLogo size="sm" variant="light" />
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Upvote. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
