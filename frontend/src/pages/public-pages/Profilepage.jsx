import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, UserRound } from 'lucide-react';

/* ---------- Dữ liệu mẫu (thay bằng thông tin người dùng từ API) ---------- */
const initialProfile = {
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@example.com',
  phone: '0912345678',
  gender: 'male',
  birthday: '1995-05-20',
  address: '',
};

const genders = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const MAX_AVATAR_MB = 2;

const tabs = [
  { id: 'info', label: 'Thông tin cá nhân', icon: UserRound },
  { id: 'password', label: 'Đổi mật khẩu', icon: KeyRound },
];

/* ---------- Thành phần dùng chung ---------- */
const inputCls =
  'block w-full border bg-white px-3 py-2.5 text-sm text-stone-800 focus:border-stone-900 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500';

const Field = ({ label, error, hint, children }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-stone-900">{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined, className: `${inputCls} ${error ? 'border-red-600' : 'border-stone-300'}` })}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] font-medium text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
};

const PrimaryButton = ({ children, ...props }) => (
  <button
    type="submit"
    className="h-11 bg-[#232226] px-8 text-xs font-bold uppercase text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#232226]"
    {...props}
  >
    {children}
  </button>
);

const PageBanner = ({ title }) => (
  <section className="relative isolate flex min-h-[180px] items-end overflow-hidden bg-stone-400 md:h-[16vw] md:max-h-[340px]" aria-labelledby="profile-title">
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
    <div className="px-5 pb-8 text-white lg:px-[4vw]">
      <h1 id="profile-title" className="text-3xl font-light md:text-4xl">{title}</h1>
      <nav aria-label="Breadcrumb" className="mt-3 flex items-center gap-2 text-xs">
        <Link to="/" className="hover:underline">Trang chủ</Link>
        <span aria-hidden="true" className="text-white/70">/</span>
        <span aria-current="page" className="font-bold">{title}</span>
      </nav>
    </div>
  </section>
);

/* ---------- Ảnh đại diện ---------- */
const AvatarPicker = ({ name, url, onChange }) => {
  const [error, setError] = useState('');
  const initial = (name.trim().split(/\s+/).pop() || '?').charAt(0).toUpperCase();
  const inputId = useId();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Vui lòng chọn một tệp ảnh.');
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) return setError(`Ảnh tối đa ${MAX_AVATAR_MB}MB.`);
    setError('');
    onChange(file);
  };

  return (
    <div className="flex items-center gap-5">
      {url ? (
        <img src={url} alt="Ảnh đại diện" className="size-20 rounded-full object-cover" />
      ) : (
        <div className="grid size-20 place-items-center rounded-full bg-[#323139] text-2xl font-light text-white" aria-hidden="true">
          {initial}
        </div>
      )}
      <div>
        <label
          htmlFor={inputId}
          className="inline-flex h-9 cursor-pointer items-center border border-[#323139] px-4 text-xs font-bold text-[#323139] transition-colors hover:bg-[#323139] hover:text-white focus-within:outline-2 focus-within:outline-offset-2"
        >
          Đổi ảnh
        </label>
        <input id={inputId} type="file" accept="image/*" onChange={onFile} className="sr-only" />
        {url && (
          <button type="button" onClick={() => onChange(null)} className="ml-3 text-xs font-medium text-stone-500 hover:text-red-600">
            Xóa ảnh
          </button>
        )}
        <p className={`mt-2 text-[12px] font-medium ${error ? 'text-red-600' : 'text-stone-500'}`} role={error ? 'alert' : undefined}>
          {error || `JPG hoặc PNG, tối đa ${MAX_AVATAR_MB}MB.`}
        </p>
      </div>
    </div>
  );
};

