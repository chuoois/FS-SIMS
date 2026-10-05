import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser, loginUser } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const inputClass =
  'h-11 w-full border border-stone-300 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-2 focus:outline-stone-900';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-stone-700';

export const RegisterPage = () => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate client-side trước khi gọi API
    if (form.password.length < 8) return setError('Mật khẩu cần ít nhất 8 ký tự.');
    if (form.password !== form.confirmPassword) return setError('Mật khẩu nhập lại chưa khớp.');

    setLoading(true);
    try {
      // 1. Đăng ký tài khoản
      await registerUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      // 2. Tự động đăng nhập luôn sau khi đăng ký thành công
      await login({ email: form.email.trim(), password: form.password });

      toast.success('Tạo tài khoản thành công! Chào mừng bạn.');
      navigate('/home', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Đăng ký thất bại, vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px] px-5 py-12 sm:py-16">
      <h1 className="text-2xl font-bold uppercase tracking-wide text-stone-900">Đăng ký</h1>
      <span className="mt-3 block h-px w-6 bg-stone-400" />
      <p className="mt-4 text-sm text-stone-600">Tạo tài khoản để nhận ưu đãi và theo dõi đơn hàng.</p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        {error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid gap-1.5">
          <label htmlFor="reg-fullName" className={labelClass}>Họ và tên</label>
          <input
            id="reg-fullName"
            name="fullName"
            required
            autoComplete="name"
            placeholder="Nhập họ và tên"
            className={inputClass}
            value={form.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="reg-email" className={labelClass}>Email</label>
          <input
            id="reg-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Nhập email"
            className={inputClass}
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="reg-phone" className={labelClass}>
            Số điện thoại <span className="text-stone-400 font-normal normal-case">(tuỳ chọn)</span>
          </label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Nhập số điện thoại"
            className={inputClass}
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="reg-password" className={labelClass}>Mật khẩu</label>
          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              className={`${inputClass} pr-11`}
              value={form.password}
              onChange={handleChange}
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

        <div className="grid gap-1.5">
          <label htmlFor="reg-confirmPassword" className={labelClass}>Nhập lại mật khẩu</label>
          <input
            id="reg-confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            className={inputClass}
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          id="register-submit-btn"
          disabled={loading}
          className="h-11 w-full bg-black text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
        >
          {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-600">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-semibold text-stone-900 underline underline-offset-4 hover:text-orange-700">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}