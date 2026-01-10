import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PropertyService } from '../../services';

interface PropertyImageUploadProps {
  propertyId: string;
  onUploadComplete?: () => void;
}

interface ImageFile {
  file: File;
  preview: string;
  caption: string;
  isPrimary: boolean;
  uploading: boolean;
  progress: number;
  error?: string;
}

export const PropertyImageUpload: React.FC<PropertyImageUploadProps> = ({
  propertyId,
  onUploadComplete,
}) => {
  const queryClient = useQueryClient();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ image, formData }: { image: ImageFile; formData: FormData }) => {
      return PropertyService.uploadPropertyImage(propertyId, formData);
    },
    onSuccess: (_, { image }) => {
      setImages(prev => prev.filter(img => img.file !== image.file));
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      onUploadComplete?.();
    },
    onError: (error: any, { image }) => {
      setImages(prev =>
        prev.map(img =>
          img.file === image.file
            ? { ...img, uploading: false, error: error.message || 'Upload failed' }
            : img
        )
      );
    },
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newImages: ImageFile[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    Array.from(files).forEach((file, index) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} is not a valid image format. Please use JPG, PNG, or WEBP.`);
        return;
      }

      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        isPrimary: images.length === 0 && index === 0, // First image is primary by default
        uploading: false,
        progress: 0,
      });
    });

    setImages(prev => [...prev, ...newImages]);
  }, [images.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const updateImage = (index: number, updates: Partial<ImageFile>) => {
    setImages(prev =>
      prev.map((img, i) => (i === index ? { ...img, ...updates } : img))
    );
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return newImages;
    });
  };

  const setPrimaryImage = (index: number) => {
    setImages(prev =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  };

  const uploadImage = async (image: ImageFile, index: number) => {
    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('caption', image.caption);
    formData.append('is_primary', image.isPrimary.toString());
    formData.append('order', index.toString());

    updateImage(index, { uploading: true, progress: 0 });

    try {
      await uploadMutation.mutateAsync({ image, formData });
    } catch (error) {
      // Error handling is done in mutation
    }
  };

  const uploadAllImages = async () => {
    const imagesToUpload = images.filter(img => !img.uploading && !img.error);

    for (let i = 0; i < imagesToUpload.length; i++) {
      await uploadImage(imagesToUpload[i], i);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-neutral-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
        `}
      >
        <input
          type="file"
          id="image-upload"
          multiple
          accept="image/jpeg,image/png,image/jpg,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <label
          htmlFor="image-upload"
          className="cursor-pointer"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                Drop images here or click to browse
              </p>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                Supports JPG, PNG, WEBP • Max 10MB per image
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              Selected Images ({images.length})
            </h3>
            <button
              onClick={uploadAllImages}
              disabled={images.some(img => img.uploading) || images.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
            >
              Upload All Images
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                {/* Image Preview */}
                <div className="relative aspect-video bg-neutral-100 dark:bg-slate-700">
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Badge */}
                  {image.isPrimary && (
                    <div className="absolute top-2 left-2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                      Primary
                    </div>
                  )}

                  {/* Remove Button */}
                  {!image.uploading && (
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}

                  {/* Upload Progress */}
                  {image.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm">Uploading...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Caption
                    </label>
                    <input
                      type="text"
                      value={image.caption}
                      onChange={(e) => updateImage(index, { caption: e.target.value })}
                      disabled={image.uploading}
                      placeholder="Add a caption..."
                      className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 disabled:bg-neutral-100 dark:disabled:bg-slate-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPrimaryImage(index)}
                      disabled={image.isPrimary || image.uploading}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:text-neutral-400 disabled:cursor-not-allowed"
                    >
                      {image.isPrimary ? 'Primary Image' : 'Set as Primary'}
                    </button>

                    <button
                      onClick={() => uploadImage(image, index)}
                      disabled={image.uploading}
                      className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {image.uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>

                  {/* Error Message */}
                  {image.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {image.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">📸 Image Upload Tips</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Upload high-quality images showcasing your property's best features</li>
          <li>• The first image (or primary image) will be shown in property listings</li>
          <li>• Recommended: exterior shots, interior rooms, amenities, location views</li>
          <li>• Use descriptive captions to help investors understand each image</li>
        </ul>
      </div>
    </div>
  );
};

export default PropertyImageUpload;
