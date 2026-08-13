# Prompt Builder Standalone

A standalone React web application for prompt engineering and benchmarking that connects to the AI Studio Maxy Chat LLM backend proxy.

## Features
- **Prompt Engineering Frameworks**: Role-Task-Format (RTF), Role-Context-Task-Format (RCTF), Chain of Thought (CHAIN), and custom user-defined frameworks.
- **Model Support**: Utilizes models configured from the main backend (e.g. Gemini 2.5 Flash, Gemini 2.0 Flash, custom OpenAI-compatible models).
- **A/B Testing & Metrics**: Side-by-side comparison of naive vs enhanced prompts with latency and token metrics.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Backend URL
By default, the development server proxies API requests to `http://localhost:3000`. You can customize the backend location by creating a `.env` file:
```env
VITE_BACKEND_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

### 4. Production Build
```bash
npm run build
```
The output will be generated in the `dist/` directory, ready to be hosted as a standalone static site.
