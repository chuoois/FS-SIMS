// =========================================================
// CreatableCombobox.jsx
// Autocomplete Combobox cho phép tìm kiếm theo danh sách có sẵn
// hoặc nhập mới và lưu vào hệ thống trực tiếp
// =========================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Plus, X, Loader2, Palette } from 'lucide-react';

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const CreatableCombobox = ({
  label,
  required = false,
  value = '',
  options = [],
  valueKey = 'id',
  labelKey = 'name',
  placeholder = 'Chọn hoặc nhập để tìm/thêm mới...',
  onChange,
  onCreate,
  isColor = false,
  colorKey = 'hex_value',
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newColorHex, setNewColorHex] = useState('#8B5A2B');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Tìm item hiện tại đang được chọn
  const selectedItem = useMemo(() => {
    if (value === null || value === undefined || value === '') return null;
    return options.find((opt) => String(opt[valueKey]) === String(value)) || null;
  }, [options, value, valueKey]);

  // Lọc options theo query
  const filteredOptions = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return options;
    const normalizedQuery = removeVietnameseTones(trimmed);
    return options.filter((opt) => {
      const optLabel = String(opt[labelKey] || '');
      return removeVietnameseTones(optLabel).includes(normalizedQuery);
    });
  }, [options, query, labelKey]);

  // Kiểm tra xem query đã trùng khớp chính xác 100% với một option có sẵn chưa
  const hasExactMatch = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return true;
    return options.some((opt) => String(opt[labelKey] || '').trim().toLowerCase() === trimmed);
  }, [options, query, labelKey]);

  // Hiển thị text trong ô input
  const displayValue = isOpen ? query : (selectedItem ? selectedItem[labelKey] : '');

  // Xử lý click ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mở dropdown khi focus hoặc click
  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery(selectedItem ? selectedItem[labelKey] : '');
  };

  const handleSelectOption = (opt) => {
    if (disabled) return;
    onChange?.(opt[valueKey], opt);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.('', null);
    setQuery('');
    if (inputRef.current) inputRef.current.focus();
  };

  // Tạo mới item
  const handleCreateNew = async () => {
    const trimmed = query.trim();
    if (!trimmed || !onCreate || isCreating) return;

    try {
      setIsCreating(true);
      const extra = isColor ? { hex_value: newColorHex } : {};
      const newItem = await onCreate(trimmed, extra);
      if (newItem && newItem[valueKey]) {
        onChange?.(newItem[valueKey], newItem);
      }
      setIsOpen(false);
      setQuery('');
    } catch (err) {
      console.error('[CreatableCombobox.handleCreateNew]', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Xử lý phím Enter / Escape / Mũi tên
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - (hasExactMatch ? 1 : 0)));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (!hasExactMatch && query.trim()) {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-stone-600"
        >
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input container */}
      <div className="relative flex items-center">
        {/* Color preview badge on the left if selected and isColor */}
        {isColor && selectedItem && !isOpen && (
          <div
            className="absolute left-3 h-3.5 w-3.5 rounded-full border border-stone-300 shadow-sm"
            style={{ backgroundColor: selectedItem[colorKey] || '#808080' }}
            title={selectedItem[colorKey] || 'Không có mã màu'}
          />
        )}

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border border-stone-200 py-2.5 text-xs text-stone-900 transition-colors focus:border-stone-900 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 ${
            isColor && selectedItem && !isOpen ? 'pl-8 pr-16' : 'px-3 pr-16'
          }`}
        />

        {/* Action icons on the right */}
        <div className="absolute right-2 flex items-center gap-1 text-stone-400">
          {selectedItem && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-1 hover:bg-stone-100 hover:text-stone-700"
              title="Xóa lựa chọn"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              if (isOpen) {
                setIsOpen(false);
                setQuery('');
              } else {
                handleInputFocus();
              }
            }}
            tabIndex={-1}
            className="rounded p-1 hover:bg-stone-100 hover:text-stone-700"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
          {/* Options list */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = selectedItem && String(selectedItem[valueKey]) === String(opt[valueKey]);
              const isHighlighted = highlightedIndex === idx;

              return (
                <button
                  key={opt[valueKey] || idx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectOption(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                    isHighlighted
                      ? 'bg-stone-100 text-stone-900'
                      : isSelected
                      ? 'bg-stone-50 font-medium text-stone-900'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isColor && (
                      <span
                        className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-stone-300 shadow-sm"
                        style={{ backgroundColor: opt[colorKey] || '#808080' }}
                      />
                    )}
                    <span className="truncate">{opt[labelKey]}</span>
                    {isColor && opt[colorKey] && (
                      <span className="text-[10px] text-stone-400 font-mono">({opt[colorKey]})</span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-stone-900" />}
                </button>
              );
            })
          ) : query.trim() ? (
            <div className="px-3 py-2 text-xs text-stone-500 italic">
              Không có dữ liệu có sẵn phù hợp với &quot;{query.trim()}&quot;
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-stone-500 italic">Chưa có dữ liệu</div>
          )}

          {/* Option thêm mới nếu có gõ text mà chưa có trong danh sách */}
          {!hasExactMatch && query.trim() && (
            <div className="mt-1 border-t border-stone-100 pt-1">
              <div className="flex items-center gap-2 rounded-md bg-stone-50 p-1.5">
                {isColor && (
                  <div className="flex items-center gap-1 pl-1" title="Chọn mã màu">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border border-stone-300 bg-transparent p-0"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={isCreating}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateNew();
                  }}
                  className="flex flex-1 items-center gap-1.5 rounded bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span className="truncate">
                        Thêm mới {label ? label.replace('*', '').trim().toLowerCase() : ''}: &quot;{query.trim()}&quot;
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableCombobox;
