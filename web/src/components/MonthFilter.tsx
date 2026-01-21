interface MonthFilterProps {
  mes: number;
  ano: number;
  onMesChange: (mes: number) => void;
  onAnoChange: (ano: number) => void;
}

export function MonthFilter({ mes, ano, onMesChange, onAnoChange }: MonthFilterProps) {
  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex flex-wrap gap-4 items-center mb-6">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Mês:
        </label>
        <select
          value={mes}
          onChange={(e) => onMesChange(Number(e.target.value))}
          className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {meses.map((nome, index) => (
            <option key={index + 1} value={index + 1}>
              {nome}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Ano:
        </label>
        <select
          value={ano}
          onChange={(e) => onAnoChange(Number(e.target.value))}
          className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {anos.map((anoValue) => (
            <option key={anoValue} value={anoValue}>
              {anoValue}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
