/**
 * Unit тесты для React компонентов
 * Тестирование Radix UI компонентов и ConferencePopup
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { ConferencePopup } from "@/components/ConferencePopup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

const futureConference = {
  id: "conf-123",
  slug: "test-conference-2027",
  title: "III Научно-практическая конференция. Миниинвазивная хирургия",
  date: "2027-04-25",
  date_end: "2027-04-26",
  location: "Москва, МКНЦ им. Логинова",
  type: "Конференция",
  status: "published",
  description: "Описание",
  program: null,
  registration_link: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/** Helper: mock fetch to return `data` as JSON */
function mockFetch(data: unknown) {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("ConferencePopup Component", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
    fetchSpy = mockFetch([futureConference]);
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it("should not open dialog when popup was already seen", async () => {
    localStorageMock.setItem(`conference_popup_seen_${futureConference.id}`, "true");
    await act(async () => { render(<ConferencePopup />); });
    // flush fetch microtask
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should not render when no upcoming conferences", async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    const { container } = await act(async () => render(<ConferencePopup />));
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it("should show popup after 2s delay if not seen before", async () => {
    await act(async () => { render(<ConferencePopup />); });
    // flush fetch
    await act(async () => {});
    // Before timer fires — dialog hidden
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Advance past the 2000ms delay
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should mark popup as seen when closed", async () => {
    await act(async () => { render(<ConferencePopup />); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText("Закрыть")); });
    expect(localStorageMock.getItem(`conference_popup_seen_${futureConference.id}`)).toBe("true");
  });

  it("should display conference information correctly", async () => {
    await act(async () => { render(<ConferencePopup />); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Приглашаем на мероприятие!")).toBeInTheDocument();
    expect(screen.getByText(/III Научно-практическая конференция/)).toBeInTheDocument();
    expect(screen.getByText(/Миниинвазивная хирургия/)).toBeInTheDocument();
    expect(screen.getByText(/Москва, МКНЦ им. Логинова/)).toBeInTheDocument();
  });

  it("should link to conference URL using slug", async () => {
    await act(async () => { render(<ConferencePopup />); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    const link = screen.getByText("Перейти к регистрации").closest("a");
    expect(link).toHaveAttribute("href", `/conferences/${futureConference.slug}`);
  });

  it("should fallback to id in URL when no slug", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => [{ ...futureConference, slug: null }],
    } as Response);
    await act(async () => { render(<ConferencePopup />); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    const link = screen.getByText("Перейти к регистрации").closest("a");
    expect(link).toHaveAttribute("href", `/conferences/${futureConference.id}`);
  });

  it("should not show popup for past conferences", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => [{ ...futureConference, date: "2020-01-01", date_end: "2020-01-02" }],
    } as Response);
    const { container } = await act(async () => render(<ConferencePopup />));
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
    expect(container.firstChild).toBeNull();
  });
});

describe("Radix UI Dialog Component", () => {
  it("should render dialog with proper accessibility attributes", () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader><DialogTitle>Test Dialog</DialogTitle></DialogHeader>
          <DialogDescription>Test description</DialogDescription>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("Dialog content")).toBeInTheDocument();
  });

  it("should handle dialog open/close state", async () => {
    const TestDialog = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Test Dialog</DialogTitle></DialogHeader>
              <DialogDescription>Test description</DialogDescription>
            </DialogContent>
          </Dialog>
        </>
      );
    };
    render(<TestDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });
});
