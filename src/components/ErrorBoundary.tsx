import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no controlado en la aplicación:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white"
        >
          <h1 className="text-2xl font-bold">No pudimos cargar Sanctify</h1>
          <p className="max-w-md text-zinc-300">
            Ocurrió un error inesperado. Recarga la página para volver a intentarlo.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[#3CC8F5] px-5 py-2 font-semibold text-black"
          >
            Recargar página
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
