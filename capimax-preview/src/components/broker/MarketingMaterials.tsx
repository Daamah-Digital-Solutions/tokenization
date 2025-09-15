import React, { useState } from 'react';
import { Button } from '../ui/Button';

export interface MarketingMaterial {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'image' | 'presentation' | 'template' | 'link';
  category: 'general' | 'property_specific' | 'education' | 'compliance' | 'social_media' | 'email';
  fileSize?: string;
  duration?: string;
  downloadUrl: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadCount: number;
  lastUpdated: string;
  tags: string[];
  isNew?: boolean;
  requiresCustomization?: boolean;
  targetAudience: string[];
  language: string;
  format?: string;
}

interface MarketingMaterialsProps {
  materials: MarketingMaterial[];
  onDownload: (materialId: string) => void;
  onPreview: (materialId: string) => void;
  onShare: (materialId: string) => void;
  onRequestMaterial: (description: string, category: string) => void;
  onCustomize?: (materialId: string) => void;
  className?: string;
}

export const MarketingMaterials: React.FC<MarketingMaterialsProps> = ({
  materials,
  onDownload,
  onPreview,
  onShare,
  onRequestMaterial,
  onCustomize,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [requestCategory, setRequestCategory] = useState('general');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'video': return '🎥';
      case 'image': return '🖼️';
      case 'presentation': return '📊';
      case 'template': return '📝';
      case 'link': return '🔗';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'general': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'property_specific': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'education': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'compliance': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'social_media': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      case 'email': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
    const matchesType = selectedType === 'all' || material.type === selectedType;
    const matchesSearch = searchTerm === '' || 
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesType && matchesSearch;
  });

  const categories = Array.from(new Set(materials.map(m => m.category)));
  const types = Array.from(new Set(materials.map(m => m.type)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleRequestSubmit = () => {
    if (requestDescription.trim()) {
      onRequestMaterial(requestDescription, requestCategory);
      setRequestDescription('');
      setShowRequestModal(false);
    }
  };

  const popularMaterials = materials
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 5);

  const recentMaterials = materials
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 3);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Marketing Materials
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              Download and share professional sales materials
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRequestModal(true)}
            >
              Request Material
            </Button>
            <div className="flex rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {materials.length}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">Total Materials</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {materials.filter(m => m.isNew).length}
            </div>
            <div className="text-sm text-green-800 dark:text-green-300">New This Week</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              {materials.reduce((sum, m) => sum + m.downloadCount, 0)}
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-300">Total Downloads</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              {categories.length}
            </div>
            <div className="text-sm text-orange-800 dark:text-orange-300">Categories</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').charAt(0).toUpperCase() + cat.replace('_', ' ').slice(1)}
              </option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Popular & Recent Materials */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Materials */}
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
              Most Downloaded
            </h3>
            <div className="space-y-2">
              {popularMaterials.slice(0, 3).map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getTypeIcon(material.type)}</span>
                    <div>
                      <div className="font-medium text-sm text-neutral-900 dark:text-slate-100">
                        {material.title}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-slate-400">
                        {material.downloadCount} downloads
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onDownload(material.id)}>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Materials */}
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
              Recently Added
            </h3>
            <div className="space-y-2">
              {recentMaterials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getTypeIcon(material.type)}</span>
                    <div>
                      <div className="font-medium text-sm text-neutral-900 dark:text-slate-100">
                        {material.title}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-slate-400">
                        Added {formatDate(material.lastUpdated)}
                      </div>
                    </div>
                    {material.isNew && (
                      <span className="px-1 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded">
                        New
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onDownload(material.id)}>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid/List */}
      <div className="p-6">
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📄</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              No Materials Found
            </h3>
            <p className="text-neutral-600 dark:text-slate-400 mb-4">
              Try adjusting your filters or search terms
            </p>
            <Button variant="primary" onClick={() => setShowRequestModal(true)}>
              Request Custom Material
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="border border-neutral-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Preview/Thumbnail */}
                <div className="relative h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
                  <span className="text-4xl">{getTypeIcon(material.type)}</span>
                  {material.isNew && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                      New
                    </div>
                  )}
                  {material.requiresCustomization && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                      Customizable
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-neutral-900 dark:text-slate-100 text-sm">
                      {material.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(material.category)}`}>
                      {material.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {material.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400 mb-3">
                    <span>{material.fileSize || material.duration}</span>
                    <span>{material.downloadCount} downloads</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {material.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-neutral-100 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {material.tags.length > 2 && (
                      <span className="text-xs text-neutral-500 dark:text-slate-400">
                        +{material.tags.length - 2} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onDownload(material.id)}
                      className="flex-1"
                    >
                      Download
                    </Button>
                    {material.previewUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPreview(material.id)}
                      >
                        Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onShare(material.id)}
                    >
                      Share
                    </Button>
                  </div>

                  {material.requiresCustomization && onCustomize && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCustomize(material.id)}
                        className="w-full"
                      >
                        Customize
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 border border-neutral-200 dark:border-slate-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <span className="text-2xl">{getTypeIcon(material.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-neutral-900 dark:text-slate-100 truncate">
                        {material.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(material.category)}`}>
                        {material.category.replace('_', ' ')}
                      </span>
                      {material.isNew && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-slate-400 truncate">
                      {material.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-neutral-500 dark:text-slate-400">
                      <span>{material.fileSize || material.duration}</span>
                      <span>{material.downloadCount} downloads</span>
                      <span>Updated {formatDate(material.lastUpdated)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onDownload(material.id)}
                  >
                    Download
                  </Button>
                  {material.previewUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPreview(material.id)}
                    >
                      Preview
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onShare(material.id)}
                  >
                    Share
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Material Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
              Request Custom Material
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={requestCategory}
                  onChange={(e) => setRequestCategory(e.target.value)}
                  className="w-full border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                >
                  <option value="general">General</option>
                  <option value="property_specific">Property Specific</option>
                  <option value="education">Education</option>
                  <option value="compliance">Compliance</option>
                  <option value="social_media">Social Media</option>
                  <option value="email">Email Templates</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Describe the material you need..."
                  rows={4}
                  className="w-full border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowRequestModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRequestSubmit}
                className="flex-1"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};