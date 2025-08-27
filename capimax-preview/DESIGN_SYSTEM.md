# Real Estate Tokenization Platform - Design System

## Overview

This comprehensive design system serves as the visual DNA for our Real Estate Tokenization Platform. It ensures consistency, scalability, and premium aesthetics across all pages and components.

**Philosophy**: Minimal luxury inspired by Apple, Tesla, and Stripe, with our distinctive emerald/green brand identity.

---

## 🎨 Design Tokens

### Color Palette

Our emerald/green theme creates trust and sophistication while maintaining accessibility.

```typescript
import { designTokens } from '@/components/design-system';

// Primary Colors (Emerald/Green Theme)
designTokens.colors.primary[500] // #10b981 - Main emerald
designTokens.colors.primary[600] // #059669 - Primary dark

// Secondary Colors (Navy/Slate for sophistication)
designTokens.colors.secondary[500] // #64748b - Main secondary

// Usage in components
className="text-emerald-500 dark:text-emerald-400"
```

### Typography Scale

Professional, clean typography hierarchy using Inter font family.

```typescript
// Font sizes follow a modular scale
designTokens.typography.fontSize['4xl'] // 36px - Main headlines
designTokens.typography.fontSize['2xl'] // 24px - Section titles
designTokens.typography.fontSize.lg     // 18px - Large body text
```

### Spacing System

Consistent 4px-based spacing grid for perfect visual rhythm.

```typescript
designTokens.spacing[4]  // 16px - Standard spacing unit
designTokens.spacing[8]  // 32px - Section spacing
designTokens.spacing[16] // 64px - Large section gaps
```

---

## 📝 Typography Components

### Heading Component

Semantic heading structure with consistent sizing and theming.

```tsx
import { Heading } from '@/components/design-system';

// Usage examples
<Heading level="h1" size="6xl" gradient>
  Platform Headlines
</Heading>

<Heading level="h2" size="4xl" color="primary">
  Section Titles
</Heading>
```

**Props:**
- `level`: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
- `size`: '7xl' | '6xl' | '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'base'
- `color`: 'primary' | 'secondary' | 'accent' | 'gradient'
- `align`: 'left' | 'center' | 'right'
- `gradient`: boolean - Applies emerald gradient effect

### Text Component

Flexible text rendering with semantic variants.

```tsx
import { Text } from '@/components/design-system';

<Text variant="body" color="tertiary">
  Standard paragraph text
</Text>

<Text variant="label" weight="semibold">
  Form labels and UI text
</Text>
```

**Props:**
- `variant`: 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label' | 'overline'
- `weight`: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
- `color`: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'success' | 'warning' | 'error' | 'accent'

---

## 🔘 Button System

Unified button system with emerald theme and consistent interactions.

```tsx
import { Button } from '@/components/design-system';

// Primary actions - emerald gradient
<Button variant="primary" size="lg">
  Start Investing
</Button>

// Secondary actions - subtle navy background
<Button variant="secondary" size="md">
  Learn More
</Button>

// Ghost actions - transparent with emerald accents
<Button variant="ghost" size="sm">
  Cancel
</Button>
```

**Variants:**
- **Primary**: Emerald gradient, white text, prominent shadows
- **Secondary**: Navy background, subtle styling for less important actions
- **Ghost**: Transparent with emerald hover effects

**States**: All variants include hover, active, disabled, and loading states with smooth transitions.

---

## 📝 Form Components

### Input Component

Sophisticated input fields with consistent styling and states.

```tsx
import { Input } from '@/components/design-system';

<Input
  label="Investment Amount"
  placeholder="Enter amount..."
  helperText="Minimum $1,000 investment"
  leftIcon={<DollarSign />}
  state="success"
/>
```

**Features:**
- Emerald focus states
- Built-in validation styling
- Icon support (left/right)
- Password toggle functionality
- Helper text and error messages

### Select Component

Styled dropdown with consistent theming.

