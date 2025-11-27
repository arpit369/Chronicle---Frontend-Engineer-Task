# Setup Guide - Gemini API Integration

## Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy the generated API key

## Step 2: Configure Environment Variables

1. Create a `.env` file in the root directory of the project (`my-react-app/.env`)
2. Add the following line with your actual API key:

```
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Example:**
```
VITE_GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Restart Development Server

After creating/updating the `.env` file:

1. Stop the development server (if running) by pressing `Ctrl+C`
2. Start it again with `npm run dev`
3. The application will now use your Gemini API key

## Step 4: Test the Integration

1. Type some text in the editor
2. Click "Continue Writing"
3. Gemini AI will complete your paragraph based on the context

## Troubleshooting

### Error: "Gemini API key is not configured"
- Make sure you created a `.env` file (not `.env.example`)
- Verify the variable name is exactly `VITE_GEMINI_API_KEY`
- Restart the development server after creating/updating `.env`

### Error: "Invalid Gemini API key"
- Verify your API key is correct
- Make sure there are no extra spaces or quotes around the key
- Check that your API key is active in Google AI Studio

### Error: "API quota exceeded"
- You may have reached your API usage limit
- Check your quota in Google AI Studio
- Wait a bit and try again

## Security Note

⚠️ **Never commit your `.env` file to version control!** It's already added to `.gitignore` to protect your API key.


