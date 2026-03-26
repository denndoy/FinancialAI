"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useLocale } from "@/components/locale-provider";
import { formatIdr } from "@/lib/format-idr";

const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

type Slice = { name: string; value: number };

export function CategoryPie({ data }: { data: Slice[] }) {
  const { t } = useLocale();
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("pie.empty")}
      </p>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) =>
              `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? formatIdr(value) : String(value ?? "")
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
