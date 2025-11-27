import { useState, useEffect } from 'react';
import { EditorView } from 'prosemirror-view';
import { toggleMark } from 'prosemirror-commands';

interface FormattingToolbarProps {
  view: EditorView | null;
}

export const FormattingToolbar = ({ view }: FormattingToolbarProps) => {
  const [activeMarks, setActiveMarks] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<string>('16px');

  useEffect(() => {
    if (!view) return;

    const updateToolbar = () => {
      const { state } = view;
      const { selection } = state;
      const marks = new Set<string>();
      let currentFontSize = '16px';

      if (selection.empty) {
        // Check marks at cursor position
        const $cursor = selection.$anchor;
        const storedMarks = state.storedMarks || $cursor.marks();
        storedMarks.forEach((mark) => {
          marks.add(mark.type.name);
          if (mark.type.name === 'fontSize') {
            currentFontSize = mark.attrs.size || '16px';
          }
        });
      } else {
        // Check marks in selection
        // Get marks at the start of selection
        const marksAtStart = state.doc.resolve(selection.from).marks();
        let foundFontSize = false;
        
        // Check each mark to see if it spans the entire selection
        marksAtStart.forEach((mark) => {
          // Check if this mark exists throughout the selection
          let markExistsEverywhere = true;
          
          state.doc.nodesBetween(selection.from, selection.to, (node) => {
            const nodeHasMark = node.marks.some((m) => m.type === mark.type);
            if (!nodeHasMark) {
              markExistsEverywhere = false;
            }
            // Track fontSize
            if (mark.type.name === 'fontSize' && !foundFontSize && nodeHasMark) {
              const fontSizeMark = node.marks.find((m) => m.type.name === 'fontSize');
              if (fontSizeMark) {
                currentFontSize = fontSizeMark.attrs.size || '16px';
                foundFontSize = true;
              }
            }
          });
          
          if (markExistsEverywhere) {
            marks.add(mark.type.name);
          }
        });
      }

      setActiveMarks(marks);
      setFontSize(currentFontSize);
    };

    // Update toolbar on selection changes using ProseMirror's update event
    const handleUpdate = () => {
      updateToolbar();
    };

    // Subscribe to ProseMirror's update event
    const plugin = {
      view() {
        return {
          update: handleUpdate,
        };
      },
    };

    // Initial update
    updateToolbar();

    // Also listen to DOM events as fallback
    const update = () => {
      requestAnimationFrame(updateToolbar);
    };

    // Listen to selection changes
    const handleSelectionChange = () => {
      updateToolbar();
    };

    view.dom.addEventListener('focus', update);
    view.dom.addEventListener('blur', update);
    view.dom.addEventListener('mouseup', update);
    view.dom.addEventListener('keyup', update);
    view.dom.addEventListener('prosemirror-update', update);
    
    // Listen for selection changes in the document
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      view.dom.removeEventListener('focus', update);
      view.dom.removeEventListener('blur', update);
      view.dom.removeEventListener('mouseup', update);
      view.dom.removeEventListener('keyup', update);
      view.dom.removeEventListener('prosemirror-update', update);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [view]);

  if (!view) return null;

  const toggleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!view) return;
    
    // Get fresh state and dispatch
    const { state, dispatch } = view;
    const markType = state.schema.marks.strong;
    if (!markType) return;
    
    // Execute the toggle command
    const command = toggleMark(markType);
    const executed = command(state, dispatch);
    
    if (executed) {
      // Force toolbar update after command
      requestAnimationFrame(() => {
        const event = new Event('prosemirror-update');
        view.dom.dispatchEvent(event);
        view.focus();
      });
    }
  };

  const toggleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!view) return;
    
    // Get fresh state and dispatch
    const { state, dispatch } = view;
    const markType = state.schema.marks.em;
    if (!markType) return;
    
    // Execute the toggle command
    const command = toggleMark(markType);
    const executed = command(state, dispatch);
    
    if (executed) {
      // Force toolbar update after command
      requestAnimationFrame(() => {
        const event = new Event('prosemirror-update');
        view.dom.dispatchEvent(event);
        view.focus();
      });
    }
  };

  const toggleUnderline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!view) return;
    
    // Get fresh state and dispatch
    const { state, dispatch } = view;
    const markType = state.schema.marks.underline;
    if (!markType) return;
    
    // Execute the toggle command
    const command = toggleMark(markType);
    const executed = command(state, dispatch);
    
    if (executed) {
      // Force toolbar update after command
      requestAnimationFrame(() => {
        const event = new Event('prosemirror-update');
        view.dom.dispatchEvent(event);
        view.focus();
      });
    }
  };

  const changeFontSize = (size: string) => {
    const { state, dispatch } = view;
    const markType = state.schema.marks.fontSize;
    if (markType) {
      const { from, to } = state.selection;
      const tr = state.tr;
      
      if (from !== to) {
        // Apply to selection - remove existing fontSize marks first
        tr.removeMark(from, to, markType);
        tr.addMark(from, to, markType.create({ size }));
      } else {
        // Apply to next typed text
        tr.removeStoredMark(markType);
        tr.addStoredMark(markType.create({ size }));
      }
      
      dispatch(tr);
      view.focus();
    }
  };

  const isBold = activeMarks.has('strong');
  const isItalic = activeMarks.has('em');
  const isUnderline = activeMarks.has('underline');

  return (
    <div className="formatting-toolbar">
      <button
        className={`toolbar-button ${isBold ? 'active' : ''}`}
        onClick={toggleBold}
        onMouseDown={(e) => e.preventDefault()}
        title="Bold (Ctrl+B)"
        type="button"
      >
        <strong>B</strong>
      </button>
      <button
        className={`toolbar-button ${isItalic ? 'active' : ''}`}
        onClick={toggleItalic}
        onMouseDown={(e) => e.preventDefault()}
        title="Italic (Ctrl+I)"
        type="button"
      >
        <em>I</em>
      </button>
      <button
        className={`toolbar-button ${isUnderline ? 'active' : ''}`}
        onClick={toggleUnderline}
        onMouseDown={(e) => e.preventDefault()}
        title="Underline (Ctrl+U)"
        type="button"
      >
        <u>U</u>
      </button>
      <div className="toolbar-separator"></div>
      <select
        className="toolbar-select"
        value={fontSize}
        onChange={(e) => changeFontSize(e.target.value)}
        title="Font Size"
      >
        <option value="12px">12px</option>
        <option value="14px">14px</option>
        <option value="16px">16px</option>
        <option value="18px">18px</option>
        <option value="20px">20px</option>
        <option value="24px">24px</option>
        <option value="28px">28px</option>
        <option value="32px">32px</option>
        <option value="36px">36px</option>
      </select>
    </div>
  );
};

