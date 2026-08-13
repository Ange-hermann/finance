"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#C9A227", "#E5C158", "#8B6F1A", "#FAFAF9", "#141414", "#0A0A0A"];

interface ChartData {
  month: string;
  offrandes: number;
  dimes: number;
}

interface PieData {
  name: string;
  value: number;
}

export default function PastorCharts({
  chartData,
  pieData,
}: {
  chartData: ChartData[];
  pieData: PieData[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">
          Évolution des recettes
        </h3>
        {chartData.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-12">Aucune donnée disponible</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorOffrandes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A227" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDimes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E5C158" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E5C158" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,162,39,0.1)" />
              <XAxis dataKey="month" stroke="#FAFAF9" fontSize={12} />
              <YAxis stroke="#FAFAF9" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#141414",
                  border: "1px solid rgba(201,162,39,0.3)",
                  borderRadius: "12px",
                  color: "#FAFAF9",
                }}
              />
              <Legend wrapperStyle={{ color: "#FAFAF9" }} />
              <Area type="monotone" dataKey="offrandes" stroke="#C9A227" fill="url(#colorOffrandes)" name="Offrandes" />
              <Area type="monotone" dataKey="dimes" stroke="#E5C158" fill="url(#colorDimes)" name="Dîmes" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">Répartition par catégorie</h3>
        {pieData.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-12">Aucune donnée disponible</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#C9A227"
                dataKey="value"
                label={(props: any) => `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: "#FAFAF9" }}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#141414",
                  border: "1px solid rgba(201,162,39,0.3)",
                  borderRadius: "12px",
                  color: "#FAFAF9",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
