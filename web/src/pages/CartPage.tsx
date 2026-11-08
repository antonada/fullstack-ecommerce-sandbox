import { useState } from 'react';
import { Link } from 'react-router';
import type { CartT } from '@shop/shared/schemas';
import { api, ApiFailure, money } from '../api';
import { useSession } from '../session';

export function CartPage() {
  const { cart, setCart } = useSession();
  const [error, setError] = useState('');

  async function change(productId: string, quantity: number) {
    setError('');
    try {
      const path = `/cart/items/${productId}`;
      setCart(
        quantity < 1
          ? await api<CartT>(path, { method: 'DELETE' })
          : await api<CartT>(path, { method: 'PATCH', body: { quantity } }),
      );
    } catch (err) {
      setError(err instanceof ApiFailure ? err.message : 'Could not update the cart');
    }
  }

  if (cart.items.length === 0) {
    return (
      <section>
        <h1>Your cart</h1>
        <p data-testid="cart-empty">Your cart is empty.</p>
        <Link to="/">Browse plants</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Your cart</h1>
      {error && (
        <p role="alert" className="error" data-testid="cart-error">
          {error}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.items.map((line) => (
            <tr key={line.productId} data-testid="cart-line">
              <td data-testid="line-name">{line.name}</td>
              <td>{money(line.priceCents)}</td>
              <td className="qty">
                <button aria-label={`Decrease ${line.name}`} onClick={() => change(line.productId, line.quantity - 1)}>
                  -
                </button>
                <span data-testid="line-qty">{line.quantity}</span>
                <button aria-label={`Increase ${line.name}`} onClick={() => change(line.productId, line.quantity + 1)}>
                  +
                </button>
              </td>
              <td data-testid="line-total">{money(line.lineTotalCents)}</td>
              <td>
                <button className="link" data-testid="remove-line" onClick={() => change(line.productId, 0)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="total">
        Total <strong data-testid="cart-total">{money(cart.totalCents)}</strong>
      </p>
      <Link to="/checkout" className="button" data-testid="go-checkout">
        Checkout
      </Link>
    </section>
  );
}
