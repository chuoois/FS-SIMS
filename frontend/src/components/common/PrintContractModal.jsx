// =========================================================
// PrintContractModal.jsx
// Mẫu in Hợp Đồng Mua Bán Nội Thất chuẩn khổ giấy A4
// Có Quốc hiệu & Tiêu ngữ chuẩn trang trọng
// Sử dụng Iframe in độc lập: TUYỆT ĐỐI KHÔNG in dính danh sách hợp đồng hay bất kỳ bảng nào của trang web
// Hai bên Đại diện Bên A và Bên B chia 2 cột song song (trái - phải)
// Có khoảng trống ký tay rộng rãi (90px) để ký bút mực
// =========================================================

import { Printer, X } from 'lucide-react';

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const PrintContractModal = ({ isOpen, onClose, contract }) => {
  if (!isOpen || !contract) return null;

  const createdDate = contract.createdAt ? new Date(contract.createdAt) : new Date();
  const day = String(createdDate.getDate()).padStart(2, '0');
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const year = createdDate.getFullYear();

  // In qua iframe độc lập: Đảm bảo 100% chỉ in duy nhất văn bản hợp đồng
  const handlePrint = () => {
    const printEl = document.getElementById('printable-contract');
    if (!printEl) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Hop_Dong_${contract.contractCode || 'Mua_Ban'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              letter-spacing: normal !important;
            }
            html, body {
              font-family: 'Times New Roman', Times, serif !important;
              font-size: 13px;
              line-height: 1.5;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            .underline { text-decoration: underline; text-underline-offset: 3px; }
            .divider { width: 140px; margin: 4px auto 8px auto; border-bottom: 1px solid #000; }
            .tracking-wider, .tracking-wide { letter-spacing: normal !important; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 10px; font-family: 'Times New Roman', Times, serif; }
            table.data-table th, table.data-table td { border: 1px solid #222; padding: 6px 8px; font-size: 12px; }
            table.data-table th { background-color: #f2f2f2; font-weight: bold; }
            table.layout-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 12px; font-family: 'Times New Roman', Times, serif; }
            table.layout-table td { border: none; padding: 0; vertical-align: top; }
            table.signature-table { width: 100%; border-collapse: collapse; border: none; margin-top: 25px; margin-bottom: 10px; font-family: 'Times New Roman', Times, serif; }
            table.signature-table td { border: none; padding: 0 10px; text-align: center; vertical-align: top; width: 50%; }
            .sign-space { height: 90px; min-height: 90px; }
          </style>
        </head>
        <body>
          ${printEl.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm print:hidden">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Header điều khiển màn hình */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Xem Trước & In Hợp Đồng Bản Giấy (A4)</h3>
              <p className="text-xs text-stone-400">
                Chỉ in duy nhất tờ hợp đồng A4 — Bên A và Bên B chia 2 cột có chỗ ký tay bút mực
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-amber-800"
            >
              <Printer className="h-4 w-4" />
              In hợp đồng / Lưu file PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG VĂN BẢN HỢP ĐỒNG (CHUẨN TRANG IN A4) */}
        <div className="max-h-[80vh] overflow-y-auto p-4 bg-stone-100/50">
          <div
            id="printable-contract"
            className="mx-auto max-w-3xl p-10 text-stone-900 bg-white shadow-sm border border-stone-200 text-xs"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              minHeight: '297mm',
              lineHeight: '1.5',
              textRendering: 'optimizeLegibility',
              letterSpacing: 'normal',
            }}
          >
            {/* Quốc hiệu & Tiêu ngữ */}
            <div className="text-center">
              <h2 className="text-sm font-bold uppercase" style={{ letterSpacing: '0px' }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </h2>
              <p className="text-xs font-semibold underline underline-offset-4" style={{ letterSpacing: '0px' }}>
                Độc lập - Tự do - Hạnh phúc
              </p>
              <div className="divider mx-auto my-1.5 w-32 border-b border-stone-800"></div>
              <p className="mt-1 text-xs italic text-stone-600">
                TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
              </p>
            </div>

            {/* Tiêu đề Hợp đồng */}
            <div className="my-5 text-center">
              <h1 className="text-xl font-bold uppercase text-stone-950" style={{ letterSpacing: '0px' }}>
                HỢP ĐỒNG MUA BÁN NỘI THẤT
              </h1>
              <p className="mt-1 text-xs font-bold text-stone-800">
                Số: <span className="font-mono">{contract.contractCode}</span>
              </p>
            </div>

            {/* Thông tin Hai Bên Mua & Bán (Chia 2 cột song song bằng Table) */}
            <table className="layout-table w-full mb-4 border-collapse" style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginBottom: '14px' }}>
              <tbody>
                <tr style={{ border: 'none' }}>
                  <td style={{ width: '50%', border: 'none', verticalAlign: 'top', paddingRight: '12px' }}>
                    <div style={{ borderLeft: '2px solid #222', paddingLeft: '10px' }}>
                      <p className="font-bold uppercase text-stone-950 mb-1" style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                        BÊN BÁN (BÊN A)
                      </p>
                      <p style={{ margin: '2px 0' }}>Đơn vị: <strong>Xưởng Sản Xuất Nội Thất Góc Nhà</strong></p>
                      <p style={{ margin: '2px 0' }}>Địa chỉ: 12 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM</p>
                      <p style={{ margin: '2px 0' }}>Hotline: 0900 000 001 — Email: contact@gocnha.vn</p>
                      <p style={{ margin: '2px 0' }}>Đại diện: <strong>{contract.signerName || 'Nhân viên kinh doanh'}</strong></p>
                    </div>
                  </td>

                  <td style={{ width: '50%', border: 'none', verticalAlign: 'top', paddingLeft: '12px' }}>
                    <div style={{ borderLeft: '2px solid #222', paddingLeft: '10px' }}>
                      <p className="font-bold uppercase text-stone-950 mb-1" style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                        BÊN MUA (BÊN B)
                      </p>
                      <p style={{ margin: '2px 0' }}>Khách hàng: <strong>{contract.customerName}</strong></p>
                      <p style={{ margin: '2px 0' }}>Số điện thoại: <strong>{contract.customerPhone}</strong></p>
                      <p style={{ margin: '2px 0' }}>Địa chỉ nhận hàng: <strong>{contract.customerAddress || 'Nhận trực tiếp tại showroom/cửa hàng'}</strong></p>
                      <p style={{ margin: '2px 0' }}>Địa điểm lập: {contract.signedPlace || 'Cửa hàng Xưởng Góc Nhà'}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ĐIỀU 1: DANH MỤC HÀNG HÓA VÀ GIÁ TRỊ HỢP ĐỒNG */}
            <div className="mb-4">
              <p className="font-bold uppercase text-stone-900 mb-1" style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                ĐIỀU 1: DANH MỤC HÀNG HÓA VÀ GIÁ TRỊ HỢP ĐỒNG
              </p>
              <table className="data-table w-full border-collapse border border-stone-800 text-xs" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', marginBottom: '10px' }}>
                <thead>
                  <tr className="bg-stone-100 font-bold text-center border-b border-stone-800" style={{ backgroundColor: '#f2f2f2' }}>
                    <th className="border border-stone-800 px-2 py-1.5 w-10" style={{ border: '1px solid #222', padding: '6px 8px' }}>STT</th>
                    <th className="border border-stone-800 px-2 py-1.5 w-24" style={{ border: '1px solid #222', padding: '6px 8px' }}>Mã SP</th>
                    <th className="border border-stone-800 px-3 py-1.5 text-left" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'left' }}>Tên sản phẩm / Quy cách</th>
                    <th className="border border-stone-800 px-2 py-1.5 w-16 text-center" style={{ border: '1px solid #222', padding: '6px 8px' }}>ĐVT</th>
                    <th className="border border-stone-800 px-2 py-1.5 w-16 text-center" style={{ border: '1px solid #222', padding: '6px 8px' }}>SL</th>
                    <th className="border border-stone-800 px-3 py-1.5 text-right w-28" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right' }}>Đơn giá</th>
                    <th className="border border-stone-800 px-3 py-1.5 text-right w-32" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(contract.items || []).map((item, idx) => (
                    <tr key={item.contractItemId || idx} className="border-b border-stone-400">
                      <td className="border border-stone-800 px-2 py-1.5 text-center" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td className="border border-stone-800 px-2 py-1.5 text-center font-mono font-medium" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'center' }}>
                        {item.productCode || '---'}
                      </td>
                      <td className="border border-stone-800 px-3 py-1.5 font-medium" style={{ border: '1px solid #222', padding: '6px 8px' }}>
                        {item.productName}
                        {item.description && (
                          <span className="block text-[10px] italic text-stone-600" style={{ display: 'block', fontSize: '10px', fontStyle: 'italic', color: '#666' }}>
                            ({item.description})
                          </span>
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-1.5 text-center" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'center' }}>Cái</td>
                      <td className="border border-stone-800 px-2 py-1.5 text-center font-bold" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                        {item.quantity}
                      </td>
                      <td className="border border-stone-800 px-3 py-1.5 text-right" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right' }}>
                        {formatVND(item.unitPrice)}
                      </td>
                      <td className="border border-stone-800 px-3 py-1.5 text-right font-bold" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatVND(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                  {/* Dòng Tổng cộng */}
                  <tr className="border-t-2 border-stone-800 font-bold bg-stone-50" style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                    <td colSpan={6} className="border border-stone-800 px-3 py-1.5 text-right uppercase" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right', textTransform: 'uppercase' }}>
                      Tổng giá trị hợp đồng:
                    </td>
                    <td className="border border-stone-800 px-3 py-1.5 text-right text-xs font-bold" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatVND(contract.totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="border border-stone-800 px-3 py-1.5 text-right text-stone-700" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right' }}>
                      Số tiền đặt cọc đã thanh toán:
                    </td>
                    <td className="border border-stone-800 px-3 py-1.5 text-right font-bold" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatVND(contract.depositAmount)}
                    </td>
                  </tr>
                  <tr className="font-bold" style={{ fontWeight: 'bold' }}>
                    <td colSpan={6} className="border border-stone-800 px-3 py-1.5 text-right uppercase text-stone-900" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right', textTransform: 'uppercase' }}>
                      Số tiền còn lại cần thanh toán khi nhận hàng:
                    </td>
                    <td className="border border-stone-800 px-3 py-1.5 text-right text-xs font-bold text-stone-900" style={{ border: '1px solid #222', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatVND(contract.remainingAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ĐIỀU 2: GIAO NHẬN & BẢO HÀNH */}
            <div className="mb-4 leading-relaxed">
              <p className="font-bold uppercase text-stone-900 mb-1" style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                ĐIỀU 2: THỜI GIAN GIAO NHẬN VÀ BẢO HÀNH
              </p>
              <p style={{ margin: '2px 0' }}>- <strong>Ngày giao dự kiến:</strong> {contract.deliveryDate ? `Ngày ${contract.deliveryDate}` : 'Theo thỏa thuận khi hoàn thiện đơn hàng'}.</p>
              <p style={{ margin: '2px 0' }}>- <strong>Địa điểm bàn giao:</strong> {contract.customerAddress || 'Tại quầy / showroom cửa hàng Góc Nhà'}.</p>
              <p style={{ margin: '2px 0' }}>- <strong>Cam kết chất lượng:</strong> Sản phẩm mới 100%, bảo hành kỹ thuật 12 tháng tại Xưởng Nội Thất Góc Nhà.</p>
              <p style={{ margin: '2px 0' }}>- <strong>Nghĩa vụ Bên B:</strong> Kiểm tra kỹ sản phẩm trước khi nhận bàn giao và thanh toán đủ số tiền còn lại.</p>
            </div>

            {/* ĐIỀU 3: HIỆU LỰC & CHỮ KÝ */}
            <div className="mb-2 leading-relaxed">
              <p className="font-bold uppercase text-stone-900 mb-1" style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                ĐIỀU 3: HIỆU LỰC HỢP ĐỒNG & CHỮ KÝ BÚT MỰC
              </p>
              <p style={{ margin: '2px 0' }}>- Hợp đồng này được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản để thực hiện.</p>
              <p style={{ margin: '2px 0' }}>- Hai bên cùng đọc, hiểu rõ nội dung và đồng ý ký tên dưới đây bằng bút mực:</p>
            </div>

            {/* CHỮ KÝ HAI BÊN (BẢN GIẤY) - CHIA 2 CỘT RÕ RÀNG VÀ CÓ KHOẢNG TRỐNG KÝ TAY 90PX */}
            <table
              className="signature-table w-full border-collapse"
              style={{
                width: '100%',
                border: 'none',
                borderCollapse: 'collapse',
                marginTop: '25px',
                marginBottom: '10px',
              }}
            >
              <tbody>
                <tr style={{ border: 'none' }}>
                  {/* Cột Bên A: Đại diện bên bán (Bên trái) */}
                  <td
                    style={{
                      width: '50%',
                      border: 'none',
                      textAlign: 'center',
                      verticalAlign: 'top',
                      padding: '0 15px',
                    }}
                  >
                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 4px 0', fontSize: '13px' }}>
                      ĐẠI DIỆN BÊN BÁN (BÊN A)
                    </p>
                    <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#555', margin: '0' }}>
                      (Ký, ghi rõ họ tên bằng bút mực)
                    </p>
                    {/* Khoảng trống ký tay mực cao 90px */}
                    <div className="sign-space" style={{ height: '90px', minHeight: '90px' }}></div>

                  </td>

                  {/* Cột Bên B: Đại diện bên mua (Bên phải) */}
                  <td
                    style={{
                      width: '50%',
                      border: 'none',
                      textAlign: 'center',
                      verticalAlign: 'top',
                      padding: '0 15px',
                    }}
                  >
                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 4px 0', fontSize: '13px' }}>
                      ĐẠI DIỆN BÊN MUA (BÊN B)
                    </p>
                    <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#555', margin: '0' }}>
                      (Ký, ghi rõ họ tên bằng bút mực)
                    </p>
                    {/* Khoảng trống ký tay mực cao 90px */}
                    <div className="sign-space" style={{ height: '90px', minHeight: '90px' }}></div>

                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer điều khiển màn hình */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Đóng lại
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-amber-800 px-5 py-2 text-xs font-bold text-white shadow hover:bg-amber-900"
          >
            <Printer className="h-4 w-4" />
            In hợp đồng bản giấy
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintContractModal;
