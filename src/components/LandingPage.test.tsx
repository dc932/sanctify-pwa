// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

vi.mock('../supabase', () => {
  const createQuery = () => {
    const result = { data: [] as never[], error: null };
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: () => query,
      then: <TResult1 = typeof result, TResult2 = never>(
        onfulfilled?:
          | ((value: typeof result) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?:
          | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
          | null
      ): Promise<TResult1 | TResult2> => Promise.resolve(result).then(onfulfilled, onrejected),
    };

    return query;
  };

  return {
    supabase: {
      from: createQuery,
      auth: {
        signInWithOAuth: vi.fn(),
        signInWithOtp: vi.fn(),
      },
    },
  };
});

describe('LandingPage actions', () => {
  afterEach(cleanup);

  it('opens the login modal from the entry buttons', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('dialog', { name: 'Iniciar sesión' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir app' }));
    expect(screen.getByRole('dialog', { name: 'Iniciar sesión' })).not.toBeNull();
  });

  it('opens the internal privacy and terms pages and returns to the landing page', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Privacidad' }));
    expect(screen.getByRole('heading', { name: 'Política de privacidad' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    fireEvent.click(screen.getByRole('button', { name: 'Términos' }));
    expect(screen.getByRole('heading', { name: 'Términos de uso' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('button', { name: 'Abrir app' })).not.toBeNull();
  });
});
