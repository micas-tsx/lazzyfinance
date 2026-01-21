import { type Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  console.log('[TransactionTable] Renderizando tabela com', transactions.length, 'transações');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getCategoryEmoji = (categoria: string) => {
    const emojis: Record<string, string> = {
      TRANSPORTE: '🚗',
      LAZER: '🎉',
      SAUDE: '🏥',
      MORADIA: '🏠',
      ESTUDOS: '📚',
      LUCROS: '💰',
    };
    return emojis[categoria] || '📝';
  };

  const getValueColor = (categoria: string) => {
    if (categoria === 'LUCROS') {
      return 'text-green-600 dark:text-green-400 font-semibold';
    }
    return 'text-red-600 dark:text-red-400';
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
    <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Data
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Categoria
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Descrição
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Valor
            </th>
            {transactions.some(t => t.nota) && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Nota
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {transactions.map((transaction) => (
            <tr
              key={transaction.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(transaction.dataGasto)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                <span className="flex items-center gap-2">
                  <span>{getCategoryEmoji(transaction.categoria)}</span>
                  <span>{transaction.categoria}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {transaction.descricao}
              </td>
              <td className={`px-4 py-3 text-sm text-right ${getValueColor(transaction.categoria)}`}>
                {transaction.categoria === 'LUCROS' ? '+' : '-'}
                {formatCurrency(Math.abs(transaction.valor))}
              </td>
              {transactions.some(t => t.nota) && (
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {transaction.nota || '-'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
