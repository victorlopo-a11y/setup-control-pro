import {Component, StrictMode} from 'react';
import type {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean; message: string}> {
  declare props: Readonly<{children: ReactNode}>;
  state = {hasError: false, message: ''};

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, message: error?.message || 'Erro inesperado'};
  }

  componentDidCatch(error: Error) {
    console.error('App render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif', background: '#f5f6f8'}}>
          <div style={{maxWidth: 760, width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20}}>
            <h1 style={{margin: 0, fontSize: 20}}>Erro ao carregar a aplicação</h1>
            <p style={{marginTop: 10, color: '#374151'}}>Copie a mensagem abaixo e me envie para eu corrigir:</p>
            <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12}}>
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
