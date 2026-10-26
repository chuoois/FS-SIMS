import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TablePagination } from '../components/common/TablePagination';

describe('TablePagination Component', () => {
  it('không render gì nếu totalItems = 0 và currentCount = 0', () => {
    const { container } = render(
      <TablePagination
        currentPage={1}
        totalPages={0}
        totalItems={0}
        currentCount={0}
        onPageChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render đúng thông tin số lượng và trang hiện tại', () => {
    render(
      <TablePagination
        currentPage={1}
        totalPages={3}
        totalItems={25}
        currentCount={10}
        itemLabel="sản phẩm"
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Hiển thị/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/sản phẩm/i)).toBeInTheDocument();
    expect(screen.getByText(/Trang 1 \/ 3/i)).toBeInTheDocument();
  });

  it('disable nút Trước khi đang ở trang 1', () => {
    render(
      <TablePagination
        currentPage={1}
        totalPages={3}
        totalItems={25}
        currentCount={10}
        onPageChange={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /Trước/i });
    const nextBtn = screen.getByRole('button', { name: /Sau/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  it('disable nút Sau khi đang ở trang cuối cùng', () => {
    render(
      <TablePagination
        currentPage={3}
        totalPages={3}
        totalItems={25}
        currentCount={5}
        onPageChange={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /Trước/i });
    const nextBtn = screen.getByRole('button', { name: /Sau/i });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it('gọi onPageChange khi nhấn nút Sau hoặc Trước', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(
      <TablePagination
        currentPage={2}
        totalPages={3}
        totalItems={25}
        currentCount={10}
        onPageChange={handlePageChange}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Sau/i });
    await user.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);

    const prevBtn = screen.getByRole('button', { name: /Trước/i });
    await user.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('gọi onPageChange khi click trực tiếp vào nút số trang', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(
      <TablePagination
        currentPage={1}
        totalPages={3}
        totalItems={25}
        currentCount={10}
        onPageChange={handlePageChange}
      />
    );

    const page2Btn = screen.getByRole('button', { name: '2' });
    await user.click(page2Btn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('render bộ chọn số lượng hiển thị trên trang và gọi onPageSizeChange khi thay đổi', async () => {
    const user = userEvent.setup();
    const handlePageSizeChange = vi.fn();

    render(
      <TablePagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        currentCount={10}
        itemsPerPage={10}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="sản phẩm"
        onPageChange={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox', { name: /Số sản phẩm mỗi trang/i });
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('10');

    await user.selectOptions(select, '20');
    expect(handlePageSizeChange).toHaveBeenCalledWith(20);
  });
});
