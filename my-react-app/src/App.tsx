import { useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { editorMachine } from './machines/editorMachine';
import { ProseMirrorEditor } from './components/ProseMirrorEditor';
import type { ProseMirrorEditorHandle } from './components/ProseMirrorEditor';
import { continueWriting } from './services/aiService';
import './App.css';

function App() {
  const editorRef = useRef<ProseMirrorEditorHandle>(null);
  const [state, send] = useMachine(editorMachine);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleContentChange = (content: string) => {
    send({ type: 'CONTENT_UPDATED', content });
  };

  const handleContinueWriting = async () => {
    const textContent = state.context.content;

    if (!textContent.trim()) {
      return;
    }

    send({ type: 'CONTINUE_WRITING' });

    try {
      const response = await continueWriting({ text: textContent });
      send({ type: 'AI_RESPONSE', content: response.continuation });
      
      const formattedContinuation = '\n\n' + response.continuation;
      
      if (editorRef.current) {
        // Start streaming - keep animation active
        setIsStreaming(true);
        await editorRef.current.streamContent(formattedContinuation, () => {
          // Streaming complete - turn off animation
          setIsStreaming(false);
          requestAnimationFrame(() => {
            editorRef.current?.focus();
          });
        });
      }
    } catch (error) {
      setIsStreaming(false);
      send({ 
        type: 'ERROR', 
        error: error instanceof Error ? error.message : 'Failed to continue writing' 
      });
    }
  };

  const canContinue = state.context.content.trim().length > 0 && !state.context.isLoading;

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="chronicle-nav">
        <div className="nav-left">
          <a href="#" className="nav-link">Product</a>
          <a href="#" className="nav-link">Pricing</a>
          <a href="#" className="nav-link">Templates</a>
          <a href="#" className="nav-link">Gallery</a>
          <a href="#" className="nav-link">Solutions</a>
          <a href="#" className="nav-link">Resources</a>
        </div>
        <div className="nav-center">
          <div className="chronicle-logo">✦</div>
        </div>
        <div className="nav-right">
          <button className="nav-button login-button">Login</button>
          <button className="nav-button try-button">Try for free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">Every great presentation starts with a Chronicle</h1>
        <p className="hero-subtitle">Create stunning presentations. No design skills required.</p>
      </div>

      {/* Editor Section */}
      <div className="editor-section">
        <div className={`editor-container ${state.context.isLoading || isStreaming ? 'ai-writing' : ''}`}>
          <ProseMirrorEditor
            ref={editorRef}
            onChange={handleContentChange}
            placeholder="Start typing your text here..."
            isAiWriting={state.context.isLoading || isStreaming}
          />
        </div>

        <div className="controls-container">
          <button
            className={`continue-button ${!canContinue ? 'disabled' : ''} ${state.context.isLoading ? 'loading' : ''}`}
            onClick={handleContinueWriting}
            disabled={!canContinue}
          >
            {state.context.isLoading ? (
              <>
                <span className="spinner"></span>
                <span>AI is writing...</span>
              </>
            ) : (
              'Continue Writing'
            )}
          </button>

          {state.context.error && (
            <div className="error-message">
              <p>{state.context.error}</p>
              {(state.context.error.includes('overloaded') || 
                state.context.error.includes('503') ||
                state.context.error.includes('quota') ||
                state.context.error.includes('429')) && (
                <button
                  className="retry-button"
                  onClick={handleContinueWriting}
                  disabled={state.context.isLoading}
                >
                  {state.context.isLoading ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <p className="info-text">
          💡 <strong>Tip:</strong> Type some text and click "Continue Writing" to have Gemini AI complete your paragraph naturally.
        </p>
        <p className="info-text">
          ⌨️ <strong>Shortcuts:</strong> Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline)
        </p>
        {!import.meta.env.VITE_GEMINI_API_KEY && (
          <p className="info-text warning">
            ⚠️ <strong>Setup Required:</strong> Please configure your Gemini API key in the .env file (VITE_GEMINI_API_KEY) to use the AI features.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
