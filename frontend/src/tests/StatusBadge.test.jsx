import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  StatusBadge,
  OrderRequestStatusBadge,
  ContractStatusBadge,
  CustomerOrderStatusBadge,
  ProductionOrderStatusBadge,
  ReceiptStatusBadge,
  MaterialIssueStatusBadge,
  AccountStatusBadge,
} from '../components/common/StatusBadge';

describe('StatusBadge Components', () => {
  describe('OrderRequestStatusBadge', () => {
    it('renders PENDING status in Vietnamese with role status', () => {
      render(<OrderRequestStatusBadge status="PENDING" />);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Chờ tiếp nhận');
    });

    it('renders CONFIRMED status', () => {
      render(<OrderRequestStatusBadge status="CONFIRMED" />);
      expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
    });

    it('renders DRAFTING status', () => {
      render(<OrderRequestStatusBadge status="DRAFTING" />);
      expect(screen.getByText('Đang phác thảo')).toBeInTheDocument();
    });

    it('renders DESIGNED status', () => {
      render(<OrderRequestStatusBadge status="DESIGNED" />);
      expect(screen.getByText('Đã có bản vẽ')).toBeInTheDocument();
    });

    it('renders CONTRACT_CREATED status', () => {
      render(<OrderRequestStatusBadge status="CONTRACT_CREATED" />);
      expect(screen.getByText('Đã tạo hợp đồng')).toBeInTheDocument();
    });

    it('renders CONVERTED status', () => {
      render(<OrderRequestStatusBadge status="CONVERTED" />);
      expect(screen.getByText('Đã chuyển đơn')).toBeInTheDocument();
    });

    it('renders REJECTED and CANCELLED statuses', () => {
      const { rerender } = render(<OrderRequestStatusBadge status="REJECTED" />);
      expect(screen.getByText('Từ chối')).toBeInTheDocument();

      rerender(<OrderRequestStatusBadge status="CANCELLED" />);
      expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    });

    it('renders fallback when status is unknown', () => {
      render(<OrderRequestStatusBadge status="UNKNOWN_STATUS" />);
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    });
  });

  describe('ContractStatusBadge', () => {
    it('renders DRAFT as Chờ ký', () => {
      render(<ContractStatusBadge status="DRAFT" />);
      expect(screen.getByText('Chờ ký')).toBeInTheDocument();
    });

    it('renders SIGNED as Đã ký kết', () => {
      render(<ContractStatusBadge status="SIGNED" />);
      expect(screen.getByText('Đã ký kết')).toBeInTheDocument();
    });

    it('renders CANCELLED as Đã hủy', () => {
      render(<ContractStatusBadge status="CANCELLED" />);
      expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    });
  });

  describe('CustomerOrderStatusBadge', () => {
    it('renders NEW status as Đơn mới', () => {
      render(<CustomerOrderStatusBadge status="NEW" />);
      expect(screen.getByText('Đơn mới')).toBeInTheDocument();
    });

    it('renders IN_PROGRESS as Đang sản xuất', () => {
      render(<CustomerOrderStatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText('Đang sản xuất')).toBeInTheDocument();
    });

    it('renders READY_TO_DELIVER as Sẵn sàng giao', () => {
      render(<CustomerOrderStatusBadge status="READY_TO_DELIVER" />);
      expect(screen.getByText('Sẵn sàng giao')).toBeInTheDocument();
    });

    it('renders COMPLETED as Hoàn thành', () => {
      render(<CustomerOrderStatusBadge status="COMPLETED" />);
      expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    });
  });

  describe('ProductionOrderStatusBadge', () => {
    it('renders ASSIGNED as Đã giao việc', () => {
      render(<ProductionOrderStatusBadge status="ASSIGNED" />);
      expect(screen.getByText('Đã giao việc')).toBeInTheDocument();
    });

    it('renders SUBMITTED as Báo hoàn thành', () => {
      render(<ProductionOrderStatusBadge status="SUBMITTED" />);
      expect(screen.getByText('Báo hoàn thành')).toBeInTheDocument();
    });

    it('renders COMPLETED as Đã nghiệm thu', () => {
      render(<ProductionOrderStatusBadge status="COMPLETED" />);
      expect(screen.getByText('Đã nghiệm thu')).toBeInTheDocument();
    });
  });

  describe('Universal StatusBadge component', () => {
    it('routes correctly by type prop', () => {
      const { rerender } = render(<StatusBadge type="contract" status="SIGNED" />);
      expect(screen.getByText('Đã ký kết')).toBeInTheDocument();

      rerender(<StatusBadge type="order_request" status="PENDING" />);
      expect(screen.getByText('Chờ tiếp nhận')).toBeInTheDocument();

      rerender(<StatusBadge type="production_order" status="IN_PROGRESS" />);
      expect(screen.getByText('Đang gia công')).toBeInTheDocument();

      rerender(<StatusBadge type="receipt" status="CONFIRMED" />);
      expect(screen.getByText('Đã nhập kho')).toBeInTheDocument();

      rerender(<StatusBadge type="material_issue" status="CONFIRMED" />);
      expect(screen.getByText('Đã xuất kho')).toBeInTheDocument();

      rerender(<StatusBadge type="account" status="ACTIVE" />);
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
    });

    it('supports size prop (sm, md, lg)', () => {
      const { container } = render(<StatusBadge type="customer_order" status="COMPLETED" size="lg" />);
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain('text-sm');
    });
  });
});
