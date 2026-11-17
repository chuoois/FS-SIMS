import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, PackageCheck, Ruler, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getProductById } from '../../services/productService';

const formatVnd = (value) => {
  const price = Number(value);
  return value === null || value === undefined || Number.isNaN(price)
    ? 'Liên hệ'
    : `${price.toLocaleString('vi-VN')} ₫`;
};

const ProductImage = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="aspect-square w-full object-cover"
    />
  ) : (
    <div
      className="grid aspect-square w-full place-items-center bg-stone-100 text-xs uppercase tracking-widest text-stone-400"
      role="img"
      aria-label={alt}
    >
      Chưa có ảnh sản phẩm
    </div>
  );
};

const ProductSkeleton = () => (
  <div className="mx-auto grid max-w-[1305px] animate-pulse gap-10 px-5 py-12 md:grid-cols-2 md:gap-16">
    <div className="aspect-square bg-stone-200" />
    <div className="space-y-5 py-4">
      <div className="h-3 w-1/3 bg-stone-200" />
      <div className="h-9 w-4/5 bg-stone-200" />
      <div className="h-6 w-1/4 bg-stone-200" />
      <div className="h-px bg-stone-200" />
      <div className="h-4 w-full bg-stone-200" />
      <div className="h-4 w-5/6 bg-stone-200" />
    </div>
  </div>
);

const Breadcrumb = ({ productName }) => (
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
    <Link to="/home" className="hover:text-stone-900 hover:underline">Trang chủ</Link>
    <span aria-hidden="true">/</span>
    <Link to="/products" className="hover:text-stone-900 hover:underline">Sản phẩm</Link>
    <span aria-hidden="true">/</span>
    <span aria-current="page" className="max-w-[240px] truncate text-stone-800">{productName}</span>
  </nav>
);

