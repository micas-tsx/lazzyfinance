import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { type Transaction, type Stats } from '../types';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { TransactionTable } from './TransactionTable';
import { MonthFilter } from './MonthFilter';
import { useTheme } from '../hooks/useTheme';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const { theme, toggleTheme } = useTheme();

  console.log('[Dashboard] Componente montado');

  useEffect(() => {
    console.log('[Dashboard] Iniciando carregamento de dados...');
    loadData();
  }, []);

  useEffect(() => {
    console.log(`[Dashboard] Mes/Ano alterado para ${mes}/${ano}, recarregando dados...`);
    loadMonthData();
  }, [mes, ano]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Dashboard] Validando token...');
      await apiService.validateToken();
      
      console.log('[Dashboard] Buscando todas as transações...');
      const allData = await apiService.getAllTransactions();
      setAllTransactions(allData.transacoes);
      
      console.log('[Dashboard] Buscando dados do mês...');
      await loadMonthData();
    } catch (err: any) {
      console.error('[Dashboard] Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthData = async () => {
    try {
      console.log(`[Dashboard] Carregando dados do mês ${mes}/${ano}...`);
      const [transactionsData, statsData] = await Promise.all([
        apiService.getTransactions(mes, ano),
        apiService.getStats(mes, ano),
      ]);
      
      setMonthTransactions(transactionsData.transacoes);
      setStats(statsData);
      console.log('[Dashboard] Dados do mês carregados:', {
        transactions: transactionsData.transacoes.length,
        stats: statsData,
      });
    } catch (err: any) {
      console.error('[Dashboard] Erro ao carregar dados do mês:', err);
      setError(err.message || 'Erro ao carregar dados do mês');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Erro</p>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-gray-600 dark:text-gray-400">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 LazzyFinance Dashboard
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Ganhos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.totalGanhos)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.quantidadeGanhos} transação(ões)
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Gastos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.totalGastos)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.quantidadeGastos} transação(ões)
                </p>
              </div>
              <div className="text-4xl">💸</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Líquido</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.saldoLiquido >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(stats.saldoLiquido)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.quantidadeTransacoes} transação(ões)
                </p>
              </div>
              <div className="text-4xl">
                {stats.saldoLiquido >= 0 ? '✅' : '⚠️'}
              </div>
            </div>
          </div>
        </div>

        {/* Month Filter */}
        <MonthFilter mes={mes} ano={ano} onMesChange={setMes} onAnoChange={setAno} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <LineChart transactions={allTransactions} />
          <PieChart stats={stats} />
        </div>

        {/* Transactions Table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Transações do Mês
          </h2>
          <TransactionTable transactions={monthTransactions} />
        </div>
      </main>

      <div>teste</div>
    </div>
  );
}
