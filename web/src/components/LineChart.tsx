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
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';

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

interface Transaction {
  dataGasto: string | Date;
  valor: number;
  categoria: string;
}

interface TransactionsByDate {
  [key: string]: {
    ganhos: number;
    gastos: number;
  };
}

interface LineChartProps {
  transactions: Transaction[];
}

export function LineChart({ transactions = [] }: LineChartProps) {
  // Validação de dados
  if (!transactions || transactions.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400">
        Nenhuma transação para exibir
      </div>
    );
  }

  // Agrupa transações por data
  const transactionsByDate = transactions.reduce<TransactionsByDate>((acc, transaction) => {
    if (!transaction.dataGasto) return acc;
    
    const date = new Date(transaction.dataGasto).toLocaleDateString('pt-BR');
    if (!acc[date]) {
      acc[date] = { ganhos: 0, gastos: 0 };
    }
    if (transaction.categoria === 'LUCROS') {
      acc[date].ganhos += transaction.valor || 0;
    } else {
      acc[date].gastos += transaction.valor || 0;
    }
    return acc;
  }, {});

  const dates = Object.keys(transactionsByDate).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/');
    const [dayB, monthB, yearB] = b.split('/');
    return new Date(Number(yearA), Number(monthA) - 1, Number(dayA)).getTime() - 
           new Date(Number(yearB), Number(monthB) - 1, Number(dayB)).getTime();
  });

  const ganhosData = dates.map(date => transactionsByDate[date].ganhos);
  const gastosData = dates.map(date => transactionsByDate[date].gastos);

  // Cores do Tema LazzyFinance
  const colors = {
    ganhos: '#10b981',
    gastos: '#f43f5e',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#94a3b8'
  };

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Ganhos',
        data: ganhosData,
        borderColor: colors.ganhos,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: colors.ganhos,
        borderWidth: 3,
      },
      {
        label: 'Gastos',
        data: gastosData.map(v => -v),
        borderColor: colors.gastos,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: colors.gastos,
        borderWidth: 3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: colors.text,
          boxWidth: 12,
          font: { size: 11, weight: 'bold' as const },
          usePointStyle: true,
          padding: 15,
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            const value = Math.abs(context.parsed.y || 0);
            return `${context.dataset.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { 
          color: colors.text, 
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: { display: false },
        border: { display: false }
      },
      y: {
        ticks: {
          color: colors.text,
          font: { size: 10 },
          callback: (value) => 'R$ ' + Math.abs(Number(value)).toFixed(0),
        },
        grid: { color: colors.grid },
        border: { display: false }
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={data} options={options} />
    </div>
  );
}