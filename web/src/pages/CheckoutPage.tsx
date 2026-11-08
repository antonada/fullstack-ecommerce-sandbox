import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Shipping } from '@shop/shared/schemas';
import type { OrderT } from '@shop/shared/schemas';
import { api, ApiFailure, money } from '../api';
import { useSession } from '../session';

const fields = [
  { name: 'fullName', label: 'Full name' },
  { name: 'address', label: 'Address' },
  { name: 'city', label: 'City' },
  { name: 'postalCode', label: 'Postal code (12-345)' },
] as const;

export function CheckoutPage() {
  const { cart, setCart, refreshCart } = useSession();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: '', address: '', city: '', postalCode: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const placed = useRef(false);

  if (cart.items.length === 0 && !placed.current) return <Navigate to="/cart" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    const parsed = Shipping.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});

    setBusy(true);
    try {
      const order = await api<OrderT>('/orders', { method: 'POST', body: { shipping: parsed.data } });
      // the cart is empty from here on, don't bounce back to /cart
      placed.current = true;
      setCart({ items: [], totalCents: 0 });
      navigate(`/orders/${order.id}`, { state: { placed: true } });
    } catch (err) {
      setFormError(err instanceof ApiFailure ? err.message : 'Could not place the order');
      await refreshCart().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Checkout</h1>
      <p className="muted">
        {cart.items.length} item(s), total <strong data-testid="checkout-total">{money(cart.totalCents)}</strong>
      </p>
      <form onSubmit={submit} noValidate className="form">
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            <input
              data-testid={`field-${f.name}`}
              value={values[f.name]}
              aria-invalid={Boolean(errors[f.name])}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
            {errors[f.name] && (
              <span className="error" data-testid={`error-${f.name}`}>
                {errors[f.name]}
              </span>
            )}
          </label>
        ))}
        {formError && (
          <p role="alert" className="error" data-testid="checkout-error">
            {formError}
          </p>
        )}
        <button type="submit" data-testid="place-order" disabled={busy}>
          {busy ? 'Placing order...' : 'Place order'}
        </button>
      </form>
    </section>
  );
}
