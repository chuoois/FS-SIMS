// =========================================================
// StaffLoginPage.jsx
// Giao diện Đăng nhập chung duy nhất dành cho 3 vị trí nhân viên:
// 1. Owner (Chủ xưởng)
// 2. Sales (Kinh doanh)
// 3. Staff Leader (Tổ trưởng xưởng)
// =========================================================

import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Hammer,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { staffLogin as staffLoginApi } from '../../services/staffAuthService';
import {
  ROLES,
  STAFF_ROLES,
  ROLE_NAMES,
  isStaffRole,
  getStaffRedirectPath,
} from '../../constants/roles';

// 3 Vai trò nhân sự nội bộ của hệ thống Góc Nhà
const STAFF_ROLE_CARDS = [
  {
    roleId: ROLES.OWNER,
    title: 'Chủ xưởng',
    subtitle: 'Owner',
    icon: Building2,
    badgeColor: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  },
  {
    roleId: ROLES.SALES,
    title: 'Kinh doanh',
    subtitle: 'Sales Staff',
    icon: Briefcase,
    badgeColor: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
  },
  {
    roleId: ROLES.LEADERSTAFF,
    title: 'Tổ trưởng xưởng',
    subtitle: 'Staff Leader',
    icon: Hammer,
    badgeColor: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  },
];

const inputClass =
  'h-11 w-full border border-stone-300 bg-white pl-10 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-stone-700';

export const StaffLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRoleHint, setSelectedRoleHint] = useState(null);

  // saveSession từ AuthContext để đồng bộ state sau khi gọi API staff-auth riêng
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Gọi API riêng cho nhân sự: POST /api/staff-auth/login
      // Backend kiểm tra role và trả 403 nếu không phải nhân sự
      const data = await staffLoginApi({ email: email.trim(), password });
      const loggedUser = data?.user;

      // Lưu session vào AuthContext (accessToken + user)
      saveSession(data.accessToken, loggedUser);

      const roleTitle = ROLE_NAMES[loggedUser.roleId] || 'Nhân viên';
      toast.success(`Đăng nhập thành công! Chào mừng ${loggedUser.fullName || roleTitle}.`);

      // Điều hướng tới dashboard tương ứng của vai trò
      // Chỉ dùng `fromPath` nếu path đó thực sự thuộc về vai trò của user vừa đăng nhập
      const defaultPath = getStaffRedirectPath(loggedUser.roleId);
      const fromPath = location.state?.from?.pathname;
      const redirectTarget =
        fromPath && fromPath.startsWith(defaultPath) ? fromPath : defaultPath;
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (card) => {
    setSelectedRoleHint(card.roleId === selectedRoleHint ? null : card.roleId);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-stone-100 font-sans text-stone-800 antialiased p-4 sm:p-6 lg:p-10">
      {/* ── Main Container: 2 Cột Đối Xứng ── */}
      <main className="mx-auto w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xl lg:grid-cols-12">
          {/* ═════════ CỘT TRÁI: BRANDING & 3 VAI TRÒ ═════════ */}
          <section className="relative flex flex-col justify-between bg-[#1f1e24] p-8 text-white lg:col-span-5 lg:p-12">
            {/* Background texture hoa văn xưởng gỗ mờ */}
            <div
              className="pointer-events-none absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Logo */}
              <div className="mb-6 flex items-center justify-between">
                <Link
                  to="/home"
                  aria-label="Góc Nhà, về trang chủ"
                  className="border border-stone-400 px-2.5 py-0.5 text-lg font-light tracking-tight text-stone-200 transition-colors hover:border-white hover:text-white"
                >
                  góc nhà
                </Link>
              </div>

              {/* Badge hệ thống */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-stone-300 uppercase">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Hệ thống Quản Trị FSSIMS 2026
              </div>

              {/* Headline */}
              <h1 className="mt-5 text-2xl font-light tracking-tight text-white sm:text-3xl">
                Cổng Đăng Nhập{' '}
                <span className="font-semibold text-orange-400">Nhân Viên</span>
              </h1>

              {/* Danh sách 3 vị trí làm việc */}
              <div className="mt-8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  3 Vị trí nhân sự áp dụng:
                </p>

                <div className="mt-3 grid gap-3">
                  {STAFF_ROLE_CARDS.map((card) => {
                    const Icon = card.icon;
                    const isSelected = selectedRoleHint === card.roleId;

                    return (
                      <button
                        key={card.roleId}
                        type="button"
                        onClick={() => handleSelectRole(card)}
                        className={`group flex items-center gap-3.5 rounded-xl border p-3 text-left transition-all ${isSelected
                            ? 'border-orange-500 bg-white/10 shadow-md ring-1 ring-orange-500/50'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                      >
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-lg border ${card.badgeColor}`}
                        >
                          <Icon className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white group-hover:text-orange-300">
                              {card.title}
                            </span>
                            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                              {card.subtitle}
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          className={`size-4 shrink-0 transition-transform ${isSelected
                              ? 'rotate-90 text-orange-400'
                              : 'text-stone-500 group-hover:text-stone-300'
                            }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ═════════ CỘT PHẢI: FORM ĐĂNG NHẬP ═════════ */}
          <section className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-7">
            <div>
              {/* Tiêu đề Form */}
              <div className="border-b border-stone-200 pb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold uppercase tracking-wider text-stone-900 sm:text-2xl">
                    Đăng Nhập Nhân Viên
                  </h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  Dùng email công việc và mật khẩu nội bộ. Hệ thống sẽ tự động nhận diện vai trò và chuyển hướng bạn đến đúng bảng điều khiển.
                </p>
              </div>

              {/* Thông báo lỗi */}
              {error && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
                >
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
                  <div className="flex-1 text-xs leading-5">
                    <p className="font-semibold text-red-900">Không thể đăng nhập</p>
                    <p className="mt-0.5">{error}</p>
                    {error.includes('Khách hàng') && (
                      <Link
                        to="/login"
                        className="mt-2 inline-flex items-center gap-1 font-bold text-red-700 underline hover:text-red-900"
                      >
                        Chuyển sang Cổng Khách hàng ngay <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
                {/* Field: Email */}
                <div className="grid gap-1.5">
                  <label htmlFor="staff-email" className={labelClass}>
                    Email nhân viên
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-stone-400">
                      <Mail className="size-4" />
                    </span>
                    <input
                      id="staff-email"
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="ten.nhanvien@fssims.local"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field: Mật khẩu */}
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="staff-password" className={labelClass}>
                      Mật khẩu
                    </label>

                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-stone-400">
                      <Lock className="size-4" />
                    </span>
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu tài khoản"
                      className={`${inputClass} pr-11`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-stone-400 hover:text-stone-700"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <Link
                      to="/staff/forgot-password"
                      className="text-xs font-semibold text-stone-600 underline underline-offset-4 hover:text-orange-700"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                </div>

                {/* Nút bấm Submit */}
                <button
                  type="submit"
                  id="staff-login-submit-btn"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 bg-[#232226] text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-black hover:shadow-lg focus:ring-2 focus:ring-stone-900 focus:outline-none disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Đang xác thực quyền hạn...
                    </span>
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StaffLoginPage;
