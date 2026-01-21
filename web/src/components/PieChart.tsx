import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { type Stats } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  stats: Stats;
}

export function PieChart({ stats }: PieChartProps) {
  console.log('[PieChart] Renderizando gráfico de pizza com stats:', stats);

  // Filtra apenas categorias de gastos (não LUCROS)
  const gastosPorCategoria = stats.resumoPorCategoria.filter(
    (item) => item.categoria !== 'LUCROS'
  );

  const labels = gastosPorCategoria.map((item) => item.categoria);
  const values = gastosPorCategoria.map((item) => item.total);

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e5e7eb' : '#1f2937';

  const colors = [
    'rgb(239, 68, 68)',   // Vermelho - TRANSPORTE
    'rgb(59, 130, 246)',  // Azul - LAZER
    'rgb(34, 197, 94)',   // Verde - SAUDE
    'rgb(251, 146, 60)',  // Laranja - MORADIA
    'rgb(168, 85, 247)',  // Roxo - ESTUDOS
  ];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: isDark ? '#374151' : '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: textColor,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: `Gastos por Categoria - ${stats.mes}/${stats.ano}`,
        color: textColor,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = values.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (gastosPorCategoria.length === 0) {
    return (
      <div className="w-full h-96 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum gasto encontrado para este período
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Pie data={data} options={options} />
    </div>
  );
}
