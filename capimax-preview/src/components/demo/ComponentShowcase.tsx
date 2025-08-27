import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../design-system/cards/Card';
import { Button } from '../ui/Button';
import { Badge } from '../design-system/icons/Badge';
import { Input } from '../design-system/forms/Input';
import { Checkbox } from '../design-system/forms/Checkbox';
import { Toggle } from '../design-system/forms/Toggle';
import { Select } from '../design-system/forms/Select';
import { PropertyCard } from '../design-system/cards/PropertyCard';
import { StatsCard } from '../design-system/cards/StatsCard';
import { Heading } from '../design-system/typography/Heading';
import { Text } from '../design-system/typography/Text';

// Mock data for component examples
const sampleProperty = {
  id: '1',
  title: 'Downtown Luxury Apartment',
  location: 'Manhattan, NYC',
  image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
  totalValue: 2500000,
  tokenPrice: 1000,
  tokensAvailable: 500,
  expectedReturn: 8.5,
  rating: 4.8
};

interface ComponentDemoProps {
  title: string;
  description: string;
  children: React.ReactNode;
  code?: string;
  category: string;
}

const ComponentDemo: React.FC<ComponentDemoProps> = ({ 
  title, 
  description, 
  children, 
  code,
  category 
}) => {
  const [showCode, setShowCode] = useState(false);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <Badge variant="outline" size="sm">
              {category}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
        {code && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="ml-4"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </Button>
        )}
      </div>

      {/* Component Preview */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4 bg-slate-50 dark:bg-slate-800/30">
        <div className="flex flex-wrap gap-4 items-center justify-center min-h-[100px]">
          {children}
        </div>
      </div>

      {/* Code Display */}
      <AnimatePresence>
        {showCode && code && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto"
          >
            <pre className="text-sm text-green-400">
              <code>{code}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export const ComponentShowcase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = [
    { id: 'all', name: 'All Components', count: 24 },
    { id: 'buttons', name: 'Buttons', count: 4 },
    { id: 'forms', name: 'Form Elements', count: 6 },
    { id: 'cards', name: 'Cards', count: 5 },
    { id: 'typography', name: 'Typography', count: 4 },
    { id: 'badges', name: 'Badges', count: 3 },
    { id: 'layout', name: 'Layout', count: 2 }
  ];

  const components = [
    {
      id: 'button-primary',
      title: 'Primary Button',
      description: 'Main action button with emerald theme',
      category: 'buttons',
      component: <Button variant="primary">Primary Action</Button>,
      code: `<Button variant="primary">Primary Action</Button>`
    },
    {
      id: 'button-outline',
      title: 'Outline Button',
      description: 'Secondary action button with border style',
      category: 'buttons',
      component: <Button variant="outline">Secondary Action</Button>,
      code: `<Button variant="outline">Secondary Action</Button>`
    },
    {
      id: 'button-ghost',
      title: 'Ghost Button',
      description: 'Subtle button for tertiary actions',
      category: 'buttons',
      component: <Button variant="ghost">Tertiary Action</Button>,
      code: `<Button variant="ghost">Tertiary Action</Button>`
    },
    {
      id: 'button-sizes',
      title: 'Button Sizes',
      description: 'Different button sizes for various use cases',
      category: 'buttons',
      component: (
        <div className="flex items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      ),
      code: `<Button size="sm">Small</Button>\n<Button size="md">Medium</Button>\n<Button size="lg">Large</Button>`
    },
    {
      id: 'input-basic',
      title: 'Text Input',
      description: 'Standard text input with validation states',
      category: 'forms',
      component: (
        <div className="w-full max-w-sm">
          <Input placeholder="Enter your email" />
        </div>
      ),
      code: `<Input placeholder="Enter your email" />`
    },
    {
      id: 'input-error',
      title: 'Input with Error',
      description: 'Input field showing error state',
      category: 'forms',
      component: (
        <div className="w-full max-w-sm">
          <Input 
            placeholder="Enter password" 
            type="password"
            error="Password must be at least 8 characters"
          />
        </div>
      ),
      code: `<Input \n  placeholder="Enter password" \n  type="password"\n  error="Password must be at least 8 characters"\n/>`
    },
    {
      id: 'select-basic',
      title: 'Select Dropdown',
      description: 'Dropdown selection component',
      category: 'forms',
      component: (
        <div className="w-full max-w-sm">
          <Select
            options={[
              { value: 'usa', label: 'United States' },
              { value: 'uk', label: 'United Kingdom' },
              { value: 'canada', label: 'Canada' },
              { value: 'australia', label: 'Australia' }
            ]}
            placeholder="Select country"
            onChange={() => {}}
          />
        </div>
      ),
      code: `<Select\n  options={[\n    { value: 'usa', label: 'United States' },\n    { value: 'uk', label: 'United Kingdom' }\n  ]}\n  placeholder="Select country"\n/>`
    },
    {
      id: 'checkbox',
      title: 'Checkbox',
      description: 'Checkbox input with custom styling',
      category: 'forms',
      component: (
        <div className="space-y-2">
          <Checkbox id="terms" label="I agree to the terms and conditions" />
          <Checkbox id="newsletter" label="Subscribe to newsletter" checked />
        </div>
      ),
      code: `<Checkbox id="terms" label="I agree to the terms and conditions" />\n<Checkbox id="newsletter" label="Subscribe to newsletter" checked />`
    },
    {
      id: 'toggle',
      title: 'Toggle Switch',
      description: 'Toggle switch for boolean settings',
      category: 'forms',
      component: (
        <div className="space-y-2">
          <Toggle label="Enable notifications" />
          <Toggle label="Dark mode" checked />
        </div>
      ),
      code: `<Toggle label="Enable notifications" />\n<Toggle label="Dark mode" checked />`
    },
    {
      id: 'property-card',
      title: 'Property Card',
      description: 'Card component for property listings',
      category: 'cards',
      component: (
        <div className="w-full max-w-sm">
          <PropertyCard property={sampleProperty} />
        </div>
      ),
      code: `<PropertyCard property={{\n  title: 'Downtown Luxury Apartment',\n  location: 'Manhattan, NYC',\n  totalValue: 2500000,\n  tokenPrice: 1000,\n  expectedReturn: 8.5\n}} />`
    },
    {
      id: 'stats-card',
      title: 'Stats Card',
      description: 'Card for displaying key metrics',
      category: 'cards',
      component: (
        <StatsCard
          title="Total Investment"
          value="$125,000"
          change="+12.5%"
          trend="up"
        />
      ),
      code: `<StatsCard\n  title="Total Investment"\n  value="$125,000"\n  change="+12.5%"\n  trend="up"\n/>`
    },
    {
      id: 'basic-card',
      title: 'Basic Card',
      description: 'Simple card container component',
      category: 'cards',
      component: (
        <Card className="p-6 w-full max-w-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Card Title
          </h3>
          <p className="text-slate-600 dark:text-slate-300">
            This is a basic card component with some sample content.
          </p>
        </Card>
      ),
      code: `<Card className="p-6">\n  <h3>Card Title</h3>\n  <p>Card content goes here</p>\n</Card>`
    },
    {
      id: 'headings',
      title: 'Headings',
      description: 'Typography scale for headings',
      category: 'typography',
      component: (
        <div className="space-y-2">
          <Heading level="h1" size="4xl">Heading 1</Heading>
          <Heading level="h2" size="3xl">Heading 2</Heading>
          <Heading level="h3" size="2xl">Heading 3</Heading>
          <Heading level="h4" size="xl">Heading 4</Heading>
        </div>
      ),
      code: `<Heading level="h1" size="4xl">Heading 1</Heading>\n<Heading level="h2" size="3xl">Heading 2</Heading>`
    },
    {
      id: 'text-variants',
      title: 'Text Variants',
      description: 'Different text styles and sizes',
      category: 'typography',
      component: (
        <div className="space-y-2">
          <Text size="lg" weight="bold">Large Bold Text</Text>
          <Text size="md" color="slate">Regular Text</Text>
          <Text size="sm" color="muted">Small Muted Text</Text>
        </div>
      ),
      code: `<Text size="lg" weight="bold">Large Bold Text</Text>\n<Text size="md" color="slate">Regular Text</Text>`
    },
    {
      id: 'badge-variants',
      title: 'Badge Variants',
      description: 'Status indicators and labels',
      category: 'badges',
      component: (
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="primary">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      ),
      code: `<Badge variant="success">Success</Badge>\n<Badge variant="warning">Warning</Badge>`
    },
    {
      id: 'badge-sizes',
      title: 'Badge Sizes',
      description: 'Different badge sizes',
      category: 'badges',
      component: (
        <div className="flex items-center gap-2">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      ),
      code: `<Badge size="sm">Small</Badge>\n<Badge size="md">Medium</Badge>`
    }
  ];

  const filteredComponents = components.filter(component => {
    const matchesCategory = activeCategory === 'all' || component.category === activeCategory;
    const matchesSearch = component.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          Component Showcase
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Interactive examples of all the reusable components built for the platform.
          Each component includes live previews and code examples.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className="whitespace-nowrap"
            >
              {category.name} ({category.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Component Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredComponents.map((component) => (
            <motion.div
              key={component.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ComponentDemo
                title={component.title}
                description={component.description}
                category={component.category}
                code={component.code}
              >
                {component.component}
              </ComponentDemo>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No components found
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Component Stats */}
      <Card className="p-8 text-center">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
          Component Library Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-3xl font-bold text-emerald-600 mb-2">{components.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Components</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">{categories.length - 1}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Categories</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-2">100%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">TypeScript</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600 mb-2">95%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Reusable</div>
          </div>
        </div>
      </Card>
    </div>
  );
};