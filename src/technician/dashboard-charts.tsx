import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { TechnicianDashboardCharts } from '@/lib/dashboard-schema';

const PROGRAM_PALETTE = [
  'hsl(262 55% 58%)',
  'hsl(210 70% 55%)',
  'hsl(168 45% 42%)',
  'hsl(32 90% 55%)',
  'hsl(340 65% 55%)',
];

const trendConfig = {
  submitted: { label: 'New requests', color: 'hsl(262 55% 58%)' },
  dueReturn: { label: 'Returns due', color: 'hsl(210 70% 55%)' },
};

const inventoryConfig = {
  active: { label: 'In stock', color: 'hsl(262 55% 58%)' },
  deploy: { label: 'Deployed', color: 'hsl(210 70% 55%)' },
  requestFlow: { label: 'Request flow', color: 'hsl(168 45% 42%)' },
  maintenance: { label: 'Disposed / other', color: 'hsl(220 12% 72%)' },
};

export function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-11 w-[5.5rem] shrink-0">
      <ChartContainer config={{ value: { label: 'Trend', color } }} className="h-full w-full aspect-auto">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function RequestTrendChart({ data }: { data: TechnicianDashboardCharts['requestTrend'] }) {
  return (
    <ChartContainer config={trendConfig} className="h-[260px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="submitted"
          stroke="var(--color-submitted)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-submitted)' }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="dueReturn"
          stroke="var(--color-dueReturn)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-dueReturn)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function ProgramStackChart({
  data,
  programKeys,
}: {
  data: TechnicianDashboardCharts['requestsByProgram'];
  programKeys: string[];
}) {
  const config = Object.fromEntries(
    programKeys.map((key, i) => [
      key,
      { label: key, color: PROGRAM_PALETTE[i % PROGRAM_PALETTE.length] },
    ]),
  );

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {programKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="programs"
            fill={PROGRAM_PALETTE[i % PROGRAM_PALETTE.length]}
            radius={i === programKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export function InventoryMixChart({ data }: { data: TechnicianDashboardCharts['inventoryMix'] }) {
  return (
    <ChartContainer config={inventoryConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="kind" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="active" stackId="inv" fill="var(--color-active)" />
        <Bar dataKey="deploy" stackId="inv" fill="var(--color-deploy)" />
        <Bar dataKey="requestFlow" stackId="inv" fill="var(--color-requestFlow)" />
        <Bar dataKey="maintenance" stackId="inv" fill="var(--color-maintenance)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