```tsx
import { Select, SelectOption } from '@/components/design-system';

const propertyTypes: SelectOption[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hospitality', label: 'Hospitality' }
];

<Select
  label="Property Type"
  options={propertyTypes}
  placeholder="Choose property type..."
/>
```

### Checkbox & Toggle

Emerald-themed form controls with smooth animations.

```tsx
import { Checkbox, Toggle } from '@/components/design-system';

<Checkbox 
  label="I agree to the terms and conditions"
  description="Required for platform access"
/>

<Toggle 
  label="Dark Mode"
  description="Toggle between light and dark themes"
/>
```

---

## 🃏 Card Components

### Card Component

Flexible container with multiple variants and interaction states.

```tsx
import { Card } from '@/components/design-system';

<Card 
  variant="elevated" 
  interactive 
  hover 
  borderAccent
>
  Card content here
</Card>
```

**Variants:**
- **Default**: Basic white/dark background with border
- **Elevated**: Enhanced shadows for hierarchy
- **Glass**: Backdrop blur effect for modern aesthetics
- **Filled**: Subtle background tint

### PropertyCard Component

Specialized card for property listings with consistent layout.

```tsx
import { PropertyCard } from '@/components/design-system';

<PropertyCard
  title="Manhattan Elite Tower"
  location="New York, NY"
  price="$12.85M"
  tokenPrice="$1,000"
  expectedReturn="14.8%"
  featured={true}
  onInvestClick={() => {}}
/>
```

### StatsCard Component

Display metrics with optional icons and animations.

```tsx
import { StatsCard } from '@/components/design-system';
import { TrendingUp } from 'lucide-react';

<StatsCard
  title="Total Returns"
  value="22.4%"
  change="+2.1% this month"
  changeType="positive"
  icon={TrendingUp}
  variant="accent"
  animated
/>
```

---

## 📱 Layout Components

### Container Component

Responsive container with consistent max-widths and padding.

```tsx
import { Container } from '@/components/design-system';

<Container size="xl" padding="lg">
  Page content here
</Container>
```

**Sizes:**
- `sm`: max-width 640px
- `md`: max-width 768px  
- `lg`: max-width 1024px
- `xl`: max-width 1280px (default)
- `2xl`: max-width 1536px
- `full`: 100% width

### Grid Component

Responsive CSS Grid with consistent gaps and breakpoints.

```tsx
import { Grid } from '@/components/design-system';

<Grid 
  cols={3} 
  gap="lg"
  responsive={{ sm: 1, md: 2, lg: 3 }}
>
  <PropertyCard />
  <PropertyCard />
  <PropertyCard />
</Grid>
```

### Stack Component

Flexbox-based spacing component for consistent layouts.

```tsx
import { Stack } from '@/components/design-system';

<Stack direction="column" spacing="xl" align="center">
  <Heading>Title</Heading>
  <Text>Description</Text>
  <Button>Action</Button>
</Stack>
```

---

## 🗂️ Section Components

### Section Component

Page section wrapper with consistent spacing and background options.

```tsx
import { Section } from '@/components/design-system';

<Section 
  variant="gradient" 
  size="lg" 
  backgroundElements
  animated
>
  Section content
</Section>
```

### SectionHeader Component

Standardized section headers with badges and descriptions.

```tsx
import { SectionHeader } from '@/components/design-system';
import { Sparkles } from 'lucide-react';

<SectionHeader
  badge="Premium Opportunities"
  badgeIcon={Sparkles}
  title="Featured Properties"
  description="Carefully vetted real estate with verified returns"
  gradient
/>
```

### CallToAction Component

Flexible CTA sections with multiple layouts and styles.

```tsx
import { CallToAction } from '@/components/design-system';

<CallToAction
  variant="gradient"
  title="Start Your Investment Journey"
  description="Join thousands of investors building wealth through real estate"
  actions={[
    { label: 'Get Started', variant: 'primary' },
    { label: 'Learn More', variant: 'ghost' }
  ]}
/>
```

---

## 🎯 Visual Elements

### Icon Component

Consistent icon sizing and theming.

```tsx
import { Icon } from '@/components/design-system';
import { Home } from 'lucide-react';

<Icon icon={Home} size="lg" variant="solid" />
```

