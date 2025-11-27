import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import { EditorState, Plugin } from 'prosemirror-state'; // Core state management for ProseMirror
import { EditorView } from 'prosemirror-view'; // View layer that renders the editor
import { Schema } from 'prosemirror-model'; // Document model schema definition
import { schema } from 'prosemirror-schema-basic'; // Basic schema with paragraphs, headings, etc.
import { addListNodes } from 'prosemirror-schema-list'; // Adds list node types (ul, ol)
import { keymap } from 'prosemirror-keymap'; // Plugin for keyboard shortcuts
import { baseKeymap, toggleMark } from 'prosemirror-commands'; // Commands for text manipulation
import { history, redo, undo } from 'prosemirror-history'; // Undo/redo functionality
import { TextSelection } from 'prosemirror-state'; // Text selection utilities
import { FormattingToolbar } from './FormattingToolbar';

// Interface defining methods exposed to parent components via ref
export interface ProseMirrorEditorHandle {
  getContent: () => string; // Returns current editor text content
  setContent: (content: string) => void; // Replaces entire editor content
  appendContent: (content: string) => void; // Appends text to end of document
  streamContent: (content: string, onComplete?: () => void) => Promise<void>; // Character-by-character streaming animation
  focus: () => void; // Focuses the editor
}

// Props interface for the editor component
interface ProseMirrorEditorProps {
  onChange?: (content: string) => void; // Callback when content changes
  placeholder?: string; // Placeholder text when editor is empty
  isAiWriting?: boolean; // Flag to show AI writing animation state
}

// Create schema once outside component for performance (avoids recreation on each render)
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'), // Extend basic schema with list nodes (ul, ol)
  marks: schema.spec.marks
    .append({
      underline: { // Custom underline mark definition
        parseDOM: [{ tag: 'u' }], 
        toDOM() {
          return ['u', 0]; 
        },
      },
      fontSize: { // Custom font size mark with configurable size attribute
        attrs: { size: { default: '16px' } }, // Default font size attribute
        parseDOM: [
          {
            style: 'font-size', 
            getAttrs: (value: string) => {
              return { size: value }; 
            },
          },
        ],
        toDOM(node: any) {
          return ['span', { style: `font-size: ${node.attrs.size}` }, 0]; // Render as span with inline style
        },
      },
    }),
});

// Optimized placeholder plugin - only updates when needed 
const createPlaceholderPlugin = (placeholder: string) => {
  let lastIsEmpty: boolean | null = null; // Track previous empty state to avoid unnecessary updates
  
  return new Plugin({
    props: {
      attributes: {
        'data-placeholder': placeholder, // Set placeholder attribute on editor DOM
      },
    },
    view(editorView) {
      const updatePlaceholder = () => {
        const { state } = editorView;
        const isEmpty = state.doc.textContent.trim().length === 0; // Check if editor is empty
        
        // Only update if state changed (prevents unnecessary DOM manipulation)
        if (lastIsEmpty === isEmpty) return;
        lastIsEmpty = isEmpty;
        
        const proseMirrorElement = editorView.dom as HTMLElement;
        if (!proseMirrorElement) return;
        
        const firstParagraph = proseMirrorElement.querySelector('p:first-child'); // Find first paragraph element
        if (firstParagraph) {
          if (isEmpty) {
            proseMirrorElement.setAttribute('data-placeholder', placeholder); 
            firstParagraph.classList.add('is-editor-empty'); 
          } else {
            proseMirrorElement.removeAttribute('data-placeholder'); // Hide placeholder when content exists
            firstParagraph.classList.remove('is-editor-empty'); 
          }
        }
      };

      // Initial update on plugin initialization
      requestAnimationFrame(updatePlaceholder);

      return {
        update: updatePlaceholder, // Called whenever editor state changes
      };
    },
  });
};

