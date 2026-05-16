import { useMemo, useState, type ElementType } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Search,
  Wrench,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TechnicianShell } from '@/technician/technician-shell';

type Priority = 'low' | 'medium' | 'high';
type JobStatus = 'scheduled' | 'in_progress' | 'blocked' | 'completed';

type WorkOrder = {
  id: string;
  ticket: string;
  title: string;
  site: string;
  priority: Priority;
  status: JobStatus;
  window: string;
  progress: number;
};

const MOCK_QUEUE: WorkOrder[] = [
  {
    id: 'wo-1',
    ticket: 'TKT-2841',
    title: 'AP refresh — wing C',
    site: 'Main detachment · Network closet B',
    priority: 'high',
    status: 'in_progress',
    window: '09:00–11:00',
    progress: 65,
  },
  {
    id: 'wo-2',
    ticket: 'TKT-2835',
    title: 'Label printer calibration',
    site: 'Records · Floor 2',
    priority: 'medium',
    status: 'scheduled',
    window: '11:30–12:15',
    progress: 0,
  },
  {
    id: 'wo-3',
    ticket: 'TKT-2820',
    title: 'Inventory scanner sync',
    site: 'Warehouse — receiving dock',
    priority: 'low',
    status: 'blocked',
    window: 'Awaiting parts',
    progress: 35,
  },
];

const MOCK_DONE: WorkOrder[] = [
  {
    id: 'wo-d1',
    ticket: 'TKT-2812',
    title: 'Badge reader firmware',
    site: 'Visitor entrance',
    priority: 'medium',
    status: 'completed',
    window: 'Completed 4:12 PM',
    progress: 100,
  },
  {
    id: 'wo-d2',
    ticket: 'TKT-2808',
    title: 'Patch panel tidy + test',
    site: 'Comms room A',
    priority: 'low',
    status: 'completed',
    window: 'Completed yesterday',
    progress: 100,
  },
];

function priorityVariant(p: Priority): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (p === 'high') return 'destructive';
  if (p === 'medium') return 'default';
  return 'secondary';
}

function statusLabel(status: JobStatus) {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'in_progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Done';
    default:
      return status;
  }
}

function TechnicianStat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

function WorkOrderCard({ job }: { job: WorkOrder }) {
  return (
    <Card className="rounded-[14px] border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-semibold leading-tight">{job.title}</CardTitle>
              <Badge variant={priorityVariant(job.priority)} className="rounded-[8px] text-[10px] font-semibold uppercase">
                {job.priority}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <span className="font-mono text-foreground/80">{job.ticket}</span>
              <span className="text-muted-foreground">·</span>
              <span>{statusLabel(job.status)}</span>
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-0.5 shrink-0 rounded-[8px] text-muted-foreground hover:text-foreground">
            Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[oklch(0.45_0.12_290)]" />
            {job.site}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {job.window}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums font-medium text-foreground">{job.progress}%</span>
        </div>
        <Progress value={job.progress} className="h-2 rounded-full" />
        {job.status === 'blocked' && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Hold until cables arrive — ETA tomorrow AM.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TechnicianDashboardPage() {
  const [search, setSearch] = useState('');

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_QUEUE;
    return MOCK_QUEUE.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.ticket.toLowerCase().includes(q) ||
        j.site.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredDone = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_DONE;
    return MOCK_DONE.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.ticket.toLowerCase().includes(q) ||
        j.site.toLowerCase().includes(q),
    );
  }, [search]);

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Today&apos;s work</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{todayLabel} · Assigned to you</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:mb-6">
        <TechnicianStat
          icon={ClipboardList}
          label="Open jobs"
          value={MOCK_QUEUE.filter((j) => j.status !== 'completed').length}
          tint="bg-lavender/15 text-[oklch(0.45_0.12_290)]"
        />
        <TechnicianStat
          icon={Wrench}
          label="In progress"
          value={MOCK_QUEUE.filter((j) => j.status === 'in_progress').length}
          tint="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
        />
        <TechnicianStat
          icon={CheckCircle2}
          label="Closed (sample)"
          value={MOCK_DONE.length}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets, sites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-[10px] pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="mb-4 h-auto w-full justify-start gap-1 rounded-[10px] bg-muted/80 p-1 sm:w-auto">
          <TabsTrigger value="queue" className="rounded-[8px] px-4 py-2 data-[state=active]:shadow-sm">
            My queue
            <Badge variant="secondary" className="ml-2 rounded-[6px] tabular-nums">
              {filteredQueue.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-[8px] px-4 py-2 data-[state=active]:shadow-sm">
            Recent closed
            <Badge variant="secondary" className="ml-2 rounded-[6px] tabular-nums">
              {filteredDone.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-0 outline-none">
          <ScrollArea className="max-h-[min(70vh,720px)] pr-3">
            <div className="space-y-3 pb-4">
              {filteredQueue.length === 0 ? (
                <Card className="rounded-[14px] border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                    No jobs match your search.
                  </CardContent>
                </Card>
              ) : (
                filteredQueue.map((job) => <WorkOrderCard key={job.id} job={job} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="mt-0 outline-none">
          <ScrollArea className="max-h-[min(70vh,720px)] pr-3">
            <div className="space-y-3 pb-4">
              {filteredDone.length === 0 ? (
                <Card className="rounded-[14px] border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                    No completed tickets match your search.
                  </CardContent>
                </Card>
              ) : (
                filteredDone.map((job) => <WorkOrderCard key={job.id} job={job} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </TechnicianShell>
  );
}
