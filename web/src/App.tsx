import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useSession } from './session';
import { ShopPage } from './pages/ShopPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage, OrderPage } from './pages/OrdersPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';

function Layout() {
  const { user, cartCount, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          Fernhill Plants
        </Link>
        <nav>
          <Link to="/cart" data-testid="nav-cart">
            Cart <span data-testid="cart-count">{cartCount}</span>
          </Link>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <span data-testid="user-name" className="muted">
                {user.name}
              </span>
              <button
                className="link"
                data-testid="sign-out"
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

function RequireAuth() {
  const { user, ready } = useSession();
  const location = useLocation();
  if (!ready) return <p className="muted">Loading...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ShopPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
