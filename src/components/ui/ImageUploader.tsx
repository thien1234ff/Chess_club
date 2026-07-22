import React, { useState, useRef } from 'react';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from './Spinner';
import { UploadCloud, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';

interface ImageUploaderProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  helperText?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label = 'Tải ảnh lên',
  value,
  onChange,
  placeholder = 'Dán URL ảnh hoặc tải ảnh từ máy...',
  helperText
}) => {
  const { addToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      onChange(uploadedUrl);
      addToast('Tải ảnh lên Cloudinary thành công!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Tải ảnh thất bại.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onChange('');
  };

  return (
    <div className="space-y-2 text-left">
      {label && (
        <label className="block text-xs font-semibold uppercase text-neutral-400">
          {label}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Preview container if image is set */}
      {value ? (
        <div className="relative rounded-xl border border-darkborder overflow-hidden bg-charcoal group max-h-48 flex items-center justify-center">
          <img src={value} alt="Preview" className="w-full h-48 object-cover opacity-90" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-gold text-charcoal rounded-lg font-bold text-xs hover:bg-gold-light cursor-pointer transition-colors"
            >
              Đổi ảnh khác
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1.5 bg-red-600/80 text-white rounded-lg hover:bg-red-600 cursor-pointer transition-colors"
              title="Xóa ảnh"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Upload Drop Zone / Button */}
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-darkborder hover:border-gold/50 rounded-xl p-4 text-center cursor-pointer transition-all bg-darkcard/50 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-2 gap-2 text-xs text-neutral-400">
                <Spinner size="md" />
                <span>Đang tải ảnh lên Cloudinary...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 gap-1.5 text-neutral-400">
                <UploadCloud size={24} className="text-gold" />
                <span className="text-xs font-semibold text-white">Tải ảnh từ máy tính</span>
                <span className="text-[10px] text-neutral-500">Hỗ trợ PNG, JPG, WEBP (Tối đa 10MB)</span>
              </div>
            )}
          </div>

          {/* Toggle manual URL input */}
          <div className="flex justify-between items-center text-[11px]">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-gold hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <LinkIcon size={12} />
              <span>{showUrlInput ? 'Ẩn ô nhập URL' : 'Hoặc nhập đường link URL ảnh trực tiếp'}</span>
            </button>
          </div>

          {showUrlInput && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold placeholder-neutral-500"
            />
          )}
        </div>
      )}

      {helperText && <p className="text-[10px] text-neutral-500">{helperText}</p>}
    </div>
  );
};

export default ImageUploader;
