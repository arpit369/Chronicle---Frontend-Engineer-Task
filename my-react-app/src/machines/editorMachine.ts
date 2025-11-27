import { setup, assign } from 'xstate'; // XState utilities for creating state machines

// Interface defining the context (state data) that the state machine manages
export interface EditorContext {
  content: string; // Current text content in the editor
  isLoading: boolean; // Whether AI is currently generating content
  error: string | null; // Error message if something goes wrong (null when no error)
}

// Union type defining all possible events that can trigger state transitions
export type EditorEvent =
  | { type: 'CONTINUE_WRITING' } // User clicked "Continue Writing" button
  | { type: 'CONTENT_UPDATED'; content: string } // Editor content changed (user typing)
  | { type: 'AI_RESPONSE'; content: string } // AI successfully generated content
  | { type: 'ERROR'; error: string } // An error occurred during AI generation
  | { type: 'RESET' }; // Reset editor to initial state

// Create the state machine using XState setup (provides type safety and reusable guards)
export const editorMachine = setup({
  types: {
    context: {} as EditorContext, // Type definition for context
    events: {} as EditorEvent, // Type definition for events
  },
  guards: {
    // Guard function: only allow CONTINUE_WRITING if editor has content
    hasContent: ({ context }) => context.content.trim().length > 0, // Check if content exists (non-empty after trimming)
  },
}).createMachine({
  id: 'editor', // Unique identifier for this state machine
  initial: 'idle', // Starting state when machine is created
  context: {
    content: '', // Initial empty content
    isLoading: false, // Initially not loading
    error: null, // Initially no errors
  },
  states: {
    idle: { // Editor is ready, user can type or trigger AI generation
      on: {
        CONTINUE_WRITING: {
          guard: 'hasContent', // Only transition if content exists (prevents empty requests)
          target: 'loading', // Transition to loading state
        },
        CONTENT_UPDATED: {
          // Update content without changing state (user is typing)
          actions: assign({
            content: ({ event }) => event.content, // Update context with new content from event
          }),
        },
      },
    },
    loading: { // AI is generating content, button is disabled
      entry: assign({
        // Actions executed when entering this state
        isLoading: true, // Set loading flag to true
        error: null, // Clear any previous errors
      }),
      on: {
        AI_RESPONSE: {
          target: 'idle', // Return to idle state after successful response
          actions: assign({
            // Append AI-generated content to existing content with space separator
            content: ({ context, event }) => context.content + ' ' + event.content,
            isLoading: false, // Clear loading flag
          }),
        },
        ERROR: {
          target: 'idle', // Return to idle state even on error (allows retry)
          actions: assign({
            error: ({ event }) => event.error, // Store error message in context
            isLoading: false, // Clear loading flag
          }),
        },
        CONTENT_UPDATED: {
          // Allow content updates even during loading (user can still type)
          actions: assign({
            content: ({ event }) => event.content, // Update content from event
          }),
        },
      },
    },
  },
  on: {
    // Global event handlers (available in all states)
    RESET: {
      target: '.idle', // Reset to idle state (relative path - same machine)
      actions: assign({
        content: '', // Clear all content
        isLoading: false, // Clear loading flag
        error: null, // Clear error message
      }),
    },
  },
});

