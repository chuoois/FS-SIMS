import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatableCombobox } from '../components/common/CreatableCombobox';

describe('CreatableCombobox Component', () => {
  const sampleMaterials = [
    { material_id: 1, material_name: 'Gỗ sồi' },
    { material_id: 2, material_name: 'Gỗ óc chó' },
    { material_id: 3, material_name: 'Gỗ thông' },
  ];

  const sampleColors = [
    { color_id: 1, color_name: 'Màu gỗ tự nhiên', hex_value: '#D2B48C' },
    { color_id: 2, color_name: 'Trắng', hex_value: '#FFFFFF' },
    { color_id: 3, color_name: 'Đen', hex_value: '#000000' },
  ];

  it('hiển thị đúng giá trị đã chọn ban đầu', () => {
    render(
      <CreatableCombobox
        label="Chất liệu"
        value={1}
        options={sampleMaterials}
        valueKey="material_id"
        labelKey="material_name"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue('Gỗ sồi');
    expect(input).toBeInTheDocument();
  });

  it('xổ danh sách và lọc khi người dùng gõ tìm kiếm', async () => {
    const user = userEvent.setup();
    render(
      <CreatableCombobox
        label="Chất liệu"
        value=""
        options={sampleMaterials}
        valueKey="material_id"
        labelKey="material_name"
        placeholder="Tìm chất liệu..."
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Tìm chất liệu...');
    await user.click(input);

    // Gõ từ khóa tìm kiếm
    await user.type(input, 'thông');

    // Option 'Gỗ thông' phải hiển thị, 'Gỗ sồi' không hiển thị
    expect(screen.getByText('Gỗ thông')).toBeInTheDocument();
    expect(screen.queryByText('Gỗ sồi')).not.toBeInTheDocument();
  });

  it('cho phép chọn option có sẵn trong danh sách', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CreatableCombobox
        label="Chất liệu"
        value=""
        options={sampleMaterials}
        valueKey="material_id"
        labelKey="material_name"
        placeholder="Tìm chất liệu..."
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText('Tìm chất liệu...');
    await user.click(input);

    const optionOak = screen.getByText('Gỗ óc chó');
    await user.click(optionOak);

    expect(handleChange).toHaveBeenCalledWith(2, sampleMaterials[1]);
  });

  it('hiển thị nút thêm mới khi gõ dữ liệu chưa có trong hệ thống và gọi onCreate', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const handleCreate = vi.fn().mockResolvedValue({
      material_id: 99,
      material_name: 'Gỗ hương',
    });

    render(
      <CreatableCombobox
        label="Chất liệu"
        value=""
        options={sampleMaterials}
        valueKey="material_id"
        labelKey="material_name"
        placeholder="Tìm chất liệu..."
        onChange={handleChange}
        onCreate={handleCreate}
      />
    );

    const input = screen.getByPlaceholderText('Tìm chất liệu...');
    await user.click(input);
    await user.type(input, 'Gỗ hương');

    // Nút thêm mới xuất hiện
    const createBtn = screen.getByRole('button', { name: /Thêm mới chất liệu: "Gỗ hương"/i });
    expect(createBtn).toBeInTheDocument();

    // Click nút thêm mới
    await user.click(createBtn);

    expect(handleCreate).toHaveBeenCalledWith('Gỗ hương', {});
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(99, {
        material_id: 99,
        material_name: 'Gỗ hương',
      });
    });
  });

  it('hỗ trợ thêm màu sắc mới kèm mã hex', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const handleCreate = vi.fn().mockResolvedValue({
      color_id: 50,
      color_name: 'Xanh rêu',
      hex_value: '#2E7D32',
    });

    render(
      <CreatableCombobox
        label="Màu sắc"
        isColor
        value=""
        options={sampleColors}
        valueKey="color_id"
        labelKey="color_name"
        colorKey="hex_value"
        placeholder="Tìm màu..."
        onChange={handleChange}
        onCreate={handleCreate}
      />
    );

    const input = screen.getByPlaceholderText('Tìm màu...');
    await user.click(input);
    await user.type(input, 'Xanh rêu');

    const createBtn = screen.getByRole('button', { name: /Thêm mới màu sắc: "Xanh rêu"/i });
    expect(createBtn).toBeInTheDocument();

    await user.click(createBtn);

    expect(handleCreate).toHaveBeenCalledWith('Xanh rêu', expect.objectContaining({ hex_value: expect.any(String) }));
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(50, {
        color_id: 50,
        color_name: 'Xanh rêu',
        hex_value: '#2E7D32',
      });
    });
  });

  it('cho phép xóa lựa chọn hiện tại bằng nút X', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CreatableCombobox
        label="Chất liệu"
        value={1}
        options={sampleMaterials}
        valueKey="material_id"
        labelKey="material_name"
        onChange={handleChange}
      />
    );

    const clearBtn = screen.getByTitle('Xóa lựa chọn');
    await user.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith('', null);
  });
});
