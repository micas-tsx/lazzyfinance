const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Serviço para fazer requisições à API
 */
class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Tenta obter token da URL
    const urlParams = new URLSearchParams(window.location.search);
    this.token = urlParams.get('token');
    console.log('[API] Token obtido da URL:', this.token ? `${this.token.substring(0, 8)}...` : 'não fornecido');
    
    // Salva token no localStorage
    if (this.token) {
      localStorage.setItem('token', this.token);
    } else {
      // Tenta obter do localStorage
      this.token = localStorage.getItem('token');
      console.log('[API] Token obtido do localStorage:', this.token ? `${this.token.substring(0, 8)}...` : 'não encontrado');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`[API] Fazendo requisição: ${options.method || 'GET'} ${url}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

     if (this.token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
  }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`[API] Resposta recebida: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('[API] Erro na resposta:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[API] Dados recebidos:', data);
      return data;
    } catch (error) {
      console.error('[API] Erro na requisição:', error);
      throw error;
    }
  }

  async validateToken(): Promise<any> {
    console.log('[API] Validando token...');
    return this.request('/api/auth/validate');
  }

  async getTransactions(mes?: number, ano?: number): Promise<{ mes: number; ano: number; transacoes: any[]; total: number }> {
    console.log(`[API] Buscando transações - mês: ${mes}, ano: ${ano}`);
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes.toString());
    if (ano) params.append('ano', ano.toString());
    const query = params.toString();
    return this.request(`/api/transactions${query ? `?${query}` : ''}`);
  }

  async getAllTransactions(): Promise<{ transacoes: any[]; total: number }> {
    console.log('[API] Buscando todas as transações...');
    return this.request('/api/transactions/all');
  }

  async getStats(mes?: number, ano?: number): Promise<any> {
    console.log(`[API] Buscando estatísticas - mês: ${mes}, ano: ${ano}`);
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes.toString());
    if (ano) params.append('ano', ano.toString());
    const query = params.toString();
    return this.request(`/api/stats${query ? `?${query}` : ''}`);
  }
}

export const apiService = new ApiService();
