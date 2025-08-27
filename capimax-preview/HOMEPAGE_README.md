# TokenEstate - Real Estate Tokenization Platform Homepage

A modern, professional homepage for a real estate tokenization platform built with React, TypeScript, TailwindCSS, and Framer Motion.

## 🚀 Live Demo

The development server is running at: `http://localhost:5173`

## ✨ Features

### Core Functionality
- **Responsive Design**: Fully responsive layout that works seamlessly across desktop, tablet, and mobile devices
- **Dark/Light Mode**: Complete theme switching with persistent user preference
- **Smooth Animations**: Professional animations and micro-interactions using Framer Motion
- **Modern UI Components**: Reusable components built with accessibility in mind

### Page Sections

1. **Hero Section**
   - Compelling headline with gradient text effects
   - Professional background image from Unsplash
   - Call-to-action buttons with hover animations
   - Statistics showcase with animated counters
   - Scroll indicator animation

2. **How It Works** 
   - 4-step process explanation with icons
   - Step-by-step visual flow
   - Hover effects and animated progress indicators
   - Clean, minimal design

3. **Featured Properties**
   - Property cards with high-quality images
   - Investment metrics (price, tokens, expected returns)
   - Progress bars showing funding status
   - Hover animations and interactive elements

4. **Why Choose Us**
   - Benefits and features grid layout
   - Gradient icon backgrounds
   - Statistics section with impressive numbers
   - Professional feature explanations

5. **Navigation & Layout**
   - Fixed navbar with smooth scroll navigation
   - Mobile-responsive hamburger menu
   - Professional footer with links and newsletter signup
   - Logo with brand identity

## 🛠 Technical Stack

### Frontend Framework
- **React 18** - Latest React with hooks and functional components
- **TypeScript** - Full type safety and better developer experience
- **Vite** - Fast build tool and development server

### Styling & Design
- **TailwindCSS** - Utility-first CSS framework with custom configuration
- **Framer Motion** - Advanced animation library for smooth interactions
- **Lucide React** - Modern icon library
- **Inter Font** - Professional typography from Google Fonts

### Key Libraries
- `framer-motion` - Animation and gesture library
- `lucide-react` - Icon components
- `react` & `react-dom` - Core React libraries

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.tsx         # Custom button with variants
│   │   ├── Card.tsx           # Reusable card component
│   │   └── ThemeToggle.tsx    # Dark/light mode toggle
│   ├── layout/                # Layout components
│   │   ├── Navbar.tsx         # Navigation header
│   │   └── Footer.tsx         # Site footer
│   ├── sections/              # Page sections
│   │   ├── HeroSection.tsx    # Hero banner
│   │   ├── HowItWorks.tsx     # Process explanation
│   │   ├── FeaturedProperties.tsx # Property showcase
│   │   └── WhyChooseUs.tsx    # Benefits section
│   └── HomePage.tsx           # Main page component
├── contexts/
│   └── ThemeContext.tsx       # Theme management
├── utils/
│   └── cn.ts                  # Class name utility
└── App.tsx                    # Root application
```

## 🎨 Design Features

### Color Scheme
- **Primary**: Blue gradient (`from-blue-600 to-purple-600`)
- **Background**: Clean whites with dark mode variants
- **Text**: Proper contrast ratios for accessibility
- **Accents**: Gradient overlays and professional shadows

### Typography
- **Font Family**: Inter (Google Fonts)
- **Font Weights**: 300-900 range for various text styles
- **Responsive**: Fluid typography that scales properly

### Animations
- **Entrance Animations**: Smooth fade-ins and slide-ups
- **Hover Effects**: Scale and transform animations
- **Scroll Animations**: Viewport-triggered animations
- **Loading States**: Smooth transitions and spinners

## 🔧 Component Features

### Button Component
- Multiple variants: `primary`, `secondary`, `outline`, `ghost`
- Different sizes: `sm`, `md`, `lg`
- Loading states with spinner animation
- Full TypeScript typing

### Card Component
- Configurable padding and hover effects
- Dark mode support
- Animation on scroll
- Flexible content layout

### Theme System
- Context-based theme management
- Persistent theme preference
- Smooth theme transitions
- System preference detection

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px - Stacked layouts, hamburger menu
- **Tablet**: 768px - 1024px - Grid adjustments, simplified navigation
- **Desktop**: > 1024px - Full layout with all features

### Mobile Optimizations
- Touch-friendly button sizes
- Optimized images and loading
- Simplified navigation patterns
- Readable text sizes

## 🖼 Image Assets

All images are sourced from Unsplash with professional real estate and cityscape themes:
- Hero background: Modern city skyline
- Property images: High-quality real estate photos
- Optimized for web performance

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Preview Production Build**:
   ```bash
   npm run preview
   ```

## 🔮 Future Enhancements

- Integration with Web3 wallet connections
- Real property data API integration  
- User authentication and profiles
- Investment tracking dashboard
- Multi-language support
- Advanced property filtering
- Real-time market data

## 📄 License

This project is part of a real estate tokenization platform development.

---

**Built with ❤️ using modern web technologies for the future of real estate investment.**