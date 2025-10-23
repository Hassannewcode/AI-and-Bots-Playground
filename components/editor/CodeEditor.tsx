import React, { useRef, useMemo } from 'react';
import { highlightCode } from '../../editor/syntaxHighlighter';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCodeChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue = `${value.substring(0, selectionStart)}  ${value.substring(selectionEnd)}`;
      onCodeChange(newValue);
      
      // Needs to be in a timeout to run after React's state update
      setTimeout(() => {
        if(textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
  };

  const lineCount = code.split('\n').length;
  // Only generate line numbers for the actual lines of code.
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const highlightedCode = useMemo(() => highlightCode(code, language), [code, language]);

  return (
    <div className="absolute inset-0 flex overflow-hidden font-mono">
      <div 
        ref={lineNumbersRef}
        className="w-12 text-right pr-4 pt-2 text-gray-500 select-none overflow-y-hidden bg-[#1e2026] border-r border-[#3a3d46]"
        aria-hidden="true"
      >
        {lineNumbers.map(n => <div key={n}>{n}</div>)}
      </div>
      <div className="flex-grow p-2 overflow-hidden relative">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
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
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  );
};

export default CodeEditor;