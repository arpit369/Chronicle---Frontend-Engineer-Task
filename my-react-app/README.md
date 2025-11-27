# Chronicle AI-Powered Text Editor

A production-ready, AI-powered rich text editor built with React, TypeScript, ProseMirror, and XState. This application demonstrates modern front-end engineering practices with intelligent content generation using Google's Gemini AI.

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![ProseMirror](https://img.shields.io/badge/ProseMirror-1.41.3-000000?logo=prosemirror)
![XState](https://img.shields.io/badge/XState-5.24.0-FF6B6B?logo=xstate)

## 🎯 Overview

This application provides a professional-grade text editing experience with AI-powered content continuation. Users can type text and use the "Continue Writing" feature to have AI-generated content seamlessly appended with a beautiful typewriter-style animation.

### Key Highlights

- ✨ **Rich Text Editing**: Professional editor with formatting toolbar (bold, italic, underline, font sizes)
- 🤖 **AI-Powered Continuation**: Intelligent paragraph completion using Google Gemini AI
- 🎨 **Beautiful UI**: Modern gradient design with smooth animations
- ⚡ **Performance Optimized**: Debounced updates, memoized plugins, efficient rendering
- 🛡️ **Type-Safe**: Full TypeScript coverage throughout
- 🔄 **State Management**: Predictable state transitions with XState
- 🎭 **Character Streaming**: Typewriter effect with variable delays for natural rhythm

## 🚀 Features

### Rich Text Editor
- **Formatting Options**: Bold, italic, underline with keyboard shortcuts
- **Font Size Control**: Adjustable font sizes from 12px to 36px
- **Real-time Toolbar**: Formatting toolbar reflects current selection state
- **Undo/Redo**: Full history support (Ctrl+Z, Ctrl+Y)
- **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + B` - Bold
  - `Ctrl/Cmd + I` - Italic
  - `Ctrl/Cmd + U` - Underline
  - `Ctrl/Cmd + Z` - Undo
  - `Ctrl/Cmd + Y` - Redo

### AI Integration
- **Smart Continuation**: Context-aware paragraph completion
- **Model Fallback Chain**: Automatic fallback to ensure reliability
- **Error Handling**: Graceful handling of API errors with retry logic
- **Streaming Animation**: Character-by-character typewriter effect
- **Dynamic Gradient**: Cursor-following gradient effect during AI writing

### User Experience
- **Loading States**: Clear visual feedback during AI generation
- **Error Messages**: User-friendly error messages with retry options
- **Smooth Animations**: Polished animations and transitions
- **Responsive Design**: Works across different screen sizes

## 🛠️ Technical Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **TypeScript** | 5.9.3 | Type safety |
| **XState** | 5.24.0 | State machine management |
| **ProseMirror** | 1.41.3 | Rich text editor framework |
| **Vite** | 7.2.4 | Build tool and dev server |
| **Google Gemini AI** | 0.24.1 | AI text generation |

## 📁 Project Structure

```
my-react-app/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── App.css                    # Application styles
│   ├── main.tsx                   # Application entry point
│   ├── index.css                  # Global styles
│   ├── components/
│   │   ├── ProseMirrorEditor.tsx  # ProseMirror editor component
│   │   └── FormattingToolbar.tsx  # Formatting toolbar component
│   ├── machines/
│   │   └── editorMachine.ts       # XState state machine
│   └── services/
│       └── aiService.ts           # Gemini AI integration service
├── public/                        # Static assets
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite configuration
└── .env                           # Environment variables (not in repo)
```

## 🏗️ Architecture

### Component Architecture

```
App.tsx
├── ProseMirrorEditor (via ref)
│   ├── FormattingToolbar
│   └── ProseMirror EditorView
└── Controls (Continue Writing button)
```

### State Management Flow

```
User Types → Content Updated → State Machine (idle)
                                    ↓
User Clicks "Continue Writing" → State Machine (loading)
                                    ↓
AI Service Called → Response Received → State Machine (idle)
                                    ↓
Content Streamed → Editor Updated → User Sees Result
```

### Key Design Decisions

1. **XState for State Management**
   - Explicit state transitions
   - Prevents invalid states
   - Easily testable
   - Clear state machine visualization

2. **ProseMirror Integration**
   - Professional-grade editor
   - Extensible architecture
   - High performance
   - Used by Notion, Linear, and other modern editors

3. **React Integration Pattern**
   - `forwardRef` + `useImperativeHandle` bridge
   - Maintains ProseMirror performance
   - Clean parent component API

4. **AI Service Design**
   - Model fallback chain for reliability
   - Exponential backoff retry logic
   - Comprehensive error handling
   - User-friendly error messages

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-react-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
   
   **Important**: Never commit your `.env` file to version control!

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in terminal)

### Building for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 📖 Usage

### Basic Usage

1. **Type some text** in the editor
2. **Click "Continue Writing"** to have AI complete your paragraph
3. **Watch the magic** as text streams in character-by-character
4. **Use formatting** via the toolbar or keyboard shortcuts

### API Methods

The editor exposes methods via ref:

```typescript
const editorRef = useRef<ProseMirrorEditorHandle>(null);

// Get current content
const content = editorRef.current?.getContent();

// Set content
editorRef.current?.setContent('New content');

// Append content
editorRef.current?.appendContent('Additional text');

// Stream content with animation
await editorRef.current?.streamContent('Text to stream');

// Focus editor
editorRef.current?.focus();
```

## 🔧 Key Components

### ProseMirrorEditor

The core editor component that wraps ProseMirror:

- **Schema**: Custom schema with underline and fontSize marks
- **Plugins**: History, placeholder, keyboard shortcuts
- **Streaming**: Character-by-character animation with variable delays
- **Cursor Tracking**: Real-time cursor position for gradient effect

### FormattingToolbar

Interactive toolbar that reflects editor state:

- **Active State Detection**: Shows which formatting is active
- **Toggle Functions**: Bold, italic, underline
- **Font Size Control**: Dropdown for size selection
- **Real-time Updates**: Syncs with editor selection

### Editor Machine (XState)

State machine managing editor state:

- **States**: `idle`, `loading`
- **Events**: `CONTINUE_WRITING`, `AI_RESPONSE`, `ERROR`, `CONTENT_UPDATED`
- **Guards**: Ensures content exists before AI generation

### AI Service

Gemini API integration with reliability features:

- **Model Fallback**: Tries multiple Gemini models
- **Retry Logic**: Exponential backoff for transient errors
- **Error Classification**: Distinguishes retryable vs permanent errors

## 🐛 Troubleshooting

### Common Issues

**"Gemini API key is not configured"**
- Ensure `.env` file exists in project root
- Verify variable name is exactly `VITE_GEMINI_API_KEY`
- Restart dev server after creating/updating `.env`

**"Invalid Gemini API key"**
- Check API key is correct (no extra spaces/quotes)
- Verify key is active in Google AI Studio
- Ensure key has proper permissions

**"API quota exceeded"**
- Check quota limits in Google AI Studio
- Wait before retrying
- Consider upgrading API plan

**Editor not responding**
- Check browser console for errors
- Verify all dependencies are installed
- Clear browser cache and reload

## 🎨 Customization

### Styling

Modify `App.css` to customize:
- Color scheme and gradients
- Animation timings
- Editor appearance
- Button styles

### Editor Configuration

Modify `ProseMirrorEditor.tsx` to:
- Add custom marks/nodes
- Change keyboard shortcuts
- Adjust streaming delays
- Modify placeholder behavior

### AI Service

Modify `aiService.ts` to:
- Change model preferences
- Adjust retry logic
- Modify prompt templates
- Change temperature settings

## 🚀 Future Enhancements

- [ ] **Streaming API**: Use Gemini's streaming API for real-time generation
- [ ] **More Formatting**: Lists, links, images, tables
- [ ] **Export Functionality**: PDF, Markdown, HTML export
- [ ] **User Preferences**: Model selection, temperature controls
- [ ] **Multi-language Support**: Internationalization
- [ ] **Collaboration**: Real-time collaboration features
- [ ] **History Management**: Document versioning
- [ ] **Templates**: Pre-built document templates

## 📝 Development Notes

### Code Quality

- ✅ Full TypeScript coverage
- ✅ ESLint configuration
- ✅ Clean code organization
- ✅ Comprehensive comments
- ✅ Performance optimizations

### Performance Optimizations

- **Debounced Updates**: Content changes debounced to 100ms
- **Memoized Plugins**: Plugins memoized to prevent recreation
- **Efficient Rendering**: Minimal re-renders with proper ref usage
- **Request Animation Frame**: Smooth cursor tracking updates

### Testing Considerations

The codebase is structured for easy testing:
- State machine can be tested independently
- Services are isolated and testable
- Components use dependency injection patterns
- Clear separation of concerns

## 📄 License

This project is part of a technical assessment for Chronicle.

## 👤 Author

Built as a demonstration of modern front-end engineering practices.

---

**Note**: This project requires a valid Gemini API key to function. See [SETUP.md](./SETUP.md) for detailed setup instructions.
