// =========================================================
// ForgotpasswordPage.jsx
// Cho phép user nhập email → hệ thống gửi mật khẩu mới qua Gmail
// =========================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { forgotPassword } from '../../services/authService';

const inputClass =
  'h-11 w-full border border-stone-300 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-2 focus:outline-stone-900';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-stone-700';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không gửi được yêu cầu, vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px] px-5 py-12 sm:py-16">
      <h1 className="text-2xl font-bold uppercase tracking-wide text-stone-900">Quên mật khẩu</h1>
      <span className="mt-3 block h-px w-6 bg-stone-400" />

      {sent ? (
        /* ── Trạng thái gửi thành công ── */
        <div className="mt-8">
          <div className="flex flex-col items-center gap-4 border border-stone-200 bg-stone-50 p-8 text-center">
            <CheckCircle className="size-10 text-emerald-600" strokeWidth={1.5} />
            <div>
              <p className="font-semibold text-stone-900">Yêu cầu đã được gửi!</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Nếu <strong className="text-stone-900">{email}</strong> đã được đăng ký,
                mật khẩu mới sẽ xuất hiện trong hộp thư của bạn trong vài giây.
              </p>
              <p className="mt-3 text-xs text-stone-500">
                Nhớ kiểm tra cả thư mục <strong>Spam / Junk</strong> nếu không thấy.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setSent(false); setEmail(''); }}
            className="mt-4 w-full border border-stone-300 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:border-stone-900 hover:text-stone-900 transition-colors"
          >
            Thử email khác
          </button>
        </div>
      ) : (
        /* ── Form nhập email ── */
        <>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Nhập email đã đăng ký. Hệ thống sẽ tạo mật khẩu mới và gửi ngay đến hộp thư của bạn.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            {error && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="grid gap-1.5">
              <label htmlFor="forgot-email" className={labelClass}>
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                  <Mail className="size-4" />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ten@email.com"
                  className="h-11 w-full border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-2 focus:outline-stone-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              id="forgot-password-submit-btn"
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-black text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang gửi...
                </span>
              ) : (
                'Gửi mật khẩu mới'
              )}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-stone-600">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-stone-900 hover:text-orange-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
};