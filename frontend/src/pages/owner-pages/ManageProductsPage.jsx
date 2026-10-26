// =========================================================
// ManageProductsPage.jsx
// Giao diện Quản lý Sản phẩm (Kho thành phẩm) dành cho Chủ xưởng (Owner)
// =========================================================

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  PackageCheck,
  Tag,
  Maximize2,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProducts,
  getProductMetadata,
  getProductStockSummary,
  getNextProductCode,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductMaterial,
  createProductColor,
} from '../../services/productManagerService';
import { CreatableCombobox } from '../../components/common/CreatableCombobox';
import { TablePagination } from '../../components/common/TablePagination';

export const ManageProductsPage = () => {
  // ── States ───────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metadata, setMetadata] = useState({ categories: [], rooms: [], materials: [], colors: [] });
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalQuantity: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [expandedSetIds, setExpandedSetIds] = useState(new Set());
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected Product
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedUsage, setSelectedUsage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const initialForm = {
    product_code: '',
    product_name: '',
    category_id: '',
    room_id: '',
    material_id: '',
    color_id: '',
    product_type: 'SINGLE',
    price: '',
    stock_quantity: '0',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    description: '',
    status: 'ACTIVE',
  };

  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Set items state for creating & editing SET products
  const [createSetItems, setCreateSetItems] = useState([]);
  const [newCreateSetItemId, setNewCreateSetItemId] = useState('');
  const [newCreateSetItemQty, setNewCreateSetItemQty] = useState(1);
  const [editSetItems, setEditSetItems] = useState([]);
  const [availableSingleProducts, setAvailableSingleProducts] = useState([]);
  const [newSetItemId, setNewSetItemId] = useState('');
  const [newSetItemQty, setNewSetItemQty] = useState(1);

  // Chế độ thêm món con vào bộ: 'EXISTING' (chọn có sẵn) hoặc 'NEW' (tạo mới trực tiếp)
  const [createChildMode, setCreateChildMode] = useState('EXISTING');
  const [editChildMode, setEditChildMode] = useState('EXISTING');

  const initialNewChildForm = {
    product_name: '',
    product_code: '',
    category_id: '',
    room_id: '',
    material_id: '',
    color_id: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    quantity: 1,
    description: '',
  };
  const [newChildForm, setNewChildForm] = useState(initialNewChildForm);
  const [newChildImageFile, setNewChildImageFile] = useState(null);
  const [newChildImagePreview, setNewChildImagePreview] = useState(null);
  const [isCreatingChild, setIsCreatingChild] = useState(false);

  // ── Fetch metadata & summary ─────────────────────────────
  const loadInitialData = async () => {
    try {
      const [metaRes, summaryRes] = await Promise.all([
        getProductMetadata().catch(() => ({ data: { categories: [], rooms: [], materials: [], colors: [] } })),
        getProductStockSummary().catch(() => ({ data: {} })),
      ]);
      if (metaRes?.data) setMetadata(metaRes.data);
      if (summaryRes?.data) setStockSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Xử lý tạo mới chất liệu trực tiếp từ Combobox ─────────
  const handleCreateMaterial = async (name, extra = {}) => {
    try {
      const res = await createProductMaterial({ material_name: name, ...extra });
      const newMat = res.data;
      toast.success(`Đã thêm chất liệu mới: "${newMat.material_name}"`);
      setMetadata((prev) => ({
        ...prev,
        materials: [...(prev.materials || []).filter((m) => m.material_id !== newMat.material_id), newMat],
      }));
      return newMat;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi thêm chất liệu mới';
      toast.error(errorMsg);
      throw err;
    }
  };

  // ── Xử lý tạo mới màu sắc trực tiếp từ Combobox ───────────
  const handleCreateColor = async (name, extra = {}) => {
    try {
      const res = await createProductColor({ color_name: name, ...extra });
      const newCol = res.data;
      toast.success(`Đã thêm màu sắc mới: "${newCol.color_name}"`);
      setMetadata((prev) => ({
        ...prev,
        colors: [...(prev.colors || []).filter((c) => c.color_id !== newCol.color_id), newCol],
      }));
      return newCol;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi thêm màu sắc mới';
      toast.error(errorMsg);
      throw err;
    }
  };

  // ── Fetch products ───────────────────────────────────────
  const fetchProductsList = useCallback(
    async (page = 1, limit = pageSize) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit,
        };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (typeFilter !== 'ALL') params.product_type = typeFilter;
        if (categoryFilter !== 'ALL') params.category_id = categoryFilter;
        if (roomFilter !== 'ALL') params.room_id = roomFilter;
        if (stockStatusFilter !== 'ALL') params.stock_status = stockStatusFilter;
        if (statusFilter !== 'ALL') params.status = statusFilter;

        const res = await getProducts(params);
        setProducts(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
          setCurrentPage(res.pagination.currentPage);
          if (res.pagination.itemsPerPage) {
            setPageSize(res.pagination.itemsPerPage);
          }
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể tải danh sách sản phẩm');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchTerm, typeFilter, categoryFilter, roomFilter, stockStatusFilter, statusFilter, pageSize]
  );

  const toggleExpandSet = (productId, e) => {
    if (e) e.stopPropagation();
    setExpandedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductsList(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProductsList]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProductsList(currentPage), loadInitialData()]);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setRoomFilter('ALL');
    setStockStatusFilter('ALL');
    setStatusFilter('ALL');
  };

  // ── Auto generate next code ──────────────────────────────
  const handleGenerateCode = async () => {
    try {
      const res = await getNextProductCode();
      if (res?.data?.nextCode) {
        setForm((prev) => ({ ...prev, product_code: res.data.nextCode }));
        toast.success(`Đã tạo mã gợi ý: ${res.data.nextCode}`);
      }
    } catch {
      toast.error('Không thể tự động sinh mã sản phẩm');
    }
  };

  // ── Handle Image Selection ───────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (jpg, png, webp)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // ── Handlers for Create Set Items ────────────────────────
  const handleUpdateCreateSetItemQuantity = (productId, delta) => {
    setCreateSetItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const nextQty = Math.max(1, (item.quantity || 1) + delta);
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
  };

  const handleCreateSetItemQuantityChange = (productId, value) => {
    const parsed = parseInt(value, 10);
    const qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setCreateSetItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveCreateSetItem = (productId) => {
    setCreateSetItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleAddCreateSetItem = () => {
    if (!newCreateSetItemId) {
      toast.error('Vui lòng chọn một sản phẩm con để thêm');
      return;
    }
    const found = availableSingleProducts.find((p) => String(p.productId) === String(newCreateSetItemId));
    if (!found) {
      toast.error('Sản phẩm không hợp lệ');
      return;
    }
    const existingIndex = createSetItems.findIndex((it) => it.productId === found.productId);
    if (existingIndex >= 0) {
      setCreateSetItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + (newCreateSetItemQty || 1) } : it
        )
      );
    } else {
      setCreateSetItems((prev) => [
        ...prev,
        {
          productId: found.productId,
          productCode: found.productCode,
          productName: found.productName,
          dimensions: found.dimensions?.formatted || (
            found.dimensions?.lengthCm || found.dimensions?.widthCm || found.dimensions?.heightCm
              ? `${found.dimensions?.lengthCm || 0}x${found.dimensions?.widthCm || 0}x${found.dimensions?.heightCm || 0} cm`
              : '—'
          ),
          quantity: Math.max(1, parseInt(newCreateSetItemQty, 10) || 1),
          imageUrl: found.imageUrl || null,
          stockQuantity: found.stockQuantity ?? 0,
        },
      ]);
    }
    setNewCreateSetItemId('');
    setNewCreateSetItemQty(1);
    toast.success(`Đã thêm "${found.productName}" vào bộ`);
  };

  // ── Handlers for Creating New Child Products Directly in Set ──
  const handleGenerateChildCode = async () => {
    try {
      const res = await getNextProductCode();
      if (res?.data?.nextCode) {
        setNewChildForm((prev) => ({ ...prev, product_code: res.data.nextCode }));
        toast.success(`Đã tạo mã con gợi ý: ${res.data.nextCode}`);
      }
    } catch {
      toast.error('Không thể tự động sinh mã sản phẩm con');
    }
  };

  const handleNewChildImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 5MB');
      return;
    }

    setNewChildImageFile(file);
    setNewChildImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveNewChildImage = () => {
    setNewChildImageFile(null);
    setNewChildImagePreview(null);
  };

  const handleCreateAndAddChildItem = async (target = 'create') => {
    if (!newChildForm.product_name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm con');
      return;
    }

    const catId = newChildForm.category_id || metadata.categories[0]?.category_id;
    if (!catId) {
      toast.error('Vui lòng chọn danh mục cho sản phẩm con');
      return;
    }

    const roomId = newChildForm.room_id || form.room_id || metadata.rooms[0]?.room_id;
    const matId = newChildForm.material_id || form.material_id || metadata.materials[0]?.material_id;
    const colId = newChildForm.color_id || form.color_id || metadata.colors[0]?.color_id;

    try {
      setIsCreatingChild(true);
      const childData = new FormData();
      childData.append('product_name', newChildForm.product_name.trim());
      if (newChildForm.product_code?.trim()) {
        childData.append('product_code', newChildForm.product_code.trim());
      }
      childData.append('category_id', catId);
      childData.append('room_id', roomId);
      childData.append('material_id', matId);
      childData.append('color_id', colId);
      if (newChildForm.length_cm) childData.append('length_cm', newChildForm.length_cm);
      if (newChildForm.width_cm) childData.append('width_cm', newChildForm.width_cm);
      if (newChildForm.height_cm) childData.append('height_cm', newChildForm.height_cm);
      if (newChildForm.description) childData.append('description', newChildForm.description);
      childData.append('product_type', 'SINGLE');
      childData.append('price', 0);
      childData.append('stock_quantity', 0);
      childData.append('status', 'ACTIVE');

      if (newChildImageFile) {
        childData.append('image', newChildImageFile);
      }

      const res = await createProduct(childData);
      const created = res.data;

      const qty = Math.max(1, parseInt(newChildForm.quantity, 10) || 1);
      const newItem = {
        productId: created.productId,
        productCode: created.productCode,
        productName: created.productName,
        dimensions: created.dimensions?.formatted || (
          newChildForm.length_cm || newChildForm.width_cm || newChildForm.height_cm
            ? `${newChildForm.length_cm || 0}x${newChildForm.width_cm || 0}x${newChildForm.height_cm || 0} cm`
            : '—'
        ),
        quantity: qty,
        imageUrl: created.imageUrl || null,
        stockQuantity: 0,
      };

      if (target === 'create') {
        setCreateSetItems((prev) => [...prev, newItem]);
      } else {
        setEditSetItems((prev) => [...prev, newItem]);
      }

      // Đưa vào danh sách có sẵn để có thể tái sử dụng
      setAvailableSingleProducts((prev) => [created, ...prev]);

      toast.success(`Đã tạo sản phẩm con "${created.productName}" và thêm vào bộ!`);

      // Reset form con và giữ các thuộc tính dùng chung
      setNewChildForm({
        ...initialNewChildForm,
        category_id: catId,
        room_id: roomId,
        material_id: matId,
        color_id: colId,
      });
      setNewChildImageFile(null);
      setNewChildImagePreview(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo sản phẩm con');
    } finally {
      setIsCreatingChild(false);
    }
  };

  // ── Open Create Modal ────────────────────────────────────
  const handleOpenCreate = () => {
    setForm({
      ...initialForm,
      product_type: 'SINGLE',
      category_id: metadata.categories[0]?.category_id || '',
      room_id: metadata.rooms[0]?.room_id || '',
      material_id: metadata.materials[0]?.material_id || '',
      color_id: metadata.colors[0]?.color_id || '',
    });
    setCreateSetItems([]);
    setNewCreateSetItemId('');
    setNewCreateSetItemQty(1);
    setCreateChildMode('EXISTING');
    setNewChildForm(initialNewChildForm);
    setNewChildImageFile(null);
    setNewChildImagePreview(null);
    loadAvailableSingleProducts();
    setImageFile(null);
    setImagePreview(null);
    setIsCreateOpen(true);
    handleGenerateCode();
  };

  // ── Submit Create ────────────────────────────────────────
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!form.product_name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }

    if (form.product_type === 'SET' && createSetItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm con vào bộ sản phẩm');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.keys(form).forEach((key) => {
        if (form[key] !== '' && form[key] !== null && form[key] !== undefined) {
          formData.append(key, form[key]);
        }
      });
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (form.product_type === 'SET') {
        const payloadItems = createSetItems.map((it) => ({
          item_product_id: it.productId,
          quantity: it.quantity || 1,
        }));
        formData.append('set_items', JSON.stringify(payloadItems));
      }

      await createProduct(formData);
      toast.success(
        form.product_type === 'SET'
          ? `Tạo bộ sản phẩm "${form.product_name}" thành công!`
          : 'Thêm mới sản phẩm thành công!'
      );
      setIsCreateOpen(false);
      fetchProductsList(1);
      loadInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Load available single products for set builder ──────
  const loadAvailableSingleProducts = async () => {
    try {
      const res = await getProducts({ product_type: 'SINGLE', include_children: true, limit: 100 });
      if (res?.data) {
        setAvailableSingleProducts(res.data);
      }
    } catch {
      // ignore
    }
  };

  // ── Open Edit Modal ──────────────────────────────────────
  const handleOpenEdit = async (p) => {
    try {
      let full = p;
      // Nếu sản phẩm mở từ hàng con hoặc thiếu chi tiết thuộc tính
      if (
        !p.categoryId ||
        !p.roomId ||
        p.dimensions?.lengthCm === undefined ||
        p.dimensions?.widthCm === undefined
      ) {
        const res = await getProductDetail(p.productId);
        if (res?.data) full = res.data;
      }

      setSelectedProduct(full);
      setForm({
        product_code: full.productCode || '',
        product_name: full.productName || '',
        category_id: full.categoryId || (metadata.categories[0]?.category_id || ''),
        room_id: full.roomId || (metadata.rooms[0]?.room_id || ''),
        material_id: full.materialId || (metadata.materials[0]?.material_id || ''),
        color_id: full.colorId || (metadata.colors[0]?.color_id || ''),
        product_type: full.productType || 'SINGLE',
        price: full.price ?? '',
        stock_quantity: full.stockQuantity ?? '0',
        length_cm: full.dimensions?.lengthCm ?? '',
        width_cm: full.dimensions?.widthCm ?? '',
        height_cm: full.dimensions?.heightCm ?? '',
        description: full.description || '',
        status: full.status || 'ACTIVE',
      });

      // Nếu là SET product, nạp danh sách các món con hiện tại và tải danh sách single products
      if (full.isSet || full.productType === 'SET') {
        const items = (full.setItems || []).map((si) => ({
          productId: si.productId,
          productCode: si.productCode,
          productName: si.productName,
          dimensions: si.dimensions?.formatted || (
            si.dimensions?.lengthCm || si.dimensions?.widthCm || si.dimensions?.heightCm
              ? `${si.dimensions?.lengthCm || 0}x${si.dimensions?.widthCm || 0}x${si.dimensions?.heightCm || 0} cm`
              : '—'
          ),
          quantity: si.quantity || 1,
          imageUrl: si.imageUrl || null,
          stockQuantity: si.stockQuantity ?? 0,
        }));
        setEditSetItems(items);
        loadAvailableSingleProducts();
      } else {
        setEditSetItems([]);
      }

      setEditChildMode('EXISTING');
      setNewChildForm(initialNewChildForm);
      setNewChildImageFile(null);
      setNewChildImagePreview(null);
      setNewSetItemId('');
      setNewSetItemQty(1);
      setImageFile(null);
      setImagePreview(full.imageUrl || null);
      setIsEditOpen(true);
    } catch {
      toast.error('Lỗi khi tải thông tin sản phẩm để sửa');
    }
  };

  // ── Handlers for Set Items in Edit Modal ───────────────────
  const handleUpdateSetItemQuantity = (productId, delta) => {
    setEditSetItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const nextQty = Math.max(1, (item.quantity || 1) + delta);
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
  };

  const handleSetItemQuantityChange = (productId, value) => {
    const parsed = parseInt(value, 10);
    const qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setEditSetItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveSetItem = (productId) => {
    setEditSetItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleAddSetItem = () => {
    if (!newSetItemId) {
      toast.error('Vui lòng chọn một sản phẩm con để thêm');
      return;
    }
    const found = availableSingleProducts.find((p) => String(p.productId) === String(newSetItemId));
    if (!found) {
      toast.error('Sản phẩm không hợp lệ');
      return;
    }
    const existingIndex = editSetItems.findIndex((it) => it.productId === found.productId);
    if (existingIndex >= 0) {
      setEditSetItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + (newSetItemQty || 1) } : it
        )
      );
    } else {
      setEditSetItems((prev) => [
        ...prev,
        {
          productId: found.productId,
          productCode: found.productCode,
          productName: found.productName,
          dimensions: found.dimensions?.formatted || (
            found.dimensions?.lengthCm || found.dimensions?.widthCm || found.dimensions?.heightCm
              ? `${found.dimensions?.lengthCm || 0}x${found.dimensions?.widthCm || 0}x${found.dimensions?.heightCm || 0} cm`
              : '—'
          ),
          quantity: Math.max(1, parseInt(newSetItemQty, 10) || 1),
          imageUrl: found.imageUrl || null,
          stockQuantity: found.stockQuantity ?? 0,
        },
      ]);
    }
    setNewSetItemId('');
    setNewSetItemQty(1);
    toast.success(`Đã thêm "${found.productName}" vào bộ`);
  };

  // ── Submit Edit ──────────────────────────────────────────
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!form.product_name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.keys(form).forEach((key) => {
        if (key !== 'product_code' && form[key] !== '' && form[key] !== null) {
          formData.append(key, form[key]);
        }
      });
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // Nếu là SET product, gửi kèm cấu hình set_items
      if (selectedProduct.isSet || form.product_type === 'SET') {
        const payloadItems = editSetItems.map((it) => ({
          item_product_id: it.productId,
          quantity: it.quantity || 1,
        }));
        formData.append('set_items', JSON.stringify(payloadItems));
      }

      await updateProduct(selectedProduct.productId, formData);
      toast.success(
        selectedProduct.isPartOfSet
          ? `Cập nhật sản phẩm con "${form.product_name}" thành công!`
          : selectedProduct.isSet
            ? `Cập nhật bộ sản phẩm "${form.product_name}" thành công!`
            : 'Cập nhật sản phẩm thành công!'
      );
      setIsEditOpen(false);
      fetchProductsList(currentPage);
      loadInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open Detail Modal ────────────────────────────────────
  const handleOpenDetail = async (p) => {
    setSelectedProduct(p);
    setIsDetailOpen(true);
    try {
      const res = await getProductDetail(p.productId);
      if (res?.data) setSelectedProduct(res.data);
      if (res?.usage) setSelectedUsage(res.usage);
    } catch {
      // ignore
    }
  };

  // ── Open Delete Modal ────────────────────────────────────
  const handleOpenDelete = async (p) => {
    setSelectedProduct(p);
    setSelectedUsage(null);
    setIsDeleteOpen(true);
    try {
      const res = await getProductDetail(p.productId);
      if (res?.usage) setSelectedUsage(res.usage);
    } catch {
      // ignore
    }
  };

  // ── Confirm Delete ───────────────────────────────────────
  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);
      await deleteProduct(selectedProduct.productId);
      toast.success('Xóa sản phẩm thành công!');
      setIsDeleteOpen(false);
      fetchProductsList(currentPage);
      loadInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa sản phẩm này');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="space-y-6 pb-12" data-testid="manage-products-page">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản lý Sản phẩm (Kho thành phẩm)
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Thêm mới sản phẩm, cập nhật tồn kho, hình ảnh và kiểm tra tình trạng hàng hóa của xưởng.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            data-testid="add-product-btn"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm mới
          </button>
        </div>
      </div>

      {/* ── Overview Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Tổng sản phẩm</span>
            <Boxes className="h-4 w-4 text-stone-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stockSummary.totalProducts || 0}</p>
          <span className="text-xs text-stone-500">Mã sản phẩm niêm yết</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Còn hàng</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stockSummary.inStock || 0}</p>
          <span className="text-xs text-emerald-700">Đang có sẵn trong kho</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Sắp hết hàng</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stockSummary.lowStock || 0}</p>
          <span className="text-xs text-amber-700">Tồn kho ≤ 5 cái</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Hết hàng</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-900">{stockSummary.outOfStock || 0}</p>
          <span className="text-xs text-rose-700">Cần bổ sung sản xuất</span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Tổng tồn thành phẩm</span>
            <PackageCheck className="h-4 w-4 text-stone-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stockSummary.totalQuantity || 0}</p>
          <span className="text-xs text-stone-500">Chiếc / Bộ trong kho</span>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã sản phẩm, tên, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-stone-200 pl-10 pr-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter (Single vs Set) */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả</option>
              <option value="SINGLE">Sản phẩm lẻ</option>
              <option value="SET">Bộ sản phẩm</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả danh mục</option>
              {metadata.categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>

            {/* Room Filter */}
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả phòng</option>
              {metadata.rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.room_name}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Mọi tình trạng tồn</option>
              <option value="IN_STOCK">Còn hàng (&gt; 0)</option>
              <option value="LOW_STOCK">Tồn thấp (≤ 5)</option>
              <option value="OUT_OF_STOCK">Hết hàng (0)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang kinh doanh</option>
              <option value="INACTIVE">Ngừng kinh doanh</option>
            </select>

            {(searchTerm || typeFilter !== 'ALL' || categoryFilter !== 'ALL' || roomFilter !== 'ALL' || stockStatusFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Products Table ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="border-b border-stone-200 bg-stone-50/75 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Ảnh</th>
                <th scope="col" className="px-4 py-3.5">Mã & Tên sản phẩm</th>
                <th scope="col" className="px-4 py-3.5">Phân loại</th>
                <th scope="col" className="px-4 py-3.5">Chất liệu / Màu</th>
                <th scope="col" className="px-4 py-3.5">Kích thước</th>
                <th scope="col" className="px-4 py-3.5 text-right">Đơn giá</th>
                <th scope="col" className="px-4 py-3.5 text-center">Tồn kho</th>
                <th scope="col" className="px-4 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-stone-500">
                    <RotateCw className="mx-auto mb-2 h-6 w-6 animate-spin text-stone-400" />
                    Đang tải dữ liệu sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-stone-500">
                    <Boxes className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                    Không tìm thấy sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stockQuantity > 0 && p.stockQuantity <= 5;
                  const isOut = p.stockQuantity === 0;
                  const isExpanded = expandedSetIds.has(p.productId);

                  return (
                    <Fragment key={p.productId}>
                      <tr
                        className={`hover:bg-stone-50/60 transition ${p.isSet ? 'cursor-pointer ' : ''
                          }${p.isSet && isExpanded ? 'bg-stone-100/70' : ''}`}
                        data-testid={`product-row-${p.productId}`}
                        onClick={() => p.isSet && toggleExpandSet(p.productId)}
                      >
                        {/* Image Thumbnail */}
                        <td className="px-4 py-3">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 flex items-center justify-center">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.productName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '';
                                }}
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-stone-300" />
                            )}
                          </div>
                        </td>

                        {/* Name & Code */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {p.isSet ? (
                              <button
                                type="button"
                                onClick={(e) => toggleExpandSet(p.productId, e)}
                                className="flex items-center gap-1.5 text-left font-semibold text-stone-900 hover:text-stone-700 transition group cursor-pointer"
                                title={isExpanded ? 'Thu gọn danh sách món con' : 'Nhấn để xổ xuống xem các món con thuộc bộ'}
                                data-testid={`toggle-set-${p.productId}`}
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded bg-stone-900 text-white group-hover:bg-stone-800 transition shadow-2xs">
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-white" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-white" />
                                  )}
                                </span>
                                <span className="group-hover:underline">{p.productName}</span>
                              </button>
                            ) : (
                              <span className="font-semibold text-stone-900">{p.productName}</span>
                            )}

                            {p.isSet && (
                              <button
                                type="button"
                                onClick={(e) => toggleExpandSet(p.productId, e)}
                                className="inline-flex items-center gap-1 rounded bg-stone-900 border border-stone-800 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-stone-800 transition cursor-pointer shadow-2xs"
                                title="Nhấn để xổ xuống xem chi tiết các món con"
                              >
                                <Boxes className="h-3 w-3" />
                                <span>Bộ {p.totalSetItems > 0 ? `${p.totalSetItems} món` : 'sản phẩm'}</span>
                                <span className="text-[10px] text-stone-300 font-normal">
                                  ({isExpanded ? '▲ Thu gọn' : '▼ Xổ xuống'})
                                </span>
                              </button>
                            )}

                            {!p.isSet && p.isPartOfSet && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600"
                                title={p.inSets?.length ? `Thuộc bộ: ${p.inSets.map((s) => s.setName).join(', ')}` : undefined}
                              >
                                Món con thuộc bộ
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-stone-500">{p.productCode}</div>
                        </td>

                        {/* Category & Room */}
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                            {p.categoryName || 'Chưa phân loại'}
                          </span>
                          <div className="mt-0.5 text-xs text-stone-400">{p.roomName || 'Đa năng'}</div>
                        </td>

                        {/* Material & Color */}
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-stone-800">{p.materialName || '—'}</div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-500">
                            {p.colorHex && (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300"
                                style={{ backgroundColor: p.colorHex }}
                              />
                            )}
                            {p.colorName || '—'}
                          </div>
                        </td>

                        {/* Dimensions */}
                        <td className="px-4 py-3 text-xs text-stone-600">
                          {p.dimensions?.formatted || '—'}
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-right font-medium text-stone-900">
                          {formatVND(p.price)}
                        </td>

                        {/* Stock Quantity */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isOut
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isLow
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                          >
                            {p.stockQuantity} cái
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-700'
                              }`}
                          >
                            {p.status === 'ACTIVE' ? 'Kinh doanh' : 'Ngừng'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Xem chi tiết"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(p);
                              }}
                              className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Chỉnh sửa"
                              data-testid={`edit-product-${p.productId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(p);
                              }}
                              className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Xóa"
                              data-testid={`delete-product-${p.productId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDelete(p);
                              }}
                              className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Sub-row Dropdown: Chi tiết các món con thuộc bộ sản phẩm ── */}
                      {p.isSet && isExpanded && (
                        <tr
                          key={`set-expand-${p.productId}`}
                          className="bg-stone-50/60 border-b-2 border-stone-200 animate-fadeIn"
                          data-testid={`set-dropdown-${p.productId}`}
                        >
                          <td colSpan={9} className="p-0">
                            <div className="border-l-4 border-stone-900 bg-stone-50/80 px-6 py-4 shadow-inner">
                              {/* Header của dropdown */}
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white">
                                    <Boxes className="h-3.5 w-3.5" />
                                  </span>
                                  <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                                      Danh sách các món con thuộc bộ:
                                    </span>{' '}
                                    <span className="text-xs font-semibold text-stone-800">
                                      {p.productName} ({p.productCode})
                                    </span>
                                  </div>
                                  <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-bold text-stone-800 border border-stone-300">
                                    {p.totalSetItems} món hoàn chỉnh
                                  </span>
                                </div>
                                <div className="text-xs text-stone-600">
                                  Giá bán bộ:{' '}
                                  <strong className="text-stone-900">{formatVND(p.price)}</strong> • Tồn kho bộ:
                                  {' '}
                                  <strong className="text-stone-900">{p.stockQuantity} bộ</strong>
                                </div>
                              </div>

                              {/* Bảng danh sách các sản phẩm con */}
                              {p.setItems && p.setItems.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="border-b border-stone-200 bg-stone-50/90 font-semibold uppercase tracking-wider text-stone-500">
                                      <tr>
                                        <th className="px-3 py-2 text-center w-10">STT</th>
                                        <th className="px-3 py-2 w-14">Ảnh</th>
                                        <th className="px-3 py-2">Mã & Tên sản phẩm con</th>
                                        <th className="px-3 py-2">Kích thước</th>
                                        <th className="px-3 py-2 text-center">Số lượng / bộ</th>
                                        <th className="px-3 py-2 text-center">Trạng thái</th>
                                        <th className="px-3 py-2 text-center w-28">Thao tác</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 text-stone-700">
                                      {p.setItems.map((item, idx) => (
                                        <tr
                                          key={item.setItemId || item.productId || idx}
                                          className="hover:bg-stone-50 transition"
                                        >
                                          <td className="px-3 py-2.5 text-center font-medium text-stone-400">
                                            {idx + 1}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="h-9 w-9 overflow-hidden rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                                              {item.imageUrl ? (
                                                <img
                                                  src={item.imageUrl}
                                                  alt={item.productName}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <ImageIcon className="h-4 w-4 text-stone-300" />
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="font-semibold text-stone-900">{item.productName}</div>
                                            <div className="font-mono text-[11px] text-stone-500">{item.productCode}</div>
                                          </td>
                                          <td className="px-3 py-2.5 text-stone-500">
                                            {item.dimensions || '—'}
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-0.5 font-bold text-stone-900 border border-stone-200">
                                              x{item.quantity} cái
                                            </span>
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                                              {item.status || 'ACTIVE'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenDetail(item)}
                                                className="rounded p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition"
                                                title="Xem chi tiết sản phẩm con"
                                                data-testid={`view-child-product-${item.productId}`}
                                              >
                                                <Eye className="h-4 w-4" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEdit(item)}
                                                className="rounded p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition"
                                                title="Chỉnh sửa sản phẩm con này"
                                                data-testid={`edit-child-product-${item.productId}`}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="border-t border-stone-200 bg-stone-50/70 font-medium">
                                      <tr>
                                        <td colSpan={4} className="px-3 py-2 text-right text-stone-500">
                                          Tổng số chi tiết cấu thành 1 bộ:
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-stone-900">
                                          {p.totalSetItems} món
                                        </td>
                                        <td colSpan={2} className="px-3 py-2 text-stone-500 text-xs italic">
                                          (Chỉ bán trọn bộ, không bán riêng lẻ)
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              ) : (
                                <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500">
                                  Chưa có thông tin danh sách món con trong bộ này.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={products.length}
          itemsPerPage={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
            fetchProductsList(1, newSize);
          }}
          itemLabel="sản phẩm"
          onPageChange={(p) => fetchProductsList(p, pageSize)}
          loading={loading}
        />
      </div>

      {/* ── Modal Thêm sản phẩm ───────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-stone-900">Thêm sản phẩm mới</h3>
                {form.product_type === 'SET' && (
                  <span className="rounded-full bg-stone-900 text-white px-2.5 py-0.5 text-xs font-bold">
                    Bộ sản phẩm (SET)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-4 p-6">
              {/* Product Type Selector: SINGLE vs SET */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600 block mb-1.5">
                  Loại sản phẩm *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, product_type: 'SINGLE' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${form.product_type === 'SINGLE'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Sản phẩm lẻ </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, product_type: 'SET' });
                      loadAvailableSingleProducts();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${form.product_type === 'SET'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <Boxes className="h-4 w-4" />
                    <span>Bộ sản phẩm </span>
                  </button>
                </div>
              </div>
              {/* Product Code & Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-stone-600">Mã sản phẩm</label>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-xs text-amber-700 hover:underline"
                    >
                      Sinh tự động
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="VD: TB-001"
                    value={form.product_code}
                    onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm font-mono focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase text-stone-600">Tên sản phẩm *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bàn ăn gỗ sồi 6 người"
                    value={form.product_name}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category, Room, Material, Color */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Danh mục *</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                  >
                    {metadata.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Phòng *</label>
                  <select
                    value={form.room_id}
                    onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                  >
                    {metadata.rooms.map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        {r.room_name}
                      </option>
                    ))}
                  </select>
                </div>
                <CreatableCombobox
                  id="create-product-material"
                  label="Chất liệu"
                  required
                  value={form.material_id}
                  options={metadata.materials}
                  valueKey="material_id"
                  labelKey="material_name"
                  placeholder="Chọn hoặc gõ để tìm/thêm chất liệu..."
                  onChange={(val) => setForm({ ...form, material_id: val })}
                  onCreate={handleCreateMaterial}
                />
                <CreatableCombobox
                  id="create-product-color"
                  label="Màu sắc"
                  required
                  isColor
                  value={form.color_id}
                  options={metadata.colors}
                  valueKey="color_id"
                  labelKey="color_name"
                  colorKey="hex_value"
                  placeholder="Chọn hoặc gõ để tìm/thêm màu sắc..."
                  onChange={(val) => setForm({ ...form, color_id: val })}
                  onCreate={handleCreateColor}
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Đơn giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 4500000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Số lượng tồn kho ban đầu *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 10"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dimensions: L, W, H */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Dài (cm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="160"
                    value={form.length_cm}
                    onChange={(e) => setForm({ ...form, length_cm: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Rộng (cm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="80"
                    value={form.width_cm}
                    onChange={(e) => setForm({ ...form, width_cm: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Cao (cm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="75"
                    value={form.height_cm}
                    onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image Upload Cloudinary (1 ảnh đại diện) */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Ảnh đại diện sản phẩm</label>
                {imagePreview ? (
                  <div className="relative mt-2 h-44 w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-2 top-2 rounded-full bg-rose-600 p-1 text-white shadow hover:bg-rose-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-6 text-center hover:bg-stone-50">
                    <Upload className="h-8 w-8 text-stone-400" />
                    <span className="mt-2 text-sm font-medium text-stone-700">Tải ảnh đại diện lên Cloudinary</span>
                    <span className="text-xs text-stone-400">JPG, PNG, WEBP (Tối đa 5MB)</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Mô tả sản phẩm</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả kiểu dáng, hoàn thiện sơn PU..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                >
                  <option value="ACTIVE">Đang kinh doanh</option>
                  <option value="INACTIVE">Ngừng kinh doanh </option>
                </select>
              </div>

              {/* Set Items Builder (khi tạo SET) */}
              {form.product_type === 'SET' && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white">
                        <Boxes className="h-3.5 w-3.5" />
                      </span>
                      <h4 className="text-sm font-bold text-stone-900">
                        Chọn các sản phẩm con cấu thành bộ
                      </h4>
                      <span className="rounded-full bg-stone-200 border border-stone-300 px-2 py-0.5 text-[11px] font-bold text-stone-800">
                        {createSetItems.reduce((acc, c) => acc + (c.quantity || 1), 0)} món
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 italic">
                      (Chỉ bán trọn gói cả bộ, không bán lẻ từng món)
                    </span>
                  </div>

                  {/* Bảng các món con đã chọn */}
                  {createSetItems.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase text-stone-600">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">STT</th>
                            <th className="px-3 py-2 w-12">Ảnh</th>
                            <th className="px-3 py-2">Sản phẩm con</th>
                            <th className="px-3 py-2 text-center w-28">Kích thước</th>
                            <th className="px-3 py-2 text-center w-36">Số lượng trong 1 bộ</th>
                            <th className="px-3 py-2 text-center w-16">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-700">
                          {createSetItems.map((item, idx) => (
                            <tr key={item.productId || idx} className="hover:bg-stone-50">
                              <td className="px-3 py-2 text-center text-stone-400 font-medium">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <div className="h-8 w-8 overflow-hidden rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-stone-300" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-stone-900">{item.productName}</div>
                                <div className="font-mono text-[11px] text-stone-500">{item.productCode}</div>
                              </td>
                              <td className="px-3 py-2 text-center text-stone-600 text-[11px]">
                                {item.dimensions || '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCreateSetItemQuantity(item.productId, -1)}
                                    className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded-l-lg font-bold"
                                    title="Giảm 1 cái"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleCreateSetItemQuantityChange(item.productId, e.target.value)}
                                    className="w-12 text-center text-xs font-bold text-stone-900 border-x border-stone-200 py-1 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCreateSetItemQuantity(item.productId, 1)}
                                    className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded-r-lg font-bold"
                                    title="Tăng 1 cái"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCreateSetItem(item.productId)}
                                  className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                                  title="Xóa khỏi bộ"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-stone-200 bg-stone-50/70 font-medium">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right text-stone-500">
                              Tổng cộng các chi tiết trong 1 bộ:
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-stone-900">
                              {createSetItems.reduce((acc, c) => acc + (c.quantity || 1), 0)} món
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 bg-white">
                      Chưa có món con nào trong bộ. Hãy thêm sản phẩm con bên dưới (chọn có sẵn hoặc tạo mới trực tiếp).
                    </div>
                  )}

                  {/* Khu vực thêm món con: Chọn có sẵn hoặc Tạo mới trực tiếp */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-3">
                    {/* Header tabs toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Thêm sản phẩm thành phần
                      </span>
                      <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setCreateChildMode('EXISTING')}
                          className={`rounded-md px-3 py-1 transition ${createChildMode === 'EXISTING'
                              ? 'bg-white text-stone-900 shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                          Chọn sản phẩm có sẵn
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateChildMode('NEW');
                            setNewChildForm((prev) => ({
                              ...prev,
                              category_id: prev.category_id || metadata.categories[0]?.category_id || '',
                              room_id: prev.room_id || form.room_id || metadata.rooms[0]?.room_id || '',
                              material_id: prev.material_id || form.material_id || metadata.materials[0]?.material_id || '',
                              color_id: prev.color_id || form.color_id || metadata.colors[0]?.color_id || '',
                            }));
                          }}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1 transition ${createChildMode === 'NEW'
                              ? 'bg-white text-stone-900 shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                          <Plus className="h-3 w-3" />
                          Tạo mới sản phẩm con trực tiếp
                        </button>
                      </div>
                    </div>

                    {createChildMode === 'EXISTING' ? (
                      /* Tab 1: Chọn từ danh sách sản phẩm lẻ có sẵn */
                      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg p-2.5 border border-stone-200">
                        <select
                          value={newCreateSetItemId}
                          onChange={(e) => setNewCreateSetItemId(e.target.value)}
                          className="flex-1 min-w-[200px] rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                        >
                          <option value="">-- Chọn sản phẩm thành phần đưa vào bộ --</option>
                          {availableSingleProducts
                            .filter((sp) => !createSetItems.some((it) => it.productId === sp.productId))
                            .map((sp) => (
                              <option key={sp.productId} value={sp.productId}>
                                {sp.productCode} - {sp.productName}
                              </option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-stone-500">Số lượng:</span>
                          <input
                            type="number"
                            min="1"
                            value={newCreateSetItemQty}
                            onChange={(e) => setNewCreateSetItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-16 rounded-lg border border-stone-200 p-2 text-center text-xs font-semibold focus:border-stone-900 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCreateSetItem}
                          className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm vào bộ</span>
                        </button>
                      </div>
                    ) : (
                      /* Tab 2: Tạo mới sản phẩm con trực tiếp trong bộ */
                      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <div className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            Thông tin sản phẩm con mới (tự động gắn vào bộ này)
                          </div>
                          <span className="text-[11px] text-stone-500 italic">
                            * Không bán lẻ, tồn kho đi theo bộ
                          </span>
                        </div>

                        {/* Hàng 1: Tên & Mã */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Tên sản phẩm con <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newChildForm.product_name}
                              onChange={(e) => setNewChildForm({ ...newChildForm, product_name: e.target.value })}
                              placeholder="VD: Ghế ăn bọc nệm, Mặt bàn kính cường lực..."
                              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-stone-700">
                                Mã sản phẩm con
                              </label>
                              <button
                                type="button"
                                onClick={handleGenerateChildCode}
                                className="text-[10px] text-stone-500 hover:text-stone-900 underline"
                              >
                                Tự sinh mã
                              </button>
                            </div>
                            <input
                              type="text"
                              value={newChildForm.product_code}
                              onChange={(e) => setNewChildForm({ ...newChildForm, product_code: e.target.value.toUpperCase() })}
                              placeholder="Tự sinh nếu trống"
                              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs font-mono text-stone-900 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Hàng 2: Danh mục, Phòng, Chất liệu, Màu sắc */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Danh mục <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={newChildForm.category_id || metadata.categories[0]?.category_id || ''}
                              onChange={(e) => setNewChildForm({ ...newChildForm, category_id: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                            >
                              {metadata.categories.map((c) => (
                                <option key={c.category_id} value={c.category_id}>
                                  {c.category_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Phòng
                            </label>
                            <select
                              value={newChildForm.room_id || form.room_id || metadata.rooms[0]?.room_id || ''}
                              onChange={(e) => setNewChildForm({ ...newChildForm, room_id: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                            >
                              {metadata.rooms.map((r) => (
                                <option key={r.room_id} value={r.room_id}>
                                  {r.room_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <CreatableCombobox
                            id="create-child-material"
                            label="Chất liệu"
                            value={newChildForm.material_id || form.material_id || metadata.materials[0]?.material_id || ''}
                            options={metadata.materials}
                            valueKey="material_id"
                            labelKey="material_name"
                            placeholder="Chọn hoặc gõ tìm/thêm..."
                            onChange={(val) => setNewChildForm({ ...newChildForm, material_id: val })}
                            onCreate={handleCreateMaterial}
                          />
                          <CreatableCombobox
                            id="create-child-color"
                            label="Màu sắc"
                            isColor
                            value={newChildForm.color_id || form.color_id || metadata.colors[0]?.color_id || ''}
                            options={metadata.colors}
                            valueKey="color_id"
                            labelKey="color_name"
                            colorKey="hex_value"
                            placeholder="Chọn hoặc gõ tìm/thêm..."
                            onChange={(val) => setNewChildForm({ ...newChildForm, color_id: val })}
                            onCreate={handleCreateColor}
                          />
                        </div>

                        {/* Hàng 3: Kích thước & Số lượng trong 1 bộ */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="md:col-span-3">
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Kích thước (Dài x Rộng x Cao cm)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                min="0"
                                value={newChildForm.length_cm}
                                onChange={(e) => setNewChildForm({ ...newChildForm, length_cm: e.target.value })}
                                placeholder="Dài (cm)"
                                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                              <input
                                type="number"
                                min="0"
                                value={newChildForm.width_cm}
                                onChange={(e) => setNewChildForm({ ...newChildForm, width_cm: e.target.value })}
                                placeholder="Rộng (cm)"
                                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                              <input
                                type="number"
                                min="0"
                                value={newChildForm.height_cm}
                                onChange={(e) => setNewChildForm({ ...newChildForm, height_cm: e.target.value })}
                                placeholder="Cao (cm)"
                                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Số lượng trong 1 bộ <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newChildForm.quantity}
                              onChange={(e) => setNewChildForm({ ...newChildForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-center text-stone-900 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Hàng 4: Upload ảnh con + Nút tạo & đưa vào bộ */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-stone-100">
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition">
                              <Upload className="h-3.5 w-3.5 text-stone-500" />
                              <span>{newChildImagePreview ? 'Đổi ảnh món con' : 'Ảnh món con (tuỳ chọn)'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleNewChildImageChange}
                                className="hidden"
                              />
                            </label>
                            {newChildImagePreview && (
                              <div className="relative inline-block">
                                <img
                                  src={newChildImagePreview}
                                  alt="Preview món con"
                                  className="h-9 w-9 rounded-md object-cover border border-stone-300 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={handleRemoveNewChildImage}
                                  className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 p-0.5 text-white shadow hover:bg-rose-600"
                                  title="Xóa ảnh"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isCreatingChild}
                            onClick={() => handleCreateAndAddChildItem('create')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{isCreatingChild ? 'Đang tạo món con...' : 'Tạo & Đưa vào bộ ngay'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu & Upload ảnh...' : form.product_type === 'SET' ? 'Tạo bộ sản phẩm' : 'Thêm sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Sửa sản phẩm ─────────────────────────────────── */}
      {isEditOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                  {selectedProduct.isPartOfSet
                    ? 'Chỉnh sửa sản phẩm con: '
                    : selectedProduct.isSet || form.product_type === 'SET'
                      ? 'Chỉnh sửa bộ sản phẩm: '
                      : 'Chỉnh sửa sản phẩm: '}
                  <span className="font-mono text-stone-600">{selectedProduct.productCode}</span>
                  {selectedProduct.isPartOfSet && selectedProduct.inSets?.[0] && (
                    <span className="text-xs font-semibold text-stone-700 bg-stone-100 rounded-md px-2.5 py-0.5 border border-stone-300">
                      Thuộc bộ: {selectedProduct.inSets[0].setName || selectedProduct.inSets[0].setCode}
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 p-6">
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              {/* Category, Room, Material, Color */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Danh mục</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                  >
                    {metadata.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Phòng</label>
                  <select
                    value={form.room_id}
                    onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                  >
                    {metadata.rooms.map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        {r.room_name}
                      </option>
                    ))}
                  </select>
                </div>
                <CreatableCombobox
                  id="edit-product-material"
                  label="Chất liệu"
                  required
                  value={form.material_id}
                  options={metadata.materials}
                  valueKey="material_id"
                  labelKey="material_name"
                  placeholder="Chọn hoặc gõ để tìm/thêm chất liệu..."
                  onChange={(val) => setForm({ ...form, material_id: val })}
                  onCreate={handleCreateMaterial}
                />
                <CreatableCombobox
                  id="edit-product-color"
                  label="Màu sắc"
                  required
                  isColor
                  value={form.color_id}
                  options={metadata.colors}
                  valueKey="color_id"
                  labelKey="color_name"
                  colorKey="hex_value"
                  placeholder="Chọn hoặc gõ để tìm/thêm màu sắc..."
                  onChange={(val) => setForm({ ...form, color_id: val })}
                  onCreate={handleCreateColor}
                />
              </div>

              {/* Price & Stock */}
              {selectedProduct.isPartOfSet ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900">
                    <Boxes className="h-4 w-4 text-stone-800" />
                    <span>Chi tiết cấu thành bộ (Chỉ bán trọn bộ, không bán riêng lẻ)</span>
                  </div>
                  <p className="mt-1 text-stone-500">
                    Sản phẩm này là chi tiết đi theo bộ. Giá bán và số lượng tồn kho được quản lý tập trung theo Bộ sản phẩm ({selectedProduct.inSets?.[0]?.setName || 'Bộ sản phẩm'}).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-600">
                      {selectedProduct.isSet || form.product_type === 'SET' ? 'Đơn giá bán bộ (VNĐ)' : 'Đơn giá bán (VNĐ)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-600">
                      {selectedProduct.isSet || form.product_type === 'SET' ? 'Số lượng bộ tồn kho' : 'Số lượng tồn kho'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Dài (cm)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.length_cm}
                    onChange={(e) => setForm({ ...form, length_cm: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Rộng (cm)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.width_cm}
                    onChange={(e) => setForm({ ...form, width_cm: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Cao (cm)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.height_cm}
                    onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image Cloudinary */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Thay đổi ảnh đại diện</label>
                {imagePreview ? (
                  <div className="relative mt-2 h-44 w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-2 top-2 rounded-full bg-rose-600 p-1 text-white shadow hover:bg-rose-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-6 text-center hover:bg-stone-50">
                    <Upload className="h-8 w-8 text-stone-400" />
                    <span className="mt-2 text-sm font-medium text-stone-700">Chọn ảnh mới để thay thế</span>
                    <span className="text-xs text-stone-400">JPG, PNG, WEBP (Tối đa 5MB)</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Mô tả sản phẩm</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                >
                  <option value="ACTIVE">Đang kinh doanh (ACTIVE)</option>
                  <option value="INACTIVE">Ngừng kinh doanh (INACTIVE)</option>
                </select>
              </div>

              {/* Set Items Management (nếu là SET) */}
              {(selectedProduct.isSet || form.product_type === 'SET') && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white">
                        <Boxes className="h-3.5 w-3.5" />
                      </span>
                      <h4 className="text-sm font-bold text-stone-900">
                        Cấu hình các sản phẩm con trong bộ
                      </h4>
                      <span className="rounded-full bg-stone-200 border border-stone-300 px-2 py-0.5 text-[11px] font-bold text-stone-800">
                        {editSetItems.reduce((acc, c) => acc + (c.quantity || 1), 0)} món
                      </span>
                    </div>
                    <span className="text-xs text-stone-500">
                      Giá bán nguyên bộ: <strong className="text-stone-900">{formatVND(form.price)}</strong>
                    </span>
                  </div>

                  {/* Bảng các món con trong bộ */}
                  {editSetItems.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase text-stone-600">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">STT</th>
                            <th className="px-3 py-2 w-12">Ảnh</th>
                            <th className="px-3 py-2">Sản phẩm con</th>
                            <th className="px-3 py-2 text-center w-28">Kích thước</th>
                            <th className="px-3 py-2 text-center w-36">Số lượng trong 1 bộ</th>
                            <th className="px-3 py-2 text-center w-20">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-700">
                          {editSetItems.map((item, idx) => (
                            <tr key={item.productId || idx} className="hover:bg-stone-50">
                              <td className="px-3 py-2 text-center text-stone-400 font-medium">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <div className="h-8 w-8 overflow-hidden rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-stone-300" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-stone-900">{item.productName}</div>
                                <div className="font-mono text-[11px] text-stone-500">{item.productCode}</div>
                              </td>
                              <td className="px-3 py-2 text-center text-stone-600 text-[11px]">
                                {item.dimensions || '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSetItemQuantity(item.productId, -1)}
                                    className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded-l-lg font-bold"
                                    title="Giảm 1 cái"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleSetItemQuantityChange(item.productId, e.target.value)}
                                    className="w-12 text-center text-xs font-bold text-stone-900 border-x border-stone-200 py-1 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSetItemQuantity(item.productId, 1)}
                                    className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded-r-lg font-bold"
                                    title="Tăng 1 cái"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(item)}
                                    className="rounded p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition"
                                    title="Sửa thông tin sản phẩm con này"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSetItem(item.productId)}
                                    className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                                    title="Xóa món này khỏi bộ"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-stone-200 bg-stone-50/70 font-medium">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right text-stone-500">
                              Tổng cộng các chi tiết cấu thành 1 bộ:
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-stone-900">
                              {editSetItems.reduce((acc, c) => acc + (c.quantity || 1), 0)} chi tiết
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 bg-white">
                      Bộ chưa có món con nào. Vui lòng thêm sản phẩm con bên dưới (chọn có sẵn hoặc tạo mới trực tiếp).
                    </div>
                  )}

                  {/* Khu vực thêm món con: Chọn có sẵn hoặc Tạo mới trực tiếp */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-3">
                    {/* Header tabs toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Thêm sản phẩm thành phần
                      </span>
                      <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setEditChildMode('EXISTING')}
                          className={`rounded-md px-3 py-1 transition ${editChildMode === 'EXISTING'
                              ? 'bg-white text-stone-900 shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                          Chọn sản phẩm có sẵn
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditChildMode('NEW');
                            setNewChildForm((prev) => ({
                              ...prev,
                              category_id: prev.category_id || metadata.categories[0]?.category_id || '',
                              room_id: prev.room_id || form.room_id || metadata.rooms[0]?.room_id || '',
                              material_id: prev.material_id || form.material_id || metadata.materials[0]?.material_id || '',
                              color_id: prev.color_id || form.color_id || metadata.colors[0]?.color_id || '',
                            }));
                          }}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1 transition ${editChildMode === 'NEW'
                              ? 'bg-white text-stone-900 shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                          <Plus className="h-3 w-3" />
                          Tạo mới sản phẩm con trực tiếp
                        </button>
                      </div>
                    </div>

                    {editChildMode === 'EXISTING' ? (
                      /* Tab 1: Chọn từ danh sách sản phẩm con có sẵn */
                      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg p-2.5 border border-stone-200">
                        <select
                          value={newSetItemId}
                          onChange={(e) => setNewSetItemId(e.target.value)}
                          className="flex-1 min-w-[200px] rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                        >
                          <option value="">-- Chọn sản phẩm con để thêm --</option>
                          {availableSingleProducts
                            .filter((sp) => !editSetItems.some((it) => it.productId === sp.productId))
                            .map((sp) => (
                              <option key={sp.productId} value={sp.productId}>
                                {sp.productCode} - {sp.productName}
                              </option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-stone-500">Số lượng:</span>
                          <input
                            type="number"
                            min="1"
                            value={newSetItemQty}
                            onChange={(e) => setNewSetItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-16 rounded-lg border border-stone-200 p-2 text-center text-xs font-semibold focus:border-stone-900 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSetItem}
                          className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm vào bộ</span>
                        </button>
                      </div>
                    ) : (
                      /* Tab 2: Tạo mới sản phẩm con trực tiếp trong bộ */
                      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <div className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            Thông tin sản phẩm con mới (tự động gắn vào bộ này)
                          </div>
                          <span className="text-[11px] text-stone-500 italic">
                            * Không bán lẻ, tồn kho đi theo bộ
                          </span>
                        </div>

                        {/* Hàng 1: Tên & Mã */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Tên sản phẩm con <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newChildForm.product_name}
                              onChange={(e) => setNewChildForm({ ...newChildForm, product_name: e.target.value })}
                              placeholder="VD: Ghế ăn bọc nệm, Mặt bàn kính cường lực..."
                              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-stone-700">
                                Mã sản phẩm con
                              </label>
                              <button
                                type="button"
                                onClick={handleGenerateChildCode}
                                className="text-[10px] text-stone-500 hover:text-stone-900 underline"
                              >
                                Tự sinh mã
                              </button>
                            </div>
                            <input
                              type="text"
                              value={newChildForm.product_code}
                              onChange={(e) => setNewChildForm({ ...newChildForm, product_code: e.target.value.toUpperCase() })}
                              placeholder="Tự sinh nếu trống"
                              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs font-mono text-stone-900 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Hàng 2: Danh mục, Phòng, Chất liệu, Màu sắc */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Danh mục <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={newChildForm.category_id || metadata.categories[0]?.category_id || ''}
                              onChange={(e) => setNewChildForm({ ...newChildForm, category_id: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                            >
                              {metadata.categories.map((c) => (
                                <option key={c.category_id} value={c.category_id}>
                                  {c.category_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Phòng
                            </label>
                            <select
                              value={newChildForm.room_id || form.room_id || metadata.rooms[0]?.room_id || ''}
                              onChange={(e) => setNewChildForm({ ...newChildForm, room_id: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                            >
                              {metadata.rooms.map((r) => (
                                <option key={r.room_id} value={r.room_id}>
                                  {r.room_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <CreatableCombobox
                            id="edit-child-material"
                            label="Chất liệu"
                            value={newChildForm.material_id || form.material_id || metadata.materials[0]?.material_id || ''}
                            options={metadata.materials}
                            valueKey="material_id"
                            labelKey="material_name"
                            placeholder="Chọn hoặc gõ tìm/thêm..."
                            onChange={(val) => setNewChildForm({ ...newChildForm, material_id: val })}
                            onCreate={handleCreateMaterial}
                          />
                          <CreatableCombobox
                            id="edit-child-color"
                            label="Màu sắc"
                            isColor
                            value={newChildForm.color_id || form.color_id || metadata.colors[0]?.color_id || ''}
                            options={metadata.colors}
                            valueKey="color_id"
                            labelKey="color_name"
                            colorKey="hex_value"
                            placeholder="Chọn hoặc gõ tìm/thêm..."
                            onChange={(val) => setNewChildForm({ ...newChildForm, color_id: val })}
                            onCreate={handleCreateColor}
                          />
                        </div>

                        {/* Hàng 3: Kích thước & Số lượng trong 1 bộ */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="md:col-span-3">
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Kích thước (Dài x Rộng x Cao cm)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                min="0"
                                value={newChildForm.length_cm}
                                onChange={(e) => setNewChildForm({ ...newChildForm, length_cm: e.target.value })}
                                placeholder="Dài (cm)"
                                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                              <input
                                type="number"
                                min="0"
                                value={newChildForm.width_cm}
                                onChange={(e) => setNewChildForm({ ...newChildForm, width_cm: e.target.value })}
                                placeholder="Rộng (cm)"
                                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                              <input
                                type="number"
                                min="0"
                                value={newChildForm.height_cm}
                                onChange={(e) => setNewChildForm({ ...newChildForm, height_cm: e.target.value })}
                                placeholder="Cao (cm)"
                                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Số lượng trong 1 bộ <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newChildForm.quantity}
                              onChange={(e) => setNewChildForm({ ...newChildForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-center text-stone-900 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Hàng 4: Upload ảnh con + Nút tạo & đưa vào bộ */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-stone-100">
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition">
                              <Upload className="h-3.5 w-3.5 text-stone-500" />
                              <span>{newChildImagePreview ? 'Đổi ảnh món con' : 'Ảnh món con (tuỳ chọn)'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleNewChildImageChange}
                                className="hidden"
                              />
                            </label>
                            {newChildImagePreview && (
                              <div className="relative inline-block">
                                <img
                                  src={newChildImagePreview}
                                  alt="Preview món con"
                                  className="h-9 w-9 rounded-md object-cover border border-stone-300 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={handleRemoveNewChildImage}
                                  className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 p-0.5 text-white shadow hover:bg-rose-600"
                                  title="Xóa ảnh"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isCreatingChild}
                            onClick={() => handleCreateAndAddChildItem('edit')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{isCreatingChild ? 'Đang tạo món con...' : 'Tạo & Đưa vào bộ ngay'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting ? 'Đang cập nhật...' : 'Cập nhật sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Chi tiết sản phẩm ───────────────────────────── */}
      {isDetailOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-fadeIn">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-white flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-bold text-stone-900">Chi tiết sản phẩm</h3>
                <span className="font-mono text-xs font-semibold text-stone-500 bg-stone-100 rounded-md px-2 py-0.5">
                  {selectedProduct.productCode}
                </span>
                {selectedProduct.isSet ? (
                  <span className="inline-flex items-center gap-1 rounded bg-stone-900 px-2 py-0.5 text-xs font-bold text-white shadow-2xs">
                    <Boxes className="h-3.5 w-3.5" />
                    Bộ {selectedProduct.totalSetItems > 0 ? `${selectedProduct.totalSetItems} món` : 'sản phẩm'}
                  </span>
                ) : (
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                    Sản phẩm lẻ
                  </span>
                )}
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${selectedProduct.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                    }`}
                >
                  {selectedProduct.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Top Section: Image & Main Specs (2 columns) */}
              <div className="flex flex-col gap-6 md:flex-row">
                {/* Left Column: Image & Price Card */}
                <div className="w-full md:w-72 flex-shrink-0 space-y-3">
                  <div className="h-56 w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center p-2">
                    {selectedProduct.imageUrl ? (
                      <img
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.productName}
                        className="h-full w-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-stone-300">
                        <ImageIcon className="h-12 w-12" />
                        <span className="text-xs mt-1 text-stone-400">Chưa có ảnh</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Stock Card */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-2 text-xs">
                    {selectedProduct.isPartOfSet ? (
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-stone-900">
                          <Boxes className="h-4 w-4 text-stone-800" />
                          <span>Chi tiết cấu thành bộ (Chỉ bán cả bộ)</span>
                        </div>
                        <p className="mt-1 text-stone-500 leading-relaxed">
                          Sản phẩm này là chi tiết đi theo bộ, không bán riêng lẻ. Giá bán và số lượng tồn kho được quản lý theo trọn bộ sản phẩm.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-stone-500 font-medium">
                            {selectedProduct.isSet ? 'Đơn giá bán bộ:' : 'Đơn giá bán:'}
                          </span>
                          <div className="text-xl font-bold text-stone-900 mt-0.5">
                            {formatVND(selectedProduct.price)}
                          </div>
                        </div>
                        <div className="border-t border-stone-200 pt-2 flex items-center justify-between">
                          <span className="text-stone-500">Tồn kho sẵn có:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full ${selectedProduct.stockQuantity === 0
                                ? 'bg-rose-100 text-rose-700'
                                : selectedProduct.stockQuantity <= 5
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                          >
                            {selectedProduct.stockQuantity} {selectedProduct.isSet ? 'bộ' : 'chiếc'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: Name, Specifications & Description */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-stone-900">{selectedProduct.productName}</h4>
                    <p className="text-xs text-stone-500 mt-0.5 font-mono">Mã: {selectedProduct.productCode}</p>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 text-xs">
                    <div>
                      <span className="text-stone-400 block mb-0.5">Danh mục</span>
                      <p className="font-semibold text-stone-800">{selectedProduct.categoryName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-stone-400 block mb-0.5">Không gian phòng</span>
                      <p className="font-semibold text-stone-800">{selectedProduct.roomName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-stone-400 block mb-0.5">Chất liệu chính</span>
                      <p className="font-semibold text-stone-800">{selectedProduct.materialName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-stone-400 block mb-0.5">Màu sắc</span>
                      <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                        {selectedProduct.colorHex && (
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-stone-300"
                            style={{ backgroundColor: selectedProduct.colorHex }}
                          />
                        )}
                        <span>{selectedProduct.colorName || '—'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-400 block mb-0.5">Kích thước (DxRxC)</span>
                      <p className="font-semibold text-stone-800">{selectedProduct.dimensions?.formatted || '—'}</p>
                    </div>
                    <div>
                      <span className="text-stone-400 block mb-0.5">Phân loại</span>
                      <p className="font-semibold text-stone-800">
                        {selectedProduct.isSet ? 'Bộ sản phẩm' : 'Sản phẩm lẻ '}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <div className="rounded-xl border border-stone-200 p-3.5 text-xs text-stone-700 bg-white">
                      <span className="font-semibold text-stone-900 block mb-1">Mô tả sản phẩm:</span>
                      <p className="leading-relaxed text-stone-600">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Set items breakdown: Full width table below top section */}
              {selectedProduct.isSet && selectedProduct.setItems?.length > 0 && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                    <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Boxes className="h-4 w-4 text-stone-800" />
                      Chi tiết {selectedProduct.setItems.length} loại sản phẩm trong bộ (Tổng cộng {selectedProduct.totalSetItems} món hoàn chỉnh):
                    </h5>
                    <span className="text-xs text-stone-500">
                      Giá bán trọn bộ: <strong className="text-stone-900">{formatVND(selectedProduct.price)}</strong>
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">STT</th>
                          <th className="px-3 py-2 w-12">Ảnh</th>
                          <th className="px-3 py-2">Mã & Tên món con</th>
                          <th className="px-3 py-2">Kích thước</th>
                          <th className="px-3 py-2 text-center">Số lượng trong 1 bộ</th>
                          <th className="px-3 py-2 text-center w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-700">
                        {selectedProduct.setItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-stone-50 transition">
                            <td className="px-3 py-2 text-center font-medium text-stone-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2">
                              <div className="h-8 w-8 overflow-hidden rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-stone-300" />
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-stone-900">{item.productName}</div>
                              <div className="font-mono text-[11px] text-stone-500">{item.productCode}</div>
                            </td>
                            <td className="px-3 py-2 text-stone-500">
                              {item.dimensions || '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 font-bold text-stone-900 border border-stone-200">
                                x{item.quantity} cái
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDetailOpen(false);
                                  handleOpenEdit(item);
                                }}
                                className="inline-flex items-center gap-1 rounded bg-stone-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-stone-800 transition"
                                title="Chỉnh sửa sản phẩm con này"
                                data-testid={`detail-edit-child-${item.productId}`}
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Sửa</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-stone-200 bg-stone-50/80 font-medium">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right text-stone-500">
                            Tổng số chi tiết cấu thành 1 bộ:
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-stone-900">
                            {selectedProduct.totalSetItems} món
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-stone-400 italic">
                            (Chỉ bán cả bộ)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between border-t border-stone-200 px-6 py-3.5 bg-stone-50/80 flex-shrink-0">
              <span className="text-xs text-stone-400">
                {selectedProduct.createdAt ? `Tạo ngày: ${new Date(selectedProduct.createdAt).toLocaleDateString('vi-VN')}` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenEdit(selectedProduct);
                  }}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs transition"
                >
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-2xs transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xóa sản phẩm ─────────────────────────────────── */}
      {isDeleteOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Xóa sản phẩm</h3>
                <p className="mt-1 text-xs text-stone-600">
                  Bạn có chắc chắn muốn xóa sản phẩm <strong>"{selectedProduct.productName}"</strong> ({selectedProduct.productCode})?
                </p>
              </div>
            </div>

            {/* Check Usage Alert */}
            {selectedUsage && selectedUsage.totalUsage > 0 && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <p className="font-semibold">Không thể xóa trực tiếp!</p>
                <p className="mt-1 text-rose-700">
                  Sản phẩm này đã phát sinh <strong>{selectedUsage.totalUsage}</strong> giao dịch (đơn hàng, hợp đồng, nhập kho...).
                  Theo quy định toàn vẹn dữ liệu, bạn nên chuyển trạng thái sang <strong>Ngừng kinh doanh </strong> thay vì xóa.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy
              </button>
              {selectedUsage && selectedUsage.totalUsage > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    await updateProduct(selectedProduct.productId, { status: 'INACTIVE' });
                    toast.success('Đã chuyển trạng thái sang Ngừng kinh doanh!');
                    setIsDeleteOpen(false);
                    fetchProductsList(currentPage);
                  }}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Ngừng kinh doanh
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
