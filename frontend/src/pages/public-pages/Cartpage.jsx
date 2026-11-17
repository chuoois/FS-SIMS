import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import bannerImg from '../../../public/images/product-banner.jpg';

/* =====================================================================
 * Cấu hình & tiện ích (đồng bộ với trang Sản phẩm)
 * ===================================================================== */
const DEFAULT_BANNER = { title: 'Giỏ hàng', image: bannerImg };

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

const formatVnd = (value) => {
  const price = Number(value);
  if (value === null || value === undefined || Number.isNaN(price)) return 'Liên hệ';
  return `${price.toLocaleString('vi-VN')} ₫`;
};

/* ---------- Thành phần nhỏ ---------- */
const Photo = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  ) : (
    <div
      className={`grid place-items-center bg-stone-100 text-[11px] uppercase tracking-widest text-stone-400 ${className}`}
      role="img"
      aria-label={alt}
    >
      Chưa có ảnh
    </div>
  );
};

const Banner = ({ banner, total }) => (
  <section
    className="relative isolate flex min-h-[360px] items-end overflow-hidden bg-stone-700 md:min-h-[460px]"
    aria-labelledby="cart-title"
  >
    {banner.image ? (
      <img src={banner.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
    ) : (
      <div className="absolute inset-0 -z-20 bg-stone-700" aria-hidden="true" />
    )}
    <div
      className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/20"
      aria-hidden="true"
    />
    <div className="w-full px-5 pb-14 text-white md:pb-20 lg:px-[4vw]">
      <div className="max-w-[640px]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-sm">
          Góc Nhà
        </p>
        <h1
          id="cart-title"
          className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-6xl"
        >
          {banner.title}
        </h1>
        {typeof total === 'number' && total > 0 && (
          <p className="mt-4 text-[13px] text-stone-200">{total} sản phẩm</p>
        )}
        <nav aria-label="Breadcrumb" className="mt-6 flex items-center gap-2 text-xs text-white/80">
          <Link to="/home" className="hover:text-white hover:underline">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-bold text-white">
            {banner.title}
          </span>
        </nav>
      </div>
    </div>
  </section>
);

const QtyStepper = ({ name, value, max, disabled, onChange }) => {
  const buttonClass = `grid size-9 place-items-center text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 ${focusRing}`;

  return (
    <div
      className="inline-flex items-center border border-stone-300 bg-white"
      role="group"
      aria-label={`Số lượng ${name}`}
    >
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={`Giảm số lượng ${name}`}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span
        className="grid h-9 min-w-10 place-items-center text-[13px] font-bold text-stone-900"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value >= Math.min(99, max)}
        onClick={() => onChange(value + 1)}
        aria-label={`Tăng số lượng ${name}`}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};

const CartItem = ({ item, busy, onQty, onRemove }) => {
  const product = item.product;
  const maxQuantity = Math.max(0, Number(product.stockQuantity) || 0);
  const detailHref = `/products/${product.productId}`;

  return (
    <li className="group grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-stone-200 py-6 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <Link to={detailHref} aria-label={`Xem ${product.productName}`} className="block overflow-hidden bg-stone-100">
        <Photo
          src={product.imageUrl}
          alt={product.productName}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {(product.productCode || product.categoryName) && (
              <span className="text-[11px] text-stone-500">
                {[product.categoryName, product.productCode].filter(Boolean).join(' · ')}
              </span>
            )}
            <h2 className="mt-1 line-clamp-2 text-[14px] font-semibold text-stone-900">
              <Link to={detailHref} className="hover:underline">
                {product.productName}
              </Link>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onRemove(product.productId)}
            disabled={busy}
            className={`inline-flex items-center gap-1 text-[12px] font-medium text-stone-500 transition-colors hover:text-red-600 disabled:opacity-50 ${focusRing}`}
            aria-label={`Xóa ${product.productName} khỏi giỏ hàng`}
          >
            <X className="size-3.5" aria-hidden="true" />
            Xóa
          </button>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-[13px] font-bold text-stone-900">{formatVnd(product.price)}</p>
          {product.isSet && (
            <span className="bg-stone-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Bộ
            </span>
          )}
        </div>

        {maxQuantity > 0 && item.quantity > maxQuantity && (
          <p className="mt-2 text-xs text-red-600">
            Kho chỉ còn {maxQuantity} sản phẩm. Vui lòng cập nhật số lượng.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <QtyStepper
            name={product.productName}
            value={item.quantity}
            max={maxQuantity}
            disabled={busy || maxQuantity === 0}
            onChange={(quantity) => onQty(product.productId, quantity)}
          />
          <span className="text-[11px] text-stone-500">
            {maxQuantity > 0 ? `Còn ${maxQuantity} sản phẩm` : 'Tạm hết hàng'}
          </span>
        </div>
      </div>

      <p className="col-span-2 text-right text-[13px] font-bold text-stone-900 sm:col-span-1 sm:min-w-[130px]">
        {formatVnd(item.lineTotal)}
      </p>
    </li>
  );
};

const SkeletonList = () => (
  <ul aria-busy="true">
    {Array.from({ length: 3 }).map((_, i) => (
      <li
        key={i}
        className="grid animate-pulse grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-stone-200 py-6 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6"
      >
        <div className="aspect-[4/3] w-full bg-stone-100" />
        <div>
          <div className="h-3 w-1/4 bg-stone-100" />
          <div className="mt-3 h-4 w-2/3 bg-stone-100" />
          <div className="mt-3 h-3 w-1/5 bg-stone-100" />
        </div>
      </li>
    ))}
  </ul>
);

const MessageBox = ({ title, children }) => (
  <div className="border border-stone-200 px-5 py-20 text-center" aria-live="polite">
    {title && <h3 className="text-2xl font-light tracking-tight text-stone-900">{title}</h3>}
    {children}
  </div>
);

const primaryBtn = `inline-flex h-11 items-center justify-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

const inputClass =
  'h-11 w-full border border-stone-300 bg-white px-3 text-[14px] text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none';

/* =====================================================================
 * Trang Giỏ hàng
 * ===================================================================== */
export const CartPage = () => {
  const { isAuthenticated, user } = useAuth();
  const {
    items,
    itemCount,
    subtotal,
    loading,
    error,
    refreshCart,
    updateItem,
    removeItem,
    submitRequest,
  } = useCart();
  const [busyProductId, setBusyProductId] = useState(null);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    contactName: '',
    contactPhone: '',
    deliveryAddress: '',
    description: '',
  });

  useEffect(() => {
    setRequestForm((current) => ({
      ...current,
      contactName: current.contactName || user?.fullName || '',
      contactPhone: current.contactPhone || user?.phoneNumber || '',
      deliveryAddress: current.deliveryAddress || user?.address || '',
    }));
  }, [user]);

  const changeQuantity = async (productId, quantity) => {
    setBusyProductId(productId);
    try {
      await updateItem(productId, quantity);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Không thể cập nhật số lượng sản phẩm.');
    } finally {
      setBusyProductId(null);
    }
  };

  const deleteItem = async (productId) => {
    setBusyProductId(productId);
    try {
      await removeItem(productId);
      toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Không thể xóa sản phẩm khỏi giỏ hàng.');
    } finally {
      setBusyProductId(null);
    }
  };

  const retryCart = async () => {
    try {
      await refreshCart();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Không thể tải giỏ hàng.');
    }
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    setIsSubmittingRequest(true);
    try {
      const request = await submitRequest(requestForm);
      toast.success(`Đã gửi yêu cầu ${request.requestCode} cho nhân viên bán hàng.`);
      setIsRequestFormOpen(false);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Không thể gửi yêu cầu mua hàng.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const showList = isAuthenticated && !loading && !error && items.length > 0;

  /* ---------- Khu vực chính ---------- */
  const renderMain = () => {
    if (!isAuthenticated) {
      return (
        <MessageBox title="Đăng nhập để xem giỏ hàng">
          <p className="mt-3 text-[14px] text-stone-600">
            Giỏ hàng được lưu theo tài khoản khách hàng của bạn.
          </p>
          <Link to="/login" className={`mt-6 ${primaryBtn}`}>
            Đăng nhập
          </Link>
        </MessageBox>
      );
    }

    if (loading) return <SkeletonList />;

    if (error) {
      return (
        <MessageBox>
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={retryCart} className={`mt-4 ${primaryBtn}`}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử tải lại
          </button>
        </MessageBox>
      );
    }

    if (items.length === 0) {
      return (
        <MessageBox title="Giỏ hàng của bạn đang trống">
          <p className="mt-3 text-[14px] text-stone-600">
            Hãy chọn vài sản phẩm bạn yêu thích để bắt đầu.
          </p>
          <Link to="/products" className={`mt-6 ${primaryBtn}`}>
            Xem sản phẩm
          </Link>
        </MessageBox>
      );
    }

    return (
      <ul>
        {items.map((item) => (
          <CartItem
            key={item.product.productId}
            item={item}
            busy={isSubmittingRequest || busyProductId === item.product.productId}
            onQty={changeQuantity}
            onRemove={deleteItem}
          />
        ))}
      </ul>
    );
  };

  return (
    <>
      <Banner banner={DEFAULT_BANNER} total={showList ? itemCount : null} />

      <section
        className="mx-auto max-w-[1500px] px-5 pb-24 pt-12 lg:px-[4vw]"
        aria-label="Giỏ hàng"
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
          {/* ── KHU VỰC CHÍNH ── */}
          <div className="min-w-0 flex-1">
            {/* Thanh công cụ */}
            <div className="mb-2 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">
                  Sản phẩm trong giỏ
                </p>
                <p
                  className="mt-1 text-2xl font-light tracking-tight text-stone-900"
                  aria-live="polite"
                >
                  {loading ? 'Đang tải...' : showList ? `${itemCount} sản phẩm` : 'Giỏ hàng'}
                </p>
              </div>
              <Link
                to="/products"
                className={`text-[12px] font-bold uppercase tracking-[0.2em] text-stone-500 hover:text-orange-700 ${focusRing}`}
              >
                Tiếp tục mua sắm
              </Link>
            </div>

            {renderMain()}
          </div>

          {/* ── SIDEBAR TÓM TẮT ── */}
          {showList && (
            <aside
              className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[320px] xl:w-[360px]"
              aria-label="Tóm tắt đơn hàng"
            >
              <div className="mb-6 border-b border-stone-200 pb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">
                  Đơn hàng
                </p>
                <h2 className="mt-1 text-2xl font-light tracking-tight text-stone-900">
                  Tóm tắt
                </h2>
              </div>

              <dl className="grid gap-3 text-[14px] text-stone-700">
                <div className="flex justify-between gap-4">
                  <dt>Tạm tính</dt>
                  <dd className="font-bold text-stone-900">{formatVnd(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-stone-200 pt-4 text-[15px]">
                  <dt className="font-bold text-stone-900">Tổng cộng</dt>
                  <dd className="font-bold text-stone-900">{formatVnd(subtotal)}</dd>
                </div>
              </dl>

              <p className="mt-6 text-[12px] leading-5 text-stone-600">
                Cần hỗ trợ đặt hàng? Gọi{' '}
                <a
                  href="tel:0969011078"
                  className="font-bold text-stone-900 hover:text-orange-700 hover:underline"
                >
                  096 9011 078
                </a>
                .
              </p>

              {!isRequestFormOpen ? (
                <button
                  type="button"
                  onClick={() => setIsRequestFormOpen(true)}
                  className={`mt-5 w-full ${primaryBtn}`}
                >
                  Gửi yêu cầu cho sale
                </button>
              ) : (
                <form className="mt-5 grid gap-4" onSubmit={handleRequestSubmit}>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-900">
                    Thông tin để nhân viên liên hệ
                  </h3>
                  <label className="grid gap-1.5 text-[12px] font-medium text-stone-700">
                    Họ và tên
                    <input
                      required
                      maxLength={150}
                      value={requestForm.contactName}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, contactName: event.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[12px] font-medium text-stone-700">
                    Số điện thoại
                    <input
                      required
                      type="tel"
                      maxLength={20}
                      value={requestForm.contactPhone}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, contactPhone: event.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[12px] font-medium text-stone-700">
                    Địa chỉ giao hàng (không bắt buộc)
                    <input
                      maxLength={255}
                      value={requestForm.deliveryAddress}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, deliveryAddress: event.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[12px] font-medium text-stone-700">
                    Ghi chú (không bắt buộc)
                    <textarea
                      maxLength={500}
                      value={requestForm.description}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="min-h-24 w-full border border-stone-300 bg-white p-3 text-[14px] text-stone-900 focus:border-stone-900 focus:outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest || busyProductId !== null}
                    className={`w-full ${primaryBtn}`}
                  >
                    {isSubmittingRequest ? 'Đang gửi yêu cầu...' : 'Xác nhận gửi yêu cầu'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingRequest}
                    onClick={() => setIsRequestFormOpen(false)}
                    className={`h-11 w-full border border-[#323139] text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white disabled:opacity-50 ${focusRing}`}
                  >
                    Hủy
                  </button>
                </form>
              )}
            </aside>
          )}
        </div>
      </section>
    </>
  );
};