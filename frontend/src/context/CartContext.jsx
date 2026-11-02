import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import * as cartService from '../services/cartService';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState({ items: [], itemCount: 0, subtotal: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], itemCount: 0, subtotal: 0 });
      setError('');
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError('');
    try {
      const response = await cartService.getCart();
      const nextCart = response.data || { items: [], itemCount: 0, subtotal: 0 };
      setCart(nextCart);
      return nextCart;
    } catch (requestError) {
      console.error('[CartContext] Không thể tải giỏ hàng:', requestError);
      setError(requestError.response?.data?.message || 'Không thể tải giỏ hàng. Vui lòng thử lại.');
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCart({ items: [], itemCount: 0, subtotal: 0 });
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    cartService.getCart()
      .then((response) => {
        if (!cancelled) {
          setCart(response.data || { items: [], itemCount: 0, subtotal: 0 });
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('[CartContext] Không thể tải giỏ hàng:', requestError);
        setError(requestError.response?.data?.message || 'Không thể tải giỏ hàng. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userAccountId]);

  const applyMutation = useCallback(async (mutation) => {
    const response = await mutation();
    const nextCart = response.data || { items: [], itemCount: 0, subtotal: 0 };
    setCart(nextCart);
    setError('');
    return nextCart;
  }, []);

  const addItem = useCallback(
    (productId, quantity = 1) =>
      applyMutation(() => cartService.addCartItem(productId, quantity)),
    [applyMutation]
  );
  const updateItem = useCallback(
    (productId, quantity) =>
      applyMutation(() => cartService.updateCartItem(productId, quantity)),
    [applyMutation]
  );
  const removeItem = useCallback(
    (productId) => applyMutation(() => cartService.removeCartItem(productId)),
    [applyMutation]
  );

  const value = useMemo(
    () => ({
      ...cart,
      loading,
      error,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
    }),
    [cart, loading, error, refreshCart, addItem, updateItem, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart phải được dùng bên trong <CartProvider>');
  return context;
}
