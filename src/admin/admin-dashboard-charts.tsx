import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { RoleCountSlice } from '@/lib/admin-dashboard-schema';

const roleConfig = {
  count: { label: 'Accounts', color: 'hsl(262 55% 58%)' },
};

export function UsersByRoleChart({ data }: { data: RoleCountSlice[] }) {
  const chartData = data.map((d) => ({
    role: d.roleName.charAt(0).toUpperCase() + d.roleName.slice(1),
    count: d.count,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No user accounts yet.
      </div>
    );
  }

  return (
    <ChartContainer config={roleConfig} className="h-[260px] w-full">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="role" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
