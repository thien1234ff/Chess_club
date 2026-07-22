import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-darkcard border-t border-darkborder mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Logo and Brand details */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wider text-ivory mb-4">
              <span className="text-gold text-2xl">♟</span>
              <span>ChessHub</span>
            </Link>
            <p className="text-sm text-neutral-400 max-w-sm mb-4">
              Học cờ vua. Tìm đối thủ. Kết nối huấn luyện viên. Tham gia câu lạc bộ. Thi đấu giải Thụy Sĩ. Chia sẻ kiến thức. Xây dựng hành trình cờ vua tại Việt Nam và quốc tế.
            </p>
            <div className="text-xs text-neutral-500 font-medium">
              Hệ sinh thái cờ vua xã hội và thi đấu toàn diện, cao cấp.
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-4 font-display">Hệ sinh thái</h4>
            <div className="flex flex-col gap-2">
              <Link to="/community" className="text-sm text-neutral-400 hover:text-white transition-colors">Cộng đồng</Link>
              <Link to="/coaches" className="text-sm text-neutral-400 hover:text-white transition-colors">Tìm Huấn luyện viên</Link>
              <Link to="/tournaments" className="text-sm text-neutral-400 hover:text-white transition-colors">Giải đấu</Link>
              <Link to="/clubs" className="text-sm text-neutral-400 hover:text-white transition-colors">Câu lạc bộ</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-4 font-display">Tài nguyên</h4>
            <div className="flex flex-col gap-2">
              <Link to="/learn" className="text-sm text-neutral-400 hover:text-white transition-colors">Bài học Cờ vua</Link>
              <Link to="/learn?tab=puzzles" className="text-sm text-neutral-400 hover:text-white transition-colors">Thế cờ Chiến thuật</Link>
              <Link to="/rankings" className="text-sm text-neutral-400 hover:text-white transition-colors">Bảng xếp hạng Elo</Link>
              <a href="https://fide.com" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-400 hover:text-white transition-colors">Website chính thức FIDE</a>
            </div>
          </div>
        </div>

        <hr className="border-darkborder mb-6" />

        {/* copyright section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            &copy; {currentYear} ChessHub Việt Nam. Bảo lưu mọi quyền.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white transition-colors">Chính sách Bảo mật</Link>
            <Link to="/" className="hover:text-white transition-colors">Điều khoản Dịch vụ</Link>
            <Link to="/" className="hover:text-white transition-colors">Quy định FIDE</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
