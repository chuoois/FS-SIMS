// =========================================================
// StatusBadge.js
// Re-export để đảm bảo tất cả import '../../components/common/StatusBadge'
// đều giải quyết chính xác trong mọi môi trường (Node, Docker, Rollup, Vite)
// =========================================================

export * from './StatusBadge.jsx';
export { default } from './StatusBadge.jsx';
