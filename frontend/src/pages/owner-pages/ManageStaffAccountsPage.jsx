// =========================================================
// ManageStaffAccountsPage.jsx
// Giao diện Quản lý tài khoản nhân viên dành riêng cho Chủ xưởng (Owner)
// Chức năng:
//  - Xem danh sách tài khoản nhân viên cấp dưới (Sales, Staff Leader - không hiển thị Owner, Customer)
//  - Tìm kiếm, lọc theo vai trò & trạng thái
//  - Thống kê tổng quan số lượng nhân sự
//  - Tạo tài khoản nhân sự mới (chọn vai trò)
//  - Xem chi tiết thông tin tài khoản
//  - Chỉnh sửa thông tin, đặt lại mật khẩu
//  - Khóa / Mở khóa tài khoản nhân viên
//  - Xóa tài khoản nhân viên
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất Góc Nhà)
// =========================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RotateCw,
  Briefcase,
  Hammer,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Pencil,
  Lock,
  Unlock,
  Trash2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  X,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStaffAccounts,
  getStaffRoles,
  createStaffAccount,
  updateStaffAccount,
  changeStaffAccountStatus,
  deleteStaffAccount,
} from '../../services/staffAccountService';
import { ROLES, ROLE_NAMES } from '../../constants/roles';
import { TablePagination } from '../../components/common/TablePagination';
import { AccountStatusBadge } from '../../components/common/StatusBadge';
import { formatDateVN as formatDate } from '../../utils/formatters';

// Role Badge Helpers dành riêng cho nhân viên cấp dưới xưởng gỗ: Sales, Staff Leader
const ROLE_CONFIG = {
  SALES: {
    label: 'Kinh doanh (Sales)',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: Briefcase,
  },
  LEADERSTAFF: {
    label: 'Tổ trưởng xưởng (Leader Staff)',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    icon: Hammer,
  },
};

// Tabs lọc trạng thái nhân sự
const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả nhân sự' },
  { key: 'ACTIVE', label: 'Đang hoạt động' },
  { key: 'INACTIVE', label: 'Đã khóa' },
];

