import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { type Transaction, type Stats } from '../types';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { TransactionTable } from './TransactionTable';
import { MonthFilter } from './MonthFilter';
import { EditTransactionModal } from './EditTransactionModal';
import { RecurringTransactions } from './RecurringTransactions';
import { Sparkles, TrendingUp, Wallet } from 'lucide-react';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);

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
      console.log('[Dashboard] Buscando gastos fixos...');
      const recurringData = await apiService.getRecurringTransactions();
      setRecurringTransactions(recurringData.gastosFixos);
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

  const handleEdit = (transaction: Transaction) => {
    console.log('[Dashboard] Editando transação:', transaction.id);
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (transaction: Transaction) => {
    const confirmDelete = window.confirm(
      `Deseja realmente deletar esta transação?\n\n${transaction.descricao} - ${formatCurrency(transaction.valor)}`
    );

    if (!confirmDelete) return;

    try {
      console.log('[Dashboard] Deletando transação:', transaction.id);
      await apiService.deleteTransaction(transaction.id);

      // Recarrega dados
      await loadMonthData();
      await loadAllTransactions();

      console.log('[Dashboard] Transação deletada com sucesso');
    } catch (err: any) {
      console.error('[Dashboard] Erro ao deletar transação:', err);
      alert('Erro ao deletar transação: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleSaveEdit = async (id: string, dados: any) => {
    try {
      console.log('[Dashboard] Salvando edição da transação:', id);
      await apiService.updateTransaction(id, dados);

      // Recarrega dados
      await loadMonthData();
      await loadAllTransactions();

      console.log('[Dashboard] Transação atualizada com sucesso');
    } catch (err: any) {
      console.error('[Dashboard] Erro ao atualizar transação:', err);
      throw err;
    }
  };

  const loadAllTransactions = async () => {
    try {
      const allData = await apiService.getAllTransactions();
      setAllTransactions(allData.transacoes);
    } catch (err: any) {
      console.error('[Dashboard] Erro ao carregar todas as transações:', err);
    }
  };

  const baseFluxo = Math.max(stats?.totalGanhos ?? 0, 0) + Math.max(stats?.totalGastos ?? 0, 0);
  const ganhoPercent = baseFluxo > 0 ? Math.min(100, (stats?.totalGanhos ?? 0) / baseFluxo * 100) : 0;
  const gastoPercent = baseFluxo > 0 ? Math.min(100, (stats?.totalGastos ?? 0) / baseFluxo * 100) : 0;

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
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-10 selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black bg-linear-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
            Lazzy<span className="text-indigo-500">Finance</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <MonthFilter mes={mes} ano={ano} onMesChange={setMes} onAnoChange={setAno} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5 backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Patrimônio Líquido</span>
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Wallet className="w-4 h-4" /></div>
            </div>
            <h2 className="text-3xl font-black text-white">{formatCurrency(stats.saldoLiquido)}</h2>
          </div>

          <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">Entradas</span>
            <h2 className="text-3xl font-black text-emerald-400">{formatCurrency(stats.totalGanhos)}</h2>
            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-6 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${ganhoPercent}%` }}
              />
            </div>
          </div>

          <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">Saídas</span>
            <h2 className="text-3xl font-black text-rose-400">{formatCurrency(stats.totalGastos)}</h2>
            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-6 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${gastoPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5 h-90">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Evolução do Caixa</h3>
            <div className="h-70">
              <LineChart transactions={allTransactions} />
            </div>
          </div>

          <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5 h-90">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Distribuição</h3>
            <div className="h-70">
              <PieChart stats={stats} />
            </div>
          </div>
        </div>

        {/* Recurring Transactions */}
        {recurringTransactions.length > 0 && (
          <div className="mb-8">
            <RecurringTransactions gastosFixos={recurringTransactions} />
          </div>
        )}

        {/* Transactions Table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Transações do Mês
          </h2>
          <TransactionTable
            transactions={monthTransactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {/* Edit Modal */}
          {editingTransaction && (
            <EditTransactionModal
              transaction={editingTransaction}
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingTransaction(null);
              }}
              onSave={handleSaveEdit}
            />
          )}
        </div>
      </main>


    </div>
  );
}