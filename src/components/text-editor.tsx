'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Copy, Wand2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { watsonApi, WatsonResponse, ErrorItem } from '@/lib/watson-api'

interface ErrorInfo {
  word: string;
  type: string;
  correction: string;
  position: {
    top: number;
    left: number;
  };
}

interface TextEditorProps {
  onErrorsFound: (errors: WatsonResponse) => void;
  onSynonymsGenerated: (synonyms: string) => void;
}

export function TextEditor({ onErrorsFound, onSynonymsGenerated }: TextEditorProps) {
  const [userInput, setUserInput] = useState("")
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentErrors, setCurrentErrors] = useState<ErrorItem[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [isSynonymLoading, setIsSynonymLoading] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getErrorWord = (error: ErrorItem) => error["خطأ"] || error["الكلمة الخاطئة"] || error["الكلمة_الخاطئة"] || "";
  const getErrorType = (error: ErrorItem) => error["نوع_الخطأ"] || error["نوع الخطأ"] || "";
  const getErrorCorrection = (error: ErrorItem) => error["تصحيح_الكلمة"] || error["تصحيح الكلمة"] || "";

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      setSelectedText(text);
      console.log('Selected text:', text);
    }
  };

  const handleGenerateSynonyms = async () => {
    if (!selectedText) {
      console.log('No text selected');
      return;
    }
    
    console.log('Generating synonyms for:', selectedText);
    
    try {
      setIsSynonymLoading(true);
      const response = await watsonApi.generateSynonyms(selectedText);
      const synonyms = response.results[0].generated_text;
      console.log('Generated synonyms:', synonyms);
      onSynonymsGenerated(synonyms);
      
    } catch (err) {
      console.error('Error generating synonyms:', err);
      setError(err instanceof Error ? err.message : 'An error occurred generating synonyms');
    } finally {
      setIsSynonymLoading(false);
    }
  };

  const markErrorsInText = (text: string, errors: ErrorItem[]) => {
    console.log('Marking errors in text:', { text, errors });

    // Create a temporary div to handle HTML safely
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    let processedText = tempDiv.innerHTML;

    // Sort errors by length (longest first) to prevent partial word matches
    const sortedErrors = [...errors].sort((a, b) => {
      const wordA = getErrorWord(a);
      const wordB = getErrorWord(b);
      return wordB.length - wordA.length;
    });

    sortedErrors.forEach(errorItem => {
      const errorWord = getErrorWord(errorItem);
      const errorType = getErrorType(errorItem);
      const correction = getErrorCorrection(errorItem);

      // Use word boundaries and capture spaces/punctuation
      const regex = new RegExp(`(^|\\s|[.،؛:-])(${errorWord})($|\\s|[.،؛:-])`, 'g');
      processedText = processedText.replace(regex, (match, before, word, after) => {
        return `${before}<span 
          class="error-word" 
          style="text-decoration: underline; text-decoration-color: red; text-decoration-thickness: 2px; position: relative; display: inline-block;"
          data-error-type="${errorType}"
          data-word="${errorWord}"
          data-correction="${correction}"
        >${word}</span>${after}`;
      });
    });

    return processedText;
  }

  const showTooltip = (target: HTMLElement) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const word = target.getAttribute('data-word');
    const errorType = target.getAttribute('data-error-type');
    const correction = target.getAttribute('data-correction');
    
    if (word && errorType && correction) {
      const rect = target.getBoundingClientRect();
      const editorRect = document.querySelector('.editor-container')?.getBoundingClientRect();
      
      if (editorRect) {
        setErrorInfo({
          word,
          type: errorType,
          correction,
          position: {
            top: rect.top - editorRect.top,
            left: rect.left - editorRect.left + (rect.width / 2),
          }
        });
      }
    }
  };

  const hideTooltip = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setErrorInfo(null);
    }, 200);
  };

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('error-word')) {
        showTooltip(target);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      if (relatedTarget?.closest('#error-tooltip')) {
        return;
      }

      if (target.id === 'error-tooltip' && relatedTarget?.classList.contains('error-word')) {
        return;
      }

      hideTooltip();
    };

    const handleTooltipMouseEnter = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const handleTooltipMouseLeave = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget?.classList.contains('error-word')) {
        hideTooltip();
      }
    };

    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);

    const tooltip = document.getElementById('error-tooltip');
    if (tooltip) {
      tooltip.addEventListener('mouseenter', handleTooltipMouseEnter);
      tooltip.addEventListener('mouseleave', handleTooltipMouseLeave);
    }

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
      if (tooltip) {
        tooltip.removeEventListener('mouseenter', handleTooltipMouseEnter);
        tooltip.removeEventListener('mouseleave', handleTooltipMouseLeave);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerateText = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const errors = await watsonApi.generateText(userInput)
      console.log('API Response:', errors);
      
      setCurrentErrors(errors);
      onErrorsFound(errors); // Pass errors to parent component
      
      const displayText = markErrorsInText(userInput, errors);
      
      const editorDiv = document.querySelector('[contenteditable]');
      if (editorDiv) {
        editorDiv.innerHTML = displayText;
      }
    } catch (err) {
      console.error('Error in handleGenerateText:', err);
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md" dir="rtl">
      <div className="flex justify-between items-center mb-4">
      </div>
      <div className="relative mb-4 editor-container">
        <div
          contentEditable
          suppressContentEditableWarning
          spellCheck="false"
          dir="rtl"
          lang="ar"
          className="w-full min-h-[150px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          style={{ 
            direction: 'rtl',
            fontFamily: 'inherit'
          }}
          onInput={(e) => {
            const newText = e.currentTarget.textContent || '';
            console.log('New user input:', newText);
            setUserInput(newText);
            setCurrentErrors([]);
            onErrorsFound([]); // Clear errors in parent when input changes
          }}
          onMouseUp={handleTextSelection}
        />
        {errorInfo && (
          <div
            id="error-tooltip"
            className="absolute z-50"
            style={{
              top: `${errorInfo.position.top - 60}px`,
              left: `${errorInfo.position.left}px`,
              transform: 'translate(-50%, 0)',
              opacity: 1,
              pointerEvents: 'auto',
            }}
          >
            <div 
              className="bg-white border border-gray-200 rounded-md shadow-lg p-2 text-sm"
              style={{
                direction: 'rtl',
                minWidth: '150px',
                maxWidth: '300px',
                position: 'relative',
              }}
            >
              <div 
                className="absolute w-3 h-3 bg-white border-b border-r border-gray-200 transform rotate-45"
                style={{
                  bottom: '-7px',
                  left: '50%',
                  marginLeft: '-6px',
                }}
              />
              <div className="font-bold mb-1">{errorInfo.word}</div>
              <div className="text-red-600">{errorInfo.type}</div>
              <div className="text-green-600 mt-1">التصحيح: {errorInfo.correction}</div>
            </div>
          </div>
        )}
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute top-2 left-2"
          onClick={() => navigator.clipboard.writeText(userInput)}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy</span>
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleGenerateText}
            disabled={isLoading}
          >
            <Wand2 className="ml-2 h-4 w-4" />
            {isLoading ? 'جاري التدقيق...' : 'تدقيق'}
          </Button>
          <Button
            variant="outline"
            className="w-[140px]"
            onClick={handleGenerateSynonyms}
            disabled={isSynonymLoading || !selectedText}
          >
            {isSynonymLoading ? 'جاري التوليد...' : 'توليد مرادفات'}
          </Button>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-red-500 text-sm text-right">
          {error}
        </div>
      )}
      <style jsx global>{`
        .error-word {
          transition: background-color 0.2s ease;
        }
        .error-word:hover {
          background-color: rgba(255, 0, 0, 0.1);
        }
        #error-tooltip {
          transition: opacity 0.2s ease;
        }
      `}</style>
    </div>
  )
}