export const ManageStaffAccountsPage = () => {
  // ── States ────────────────────────────────────────────────
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [serverStats, setServerStats] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    roleId: '',
    gender: 'MALE',
    dob: '',
    address: '',
    note: '',
  });

  const [editForm, setEditForm] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    roleId: '',
    gender: 'MALE',
    dob: '',
    address: '',
    note: '',
    password: '',
  });

  // ── Fetch accounts & roles ────────────────────────────────
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      try {
        const params = {
          search: searchTerm.trim() || undefined,
          role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
          status: selectedStatusFilter !== 'ALL' ? selectedStatusFilter : undefined,
          page: currentPage,
          limit: pageSize,
        };

        const [accRes, roleRes] = await Promise.all([
          getStaffAccounts(params),
          getStaffRoles(),
        ]);

        setAccounts(accRes?.data || []);
        if (accRes?.pagination) {
          setPagination(accRes.pagination);
        }
        if (accRes?.stats) {
          setServerStats(accRes.stats);
        }
        setRoles(roleRes?.roles || []);
      } catch (err) {
        console.error('Lỗi tải dữ liệu tài khoản nhân viên:', err);
        toast.error(err?.response?.data?.message || 'Không thể tải danh sách tài khoản');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchTerm, selectedRoleFilter, selectedStatusFilter, currentPage, pageSize]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics calculation (ưu tiên stats từ server, fallback đếm từ danh sách hiện tại)
  const stats = useMemo(() => {
    if (serverStats) return serverStats;
    const total = pagination.totalItems || accounts.length;
    const active = accounts.filter((a) => a.status === 'ACTIVE').length;
    const inactive = total - active;
    const salesCount = accounts.filter(
      (a) => a.role?.role_code === 'SALES' || Number(a.role_id) === ROLES.SALES
    ).length;
    const leaderCount = accounts.filter(
      (a) => a.role?.role_code === 'LEADERSTAFF' || Number(a.role_id) === ROLES.LEADERSTAFF
    ).length;

    return { total, active, inactive, salesCount, leaderCount };
  }, [serverStats, accounts, pagination.totalItems]);

  // Làm mới danh sách
  const handleRefresh = async () => {
    await fetchData(true);
    toast.success('Đã làm mới dữ liệu');
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRoleFilter('ALL');
    setSelectedStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // ── Open Modals ──────────────────────────────────────────
  const handleOpenCreate = () => {
    const defaultRoleId = roles.length > 0 ? roles[0].role_id : '';
    setCreateForm({
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      roleId: defaultRoleId,
      gender: 'MALE',
      dob: '',
      address: '',
      note: '',
    });
    setShowCreatePassword(false);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (acc) => {
    setSelectedAccount(acc);
    setEditForm({
      email: acc.email || '',
      fullName: acc.full_name || '',
      phoneNumber: acc.phone_number || '',
      roleId: acc.role_id || (acc.role?.role_id ?? ''),
      gender: acc.gender || 'MALE',
      dob: acc.dob ? String(acc.dob).slice(0, 10) : '',
      address: acc.address || '',
      note: acc.note || '',
      password: '',
    });
    setShowEditPassword(false);
    setIsEditOpen(true);
  };

  const handleOpenDetail = (acc) => {
    setSelectedAccount(acc);
    setIsDetailOpen(true);
  };

  const handleOpenStatusConfirm = (acc) => {
    setSelectedAccount(acc);
    setIsStatusConfirmOpen(true);
  };

  const handleOpenDelete = (acc) => {
    setSelectedAccount(acc);
    setIsDeleteOpen(true);
  };

  // ── Actions ─────────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.email?.trim() || !createForm.password || !createForm.fullName?.trim() || !createForm.phoneNumber?.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    setSubmitting(true);
    try {
      await createStaffAccount(createForm);
      toast.success('Tạo tài khoản nhân viên thành công!');
      setIsCreateOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const payload = { ...editForm };
      delete payload.roleId; // Không cho phép đổi vai trò nhân viên sau khi đã tạo
      if (!payload.password) delete payload.password; // không gửi nếu rỗng

      const accountId = selectedAccount.user_account_id || selectedAccount.account_id;
      await updateStaffAccount(accountId, payload);
      toast.success('Cập nhật tài khoản nhân viên thành công!');
      setIsEditOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);
    const newStatus = selectedAccount.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const accountId = selectedAccount.user_account_id || selectedAccount.account_id;
    try {
      await changeStaffAccountStatus(accountId, newStatus);
      toast.success(
        newStatus === 'ACTIVE'
          ? `Đã mở khóa tài khoản ${selectedAccount.email}`
          : `Đã khóa tài khoản ${selectedAccount.email}`
      );
      setIsStatusConfirmOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Thao tác trạng thái thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);
    const accountId = selectedAccount.user_account_id || selectedAccount.account_id;
    try {
      await deleteStaffAccount(accountId);
      toast.success(`Đã xóa tài khoản ${selectedAccount.email}`);
      setIsDeleteOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể xóa tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. TIÊU ĐỀ TRANG & NÚT HÀNH ĐỘNG CHÍNH ─────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản Lý Tài Khoản Nhân Viên
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Khu vực dành riêng cho Chủ xưởng quản lý các tài khoản nhân sự cấp dưới (Kinh doanh, Tổ trưởng xưởng Góc Nhà).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tạo tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỔNG QUAN (4 CARDS) ───────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số nhân sự */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng nhân sự</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stats.total}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">nhân sự</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            {stats.salesCount} Kinh doanh • {stats.leaderCount} Tổ trưởng
          </div>
        </div>

        {/* Đang hoạt động */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đang hoạt động</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {stats.active}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700/70">tài khoản</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            Được phép đăng nhập hệ thống
          </div>
        </div>

        {/* Đã bị khóa */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-xs transition hover:border-rose-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Đã bị khóa</span>
            <div className="rounded-lg bg-rose-100 p-1.5 text-rose-800">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-rose-900 sm:text-2xl">
            {stats.inactive}
            <span className="ml-1.5 text-xs font-sans font-normal text-rose-700/70">vô hiệu hóa</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700">
            Bị chặn truy cập cổng nhân sự
          </div>
        </div>

        {/* Tổ trưởng xưởng sản xuất */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Tổ trưởng xưởng</span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Hammer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-900 sm:text-2xl">
            {stats.leaderCount}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-700/70">quản đốc</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700">
            Điều phối sản xuất & gia công mộc
          </div>
        </div>
      </section>

      {/* ── 3. TABS LỌC TRẠNG THÁI NHÂN SỰ ───────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-2">
        {STATUS_TABS.map((tab) => {
          const isActive = selectedStatusFilter === tab.key;
          let count = stats.total;
          if (tab.key === 'ACTIVE') count = stats.active;
          if (tab.key === 'INACTIVE') count = stats.inactive;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSelectedStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                isActive
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  isActive
                    ? 'bg-stone-800 text-stone-200'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. BỘ LỌC & TÌM KIẾM ──────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Ô tìm kiếm */}
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-600"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Vai trò */}
          <div>
            <select
              aria-label="Lọc theo vai trò"
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              <option value="ALL">Tất cả vai trò</option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_code}>
                  {ROLE_NAMES[r.role_id] || r.role_name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Lọc theo trạng thái"
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã khóa</option>
            </select>

            {/* Nút reset bộ lọc nếu có thay đổi */}
            {(searchTerm || selectedRoleFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100 active:scale-95"
                title="Xóa bộ lọc"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. BẢNG DANH SÁCH TÀI KHOẢN NHÂN VIÊN ─────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6">Nhân viên</th>
                <th className="px-3 py-3">Số điện thoại</th>
                <th className="px-3 py-3">Vai trò</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3">Ngày tạo</th>
                <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin text-amber-800" />
                      <span className="text-xs">Đang tải danh sách tài khoản nhân viên...</span>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Không tìm thấy tài khoản nhân viên nào</p>
                      <p className="text-xs text-stone-400">
                        {searchTerm || selectedRoleFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                          ? 'Thử điều chỉnh lại bộ lọc tìm kiếm.'
                          : 'Bấm "Tạo tài khoản mới" để thêm nhân sự vào xưởng.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const accountId = acc.user_account_id || acc.account_id;
                  const roleCode = acc.role?.role_code || 'STAFF';
                  const roleCfg = ROLE_CONFIG[roleCode] || {
                    label: acc.role?.role_name || 'Nhân viên',
                    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
                    icon: Users,
                  };
                  const RoleIcon = roleCfg.icon;

                  return (
                    <tr
                      key={accountId || acc.email}
                      className="transition hover:bg-stone-50/70"
                    >
                      {/* Nhân viên */}
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-900/10 text-amber-950 font-bold font-mono text-xs border border-amber-900/20 shadow-2xs">
                            {acc.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(acc)}
                              className="font-semibold text-stone-900 hover:text-amber-900 hover:underline text-left focus-visible:outline-none"
                            >
                              {acc.full_name}
                            </button>
                            <p className="text-[11px] font-mono text-stone-500">{acc.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Số điện thoại */}
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-stone-600">
                        {acc.phone_number || '—'}
                      </td>

                      {/* Vai trò */}
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleCfg.badgeClass}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          <span>{roleCfg.label}</span>
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <AccountStatusBadge status={acc.status} />
                      </td>

                      {/* Ngày tạo */}
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-stone-600">
                        {acc.createdate ? formatDate(acc.createdate) : '—'}
                      </td>

                      {/* Thao tác */}
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(acc)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xem chi tiết tài khoản"
                          >
                            <Eye className="h-3 w-3 text-stone-400" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(acc)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Chỉnh sửa thông tin nhân viên"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Khóa / Mở khóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenStatusConfirm(acc)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold shadow-xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                              acc.status === 'ACTIVE'
                                ? 'border-amber-300 bg-amber-50/60 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-300 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100'
                            }`}
                            title={acc.status === 'ACTIVE' ? 'Khóa tài khoản này' : 'Mở khóa tài khoản này'}
                          >
                            {acc.status === 'ACTIVE' ? (
                              <>
                                <Lock className="h-3 w-3" />
                                <span>Khóa</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3 w-3" />
                                <span>Mở khóa</span>
                              </>
                            )}
                          </button>

                          {/* Xóa tài khoản */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(acc)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xóa tài khoản nhân viên này"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={accounts.length}
          itemsPerPage={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={handlePageChange}
          itemLabel="nhân sự"
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 1: TẠO TÀI KHOẢN NHÂN VIÊN MỚI                  */}
      {/* ═════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                    Tạo Tài Khoản Nhân Viên Mới
                  </h2>
                  <p className="text-xs text-stone-500">
                    Cấp quyền đăng nhập cho bộ phận Kinh doanh hoặc Tổ trưởng xưởng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng form tạo tài khoản"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4 text-xs">
              {/* Chọn vai trò */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Vai trò nhân sự <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {roles.map((r) => {
                    const isSelected = String(createForm.roleId) === String(r.role_id);
                    const cfg = ROLE_CONFIG[r.role_code] || {
                      label: r.role_name,
                      icon: Users,
                    };
                    const Icon = cfg.icon;

                    return (
                      <label
                        key={r.role_id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition active:scale-98 ${
                          isSelected
                            ? 'border-amber-900 bg-amber-900 text-white shadow-xs'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="roleId"
                          value={r.role_id}
                          checked={isSelected}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, roleId: e.target.value })
                          }
                          className="sr-only"
                        />
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-bold">{ROLE_NAMES[r.role_id] || r.role_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Email & Mật khẩu ban đầu */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nhanvien@gocnha.vn"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mật khẩu ban đầu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      placeholder="Tối thiểu 6 ký tự"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      className="w-full rounded-lg border border-stone-300 pl-3 pr-10 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      title={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Họ tên & Số điện thoại */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, fullName: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0901234567"
                    value={createForm.phoneNumber}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phoneNumber: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              {/* Giới tính & Ngày sinh */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={createForm.gender}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, gender: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={createForm.dob}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, dob: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Địa chỉ liên hệ
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố..."
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Ghi chú nội bộ */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ghi chú nội bộ
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về xưởng mộc, tổ phụ trách, kinh nghiệm gia công..."
                  value={createForm.note}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, note: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 active:scale-95 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 2: CHỈNH SỬA TÀI KHOẢN NHÂN VIÊN                 */}
      {/* ═════════════════════════════════════════════════════ */}
      {isEditOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                    Chỉnh Sửa Thông Tin Nhân Viên
                  </h2>
                  <p className="text-xs font-mono text-stone-500">{selectedAccount.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng form chỉnh sửa"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4 text-xs">
              {/* Vai trò nhân sự (Cố định) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Vai trò nhân sự (Cố định)
                </label>
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-100/70 p-3">
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const roleCode =
                        selectedAccount.role?.role_code ||
                        roles.find((r) => String(r.role_id) === String(selectedAccount.role_id))?.role_code;
                      const cfg = ROLE_CONFIG[roleCode] || {
                        label: selectedAccount.role?.role_name || 'Nhân viên',
                        icon: Users,
                      };
                      const Icon = cfg.icon;
                      return (
                        <>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 border border-stone-200 shadow-2xs">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900">
                              {selectedAccount.role?.role_name || cfg.label}
                            </span>
                            {roleCode && (
                              <span className="block text-[10px] text-stone-500 font-mono">
                                {roleCode}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <span className="rounded-md bg-stone-200/80 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                    Không thể đổi
                  </span>
                </div>
              </div>

              {/* Email đăng nhập */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Họ tên & Số điện thoại */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              {/* Giới tính & Ngày sinh */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Ghi chú nội bộ */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ghi chú nội bộ
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Đổi mật khẩu mới (Tùy chọn) */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-900" />
                  <label className="text-xs font-bold text-stone-800">
                    Đặt lại mật khẩu mới (Tùy chọn)
                  </label>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Để trống nếu không muốn đổi mật khẩu"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 bg-white pl-3 pr-10 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    title={showEditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 active:scale-95 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 3: XEM CHI TIẾT TÀI KHOẢN                       */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-900 text-base font-bold text-white shadow-xs">
                  {selectedAccount.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    {selectedAccount.full_name}
                  </h2>
                  <p className="text-xs font-mono text-stone-500">{selectedAccount.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng chi tiết tài khoản"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4 text-xs">
              {/* Vai trò & Trạng thái */}
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                <div>
                  <span className="text-[11px] font-semibold text-stone-500">
                    Vai trò hiện tại
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold text-stone-900">
                    <ShieldCheck className="h-4 w-4 text-amber-900" />
                    <span>{selectedAccount.role?.role_name || 'Nhân viên'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-stone-500">
                    Trạng thái
                  </span>
                  <div className="mt-1">
                    <AccountStatusBadge status={selectedAccount.status} />
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ & cá nhân */}
              <div className="space-y-3 rounded-xl border border-stone-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Thông tin cá nhân & Liên hệ
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500">Số điện thoại:</span>
                    <p className="mt-0.5 font-semibold font-mono text-stone-800">
                      {selectedAccount.phone_number || 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Giới tính:</span>
                    <p className="mt-0.5 font-semibold text-stone-800">
                      {selectedAccount.gender === 'FEMALE'
                        ? 'Nữ'
                        : selectedAccount.gender === 'OTHER'
                        ? 'Khác'
                        : 'Nam'}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Ngày sinh:</span>
                    <p className="mt-0.5 font-semibold font-mono text-stone-800">
                      {selectedAccount.dob ? formatDate(selectedAccount.dob) : 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Mã ID nhân sự:</span>
                    <p className="mt-0.5 font-semibold font-mono text-amber-900">
                      #{selectedAccount.user_account_id || selectedAccount.account_id}
                    </p>
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-2.5 text-xs">
                  <span className="text-stone-500">Địa chỉ:</span>
                  <p className="mt-0.5 font-medium text-stone-800">
                    {selectedAccount.address || 'Chưa có thông tin địa chỉ'}
                  </p>
                </div>

                {selectedAccount.note && (
                  <div className="border-t border-stone-100 pt-2.5 text-xs">
                    <span className="text-stone-500">Ghi chú nội bộ:</span>
                    <p className="mt-0.5 text-stone-700 bg-amber-50/50 p-2 rounded border border-amber-200/50">
                      {selectedAccount.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Nhật ký hệ thống */}
              <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-[11px] text-stone-500">
                <div className="flex justify-between">
                  <span>Ngày khởi tạo:</span>
                  <span className="font-mono text-stone-700">
                    {selectedAccount.createdate ? formatDate(selectedAccount.createdate) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Người tạo:</span>
                  <span className="font-medium text-stone-700">
                    {selectedAccount.createby || 'Hệ thống'}
                  </span>
                </div>
                {selectedAccount.modifiedate && (
                  <div className="flex justify-between">
                    <span>Cập nhật gần nhất:</span>
                    <span className="font-mono text-stone-700">
                      {formatDate(selectedAccount.modifiedate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 bg-stone-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedAccount);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 active:scale-95"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Chỉnh sửa thông tin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 4: XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN            */}
      {/* ═════════════════════════════════════════════════════ */}
      {isStatusConfirmOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  selectedAccount.status === 'ACTIVE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">
                {selectedAccount.status === 'ACTIVE'
                  ? 'Xác nhận khóa tài khoản?'
                  : 'Xác nhận mở khóa tài khoản?'}
              </h2>
            </div>

            <p className="mt-3 text-xs text-stone-600">
              {selectedAccount.status === 'ACTIVE'
                ? `Sau khi khóa, nhân viên "${selectedAccount.full_name}" (${selectedAccount.email}) sẽ không thể đăng nhập vào cổng nhân sự cho đến khi được mở khóa lại.`
                : `Nhân viên "${selectedAccount.full_name}" (${selectedAccount.email}) sẽ có thể đăng nhập bình thường vào hệ thống sau khi được mở khóa.`}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsStatusConfirmOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleStatus}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 disabled:opacity-50 ${
                  selectedAccount.status === 'ACTIVE'
                    ? 'bg-amber-700 hover:bg-amber-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {selectedAccount.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 5: XÁC NHẬN XÓA TÀI KHOẢN                       */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDeleteOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">
                Xóa vĩnh viễn tài khoản nhân sự?
              </h2>
            </div>

            <p className="mt-3 text-xs text-stone-600">
              Bạn có chắc chắn muốn xóa tài khoản của nhân viên{' '}
              <strong>"{selectedAccount.full_name}"</strong> (
              <span className="font-mono text-stone-800">{selectedAccount.email}</span>)?
              Hành động này <strong className="text-rose-600">không thể hoàn tác</strong>.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 disabled:opacity-50"
              >
                {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStaffAccountsPage;
