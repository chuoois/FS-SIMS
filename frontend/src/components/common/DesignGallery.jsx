import { ExternalLink, FileText, RotateCw, Trash2 } from 'lucide-react';

export function isOwnerDesignImage(img) {
  if (!img) return false;
  if (typeof img === 'string') return img.includes('design_files');
  return Boolean(
    img.imageType === 'OWNER_DESIGN' ||
      img.isOwnerDesign ||
      (typeof img.createdBy === 'string' && img.createdBy.toUpperCase().includes('OWNER')) ||
      (typeof img.imageUrl === 'string' && img.imageUrl.includes('design_files'))
  );
}

export function isPdfDesignUrl(url = '') {
  return (
    typeof url === 'string' &&
    (url.toLowerCase().includes('.pdf') || url.includes('/raw/upload/'))
  );
}

/**
 * Shared responsive 3-column thumbnail grid for customer reference images & workshop drawings.
 * Supports lightbox preview (optional) and Owner delete action (optional).
 */
export function DesignGallery({
  images = [],
  badgeText,
  badgeClassName,
  borderClassName,
  emptyText,
  emptyClassName,
  onPreview,
  onDelete,
  deletingImageId,
}) {
  if (!images || images.length === 0) {
    if (!emptyText) return null;
    return <div className={emptyClassName}>{emptyText}</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-2.5">
      {images.map((img, imgIdx) => {
        const url = typeof img === 'string' ? img : img?.imageUrl;
        if (!url) return null;
        const imgId = typeof img === 'object' ? (img.imageId || img.requestImageId || null) : null;
        const isPdf = isPdfDesignUrl(url);
        const isDeleting = Boolean(onDelete && imgId && deletingImageId === imgId);
        const useModalPreview = Boolean(onPreview && !isPdf);

        const visualBody = (
          <>
            {isPdf ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-stone-50 p-2 text-center text-stone-700">
                <FileText className="h-6 w-6 text-rose-600" />
                <span className="text-[10px] font-semibold leading-tight">Tài liệu PDF</span>
              </div>
            ) : (
              <img
                src={url}
                alt={`${badgeText} ${imgIdx + 1}`}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-xs font-medium gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> {useModalPreview ? 'Phóng to' : 'Xem lớn'}
            </div>
          </>
        );

        return (
          <div
            key={imgId || `${url}-${imgIdx}`}
            className={`group relative overflow-hidden rounded-lg border bg-white aspect-square shadow-2xs transition ${borderClassName}`}
          >
            {useModalPreview ? (
              <button
                type="button"
                onClick={() => onPreview(url)}
                className="block h-full w-full text-left cursor-pointer"
                title="Phóng to hình ảnh"
              >
                {visualBody}
              </button>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block h-full w-full"
              >
                {visualBody}
              </a>
            )}

            <span
              className={`pointer-events-none absolute top-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs backdrop-blur-xs ${badgeClassName}`}
            >
              {badgeText}
            </span>

            {onDelete && imgId && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(img);
                }}
                aria-label={`Xóa ${badgeText.toLowerCase()} ${imgIdx + 1}`}
                title="Xóa bản vẽ này"
                className="absolute top-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600/95 text-white shadow hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {isDeleting ? (
                  <RotateCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
