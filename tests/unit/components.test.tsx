/**
 * Unit тесты для React компонентов
 * Тестирование Radix UI компонентов и Framer Motion анимаций
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ConferencePopup } from '@/components/ConferencePopup';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

vi.mock('next/link', () => {
  return {
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

// Мок для localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ConferencePopup Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  it('should not render if popup was already seen', async () => {
    localStorageMock.setItem('conference_popup_seen_v3', 'true');
    
    const { container } = await act(async () => {
      return render(<ConferencePopup />);
    });
    
    // Диалог не должен отображаться, если popup уже видели
    expect(container.firstChild).toBeNull();
  });

  it('should show popup after delay if not seen before', async () => {
    localStorageMock.removeItem('conference_popup_seen_v3');
    
    await act(async () => {
      render(<ConferencePopup />);
    });
    
    // До истечения таймера диалог не должен быть открыт
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    
    // Ускоряем время
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    
    // После таймера диалог должен появиться
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should mark popup as seen when closed', async () => {
    localStorageMock.removeItem('conference_popup_seen_v3');
    
    await act(async () => {
      render(<ConferencePopup />);
    });
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Находим кнопку закрытия
    const closeButton = screen.getByText('Закрыть');
    await act(async () => {
      fireEvent.click(closeButton);
    });
    
    // Проверяем, что popup помечен как просмотренный
    expect(localStorageMock.getItem('conference_popup_seen_v3')).toBe('true');
  });

  it('should display conference information correctly', async () => {
    localStorageMock.removeItem('conference_popup_seen_v3');
    
    await act(async () => {
      render(<ConferencePopup />);
    });
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    
    expect(screen.getByText('Приглашаем на конференцию!')).toBeInTheDocument();
    expect(screen.getByText(/III Научно-практическая конференция/)).toBeInTheDocument();
    expect(screen.getByText(/Миниинвазивная хирургия/)).toBeInTheDocument();
    expect(screen.getByText(/25 апреля 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Москва, МКНЦ им. Логинова/)).toBeInTheDocument();
  });
});

describe('Radix UI Dialog Component', () => {
  it('should render dialog with proper accessibility attributes', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <DialogDescription>Test description</DialogDescription>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should handle dialog open/close state', async () => {
    const TestDialog = () => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Dialog</DialogTitle>
              </DialogHeader>
              <DialogDescription>Test description</DialogDescription>
            </DialogContent>
          </Dialog>
        </>
      );
    };

    render(<TestDialog />);
    
    // Диалог закрыт
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    
    // Открываем диалог
    fireEvent.click(screen.getByText('Open'));
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
