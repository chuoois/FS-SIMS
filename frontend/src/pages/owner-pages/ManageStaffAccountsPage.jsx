// =========================================================
// ManageStaffAccountsPage.jsx
// Giao diện Quản lý tài khoản nhân viên dành riêng cho Chủ xưởng (Owner)
// Chức năng:
//  - Xem danh sách tài khoản nhân viên cấp dưới (Sales, Staff Leader - không hiển thị Owner, Customer)
//  - Tìm kiếm, lọc theo vai trò & trạng thái
//  - Thống kê tổng quan số lượng nhân sự
//  - Tạo tài khoản nhân sự mới (chọn vai trò)
//  - Xem chi tiết thông tin tài khoản
//  - Chỉnh sửa thông tin, đổi vai trò, đặt lại mật khẩu
//  - Khóa / Mở khóa tài khoản nhân viên
//  - Xóa tài khoản nhân viên
// =========================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RotateCw,
  Building2,
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
  FileText,
  BadgeCheck,
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

// Role Badge Helpers (chỉ áp dụng cho nhân viên cấp dưới: Sales, Staff Leader)
const ROLE_CONFIG = {
  SALES: {
    label: 'Kinh doanh (Sales)',
    badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-300',
    icon: Briefcase,
  },
  LEADERSTAFF: {
    label: 'Tổ trưởng xưởng (Leader Staff)',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
    icon: Hammer,
  },
};

