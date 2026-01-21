import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { type Transaction } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartProps {
  transactions: Transaction[];
}

export function LineChart({ transactions }: LineChartProps) {
  console.log('[LineChart] Renderizando gráfico de linha com', transactions.length, 'transações');

  // Agrupa transações por data
  const transactionsByDate = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.dataGasto).toLocaleDateString('pt-BR');
    if (!acc[date]) {
      acc[date] = { ganhos: 0, gastos: 0 };
    }
    if (transaction.categoria === 'LUCROS') {
      acc[date].ganhos += transaction.valor;
    } else {
      acc[date].gastos += transaction.valor;
    }
    return acc;
  }, {} as Record<string, { ganhos: number; gastos: number }>);

  const dates = Object.keys(transactionsByDate).sort((a, b) => {
    return new Date(a.split('/').reverse().join('-')).getTime() - 
           new Date(b.split('/').reverse().join('-')).getTime();
  });

  const ganhosData = dates.map(date => transactionsByDate[date].ganhos);
  const gastosData = dates.map(date => transactionsByDate[date].gastos);

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Ganhos',
        data: ganhosData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Gastos',
        data: gastosData.map(v => -v), // Negativo para mostrar abaixo do zero
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
        },
      },
      title: {
        display: true,
        text: 'Evolução Temporal de Ganhos e Gastos',
        color: textColor,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = Math.abs(context.parsed.y);
            return `${context.dataset.label}: R$ ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: textColor,
          callback: function(value: any) {
            return 'R$ ' + Math.abs(value).toFixed(0);
          },
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };

  return (
    <div className="w-full h-96 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Line data={data} options={options} />
    </div>
  );
}
