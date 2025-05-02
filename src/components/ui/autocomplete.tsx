import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface AutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onSelect'> {
  suggestions: string[];
  onSelect: (value: string) => void;
}

export function Autocomplete({
  suggestions,
  onSelect,
  className,
  ...props
}: AutocompleteProps) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value
  useEffect(() => {
    if (props.value && typeof props.value === 'string') {
      const inputValue = (props.value as string).toLowerCase();
      // Remove the input value from suggestions if it exists
      const filtered = suggestions
        .filter(suggestion => suggestion.toLowerCase() !== inputValue)
        .filter(suggestion =>
          suggestion.toLowerCase().startsWith(inputValue) || // Prioritize startsWith
          suggestion.toLowerCase().includes(inputValue)       // Then includes
        );
      // Remove duplicatas mantendo a ordem original
      const uniqueSuggestions = Array.from(new Set(filtered));
      // Sort suggestions: startsWith first, then includes
      const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
        const aStartsWith = a.toLowerCase().startsWith(inputValue);
        const bStartsWith = b.toLowerCase().startsWith(inputValue);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      setFilteredSuggestions(sortedSuggestions);
    } else {
      setFilteredSuggestions([]);
    }
  }, [props.value, suggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredSuggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        {...props}
        className={cn(className)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              className={cn(
                'px-4 py-2 cursor-pointer hover:bg-gray-100',
                index === highlightedIndex ? 'bg-gray-100' : ''
              )}
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
