import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { apiService } from './services/api';

function App() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(true);

  console.log('[App] Componente montado');

  useEffect(() => {
    console.log('[App] Verificando token...');
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      // Verifica se há token na URL ou localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      
      console.log('[App] Token da URL:', tokenFromUrl ? `${tokenFromUrl.substring(0, 8)}...` : 'não encontrado');
      
      if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        // Remove token da URL para não expor
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('[App] Nenhum token encontrado');
        setHasToken(false);
        setValidating(false);
        return;
      }

      console.log('[App] Validando token com a API...');
      await apiService.validateToken();
      console.log('[App] Token válido!');
      setHasToken(true);
    } catch (error: any) {
      console.error('[App] Erro ao validar token:', error);
      // Remove token inválido
      localStorage.removeItem('token');
      setHasToken(false);
    } finally {
      setValidating(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Acesso não autorizado. Use o comando /site no bot Telegram para obter seu link de acesso.
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