// Main editor component using forwardRef to expose methods to parent via ref
export const ProseMirrorEditor = forwardRef<ProseMirrorEditorHandle, ProseMirrorEditorProps>(
  ({ onChange, placeholder = 'Start typing...', isAiWriting = false }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null); // Ref to the DOM container element
    const viewRef = useRef<EditorView | null>(null); // Ref to ProseMirror EditorView instance
    const onChangeRef = useRef(onChange); // Ref to onChange callback (avoids stale closures)
    const [editorView, setEditorView] = useState<EditorView | null>(null); // State for EditorView (used by FormattingToolbar)
    const onChangeTimeoutRef = useRef<number | null>(null); // Ref to debounce timeout ID

    // Keep onChange ref up to date when prop changes (prevents stale closures in debounced handler)
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Memoize plugins to avoid recreation on every render (performance optimization)
    const plugins = useMemo(() => [
      history(), // Undo/redo history plugin
      createPlaceholderPlugin(placeholder), // Custom placeholder plugin
      keymap({
        'Mod-z': undo, // Ctrl/Cmd+Z for undo
        'Mod-y': redo, // Ctrl/Cmd+Y for redo
        'Mod-Shift-z': redo, // Ctrl/Cmd+Shift+Z for redo (alternative)
        'Mod-b': toggleMark(mySchema.marks.strong), // Ctrl/Cmd+B for bold
        'Mod-i': toggleMark(mySchema.marks.em), // Ctrl/Cmd+I for italic
        'Mod-u': toggleMark(mySchema.marks.underline), // Ctrl/Cmd+U for underline
      }),
      keymap(baseKeymap), // Base keyboard shortcuts (Enter, Backspace, etc.)
    ], [placeholder]);

    // Debounced onChange handler - using ref to avoid recreation (prevents new function on each render)
    const handleChange = useRef((textContent: string) => {
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current); // Clear previous timeout if exists
      }
      onChangeTimeoutRef.current = window.setTimeout(() => {
        if (onChangeRef.current) {
          onChangeRef.current(textContent); // Call onChange callback after delay
        }
      }, 100); // Debounce by 100ms (reduces excessive parent component updates)
    }).current;

    // Expose methods to parent component via ref (allows parent to control editor)
    useImperativeHandle(ref, () => ({
      getContent: () => {
        if (!viewRef.current) return '';
        return viewRef.current.state.doc.textContent; // Extract plain text from document
      },
      setContent: (content: string) => {
        if (!viewRef.current) return;
        const state = EditorState.create({
          doc: mySchema.nodeFromJSON({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: content ? [{ type: 'text', text: content }] : [], // Create paragraph node with text
              },
            ],
          }),
          plugins,
        });
        viewRef.current.updateState(state); // Replace entire editor content
      },
      appendContent: (content: string) => {
        if (!viewRef.current) return;
        const { state, dispatch } = viewRef.current;
        const { tr } = state; // Create transaction for document modification
        const endPos = state.doc.content.size; // Get position at end of document
        const lastChar = state.doc.textContent[state.doc.textContent.length - 1];
        const insertText = (lastChar && !lastChar.match(/\s/)) ? ' ' + content : content; // Add space if needed
        tr.insertText(insertText, endPos); // Insert text at end position
        dispatch(tr); // Apply transaction to update editor
      },
      streamContent: async (content: string, onComplete?: () => void) => {
        if (!viewRef.current) return;
        
        // Handle leading newlines (extract them separately for proper rendering)
        let textToStream = content;
        let leadingNewlines = '';
        while (textToStream.startsWith('\n')) {
          leadingNewlines += '\n';
          textToStream = textToStream.slice(1); // Remove newline from text to stream
        }
        
        // Add space if needed (ensures proper word spacing when appending)
        if (leadingNewlines === '') {
          const currentState = viewRef.current.state;
          const lastChar = currentState.doc.textContent[currentState.doc.textContent.length - 1];
          if (lastChar && !lastChar.match(/\s/)) {
            textToStream = ' ' + textToStream; // Add space before content if last char isn't whitespace
          }
        }
        
        // Insert leading newlines first (if any exist)
        if (leadingNewlines) {
          const { state, dispatch } = viewRef.current;
          const { tr } = state;
          tr.insertText(leadingNewlines, state.doc.content.size); // Insert newlines at end
          dispatch(tr); // Apply transaction
          await new Promise(resolve => setTimeout(resolve, 30)); // Brief pause after newlines
        }
        
        // Character-by-character streaming for typewriter effect
        for (let i = 0; i < textToStream.length; i++) {
          if (!viewRef.current) break; // Exit if editor was unmounted
          
          const char = textToStream[i];
          const { state, dispatch } = viewRef.current;
          const { tr } = state;
          const endPos = state.doc.content.size; // Get end position of document
          const selection = TextSelection.near(state.doc.resolve(endPos)); // Create selection at end
          tr.setSelection(selection); // Set cursor position
          tr.insertText(char); // Insert single character
          dispatch(tr); // Apply transaction to update editor
          
          // Update cursor position for gradient effect (CSS custom properties for dynamic gradient)
          if (viewRef.current) {
            const editorElement = viewRef.current.dom.closest('.prosemirror-editor') as HTMLElement;
            if (editorElement) {
              // Get cursor coordinates from ProseMirror view (primary method)
              const { state } = viewRef.current;
              const { selection: pmSelection } = state;
              const coords = viewRef.current.coordsAtPos(pmSelection.head); // Get screen coordinates of cursor
              
              if (coords) {
                const editorRect = editorElement.getBoundingClientRect();
                const x = ((coords.left - editorRect.left) / editorRect.width) * 100; // Convert to percentage
                const y = ((coords.top - editorRect.top) / editorRect.height) * 100;
                editorElement.style.setProperty('--cursor-x', `${Math.max(5, Math.min(95, x))}%`); // Clamp between 5-95%
                editorElement.style.setProperty('--cursor-y', `${Math.max(5, Math.min(95, y))}%`); // Update CSS vars for gradient
              } else {
                // Fallback: use DOM selection API if ProseMirror coordinates unavailable
                setTimeout(() => {
                  const domSelection = window.getSelection();
                  if (domSelection && domSelection.rangeCount > 0) {
                    const range = domSelection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const editorRect = editorElement.getBoundingClientRect();
                    const x = ((rect.left + rect.width / 2 - editorRect.left) / editorRect.width) * 100;
                    const y = ((rect.top + rect.height / 2 - editorRect.top) / editorRect.height) * 100;
                    editorElement.style.setProperty('--cursor-x', `${Math.max(5, Math.min(95, x))}%`);
                    editorElement.style.setProperty('--cursor-y', `${Math.max(5, Math.min(95, y))}%`);
                  }
                }, 0);
              }
            }
          }
          
          // Variable delays for natural typing rhythm (different speeds for different character types)
          let delay = 30; // Base delay for default characters
          if (char.match(/\s/)) {
            delay = 15; // Spaces are very fast (no visual delay needed)
          } else if (char.match(/[.,!?;:]/)) {
            delay = 60; // Punctuation has slight pause (natural reading rhythm)
          } else if (char.match(/[a-zA-Z]/)) {
            delay = 40; // Letters at moderate speed (readable but not slow)
          }
          
          await new Promise(resolve => setTimeout(resolve, delay)); // Wait before next character
        }
        
        if (onComplete) {
          onComplete(); // Call completion callback when streaming finishes
        }
      },
      focus: () => {
        viewRef.current?.focus(); // Focus the editor (moves cursor to editor)
      },
    }));

    // Initialize ProseMirror editor when component mounts or plugins change
    useEffect(() => {
      if (!editorRef.current) return;

      // Clear any existing content (cleanup from previous render)
      editorRef.current.innerHTML = '';

      // Create initial editor state with empty paragraph
      const state = EditorState.create({
        doc: mySchema.nodeFromJSON({
          type: 'doc',
          content: [
            {
              type: 'paragraph', // Start with empty paragraph node
            },
          ],
        }),
        plugins, // Apply all plugins (history, placeholder, keymap, etc.)
      });

      // Create editor container div (ProseMirror will manage this DOM element)
      const editorContainer = document.createElement('div');
      editorContainer.className = 'prosemirror-editor-content';
      editorContainer.style.width = '100%';
      editorContainer.style.height = '100%';
      editorRef.current.appendChild(editorContainer);

      // Create the ProseMirror EditorView (the actual editor instance)
      const view = new EditorView(editorContainer, {
        state, // Initial editor state
        dispatchTransaction: (transaction) => {
          if (!viewRef.current) return;
          
          const newState = view.state.apply(transaction); // Apply transaction to get new state
          view.updateState(newState); // Update view with new state
          
          // Trigger toolbar update (notify FormattingToolbar of state change)
          requestAnimationFrame(() => {
            const event = new Event('prosemirror-update');
            view.dom.dispatchEvent(event); // Dispatch custom event for toolbar sync
          });
          
          // Debounced onChange callback (notify parent component of content change)
          const textContent = newState.doc.textContent;
          handleChange(textContent);
        },
      });

      viewRef.current = view; // Store view in ref for imperative access
      setEditorView(view); // Store in state for FormattingToolbar access

      // Focus the editor when it's mounted (better UX - ready to type immediately)
      requestAnimationFrame(() => {
        view.focus();
      });

      // Cleanup function (runs when component unmounts or plugins change)
      return () => {
        if (onChangeTimeoutRef.current) {
          clearTimeout(onChangeTimeoutRef.current); // Clear pending debounced callback
        }
        if (viewRef.current) {
          viewRef.current.destroy(); // Destroy ProseMirror view (cleanup event listeners, etc.)
        }
        viewRef.current = null; // Clear ref
        setEditorView(null); // Clear state
        if (editorRef.current) {
          editorRef.current.innerHTML = ''; // Clear DOM container
        }
      };
    }, [plugins]); // Re-run effect if plugins change

    // Render editor wrapper with formatting toolbar and editor container
    return (
      <div className={`prosemirror-editor-wrapper ${isAiWriting ? 'ai-writing-active' : ''}`}>
        <FormattingToolbar view={editorView} /> {/* Formatting toolbar (bold, italic, etc.) */}
        <div
          ref={editorRef}
          className={`prosemirror-editor ${isAiWriting ? 'ai-writing-active' : ''}`} // Container where ProseMirror will mount
        />
      </div>
    );
  }
);

ProseMirrorEditor.displayName = 'ProseMirrorEditor'; // Set display name for React DevTools