const ProductFacts = ({ product }) => {
  const facts = [
    ['Mã sản phẩm', product.productCode],
    ['Danh mục', product.categoryName],
    ['Không gian', product.roomName],
    ['Chất liệu', product.materialName],
    ['Màu sắc', product.colorName],
    ['Kích thước', product.dimensions?.formatted],
  ].filter(([, value]) => value);

  if (!facts.length) return null;

  return (
    <dl className="mt-8 grid gap-3 border-t border-stone-200 pt-6 sm:grid-cols-2">
      {facts.map(([label, value]) => (
        <div key={label} className="flex gap-2 text-[13px]">
          <dt className="shrink-0 text-stone-500">{label}:</dt>
          <dd className="font-medium text-stone-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const SetContents = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!items?.length) return null;

  return (
    <section className="mt-8 border-t border-stone-200 pt-6">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="set-content-panel"
        className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700">Chi tiết bộ sản phẩm</p>
          <span className="mt-1 block text-lg font-semibold text-stone-900">Sản phẩm trong bộ</span>
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-stone-500">{items.length} món</span>
          <ChevronDown
            className={`size-5 text-stone-700 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>
      {isOpen && (
        <ul id="set-content-panel" className="mt-4 grid gap-4">
          {items.map((item) => (
          <li
            key={item.setItemId ?? item.productId}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border border-stone-200 bg-white p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4"
          >
            <Link
              to={`/products/${item.productId}`}
              aria-label={`Xem chi tiết ${item.productName}`}
              className="h-fit overflow-hidden"
            >
              <ProductImage src={item.imageUrl} alt={item.productName || 'Sản phẩm trong bộ'} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {(item.categoryName || item.productCode) && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {[item.categoryName, item.productCode].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <h3 className="mt-1 font-semibold text-stone-900">
                    <Link to={`/products/${item.productId}`} className="hover:text-orange-700 hover:underline">
                      {item.productName}
                    </Link>
                  </h3>
                </div>
                <span className="shrink-0 bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-700">
                  Số lượng: {item.quantity}
                </span>
              </div>

              <p className="mt-2 text-sm font-bold text-stone-900">{formatVnd(item.unitPrice)}</p>

              {(item.description || item.dimensions || item.materialName || item.colorName || item.roomName) && (
                <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                  {item.dimensions && (
                    <div className="flex gap-1.5">
                      <dt className="text-stone-500">Kích thước:</dt>
                      <dd className="text-stone-800">{item.dimensions}</dd>
                    </div>
                  )}
                  {item.materialName && (
                    <div className="flex gap-1.5">
                      <dt className="text-stone-500">Chất liệu:</dt>
                      <dd className="text-stone-800">{item.materialName}</dd>
                    </div>
                  )}
                  {item.colorName && (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-stone-500">Màu sắc:</dt>
                      {item.colorHex && (
                        <span
                          className="size-3 rounded-full border border-stone-300"
                          style={{ backgroundColor: item.colorHex }}
                          aria-label={`Màu ${item.colorName}`}
                        />
                      )}
                      <dd className="text-stone-800">{item.colorName}</dd>
                    </div>
                  )}
                  {item.roomName && (
                    <div className="flex gap-1.5">
                      <dt className="text-stone-500">Không gian:</dt>
                      <dd className="text-stone-800">{item.roomName}</dd>
                    </div>
                  )}
                </dl>
              )}

              {item.description && (
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-stone-600">{item.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                <span className={`text-[11px] ${Number(item.stockQuantity) > 0 ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {Number(item.stockQuantity) > 0 ? `Còn ${item.stockQuantity} sản phẩm` : 'Tạm hết hàng'}
                </span>
              </div>
            </div>
          </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const ProductDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addItem, loading: cartLoading } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setProduct(null);

    getProductById(id)
      .then((response) => {
        if (!cancelled) setProduct(response?.data ?? null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('[ProductDetailPage] Không thể tải chi tiết sản phẩm:', requestError);
        setError(
          requestError.response?.status === 404
            ? 'Sản phẩm không tồn tại hoặc hiện không được kinh doanh.'
            : 'Không thể tải thông tin sản phẩm. Vui lòng thử lại.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (loading) return <ProductSkeleton />;

  if (error || !product) {
    return (
      <section className="mx-auto max-w-[760px] px-5 py-24 text-center" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">Góc Nhà</p>
        <h1 className="mt-3 text-2xl font-light text-stone-900">
          {error || 'Không tìm thấy sản phẩm.'}
        </h1>
        {error && (
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-6 h-11 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
          >
            Thử lại
          </button>
        )}
        <div>
          <Link to="/products" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-orange-700">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại danh sách sản phẩm
          </Link>
        </div>
      </section>
    );
  }

  const inStock = Number(product.stockQuantity) > 0;
  const specifications = [
    { icon: PackageCheck, text: inStock ? `Còn ${product.stockQuantity} sản phẩm` : 'Tạm hết hàng' },
    { icon: Truck, text: 'Hỗ trợ giao hàng và lắp đặt' },
    ...(product.dimensions?.formatted
      ? [{ icon: Ruler, text: `Kích thước: ${product.dimensions.formatted}` }]
      : []),
  ];

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await addItem(product.productId, 1);
      toast.success('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Không thể thêm sản phẩm vào giỏ hàng.');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1305px] px-5 pb-20 pt-8 lg:px-8">
      <Breadcrumb productName={product.productName || 'Chi tiết sản phẩm'} />

      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
        <div className="h-fit overflow-hidden bg-stone-100">
          <ProductImage src={product.imageUrl} alt={product.productName || 'Sản phẩm'} />
        </div>

        <article className="py-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
            {product.categoryName && <span>{product.categoryName}</span>}
            {product.isSet && <span className="border border-orange-200 px-2 py-1">Sản phẩm bộ</span>}
          </div>
          <h1 className="mt-3 text-3xl font-light leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {product.productName}
          </h1>
          {product.productCode && (
            <p className="mt-3 text-xs text-stone-500">Mã sản phẩm: {product.productCode}</p>
          )}

          <p className="mt-6 text-2xl font-semibold text-stone-900">{formatVnd(product.price)}</p>
          <p className={`mt-3 inline-flex items-center gap-2 text-[13px] ${inStock ? 'text-emerald-700' : 'text-stone-500'}`}>
            <Check className="size-4" aria-hidden="true" />
            {inStock ? 'Sẵn sàng giao hàng' : 'Vui lòng liên hệ để được tư vấn'}
          </p>

          {product.description && (
            <section className="mt-7 border-t border-stone-200 pt-6" aria-labelledby="description-title">
              <h2 id="description-title" className="text-sm font-bold text-stone-900">Mô tả sản phẩm</h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-7 text-stone-600">{product.description}</p>
            </section>
          )}

          <ProductFacts product={product} />
          <SetContents items={product.setItems} />

          <div className="mt-8 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart || cartLoading}
                className="inline-flex h-12 flex-1 items-center justify-center bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
              >
                {addingToCart
                  ? 'Đang thêm...'
                  : cartLoading
                    ? 'Đang tải giỏ hàng...'
                    : inStock
                      ? 'Thêm vào giỏ hàng'
                      : 'Tạm hết hàng'}
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-12 flex-1 items-center justify-center bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
              >
                Đăng nhập để mua hàng
              </Link>
            )}
            <Link
              to="/products"
              className="inline-flex h-12 items-center justify-center border border-stone-300 px-6 text-xs font-bold uppercase tracking-widest text-stone-800 transition-colors hover:border-stone-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
            >
              Tiếp tục xem sản phẩm
            </Link>
          </div>

          {specifications.length > 0 && (
            <ul className="mt-8 grid gap-3 border-t border-stone-200 pt-6 text-[12px] text-stone-600 sm:grid-cols-2">
              {specifications.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-stone-800" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
};
