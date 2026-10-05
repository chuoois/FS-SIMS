import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const inputClass =
  'h-11 w-full border border-stone-300 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-2 focus:outline-stone-900';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-stone-700';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sau khi login, redirect về trang trước đó hoặc home
  const from = location.state?.from?.pathname || '/home';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      toast.success('Đăng nhập thành công!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Đăng nhập thất bại, vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px] px-5 py-12 sm:py-16">
      <h1 className="text-2xl font-bold uppercase tracking-wide text-stone-900">Đăng nhập</h1>
      <span className="mt-3 block h-px w-6 bg-stone-400" />
      <p className="mt-4 text-sm text-stone-600">Chào mừng bạn quay lại. Đăng nhập để tiếp tục mua sắm.</p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        {error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid gap-1.5">
          <label htmlFor="login-email" className={labelClass}>Email</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="ten@email.com"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="login-password" className={labelClass}>Mật khẩu</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              className={`${inputClass} pr-11`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-stone-500 hover:text-stone-900"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-stone-600 underline underline-offset-4 hover:text-orange-700">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          id="login-submit-btn"
          disabled={loading}
          className="h-11 w-full bg-black text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
        >
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-600">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-stone-900 underline underline-offset-4 hover:text-orange-700">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}