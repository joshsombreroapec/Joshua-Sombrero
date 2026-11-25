import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { parseMultiFilter, serializeMultiFilter } from '../lib/filterUtils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectCheckboxFilterProps {
  label?: string;
  options: (string | MultiSelectOption)[];
  value: string;
  onChange: (newValue: string) => void;
  placeholder: string;
  compact?: boolean;
  align?: 'left' | 'right';
  searchable?: boolean;
}

export const MultiSelectCheckboxFilter: React.FC<MultiSelectCheckboxFilterProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  compact = false,
  align = 'left',
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedOptions: MultiSelectOption[] = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      ),
    [options]
  );

  const selectedValues = useMemo(() => parseMultiFilter(value), [value]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const showSearch = searchable !== undefined ? searchable : normalizedOptions.length > 6;

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, showSearch]);

  const toggleOption = (optValue: string) => {
    const next = new Set(selectedSet);
    if (next.has(optValue)) {
      next.delete(optValue);
    } else {
      next.add(optValue);
    }
    onChange(serializeMultiFilter(Array.from(next)));
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedSet);
    filteredOptions.forEach((opt) => next.add(opt.value));
    onChange(serializeMultiFilter(Array.from(next)));
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
  };

  const selectedLabels = useMemo(() => {
    return selectedValues.map((v) => {
      const match = normalizedOptions.find((o) => o.value === v);
      return match ? match.label : v;
    });
  }, [selectedValues, normalizedOptions]);

  const allFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) => selectedSet.has(opt.value));

  const buttonText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} selected`;

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-xs font-bold text-white mb-1.5">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        className={`w-full flex items-center justify-between gap-1.5 bg-[#0F172A] border text-left text-xs font-bold text-white focus:outline-hidden transition-all cursor-pointer ${
          compact ? 'py-1.5 px-2 rounded-lg' : 'py-2 px-3 rounded-xl'
        } ${
          isOpen
            ? 'border-[#2563EB] ring-2 ring-blue-500/30'
            : selectedValues.length > 0
            ? 'border-[#38bdf8]/80'
            : 'border-[#CBD5E1]/40 hover:border-[#CBD5E1]/70'
        }`}
      >
        <span className="truncate flex items-center gap-1.5 min-w-0">
          <span className="truncate">{buttonText}</span>
          {selectedValues.length > 1 && (
            <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-[#2563EB] text-white text-[10px] font-extrabold leading-tight">
              {selectedValues.length}
            </span>
          )}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              data-pdf-hide="true"
              onClick={handleClearAll}
              title="Clear selection"
              className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#38bdf8]' : ''
            }`}
          />
        </span>
      </button>

      {isOpen && (
        <div
          data-pdf-hide="true"
          className={`absolute z-50 mt-1.5 min-w-full w-64 max-w-[85vw] rounded-xl bg-[#0F172A] border border-[#CBD5E1]/40 shadow-2xl overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Search Bar for longer option lists */}
          {showSearch && (
            <div className="p-2 border-b border-slate-700/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions Header */}
          <div className="px-2.5 py-1.5 bg-slate-900/80 border-b border-slate-700/80 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-300 font-semibold">
              {selectedValues.length} / {normalizedOptions.length} selected
            </span>
            <div className="flex items-center gap-2">
              {!allFilteredSelected && filteredOptions.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[#38bdf8] hover:text-sky-300 font-bold cursor-pointer"
                >
                  {searchQuery ? 'Select Shown' : 'Select All'}
                </button>
              )}
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearAll()}
                  className="text-rose-300 hover:text-rose-200 font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Checkbox Options List */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-800/60">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedSet.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer select-none transition-colors ${
                      isChecked
                        ? 'bg-[#2563EB]/25 text-white font-bold'
                        : 'text-slate-200 hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOption(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        isChecked
                          ? 'bg-[#2563EB] border-[#38bdf8] text-white'
                          : 'bg-slate-900 border-slate-500 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                    <span className="truncate flex-1" title={opt.label}>
                      {opt.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export interface FilterChipGroup {
  key: string;
  label: string;
  value?: string;
  labelMap?: Record<string, string>;
  onChange: (newValue: string) => void;
}

export const ActiveFilterChips: React.FC<{ groups: FilterChipGroup[] }> = ({ groups }) => {
  const chips = groups.flatMap((group) => {
    const items = parseMultiFilter(group.value);
    return items.map((item) => ({
      groupKey: group.key,
      groupLabel: group.label,
      value: item,
      displayLabel: group.labelMap?.[item] || item,
      onRemove: () => {
        const remaining = items.filter((v) => v !== item);
        group.onChange(serializeMultiFilter(remaining));
      },
    }));
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#475569]/80 text-[11px]">
      <span className="text-[#CBD5E1] font-semibold mr-1">Selected:</span>
      {chips.map((chip) => (
        <span
          key={`${chip.groupKey}-${chip.value}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F172A] text-white border border-[#38bdf8]/40 font-semibold"
        >
          <span className="text-[#38bdf8] font-bold">{chip.groupLabel}:</span>
          <span>{chip.displayLabel}</span>
          <button
            type="button"
            data-pdf-hide="true"
            onClick={chip.onRemove}
            title={`Remove ${chip.groupLabel}: ${chip.displayLabel}`}
            className="ml-0.5 text-slate-300 hover:text-rose-400 font-bold cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
};