export const ManageStaffAccountsPage = () => {

  // State
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

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
    password: '', // để trống nếu không đổi
  });

  // Fetch accounts & roles
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [accRes, roleRes] = await Promise.all([
        getStaffAccounts(),
        getStaffRoles(),
      ]);
      setAccounts(accRes.data || []);
      setRoles(roleRes.roles || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu tài khoản nhân viên:', err);
      toast.error(err?.response?.data?.message || 'Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === 'ACTIVE').length;
    const inactive = total - active;
    const salesCount = accounts.filter(
      (a) => a.role?.role_code === 'SALES' || Number(a.role_id) === ROLES.SALES
    ).length;
    const leaderCount = accounts.filter(
      (a) => a.role?.role_code === 'LEADERSTAFF' || Number(a.role_id) === ROLES.LEADERSTAFF
    ).length;

    return { total, active, inactive, salesCount, leaderCount };
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Search
      const search = searchTerm.trim().toLowerCase();
      const matchSearch =
        !search ||
        acc.full_name?.toLowerCase().includes(search) ||
        acc.email?.toLowerCase().includes(search) ||
        acc.phone_number?.includes(search);

      // Role filter
      const matchRole =
        selectedRoleFilter === 'ALL' ||
        String(acc.role_id) === String(selectedRoleFilter) ||
        acc.role?.role_code === selectedRoleFilter;

      // Status filter
      const matchStatus =
        selectedStatusFilter === 'ALL' || acc.status === selectedStatusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // ── Open Modals ──────────────────────────────────────────
  const handleOpenCreate = () => {
    // Mặc định chọn vai trò đầu tiên (thường là Sales nếu không muốn chọn Owner)
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
      dob: acc.dob || '',
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
      if (!payload.password) delete payload.password; // không gửi nếu rỗng

      await updateStaffAccount(selectedAccount.user_account_id, payload);
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
    try {
      await changeStaffAccountStatus(selectedAccount.user_account_id, newStatus);
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
    try {
      await deleteStaffAccount(selectedAccount.user_account_id);
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
      {/* ── Tiêu đề trang & Nút hành động chính ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Quản lý tài khoản nhân viên
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Khu vực dành riêng cho Chủ xưởng quản lý các tài khoản nhân viên cấp dưới (Kinh doanh, Tổ trưởng xưởng).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tạo tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Tổng nhân sự */}
        <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tổng số nhân sự
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stats.total}</p>
          <p className="mt-1 text-xs text-stone-500">
            {stats.salesCount} Kinh doanh • {stats.leaderCount} Tổ trưởng
          </p>
        </div>

        {/* Đang hoạt động */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Đang hoạt động
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{stats.active}</p>
          <p className="mt-1 text-xs text-emerald-700">Được phép đăng nhập hệ thống</p>
        </div>

        {/* Đã khóa */}
        <div className="relative overflow-hidden rounded-xl border border-red-200/80 bg-red-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
              Đã bị khóa
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-700">
              <UserX className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-950">{stats.inactive}</p>
          <p className="mt-1 text-xs text-red-700">Bị vô hiệu hóa truy cập</p>
        </div>

        {/* Vai trò Kinh doanh & Tổ trưởng */}
        <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Đội ngũ nhân sự
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700">
              <Briefcase className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {stats.salesCount + stats.leaderCount}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {stats.salesCount} Kinh doanh • {stats.leaderCount} Tổ trưởng
          </p>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-300 bg-stone-50/50 pl-10 pr-3.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </div>

        {/* Bộ lọc vai trò & trạng thái */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc Role */}
          <div className="relative">
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-stone-300 bg-white pl-3.5 pr-8 text-sm font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả vai trò</option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_code}>
                  {ROLE_NAMES[r.role_id] || r.role_name}
                </option>
              ))}
            </select>
            <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Lọc Trạng thái */}
          <div className="relative">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-stone-300 bg-white pl-3.5 pr-8 text-sm font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã khóa</option>
            </select>
            <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Nút reset bộ lọc nếu có thay đổi */}
          {(searchTerm || selectedRoleFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedRoleFilter('ALL');
                setSelectedStatusFilter('ALL');
              }}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Bảng danh sách tài khoản nhân viên ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RotateCw className="h-8 w-8 animate-spin text-stone-400" />
            <p className="text-sm font-medium text-stone-500">Đang tải danh sách tài khoản nhân viên...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-stone-800">Không tìm thấy nhân viên nào</h3>
            <p className="mt-1 text-sm text-stone-500">
              {searchTerm || selectedRoleFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                ? 'Không có kết quả phù hợp với tiêu chí lọc của bạn.'
                : 'Chưa có tài khoản nhân viên nào trong hệ thống.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-stone-700">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-600">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">Nhân viên</th>
                  <th scope="col" className="px-3 py-3.5">Số điện thoại</th>
                  <th scope="col" className="px-3 py-3.5">Vai trò</th>
                  <th scope="col" className="px-3 py-3.5">Trạng thái</th>
                  <th scope="col" className="px-3 py-3.5">Ngày tạo</th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredAccounts.map((acc) => {
                  const roleCode = acc.role?.role_code || 'STAFF';
                  const roleCfg = ROLE_CONFIG[roleCode] || {
                    label: acc.role?.role_name || 'Nhân viên',
                    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
                    icon: Users,
                  };
                  const RoleIcon = roleCfg.icon;
                  return (
                    <tr
                      key={acc.user_account_id}
                      className="group transition-colors hover:bg-stone-50/80"
                    >
                      {/* Cột Thông tin cá nhân */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-white shadow-sm">
                            {acc.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                              <span>{acc.full_name}</span>
                            </div>
                            <span className="text-xs text-stone-500">{acc.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Số điện thoại */}
                      <td className="px-3 py-4 text-xs font-medium text-stone-700">
                        {acc.phone_number || '—'}
                      </td>

                      {/* Cột Vai trò */}
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${roleCfg.badgeClass}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          <span>{roleCfg.label}</span>
                        </span>
                      </td>

                      {/* Cột Trạng thái */}
                      <td className="px-3 py-4">
                        {acc.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Đã khóa
                          </span>
                        )}
                      </td>

                      {/* Cột Ngày tạo */}
                      <td className="px-3 py-4 text-xs text-stone-500">
                        {acc.createdate
                          ? new Date(acc.createdate).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>

                      {/* Cột Thao tác */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(acc)}
                            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(acc)}
                            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                            title="Chỉnh sửa thông tin"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Khóa / Mở khóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenStatusConfirm(acc)}
                            className={`rounded-lg p-1.5 transition ${
                              acc.status === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title={
                              acc.status === 'ACTIVE'
                                ? 'Khóa tài khoản'
                                : 'Mở khóa tài khoản'
                            }
                          >
                            {acc.status === 'ACTIVE' ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(acc)}
                            className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: TẠO TÀI KHOẢN NHÂN VIÊN MỚI ─────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Tạo tài khoản nhân sự mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
              {/* Chọn vai trò */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Vai trò nhân viên <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
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
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-bold">{r.role_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Email & Mật khẩu */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Email đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nhanvien@gmail.com"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Mật khẩu ban đầu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      placeholder="Tối thiểu 6 ký tự"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      className="h-10 w-full rounded-lg border border-stone-300 pl-3 pr-10 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-700 focus:outline-none"
                      title={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showCreatePassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Họ tên & Số điện thoại */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, fullName: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0901234567"
                    value={createForm.phoneNumber}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phoneNumber: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              {/* Giới tính & Ngày sinh */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Giới tính
                  </label>
                  <select
                    value={createForm.gender}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, gender: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={createForm.dob}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, dob: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Địa chỉ liên hệ
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố..."
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Ghi chú nội bộ
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về phân công, vị trí làm việc..."
                  value={createForm.note}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, note: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: SỬA TÀI KHOẢN NHÂN VIÊN ────────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isEditOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Chỉnh sửa thông tin nhân viên
                  </h3>
                  <p className="text-xs text-stone-500">{selectedAccount.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleEditSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
              {/* Thay đổi vai trò */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Vai trò nhân sự <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {roles.map((r) => {
                    const isSelected = String(editForm.roleId) === String(r.role_id);
                    const cfg = ROLE_CONFIG[r.role_code] || {
                      label: r.role_name,
                      icon: Users,
                    };
                    const Icon = cfg.icon;

                    return (
                      <label
                        key={r.role_id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="editRoleId"
                          value={r.role_id}
                          checked={isSelected}
                          onChange={(e) =>
                            setEditForm({ ...editForm, roleId: e.target.value })
                          }
                          className="sr-only"
                        />
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-bold">{r.role_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Email đăng nhập */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Email đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien@gmail.com"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Họ tên & Số điện thoại */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullName: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editForm.phoneNumber}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phoneNumber: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              {/* Giới tính & Ngày sinh */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Giới tính
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gender: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) =>
                      setEditForm({ ...editForm, dob: e.target.value })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Ghi chú nội bộ
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Đổi mật khẩu mới (Tùy chọn) */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-stone-700" />
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Đặt lại mật khẩu mới (Tùy chọn)
                  </label>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Để trống nếu không muốn đổi mật khẩu"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-3 pr-10 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-700 focus:outline-none"
                    title={showEditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showEditPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: XEM CHI TIẾT TÀI KHOẢN ─────────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-stone-200 bg-stone-50 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-lg font-bold text-white shadow-md">
                    {selectedAccount.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      {selectedAccount.full_name}
                    </h3>
                    <p className="text-xs text-stone-500">{selectedAccount.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {/* Vai trò & Trạng thái */}
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Vai trò hiện tại
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold text-stone-900">
                    <ShieldCheck className="h-4 w-4 text-stone-700" />
                    <span>{selectedAccount.role?.role_name || 'Nhân viên'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Trạng thái
                  </span>
                  <div className="mt-1">
                    {selectedAccount.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                        <XCircle className="h-3.5 w-3.5" />
                        Đã khóa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ */}
              <div className="space-y-3 rounded-xl border border-stone-200 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Thông tin cá nhân & Liên hệ
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500">Số điện thoại:</span>
                    <p className="mt-0.5 font-semibold text-stone-800">
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
                    <p className="mt-0.5 font-semibold text-stone-800">
                      {selectedAccount.dob
                        ? new Date(selectedAccount.dob).toLocaleDateString('vi-VN')
                        : 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Mã ID nhân sự:</span>
                    <p className="mt-0.5 font-semibold text-stone-800">
                      #{selectedAccount.user_account_id}
                    </p>
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-2 text-xs">
                  <span className="text-stone-500">Địa chỉ:</span>
                  <p className="mt-0.5 font-semibold text-stone-800">
                    {selectedAccount.address || 'Chưa có thông tin địa chỉ'}
                  </p>
                </div>

                {selectedAccount.note && (
                  <div className="border-t border-stone-100 pt-2 text-xs">
                    <span className="text-stone-500">Ghi chú:</span>
                    <p className="mt-0.5 text-stone-700">{selectedAccount.note}</p>
                  </div>
                )}
              </div>

              {/* Nhật ký hệ thống */}
              <div className="space-y-2 rounded-xl border border-stone-100 bg-stone-50 p-4 text-[11px] text-stone-500">
                <div className="flex justify-between">
                  <span>Ngày khởi tạo:</span>
                  <span className="font-medium text-stone-700">
                    {selectedAccount.createdate
                      ? new Date(selectedAccount.createdate).toLocaleString('vi-VN')
                      : '—'}
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
                    <span className="font-medium text-stone-700">
                      {new Date(selectedAccount.modifiedate).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedAccount);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-800"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Chỉnh sửa thông tin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: XÁC NHẬN KHÓA / MỞ KHÓA ────────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isStatusConfirmOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {selectedAccount.status === 'ACTIVE'
                  ? 'Xác nhận khóa tài khoản?'
                  : 'Xác nhận mở khóa tài khoản?'}
              </h3>
            </div>

            <p className="mt-3 text-sm text-stone-600">
              {selectedAccount.status === 'ACTIVE'
                ? `Sau khi khóa, nhân viên "${selectedAccount.full_name}" (${selectedAccount.email}) sẽ không thể đăng nhập vào cổng nhân sự cho đến khi được mở khóa lại.`
                : `Nhân viên "${selectedAccount.full_name}" (${selectedAccount.email}) sẽ có thể đăng nhập bình thường vào hệ thống sau khi được mở khóa.`}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsStatusConfirmOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleStatus}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                  selectedAccount.status === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                <span>
                  {selectedAccount.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 5: XÁC NHẬN XÓA TÀI KHOẢN ─────────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isDeleteOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                Xóa vĩnh viễn tài khoản nhân sự?
              </h3>
            </div>

            <p className="mt-3 text-sm text-stone-600">
              Bạn có chắc chắn muốn xóa tài khoản của nhân viên{' '}
              <strong>"{selectedAccount.full_name}"</strong> (
              <span className="text-stone-800">{selectedAccount.email}</span>)?
              Hành động này <strong className="text-red-600">không thể hoàn tác</strong>.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
