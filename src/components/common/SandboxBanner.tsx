import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { MockDB } from '../../services/mockDb';
import { useToast } from '../../contexts/ToastContext';

export const SandboxBanner: React.FC = () => {
  const { addToast } = useToast();
  const isMockMode = import.meta.env.VITE_APP_MODE === 'mock';

  if (!isMockMode) return null;

  const handleResetSeed = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại và khởi tạo lại toàn bộ dữ liệu ChessHub? Thao tác này sẽ xóa các bài đăng, lịch đặt và đăng ký tùy chỉnh.')) {
      MockDB.init(true); // Force seed re-initialization
      addToast('Cơ sở dữ liệu Sandbox đã được khởi tạo lại thành công.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 py-2 px-4 text-xs font-semibold flex items-center justify-between gap-4 z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
        <span>Chế độ Sandbox: Đang chạy trên cơ sở dữ liệu giả lập. Dữ liệu lưu trữ trong phiên làm việc.</span>
      </div>
      <button
        onClick={handleResetSeed}
        className="flex items-center gap-1.5 bg-amber-500 text-charcoal hover:bg-amber-400 px-3 py-1 rounded font-bold cursor-pointer transition-colors shadow-sm"
      >
        <RotateCcw size={12} />
        <span>Đặt lại &amp; Khởi tạo dữ liệu</span>
      </button>
    </div>
  );
};
export default SandboxBanner;
