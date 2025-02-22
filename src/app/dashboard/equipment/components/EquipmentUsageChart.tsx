"use client";

import { Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export function EquipmentUsageChart({
  data,
}: {
  data: { date: string; hoursWorked: number }[];
}) {
  const chartData = {
    labels: data.map((entry) => entry.date),
    datasets: [
      {
        label: "Hours Worked",
        data: data.map((entry) => entry.hoursWorked),
        backgroundColor: "#36A2EB",
        borderColor: "#007BFF",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div id="equipment-usage-chart" className="w-full h-full">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true },
          },
        }}
      />
    </div>
  );
}