### Badge Component

Status indicators and labels with semantic variants.

```tsx
import { Badge } from '@/components/design-system';

<Badge variant="success" dot>
  Active Investment
</Badge>
```

### Avatar Component

User profile pictures with elegant fallbacks.

```tsx
import { Avatar } from '@/components/design-system';

<Avatar 
  src="/user-avatar.jpg" 
  alt="John Doe" 
  size="lg" 
  fallback="John Doe"
/>
```

---

## 🌓 Dark Mode Support

Every component automatically supports light and dark modes through our design tokens:

```tsx
// Colors automatically adapt
className="text-slate-900 dark:text-white"
className="bg-white dark:bg-slate-900"

// Emerald theme works in both modes
className="text-emerald-500 dark:text-emerald-400"
className="border-emerald-200 dark:border-emerald-800"
```

---

## 🚀 Usage Guidelines

### Component Hierarchy

1. **Page Level**: Use `Section` components with `Container`
2. **Layout**: Use `Grid` and `Stack` for consistent spacing
3. **Content**: Use `Card` variants for content grouping
4. **Text**: Always use `Heading` and `Text` components
5. **Actions**: Standardize on `Button` component variants

### Best Practices

**✅ Do:**
- Use design tokens for consistent spacing and colors
- Implement proper semantic HTML with our components
- Leverage the emerald theme for brand consistency
- Use animation props for smooth interactions

**❌ Don't:**
- Mix custom colors outside the design system
- Use arbitrary spacing values
- Override component styles heavily
- Ignore responsive design patterns

### Example Page Structure

```tsx
import { 
  Section, 
  Container, 
  SectionHeader, 
  Grid, 
  PropertyCard,
  CallToAction,
  Button 
} from '@/components/design-system';

export function PropertiesPage() {
  return (
    <>
      {/* Hero Section */}
      <Section variant="gradient" size="xl" backgroundElements>
        <Container>
          <SectionHeader
            badge="Investment Opportunities"
            title="Premium Real Estate Portfolio"
            description="Explore verified properties with institutional-grade due diligence"
            align="center"
            gradient
          />
        </Container>
      </Section>

      {/* Properties Grid */}
      <Section size="lg">
        <Container>
          <Grid cols={3} gap="lg" responsive={{ sm: 1, md: 2, lg: 3 }}>
            <PropertyCard {...propertyData} />
            <PropertyCard {...propertyData} />
            <PropertyCard {...propertyData} />
          </Grid>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section variant="accent">
        <Container>
          <CallToAction
            title="Ready to Start Investing?"
            description="Join our platform and access exclusive real estate opportunities"
            actions={[
              { label: 'Create Account', variant: 'primary' },
              { label: 'Learn More', variant: 'ghost' }
            ]}
          />
        </Container>
      </Section>
    </>
  );
}
```

---

## 🔧 Technical Implementation

### Import Structure

```typescript
// Import everything from design system
import { 
  Button, 
  Card, 
  Heading, 
  Text,
  designTokens 
} from '@/components/design-system';

// Or import specific categories
import { Heading, Text } from '@/components/design-system/typography';
import { Button } from '@/components/design-system';
```

### TypeScript Support

All components include comprehensive TypeScript definitions with proper prop types and IntelliSense support.

### Animation Integration

Components use Framer Motion for smooth animations:

```tsx
// Most components include animation props
<Card interactive hover animated />
<SectionHeader animated />
<StatsCard animated />
```

---

## 🎯 Future Expansion

This design system is built for scalability:

1. **New Components**: Follow the established patterns for consistency
2. **Color Themes**: Extend the emerald theme while maintaining accessibility
3. **Responsive Patterns**: Use existing breakpoint system
4. **Animation Library**: Build on Framer Motion foundations

The design system ensures every new page (About, Contact, Dashboard, Blog, etc.) will automatically feel cohesive and premium while maintaining our distinctive emerald/green brand identity.

---

**Built with ❤️ for the Real Estate Tokenization Platform**