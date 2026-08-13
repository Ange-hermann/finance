"use client";

import {
  LineChart,
  Line,
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

export default function TreasurerCharts({
  chartData,
  pieData,
}: {
  chartData: ChartData[];
  pieData: PieData[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Line chart */}
      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">
          Évolution des recettes (Offrandes vs Dîmes)
        </h3>
        {chartData.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-12">Aucune donnée disponible</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,162,39,0.1)" />
              <XAxis dataKey="month" stroke="#FAFAF9" fontSize={11} />
              <YAxis stroke="#FAFAF9" fontSize={11} width={60} />
              <Tooltip
                contentStyle={{
                  background: "#141414",
                  border: "1px solid rgba(201,162,39,0.3)",
                  borderRadius: "12px",
                  color: "#FAFAF9",
                }}
              />
              <Legend wrapperStyle={{ color: "#FAFAF9" }} />
              <Line
                type="monotone"
                dataKey="offrandes"
                stroke="#C9A227"
                strokeWidth={2}
                name="Offrandes"
                dot={{ fill: "#C9A227" }}
              />
              <Line
                type="monotone"
                dataKey="dimes"
                stroke="#E5C158"
                strokeWidth={2}
                name="Dîmes"
                dot={{ fill: "#E5C158" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart */}
      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">Répartition par catégorie</h3>
        {pieData.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-12">Aucune donnée disponible</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
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
