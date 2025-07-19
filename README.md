# 🎬 BrightStage AI - Automated Webinar Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.4-646CFF.svg)](https://vitejs.dev/)

> **Transform basic inputs into complete professional webinars with AI-powered content generation, slide creation, and voiced video output.**

## 🚀 Overview

BrightStage AI is an automated webinar presentation generator that transforms basic inputs into complete, professional webinars. The platform includes structured content generation, slide creation, pitch materials, and voiced video output that simulates real webinar presentations.

### ✨ Key Features

- **🤖 AI-Powered Content Generation** - Multiple AI providers (OpenAI, Claude, Gemini, xAI)
- **🎨 Template-Based Slide Creation** - Professional templates with visual assets
- **🎙️ Text-to-Speech Integration** - Multiple voice options including voice cloning
- **🎥 Automated Video Assembly** - Slide synchronization with narration
- **💳 Token-Based Usage System** - Stripe integration for seamless payments
- **📊 Real-time Progress Tracking** - Auto-save and version history
- **📤 Multi-Format Export** - MP4, PPTX, PDF outputs
- **👥 Admin Panel** - User and content management
- **📱 Responsive Design** - Works on all devices

## 🛠️ Tech Stack

- **Frontend**: React 19.1.0 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI Integration**: OpenAI, Anthropic Claude, Google Gemini, xAI Grok
- **TTS Services**: ElevenLabs, Google Cloud TTS, Azure TTS, AWS Polly
- **Payments**: Stripe
- **Video Processing**: FFmpeg
- **State Management**: React Hooks + Context
- **Routing**: React Router DOM

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- AI service API keys (OpenAI, Claude, etc.)
- TTS service API keys (ElevenLabs, etc.)
- Stripe account for payments

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/blink-new/brightstage-ai-webinar-generator-tdbfm6bb.git
   cd brightstage-ai-webinar-generator-tdbfm6bb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create `.env.local` file:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # AI Service API Keys (Server-side only)
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_claude_key
   GOOGLE_AI_API_KEY=your_gemini_key
   XAI_API_KEY=your_xai_key
   
   # TTS Service API Keys
   ELEVENLABS_API_KEY=your_elevenlabs_key
   GOOGLE_CLOUD_TTS_KEY=your_google_tts_key
   
   # Stripe Configuration
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

4. **Database Setup**
   
   Run the SQL migrations in your Supabase dashboard:
   ```sql
   -- See /supabase/migrations/ for complete schema
   -- Tables: users, webinar_projects, tokens, ai_generations, etc.
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### 1. Content Input & Generation
- Enter webinar topic and target audience
- Set duration (30-120 minutes)
- Select preferred AI tool for content generation
- Use "Enhance" button to improve input descriptions
- Generate structured webinar outline

### 2. Slide & Visual Creation
- Review and edit content outline
- Select from curated template gallery
- Generate slides with AI-suggested visuals
- Download/upload slides for external editing

### 3. Voice & Video Generation
- Select voice style and TTS provider
- Customize narration script
- Generate voiced webinar video
- Preview clips before full generation

### 4. Export & Sharing
- Generate condensed pitch videos
- Export in multiple formats
- Share via links or download files

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── steps/           # Webinar creation steps
│   ├── Dashboard.tsx    # Main dashboard
│   ├── WebinarCreator.tsx
│   └── AdminPanel.tsx
├── hooks/               # Custom React hooks
├── services/            # API service layers
├── utils/               # Utility functions
├── types/               # TypeScript definitions
└── blink/              # Blink SDK integration
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:css     # Run Stylelint
```

### Code Quality

- **ESLint**: Comprehensive linting with TypeScript, React, and security rules
- **Stylelint**: CSS/SCSS linting with standard configuration
- **TypeScript**: Strict type checking enabled
- **Prettier**: Code formatting (configured in ESLint)

### Testing

```bash
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:coverage # Generate coverage report
```

## 🔐 Security

- **API Key Management**: Server-side only, never exposed to frontend
- **Authentication**: Supabase Auth with JWT tokens
- **Data Validation**: Zod schemas for all inputs
- **CORS Configuration**: Properly configured for production
- **Rate Limiting**: Implemented for AI API calls
- **Input Sanitization**: XSS protection on all user inputs

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables (Production)

Ensure all environment variables are set in your production environment:
- Supabase credentials
- AI service API keys
- TTS service keys
- Stripe configuration
- Security keys and secrets

### Hosting Options

- **Vercel**: Recommended for React apps
- **Netlify**: Alternative hosting option
- **AWS S3 + CloudFront**: For custom deployments
- **Docker**: Container deployment ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation for API changes
- Follow the existing code style
- Ensure all linting passes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full API Documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/blink-new/brightstage-ai-webinar-generator-tdbfm6bb/issues)
- **Discussions**: [GitHub Discussions](https://github.com/blink-new/brightstage-ai-webinar-generator-tdbfm6bb/discussions)
- **Email**: support@brightstage.ai

## 🙏 Acknowledgments

- [Blink](https://blink.new) - AI-powered development platform
- [Supabase](https://supabase.com) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com) - UI component library
- [Lucide](https://lucide.dev) - Icon library
- [Tailwind CSS](https://tailwindcss.com) - Styling framework

---

**Built with ❤️ using [Blink AI](https://blink.new)**