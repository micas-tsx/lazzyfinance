import { Calendar } from "lucide-react";

interface MonthFilterProps {
  mes: number;
  ano: number;
  onMesChange: (mes: number) => void;
  onAnoChange: (ano: number) => void;
}

export function MonthFilter({ mes, ano, onMesChange, onAnoChange }: MonthFilterProps) {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative group">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
        <select
          value={mes}
          onChange={(e) => onMesChange(Number(e.target.value))}
          className="pl-10 pr-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl text-sm font-medium focus:ring-2 ring-indigo-500/50 outline-none appearance-none cursor-pointer"
        >
          {meses.map((nome, index) => <option key={index} value={index + 1}>{nome}</option>)}
        </select>
      </div>
      <select
        value={ano}
        onChange={(e) => onAnoChange(Number(e.target.value))}
        className="px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl text-sm font-medium focus:ring-2 ring-indigo-500/50 outline-none appearance-none cursor-pointer"
      >
        {anos.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}
