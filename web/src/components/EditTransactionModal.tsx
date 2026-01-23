import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Transaction } from '../types';

interface EditTransactionModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, dados: any) => Promise<void>;
}

const categorias = [
  'ALIMENTACAO',
  'TRANSPORTE',
  'LAZER',
  'SAUDE',
  'MORADIA',
  'ESTUDOS',
  'TRABALHO',
  'LUCROS',
];

export function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
  onSave,
}: EditTransactionModalProps) {
  const [valor, setValor] = useState(transaction.valor.toString());
  const [categoria, setCategoria] = useState(transaction.categoria);
  const [descricao, setDescricao] = useState(transaction.descricao);
  const [dataGasto, setDataGasto] = useState(
    new Date(transaction.dataGasto).toISOString().split('T')[0]
  );
  const [nota, setNota] = useState(transaction.nota || '');
  const [salvando, setSalvando] = useState(false);

  // Atualiza valores quando transaction muda
  useEffect(() => {
    setValor(transaction.valor.toString());
    setCategoria(transaction.categoria);
    setDescricao(transaction.descricao);
    setDataGasto(new Date(transaction.dataGasto).toISOString().split('T')[0]);
    setNota(transaction.nota || '');
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      await onSave(transaction.id, {
        valor: parseFloat(valor),
        categoria,
        descricao,
        dataGasto: new Date(dataGasto).toISOString(),
        nota: nota || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Editar Transação</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Data
            </label>
            <input
              type="date"
              value={dataGasto}
              onChange={(e) => setDataGasto(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nota (opcional)
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
