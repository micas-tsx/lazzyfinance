export interface Transaction {
  id: string;
  valor: number;
  categoria: string;
  descricao: string;
  dataGasto: string;
  nota?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Stats {
  mes: number;
  ano: number;
  totalGanhos: number;
  totalGastos: number;
  saldoLiquido: number;
  quantidadeTransacoes: number;
  quantidadeGanhos: number;
  quantidadeGastos: number;
  resumoPorCategoria: {
    categoria: string;
    total: number;
    quantidade: number;
  }[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
