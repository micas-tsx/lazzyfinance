import { Calendar, Repeat } from 'lucide-react';

interface RecurringTransaction {
  id: string;
  valor: number;
  categoria: string;
  descricao: string;
  diaDoMes: number;
  nota?: string | null;
}

interface RecurringTransactionsProps {
  gastosFixos: RecurringTransaction[];
}

export function RecurringTransactions({ gastosFixos }: RecurringTransactionsProps) {
  if (gastosFixos.length === 0) {
    return null;
  }

  return (
    <div className="p-8 rounded-4xl bg-slate-900/40 border border-white/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Repeat className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Gastos Fixos Recorrentes</h3>
          <p className="text-xs text-slate-400">Agendados para repetir todo mês</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gastosFixos.map((gasto) => (
          <div
            key={gasto.id}
            className="p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:border-indigo-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-indigo-400">
                  Dia {gasto.diaDoMes}
                </span>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-slate-700/50 text-slate-300">
                {gasto.categoria}
              </span>
            </div>

            <div className="mb-2">
              <p className="text-base font-bold text-white mb-1">{gasto.descricao}</p>
              <p className="text-lg font-black text-slate-300">
                R$ {gasto.valor.toFixed(2).replace('.', ',')}
              </p>
            </div>

            {gasto.nota && (
              <p className="text-xs text-slate-400 mt-2 italic">{gasto.nota}</p>
            )}

            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                🔔 Notificação às 9h do dia {gasto.diaDoMes}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
        <p className="text-xs text-slate-400">
          💡 <strong className="text-indigo-400">Como funciona:</strong> No dia agendado, você receberá uma notificação no Telegram para confirmar se deseja registrar o gasto naquele mês.
        </p>
      </div>
    </div>
  );
}
