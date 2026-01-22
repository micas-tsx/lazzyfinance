import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js';
import { type Stats } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  stats: Stats;
}

export function PieChart({ stats }: PieChartProps) {
  console.log('[PieChart] Renderizando gráfico de pizza com stats:', stats);

  const gastosPorCategoria = stats.resumoPorCategoria.filter(
    (item) => item.categoria !== 'LUCROS'
  );

  const labels = gastosPorCategoria.map((item) => item.categoria);
  const values = gastosPorCategoria.map((item) => item.total);

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: '#0f172a', 
        borderWidth: 4,
        hoverOffset: 20,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#94a3b8',
          padding: 20,
          usePointStyle: true,
          font: { size: 12, weight: 'bold' }
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = values.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` ${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '65%', 
  };

  if (gastosPorCategoria.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-slate-500 italic text-sm text-center">Nenhum gasto encontrado</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2">
      <Pie data={data} options={options} />
    </div>
  );
}