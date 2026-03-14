'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const tagsFetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

interface TagAutocompleteInputProps {
  existingTags?: string[]; // tags already on the contact (to filter from suggestions)
  onAdd: (tag: string) => void;
  placeholder?: string;
  inputClassName?: string;
  showButton?: boolean;
  autoFocus?: boolean;
  onKeyDownExtra?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function TagAutocompleteInput({
  existingTags = [],
  onAdd,
  placeholder = 'Добавить тег...',
  inputClassName = '',
  showButton = true,
  autoFocus = false,
  onKeyDownExtra,
  inputRef: externalInputRef,
}: TagAutocompleteInputProps) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useSWR<{ tags: string[] }>(
    '/api/admin/contacts/tags',
    tagsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const allTags = data?.tags ?? [];

  const filtered = value.trim()
    ? allTags.filter(t =>
        t.toLowerCase().includes(value.toLowerCase()) &&
        !existingTags.includes(t)
      )
    : allTags.filter(t => !existingTags.includes(t));

  const handleAdd = useCallback(() => {
    const tag = value.trim();
    if (!tag) return;
    onAdd(tag);
    setValue('');
    setOpen(false);
    setActiveIndex(-1);
  }, [value, onAdd]);

  const handleSelect = useCallback((tag: string) => {
    onAdd(tag);
    setValue('');
    setOpen(false);
    setActiveIndex(-1);
  }, [onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        handleSelect(filtered[activeIndex]);
      } else {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
    onKeyDownExtra?.(e);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} className="relative flex gap-2">
      <div className="relative flex-1">
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          autoFocus={autoFocus}
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1 z-50 bg-white border border-[var(--frox-gray-200)] rounded-xl shadow-lg max-h-48 overflow-y-auto w-full min-w-[160px]"
          >
            {filtered.map((tag, i) => (
              <button
                key={tag}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(tag); }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-[var(--frox-brand)] text-white'
                    : 'text-[var(--frox-gray-700)] hover:bg-[var(--frox-gray-100)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      {showButton && (
        <Button size="sm" variant="outline" onClick={handleAdd} className="h-8 w-8 p-0 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