/* ---------- Tab: thông tin cá nhân ---------- */
const InfoForm = () => {
  const [values, setValues] = useState(initialProfile);
  const [saved, setSaved] = useState(initialProfile);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => () => avatarUrl && URL.revokeObjectURL(avatarUrl), [avatarUrl]);

  const pickAvatar = (file) => {
    setAvatarFile(file);
    setAvatarUrl(file ? URL.createObjectURL(file) : '');
    setStatus('');
  };

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setStatus('');
  };

  const validate = () => {
    const next = {};
    if (!values.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.';
    if (!/^(0|\+84)\d{9}$/.test(values.phone.replace(/\s/g, ''))) next.phone = 'Số điện thoại không hợp lệ.';
    return next;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    // TODO: gọi API cập nhật hồ sơ (kèm avatarFile nếu có)
    setSaved(values);
    setStatus('Đã lưu thay đổi.');
  };

  const dirty = JSON.stringify(values) !== JSON.stringify(saved) || !!avatarFile;

  const reset = () => {
    setValues(saved);
    setErrors({});
    pickAvatar(null);
    setStatus('');
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <AvatarPicker name={values.fullName} url={avatarUrl} onChange={pickAvatar} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Họ và tên (Yêu cầu)" error={errors.fullName}>
          {(p) => <input {...p} value={values.fullName} onChange={set('fullName')} autoComplete="name" />}
        </Field>
        <Field label="Số điện thoại (Yêu cầu)" error={errors.phone}>
          {(p) => <input {...p} type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" />}
        </Field>
        <Field label="Email" hint="Email dùng để đăng nhập nên không thể thay đổi.">
          {(p) => <input {...p} type="email" value={values.email} disabled />}
        </Field>
        <Field label="Giới tính">
          {(p) => (
            <select {...p} value={values.gender} onChange={set('gender')}>
              {genders.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Ngày sinh">
          {(p) => <input {...p} type="date" value={values.birthday} onChange={set('birthday')} autoComplete="bday" />}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Địa chỉ nhận hàng">
            {(p) => <textarea {...p} rows={3} value={values.address} onChange={set('address')} autoComplete="street-address" />}
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <PrimaryButton disabled={!dirty}>Lưu thay đổi</PrimaryButton>
        {dirty && (
          <button type="button" onClick={reset} className="text-xs font-bold text-stone-600 hover:text-stone-900">
            Hủy thay đổi
          </button>
        )}
        <p role="status" className="text-[13px] font-medium text-green-700">{status}</p>
      </div>
    </form>
  );
};

/* ---------- Tab: đổi mật khẩu ---------- */
const PasswordInput = ({ show, onToggle, ...props }) => (
  <div className="relative">
    <input {...props} type={show ? 'text' : 'password'} className={`${props.className} pr-11`} />
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      className="absolute right-0 top-0 grid h-full w-11 place-items-center text-stone-500 hover:text-stone-900"
    >
      {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  </div>
);

const PasswordForm = () => {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setStatus('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!values.current) next.current = 'Vui lòng nhập mật khẩu hiện tại.';
    if (values.next.length < 8) next.next = 'Mật khẩu mới cần ít nhất 8 ký tự.';
    else if (values.next === values.current) next.next = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    if (values.confirm !== values.next) next.confirm = 'Mật khẩu xác nhận không khớp.';
    setErrors(next);
    if (Object.keys(next).length) return;
    // TODO: gọi API đổi mật khẩu
    setValues({ current: '', next: '', confirm: '' });
    setStatus('Đã đổi mật khẩu.');
  };

  const toggle = () => setShow((s) => !s);

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-[420px] gap-6">
      <Field label="Mật khẩu hiện tại" error={errors.current}>
        {(p) => <PasswordInput {...p} show={show} onToggle={toggle} value={values.current} onChange={set('current')} autoComplete="current-password" />}
      </Field>
      <Field label="Mật khẩu mới" error={errors.next} hint="Tối thiểu 8 ký tự.">
        {(p) => <PasswordInput {...p} show={show} onToggle={toggle} value={values.next} onChange={set('next')} autoComplete="new-password" />}
      </Field>
      <Field label="Nhập lại mật khẩu mới" error={errors.confirm}>
        {(p) => <PasswordInput {...p} show={show} onToggle={toggle} value={values.confirm} onChange={set('confirm')} autoComplete="new-password" />}
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <PrimaryButton>Đổi mật khẩu</PrimaryButton>
        <p role="status" className="text-[13px] font-medium text-green-700">{status}</p>
      </div>
    </form>
  );
};

/* ---------- Trang Hồ sơ (route con của HomeLayout) ---------- */
export const ProfilePage = () => {
  const [tab, setTab] = useState('info');
  const current = tabs.find((t) => t.id === tab);

  return (
    <>
      <PageBanner title="Tài khoản của tôi" />

      <div className="mx-auto grid max-w-[1305px] gap-10 px-5 py-12 md:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label="Menu tài khoản" className="flex gap-2 overflow-x-auto md:grid md:content-start md:gap-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 border-b-2 px-1 py-3 text-left text-[13px] transition-colors md:border-b md:border-l-2 md:border-b-stone-200 md:px-4 ${
                tab === id
                  ? 'border-orange-700 font-bold text-orange-700 md:border-l-orange-700'
                  : 'border-transparent font-medium text-stone-700 hover:text-orange-700 md:border-l-transparent'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <section aria-labelledby="tab-title">
          <h2 id="tab-title" className="text-[15px] font-bold uppercase tracking-wide text-stone-900">{current.label}</h2>
          <span className="mt-3 block h-px w-6 bg-stone-500" aria-hidden="true" />
          <div className="mt-8">{tab === 'info' ? <InfoForm /> : <PasswordForm />}</div>
        </section>
      </div>
    </>
  );
};