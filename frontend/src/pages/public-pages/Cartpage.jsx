import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const formatVnd = (value) => {
  const price = Number(value);
  return value === null || value === undefined || Number.isNaN(price)
    ? 'Liên hệ'
    : `${price.toLocaleString('vi-VN')} ₫`;
};

const Photo = ({ src, alt, className = '' }) =>
  src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div
      className={`grid place-items-center bg-stone-100 text-[10px] uppercase tracking-widest text-stone-400 ${className}`}
      role="img"
      aria-label={alt}
    >
      Chưa có ảnh
    </div>
  );

const PageBanner = ({ title }) => (
  <section className="relative isolate flex min-h-[180px] items-end overflow-hidden bg-stone-400 md:h-[16vw] md:max-h-[340px]" aria-labelledby="cart-title">
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
    <div className="px-5 pb-8 text-white lg:px-[4vw]">
      <h1 id="cart-title" className="text-3xl font-light md:text-4xl">{title}</h1>
      <nav aria-label="Breadcrumb" className="mt-3 flex items-center gap-2 text-xs">
        <Link to="/home" className="hover:underline">Trang chủ</Link>
        <span aria-hidden="true" className="text-white/70">/</span>
        <span aria-current="page" className="font-bold">{title}</span>
      </nav>
    </div>
  </section>
);

const QtyStepper = ({ name, value, max, disabled, onChange }) => {
  const buttonClass =
    'grid size-9 place-items-center text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

  return (
    <div className="inline-flex items-center border border-stone-300" role="group" aria-label={`Số lượng ${name}`}>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={`Giảm số lượng ${name}`}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span className="grid h-9 min-w-10 place-items-center text-[13px] font-bold text-stone-900" aria-live="polite">
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

  return (
    <li className="grid grid-cols-[76px_minmax(0,1fr)] gap-4 border-b border-stone-200 py-6 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <Link to={`/products/${product.productId}`} aria-label={`Xem ${product.productName}`}>
        <Photo src={product.imageUrl} alt={product.productName} className="aspect-square w-full" />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {(product.productCode || product.categoryName) && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {[product.categoryName, product.productCode].filter(Boolean).join(' · ')}
              </p>
            )}
            <h2 className="mt-1 text-[13px] font-bold text-stone-900">
              <Link to={`/products/${product.productId}`} className="hover:text-orange-700 hover:underline">
                {product.productName}
              </Link>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onRemove(product.productId)}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-stone-500 transition-colors hover:text-red-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-label={`Xóa ${product.productName} khỏi giỏ hàng`}
          >
            <X className="size-3.5" aria-hidden="true" />
            Xóa
          </button>
        </div>

        <p className="mt-2 text-[12px] font-medium text-stone-600">{formatVnd(product.price)}</p>
        {product.isSet && (
          <p className="mt-1 text-[11px] font-medium text-orange-700">Sản phẩm bộ</p>
        )}
        {maxQuantity > 0 && item.quantity > maxQuantity && (
          <p className="mt-2 text-xs text-red-600">Kho chỉ còn {maxQuantity} sản phẩm. Vui lòng cập nhật số lượng.</p>
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

const EmptyCart = () => (
  <section className="mx-auto max-w-[560px] px-5 py-24 text-center" aria-live="polite">
    <h2 className="text-xl font-normal text-stone-900">Giỏ hàng của bạn đang trống</h2>
    <p className="mt-3 text-[13px] font-medium text-stone-600">Hãy chọn vài sản phẩm bạn yêu thích để bắt đầu.</p>
    <Link
      to="/products"
      className="mt-8 inline-flex h-11 items-center bg-[#323139] px-8 text-xs font-bold uppercase text-white transition-colors hover:bg-[#232226] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#323139]"
    >
      Xem sản phẩm
    </Link>
  </section>
);

export const CartPage = () => {
  const { isAuthenticated } = useAuth();
  const { items, itemCount, subtotal, loading, error, refreshCart, updateItem, removeItem } = useCart();
  const [busyProductId, setBusyProductId] = useState(null);

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

  return (
    <>
      <PageBanner title="Giỏ hàng" />

      {!isAuthenticated ? (
        <section className="mx-auto max-w-[560px] px-5 py-24 text-center">
          <h2 className="text-xl font-normal text-stone-900">Đăng nhập để xem giỏ hàng</h2>
          <p className="mt-3 text-[13px] text-stone-600">Giỏ hàng được lưu theo tài khoản khách hàng của bạn.</p>
          <Link
            to="/login"
            className="mt-8 inline-flex h-11 items-center bg-stone-900 px-8 text-xs font-bold uppercase text-white hover:bg-orange-700"
          >
            Đăng nhập
          </Link>
        </section>
      ) : loading ? (
        <section className="mx-auto max-w-[1305px] px-5 py-16" aria-busy="true">
          <p className="animate-pulse text-sm text-stone-500">Đang tải giỏ hàng...</p>
        </section>
      ) : error ? (
        <section className="mx-auto max-w-[760px] px-5 py-20 text-center" aria-live="polite">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={retryCart}
            className="mt-5 inline-flex h-11 items-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-700"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử tải lại
          </button>
        </section>
      ) : items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mx-auto grid max-w-[1305px] gap-10 px-5 py-12 lg:grid-cols-[1fr_360px] lg:gap-14">
          <section aria-label="Sản phẩm trong giỏ hàng">
            <div className="flex items-baseline justify-between border-b border-stone-900 pb-3">
              <h2 className="text-[14px] font-bold uppercase tracking-wide text-stone-900">
                Sản phẩm ({itemCount})
              </h2>
              <Link to="/products" className="text-[12px] font-bold text-stone-900 hover:text-orange-700">
                Tiếp tục mua sắm
              </Link>
            </div>
            <ul>
              {items.map((item) => (
                <CartItem
                  key={item.product.productId}
                  item={item}
                  busy={busyProductId === item.product.productId}
                  onQty={changeQuantity}
                  onRemove={deleteItem}
                />
              ))}
            </ul>
          </section>

          <aside className="h-fit bg-stone-100 p-6 lg:sticky lg:top-6" aria-label="Tóm tắt đơn hàng">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-stone-900">Tóm tắt đơn hàng</h2>
            <span className="mt-3 block h-px w-6 bg-stone-500" aria-hidden="true" />

            <dl className="mt-6 grid gap-3 text-[13px] font-medium text-stone-800">
              <div className="flex justify-between gap-4">
                <dt>Tạm tính</dt>
                <dd className="font-bold">{formatVnd(subtotal)}</dd>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-stone-300 pt-4 text-[15px]">
                <dt className="font-bold text-stone-900">Tổng cộng</dt>
                <dd className="font-bold text-stone-900">{formatVnd(subtotal)}</dd>
              </div>
            </dl>

            <p className="mt-6 text-center text-[11px] leading-5 text-stone-600">
              Cần hỗ trợ đặt hàng? Gọi{' '}
              <a href="tel:0969011078" className="font-bold text-stone-900 hover:text-orange-700">096 9011 078</a>.
            </p>
          </aside>
        </div>
      )}
    </>
  );
};
