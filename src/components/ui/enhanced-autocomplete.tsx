import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface EnhancedAutocompleteProps {
  suggestions: string[];
  onSelect?: (value: string) => void;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  highlightDuplicates?: boolean;
  isDuplicate?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  error?: boolean;
  value?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: 'default' | 'lg' | 'xl';
}

export function EnhancedAutocomplete({
  suggestions,
  onSelect,
  onInputChange,
  highlightDuplicates = true,
  isDuplicate = false,
  className,
  label,
  required,
  error,
  size = 'default',
  ...props
}: EnhancedAutocompleteProps) {
  const [inputValue, setInputValue] = useState<string>(props.value?.toString() || '');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // Update input value when props.value changes
  useEffect(() => {
    if (props.value !== undefined && props.value !== null) {
      setInputValue(props.value.toString());
    }
  }, [props.value]);

  // Filter suggestions based on input value
  useEffect(() => {
    if (inputValue) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(true);
    setActiveSuggestionIndex(0);
    
    if (onInputChange) {
      onInputChange(e);
    }
  };

  const handleClick = (suggestion: string) => {
    setInputValue(suggestion);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    
    if (onSelect) {
      onSelect(suggestion);
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0 && showSuggestions) {
        setInputValue(filteredSuggestions[activeSuggestionIndex]);
        setShowSuggestions(false);
        
        if (onSelect) {
          onSelect(filteredSuggestions[activeSuggestionIndex]);
        }
      }
    }
    // Arrow up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeSuggestionIndex > 0) {
        setActiveSuggestionIndex(activeSuggestionIndex - 1);
      }
    }
    // Arrow down
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeSuggestionIndex < filteredSuggestions.length - 1) {
        setActiveSuggestionIndex(activeSuggestionIndex + 1);
      }
    }
    // Escape
    else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events to fire
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleFocus = () => {
    if (inputValue && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Check if value exists in suggestions (ignoring case)
  const valueExists = (value: string) => {
    return suggestions.some(suggestion => 
      suggestion.toLowerCase() === value.toLowerCase() && 
      suggestion !== props.value
    );
  };

  // Highlight text that matches the input
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? <span key={i} className="font-semibold bg-yellow-100">{part}</span> : part
        )}
      </>
    );
  };

  // Determine if the current value is a duplicate
  const isDuplicateValue = highlightDuplicates && inputValue && valueExists(inputValue);

  // Definir classes com base no tamanho
  const getInputHeight = () => {
    switch (size) {
      case 'lg':
        return 'h-12';
      case 'xl':
        return 'h-14';
      default:
        return 'h-10';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'lg':
        return 'text-base';
      case 'xl':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <Input
        {...props}
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          className,
          getInputHeight(),
          getFontSize(),
          'px-4 w-full',
          (isDuplicateValue || isDuplicate || error) && 'border-red-500 focus:ring-red-500'
        )}
        autoComplete="off"
        style={{ width: '100%', minWidth: '100%' }}
      />
      
      {isDuplicateValue && (
        <div className="text-red-500 text-xs mt-1">
          Este valor já existe. Por favor, escolha outro.
        </div>
      )}
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleClick(suggestion)}
              className={cn(
                "cursor-pointer select-none relative py-3 pl-4 pr-9 text-gray-900 hover:bg-gray-100",
                getFontSize(),
                index === activeSuggestionIndex && "bg-gray-100"
              )}
            >
              {highlightMatch(suggestion, inputValue)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
