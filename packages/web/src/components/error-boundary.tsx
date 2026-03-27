'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Algo deu errado</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Ocorreu um erro inesperado. Tente recarregar a pagina.
          </p>
          <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
            Recarregar pagina
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
