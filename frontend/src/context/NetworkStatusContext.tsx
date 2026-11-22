import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Wifi, WifiOff } from 'lucide-react';

export interface NetworkStatusContextValue {
  isOnline: boolean;
  offlineSince: number | null;
  wasOffline: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue>({
  isOnline: true,
  offlineSince: null,
  wasOffline: false,
});

export function useNetworkStatus(): NetworkStatusContextValue {
  return useContext(NetworkStatusContext);
}

export interface NetworkStatusProviderProps {
  children: ReactNode;
  showBanner?: boolean;
}

export function NetworkStatusProvider({ children, showBanner = true }: NetworkStatusProviderProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState<boolean>(false);
  const [showReconnectedAlert, setShowReconnectedAlert] = useState<boolean>(false);

  useEffect(() => {
    onlineManager.setOnline(isOnline);
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSince(null);
      setShowOfflineAlert(false);
      setWasOffline((prev) => {
        if (prev) {
          setShowReconnectedAlert(true);
        }
        return false;
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSince(Date.now());
      setWasOffline(true);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, offlineSince, wasOffline }}>
      {children}
      {showBanner && (
        <>
          {/* Alerta Discreto de Modo Offline (temporário com autoHideDuration para não ficar preso na tela) */}
          <Snackbar
            open={showOfflineAlert}
            autoHideDuration={6000}
            onClose={() => setShowOfflineAlert(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            sx={{ mb: 2, ml: 2 }}
          >
            <Alert
              severity="warning"
              variant="filled"
              onClose={() => setShowOfflineAlert(false)}
              icon={<WifiOff size={18} />}
              sx={{
                backgroundColor: '#b45309',
                color: '#ffffff',
                fontWeight: 500,
                boxShadow: 4,
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.82rem',
              }}
            >
              Você está desconectado. O editor está temporariamente em modo somente leitura e
              voltará a sincronizar assim que a rede for restabelecida.
            </Alert>
          </Snackbar>

          {/* Alerta de Reconexão */}
          <Snackbar
            open={showReconnectedAlert}
            autoHideDuration={4000}
            onClose={() => setShowReconnectedAlert(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            sx={{ mb: 2, ml: 2 }}
          >
            <Alert
              severity="success"
              variant="filled"
              icon={<Wifi size={18} />}
              onClose={() => setShowReconnectedAlert(false)}
              sx={{
                backgroundColor: '#059669',
                color: '#ffffff',
                fontWeight: 500,
                boxShadow: 4,
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.82rem',
              }}
            >
              Conexão restabelecida! Sincronizando alterações locais com o servidor...
            </Alert>
          </Snackbar>
        </>
      )}
    </NetworkStatusContext.Provider>
  );
}
