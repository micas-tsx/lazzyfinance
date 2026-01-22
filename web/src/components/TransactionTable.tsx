import type { ReactElement } from 'react';
import { type Transaction } from '../types';
import { Book, Car, ChevronRight, Home, Medal, PartyPopper, TrendingUp, Wallet, Utensils, Briefcase } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  console.log('[TransactionTable] Renderizando tabela com', transactions.length, 'transações');

  const getIcon = (categoria: string) => {
    const emojis: Record<string, ReactElement> = {
      ALIMENTACAO: <Utensils className="w-5 h-5" />,
      TRANSPORTE: <Car className="w-5 h-5" />,
      LAZER: <PartyPopper className="w-5 h-5" />,
      SAUDE: <Medal className="w-5 h-5" />,
      MORADIA: <Home className="w-5 h-5" />,
      ESTUDOS: <Book className="w-5 h-5" />,
      TRABALHO: <Briefcase className="w-5 h-5" />,
      LUCROS: <TrendingUp className="w-5 h-5" />
    };
    return emojis[categoria] || <Wallet className="w-5 h-5" />;
  };

  if (transactions.length === 0) {
    return (
      <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Nenhuma transação encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold">Transações</h3>
        <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">VER TUDO <ChevronRight className="w-3 h-3" /></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-widest">
              <th className="pb-6 px-4">Data</th>
              <th className="pb-6 px-4">Detalhes</th>
              <th className="pb-6 px-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map(t => (
              <tr key={t.id} className="group hover:bg-white/5 transition-colors">
                <td className="py-5 px-4 text-sm font-medium text-slate-400">
                  {new Date(t.dataGasto).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </td>
                <td className="py-5 px-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.categoria === 'LUCROS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                      {getIcon(t.categoria)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">{t.descricao}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-600">{t.categoria}</p>
                    </div>
                  </div>
                </td>
                <td className={`py-5 px-4 text-right font-black ${t.categoria === 'LUCROS' ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {t.categoria === 'LUCROS' ? '+' : '-'} {(t.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
