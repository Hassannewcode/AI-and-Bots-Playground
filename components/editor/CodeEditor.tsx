import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { highlightCode } from '../../editor/syntaxHighlighter';
import type { Suggestion, Problem } from '../../game/types';
import { getSuggestions } from '../../editor/autocomplete';
import { getCodeCompletion } from '../../game/gemini';
import AutoCompletePopup from './AutoCompletePopup';

interface Settings {
    keybindings: {
        acceptSuggestion: string;
        acceptAiCompletion: string;
        cycleAiCompletionDown: string;
        cycleAiCompletionUp: string;
    }
}

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  problems: Problem[];
  settings: Settings;
}

// Helper to escape HTML for dangerouslySetInnerHTML
const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Simple debounce utility
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: number;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => resolve(func(...args)), waitFor);
    });
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language, problems, settings }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  
  // State for single-word autocomplete popup
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState<{ top: number, left: number } | null>(null);
  
  // State for AI multi-line completions
  const [multiLineSuggestions, setMultiLineSuggestions] = useState<string[]>([]);
  const [activeMultiLineIndex, setActiveMultiLineIndex] = useState(0);
  const [ghostText, setGhostText] = useState('');
  const [isFetchingCompletions, setIsFetchingCompletions] = useState(false);


  const debouncedGetAiCompletions = useMemo(() => debounce(async (currentCode: string, cursorPosition: number, lang: string) => {
    if (!textareaRef.current || isFetchingCompletions) return;

    const charAfterCursor = currentCode[cursorPosition];
    if (charAfterCursor && !charAfterCursor.match(/\s|[,;(){}[\]]/)) {
        setGhostText('');
        setMultiLineSuggestions([]);
        return;
    }
    
    setIsFetchingCompletions(true);
    try {
        const aiSuggestions = await getCodeCompletion(currentCode, cursorPosition, lang);
        if (textareaRef.current && textareaRef.current.value === currentCode) {
            if (aiSuggestions.length > 0) {
                setMultiLineSuggestions(aiSuggestions);
                setActiveMultiLineIndex(0);
                setGhostText(aiSuggestions[0]);
            } else {
                setGhostText('');
                setMultiLineSuggestions([]);
            }
        }
    } finally {
        setIsFetchingCompletions(false);
    }
  }, 300), [isFetchingCompletions]);


  const syncScroll = () => {
    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  const updateSuggestions = () => {
    if (!textareaRef.current) return;
    const { value, selectionStart } = textareaRef.current;
    
    const currentLineNumber = value.substring(0, selectionStart).split('\n').length - 1;
    const currentLine = value.split('\n')[currentLineNumber];
    const cursorPositionInLine = selectionStart - value.lastIndexOf('\n', selectionStart - 1) - 1;

    const newSuggestions = getSuggestions(currentLine, cursorPositionInLine, value, language);
    setSuggestions(newSuggestions);
    
    if (newSuggestions.length > 0) {
      setActiveSuggestionIndex(0);
      const { top, left } = getCursorCoordinates(textareaRef.current, selectionStart);
      setPopupPosition({ top: top + 20, left: left });
    } else {
      setPopupPosition(null);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onCodeChange(newCode);
    setGhostText('');
    setMultiLineSuggestions([]);
    
    setTimeout(updateSuggestions, 0);
    debouncedGetAiCompletions(newCode, cursorPosition, language);
  };
  
  const applySuggestion = (suggestion: Suggestion) => {
      if(!textareaRef.current) return;

      const { value, selectionStart } = textareaRef.current;
      const currentLine = value.split('\n')[value.substring(0, selectionStart).split('\n').length - 1];
      const cursorIndexOnLine = selectionStart - value.lastIndexOf('\n', selectionStart - 1) - 1;
      
      const textBeforeCursor = currentLine.substring(0, cursorIndexOnLine);
      const lastWordMatch = textBeforeCursor.match(/[\w.]+$/);
      const textToReplace = lastWordMatch ? lastWordMatch[0] : '';
      const startOfReplacement = selectionStart - textToReplace.length;

      const textToInsert = suggestion.type === 'param' ? `${suggestion.label}: ` : suggestion.label;

      const newValue = value.substring(0, startOfReplacement) + textToInsert + value.substring(selectionStart);
      onCodeChange(newValue);
      
      setPopupPosition(null);
      setSuggestions([]);

      setTimeout(() => {
        if(textareaRef.current) {
          const newCursorPos = startOfReplacement + textToInsert.length;
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
  };
  
  const applyGhostText = useCallback(() => {
    if (!ghostText || !textareaRef.current) return;

    const { selectionStart, value } = textareaRef.current;
    const newValue = value.substring(0, selectionStart) + ghostText + value.substring(selectionStart);
    onCodeChange(newValue);
    setGhostText('');
    setMultiLineSuggestions([]);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = selectionStart + ghostText.length;
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
  }, [ghostText, onCodeChange]);

  const checkKeybinding = (e: React.KeyboardEvent, binding: string): boolean => {
    if (!binding) return false;
    const parts = binding.split('+').map(p => p.trim().toLowerCase());
    const key = parts.pop();
    if (!key || e.key.toLowerCase() !== key) return false;

    // Check if all required modifiers are pressed
    if (parts.includes('control') && !e.ctrlKey) return false;
    if (parts.includes('alt') && !e.altKey) return false;
    if (parts.includes('shift') && !e.shiftKey) return false;
    if (parts.includes('meta') && !e.metaKey) return false;
    
    return true;
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Priority 1: Handle single-word autocomplete popup
    if (popupPosition && suggestions.length > 0) {
       if (e.key === 'ArrowDown') {
           e.preventDefault();
           setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
           return;
       }
       if (e.key === 'ArrowUp') {
           e.preventDefault();
           setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
           return;
       }
       if (e.key === 'Enter' || checkKeybinding(e, settings.keybindings.acceptSuggestion)) {
           e.preventDefault();
           applySuggestion(suggestions[activeSuggestionIndex]);
           setGhostText('');
           setMultiLineSuggestions([]);
           return;
       }
       if (e.key === 'Escape') {
           e.preventDefault();
           setPopupPosition(null);
           setSuggestions([]);
           return;
       }
    }

    // Priority 2: Handle AI multi-line ghost text suggestions
    if (ghostText && multiLineSuggestions.length > 0) {
        if (checkKeybinding(e, settings.keybindings.acceptAiCompletion)) {
            e.preventDefault();
            applyGhostText();
            return;
        }
        if (checkKeybinding(e, settings.keybindings.cycleAiCompletionDown)) {
            e.preventDefault();
            const nextIndex = (activeMultiLineIndex + 1) % multiLineSuggestions.length;
            setActiveMultiLineIndex(nextIndex);
            setGhostText(multiLineSuggestions[nextIndex]);
            return;
        }
        if (checkKeybinding(e, settings.keybindings.cycleAiCompletionUp)) {
            e.preventDefault();
            const prevIndex = (activeMultiLineIndex - 1 + multiLineSuggestions.length) % multiLineSuggestions.length;
            setActiveMultiLineIndex(prevIndex);
            setGhostText(multiLineSuggestions[prevIndex]);
            return;
        }
        if (e.key === 'Escape') {
           e.preventDefault();
           setGhostText('');
           setMultiLineSuggestions([]);
           return;
       }
    }
    
    // Priority 3: Default Tab behavior (indentation)
    if (e.key === 'Tab' && !e.shiftKey && suggestions.length === 0) {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue = `${value.substring(0, selectionStart)}  ${value.substring(selectionEnd)}`;
      onCodeChange(newValue);
      
      setTimeout(() => {
        if(textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
      return;
    }
    
  }, [
    ghostText, multiLineSuggestions, activeMultiLineIndex, 
    popupPosition, suggestions, activeSuggestionIndex,
    applyGhostText, applySuggestion, settings
  ]);


  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const highlightedCode = useMemo(() => highlightCode(code, language), [code, language]);
  const problemLines = useMemo(() => new Set(problems.map(p => p.line)), [problems]);

  return (
    <div className="absolute inset-0 flex overflow-hidden font-mono">
      <div 
        ref={lineNumbersRef}
        className="w-12 text-right pr-4 pt-2 text-gray-500 select-none overflow-y-hidden bg-[#1e2026] border-r border-[#3a3d46]"
        aria-hidden="true"
      >
        {lineNumbers.map(n => (
          <div key={n} className={problemLines.has(n) ? 'text-red-400' : ''}>
            {n}
          </div>
        ))}
      </div>
      <div className="flex-grow p-2 overflow-hidden relative">
        <div className="editor-highlight-bg">
          {problems.map(p => (
            <div
              key={`problem-${p.line}-${p.message}`}
              className="error-line-highlight"
              style={{ top: `${(p.line - 1) * 1.25}rem` }} // 1.25rem = line-height
            />
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onClick={() => {
              updateSuggestions();
              setGhostText('');
              setMultiLineSuggestions([]);
          }}
          onBlur={() => {
              setGhostText('');
              setMultiLineSuggestions([]);
          }}
          onKeyUp={(e) => {
              if(!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
                  updateSuggestions();
              }
          }}
          className="editor-textarea"
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
        <pre
          ref={preRef}
          aria-hidden="true"
          className="editor-highlight"
        >
          <code dangerouslySetInnerHTML={{ __html: highlightedCode + `<span class="ghost-text">${escapeHtml(ghostText)}</span>` }} />
        </pre>
        {popupPosition && suggestions.length > 0 && (
            <AutoCompletePopup
                suggestions={suggestions}
                activeIndex={activeSuggestionIndex}
                onSelect={(suggestion) => {
                    applySuggestion(suggestion);
                    setGhostText('');
                    setMultiLineSuggestions([]);
                }}
                position={popupPosition}
            />
        )}
        {multiLineSuggestions.length > 0 && (
            <div className="absolute bottom-2 right-4 z-20 bg-[#272a33] border border-[#3a3d46] rounded px-2 py-1 text-xs text-gray-400 select-none">
                Suggestion {activeMultiLineIndex + 1} of {multiLineSuggestions.length}
                <span className="text-gray-600 mx-2">|</span>
                <span className="font-semibold">Ctrl + ↑/↓</span> to cycle
                <span className="text-gray-600 mx-2">|</span>
                <span className="font-semibold">Tab</span> to accept
            </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;

// Helper to get cursor position in pixels
const getCursorCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const text = element.value.substring(0, position);
    const line = text.split('\n').length - 1;

    // Create a temporary span to measure the width of the text on the current line
    const span = document.createElement('span');
    const style = window.getComputedStyle(element);
    
    // Copy necessary styles from the textarea to the span
    span.style.font = style.font;
    span.style.whiteSpace = 'pre';
    span.style.visibility = 'hidden';
    span.textContent = text.split('\n').pop() || '';
    
    document.body.appendChild(span);
    const spanRect = span.getBoundingClientRect();
    const width = spanRect.width;
    document.body.removeChild(span);

    const lineHeightStr = style.lineHeight;
    let lineHeight = 20; // Default fallback: 1.25rem * 16px/rem
    if (lineHeightStr && lineHeightStr !== 'normal') {
        const parsedLineHeight = parseFloat(lineHeightStr);
        if (!isNaN(parsedLineHeight)) {
            lineHeight = parsedLineHeight;
        }
    }
    
    return {
        top: line * lineHeight,
        left: width - element.scrollLeft,
    };
};