import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Boxes, BarChart3, Shield, Bell, PackageSearch, ScanBarcode, Activity, Menu, X } from 'lucide-react';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { StatusBadge } from '@/components/inventory/StatusBadge';

function MockRow({ name, sku, qty, status }: { name: string; sku: string; qty: number; status: 'in_stock' | 'low_stock' | 'out_of_stock' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border/60 bg-white p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-secondary">
          <Boxes className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{sku}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} className="text-[9px]" />
        <span className="text-sm font-bold tabular-nums text-foreground">{qty}</span>
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
            <p className="text-[13px] font-semibold text-foreground">Inventory</p>
            <p className="text-[10px] text-muted-foreground">12 items tracked</p>
          </div>
          <MockRow name="USB-C Cable 2m" sku="ELEC-001" qty={42} status="in_stock" />
          <MockRow name="Office Chair" sku="FURN-014" qty={3} status="low_stock" />
          <MockRow name="A4 Paper Ream" sku="OFFC-022" qty={0} status="out_of_stock" />
          <MockRow name="Cordless Drill" sku="TOOL-007" qty={18} status="in_stock" />
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: PackageSearch, title: 'Real-time stock levels', description: 'Always know what you have, where it is, and when it needs reordering.' },
  { icon: Bell, title: 'Low-stock alerts', description: 'Items automatically flag as low or out of stock based on your thresholds.' },
  { icon: BarChart3, title: 'Search and filter', description: 'Find items by name, SKU, category, or location in seconds.' },
  { icon: Shield, title: 'Role-based control', description: 'Admins manage inventory; team members view and report. Everyone stays aligned.' },
];

const steps = [
  { num: '01', icon: ScanBarcode, title: 'Add your items', description: 'Enter products with SKU, quantity, supplier, and location.' },
  { num: '02', icon: Activity, title: 'Track movement', description: 'Update quantities as stock comes in or goes out. Status updates automatically.' },
  { num: '03', icon: Bell, title: 'Stay ahead', description: 'Get a clear view of low and out-of-stock items so you reorder on time.' },
];

export function LandingPage() {
  const [showNav, setShowNav] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowNav(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToHowItWorks = () => {
    setMobileNavOpen(false);
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky nav */}
      <nav className={`fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-4 sm:px-8 md:px-12 transition-all duration-300 ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="mx-auto flex max-w-6xl h-8 items-center justify-between">
          <NimsLogo size="md" variant="light" />
          <div className="hidden items-center gap-8 sm:flex">
            <button onClick={scrollToHowItWorks} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </button>
            <Link to="/login" className="rounded-[10px] bg-foreground px-5 py-1.5 text-sm font-semibold text-background hover:opacity-90 transition-all">
              Sign in
            </Link>
          </div>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="flex h-10 w-10 items-center justify-center rounded-[8px] text-muted-foreground hover:text-foreground sm:hidden">
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileNavOpen && (
          <div className="mx-auto max-w-6xl space-y-3 px-1 pt-4 sm:hidden">
            <button onClick={scrollToHowItWorks} className="block w-full py-2 text-left text-sm text-muted-foreground">
              How it works
            </button>
            <Link to="/login" className="block w-full rounded-[10px] bg-foreground px-4 py-2 text-center text-sm font-semibold text-background">
              Sign in
            </Link>
          </div>
        )}
      </nav>

      <div className="relative">
        {/* Gradient mesh */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[200px] right-[10%] h-[600px] w-[600px] rounded-full bg-lavender/[0.12] blur-[100px]" />
          <div className="absolute -top-[100px] -left-[200px] h-[500px] w-[500px] rounded-full bg-[oklch(0.65_0.20_350)]/[0.08] blur-[80px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle, var(--foreground) 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
        />

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24 md:py-32">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
              <div className="flex-1 max-w-xl">
                <div className="mb-8">
                  <NimsLogo size="lg" variant="light" />
                </div>
                <h1 className="text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl md:text-5xl lg:text-[56px]">
                  Inventory, finally under control
                </h1>
                <p className="mt-6 max-w-md text-base leading-[1.6] text-muted-foreground sm:mt-8 sm:text-lg">
                  NIMS gives your team a single source of truth for stock levels, locations, and suppliers — with low-stock alerts so nothing slips through.
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link
                    to="/login"
                    className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-lavender px-8 py-3 text-base font-semibold text-foreground transition-all hover:shadow-lg hover:shadow-lavender/25"
                  >
                    Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <button
                    onClick={scrollToHowItWorks}
                    className="inline-flex items-center justify-center rounded-[10px] border border-border bg-white px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    See how it works
                  </button>
                </div>
              </div>
              <div className="w-full max-w-md lg:max-w-lg flex-shrink-0">
                <div className="relative">
                  <div className="pointer-events-none absolute -top-6 -left-6 z-10 h-12 w-12 rounded-full bg-lavender shadow-lg shadow-lavender/20 animate-[float_6s_ease-in-out_infinite] flex items-center justify-center">
                    <Boxes className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="pointer-events-none absolute -top-4 -right-4 z-10 h-10 w-10 rounded-full bg-[oklch(0.65_0.20_350)] shadow-lg flex items-center justify-center">
                    <Bell className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="pointer-events-none absolute -bottom-5 -right-5 z-10 h-11 w-11 rounded-full bg-foreground shadow-lg flex items-center justify-center">
                    <ScanBarcode className="h-4 w-4 text-background" />
                  </div>
                  <AppMockup />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="relative">
          <div className="mx-6 rounded-[24px] bg-foreground text-background sm:mx-10">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
              <div className="mb-14 max-w-lg">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lavender">How it works</p>
                <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.01em] sm:text-4xl">From chaos to clarity in three steps</h2>
              </div>
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-10">
                {steps.map((step, i) => {
                  const iconColors = [
                    'bg-lavender text-foreground',
                    'bg-[oklch(0.85_0.12_155)] text-foreground',
                    'bg-[oklch(0.85_0.10_55)] text-foreground',
                  ];
                  return (
                    <div key={i}>
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

        {/* Features */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
              <div className="lg:w-80 lg:flex-shrink-0">
                <div className="lg:sticky lg:top-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lavender">Features</p>
                  <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.01em] text-foreground sm:text-4xl">Built for the people who keep things moving</h2>
                  <p className="mt-4 text-base leading-[1.6] text-muted-foreground">
                    Every tool you need to run an organized stockroom — without the spreadsheet headaches.
                  </p>
                </div>
              </div>
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

        {/* CTA */}
        <section className="relative">
          <div className="mx-6 mb-4 rounded-[24px] bg-foreground px-6 py-16 sm:mx-10 sm:px-12 sm:py-24 md:py-28">
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.01em] text-white sm:text-4xl">Ready to take control of your stock?</h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-[1.6] text-white/60">
                Sign in to start managing inventory the way it should be — clear, fast, and shared with your team.
              </p>
              <Link
                to="/login"
                className="group mt-10 inline-flex items-center justify-center gap-2 rounded-[10px] bg-lavender px-8 py-3 text-base font-semibold text-foreground transition-all hover:shadow-lg hover:shadow-lavender/25"
              >
                Sign in to NIMS <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="px-6 py-4 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <NimsLogo size="sm" variant="light" />
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NIMS. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
