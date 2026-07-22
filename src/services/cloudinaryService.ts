/**
 * Cloudinary Free Image Upload Service
 * Handles direct unsigned image uploads to Cloudinary without requiring a backend server.
 */

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dx17fwjii';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'chesshub_preset';

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File được chọn phải là định dạng hình ảnh (PNG, JPG, WEBP, GIF...).');
  }

  // Max 10MB limit check
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Kích thước ảnh vượt quá 10MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Tải ảnh lên Cloudinary thất bại.');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error(error.message || 'Tải ảnh lên Cloudinary thất bại. Vui lòng kiểm tra lại kết nối mạng.');
  }
};
