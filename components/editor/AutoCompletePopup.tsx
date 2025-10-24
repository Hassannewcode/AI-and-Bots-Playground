
import React from 'react';
import type { Suggestion, SuggestionType } from '../../game/types';
import { MethodIcon, ClassIcon, ParameterIcon, LibraryIcon, VariableIcon, KeywordIcon, FunctionIcon } from '../icons';

interface AutoCompletePopupProps {
  suggestions: Suggestion[];
  activeIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  position: { top: number; left: number };
}

const SuggestionIcon: React.FC<{type: SuggestionType}> = ({ type }) => {
    switch(type) {
        case 'method': return <MethodIcon className="w-4 h-4 text-purple-400" />;
        case 'class': return <ClassIcon className="w-4 h-4 text-teal-400" />;
        case 'param': return <ParameterIcon className="w-4 h-4 text-orange-400" />;
        case 'library': return <LibraryIcon className="w-4 h-4 text-blue-400" />;
        case 'variable': return <VariableIcon className="w-4 h-4 text-yellow-400" />;
        case 'keyword': return <KeywordIcon className="w-4 h-4 text-pink-400" />;
        case 'function': return <FunctionIcon className="w-4 h-4 text-sky-400" />;
        default: return null;
    }
}

const AutoCompletePopup: React.FC<AutoCompletePopupProps> = ({ suggestions, activeIndex, onSelect, position }) => {
  return (
    <div
      className="autocomplete-popup"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.label}
          className={`suggestion-item ${index === activeIndex ? 'active' : ''}`}
          onClick={() => onSelect(suggestion)}
          onMouseDown={(e) => e.preventDefault()} // Prevent textarea from losing focus
        >
          <SuggestionIcon type={suggestion.type} />
          <span className="ml-2 font-semibold">{suggestion.label}</span>
          {suggestion.detail && <span className="ml-3 text-gray-400">{suggestion.detail}</span>}
        </div>
      ))}
    </div>
  );
};

export default AutoCompletePopup;
