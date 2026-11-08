import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { OrderT } from '@shop/shared/schemas';
import { api, ApiFailure, money } from '../api';

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderT[] | null>(null);

  useEffect(() => {
    api<{ items: OrderT[] }>('/orders').then((res) => setOrders(res.items));
  }, []);

  if (!orders) return <p className="muted">Loading...</p>;
  if (orders.length === 0) return <p data-testid="orders-empty">You have no orders yet.</p>;

  return (
    <section>
      <h1>Your orders</h1>
      <ul className="orders" data-testid="order-list">
        {orders.map((o) => (
          <li key={o.id} data-testid="order-row">
            <Link to={`/orders/${o.id}`}>{new Date(o.createdAt).toLocaleString('en-GB')}</Link>
            <span>{o.items.reduce((n, i) => n + i.quantity, 0)} item(s)</span>
            <strong>{money(o.totalCents)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OrderPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState<OrderT | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<OrderT>(`/orders/${id}`)
      .then(setOrder)
      .catch((err: ApiFailure) => setError(err.message));
  }, [id]);

  if (error)
    return (
      <p role="alert" className="error" data-testid="order-error">
        {error}
      </p>
    );
  if (!order) return <p className="muted">Loading...</p>;

  return (
    <section>
      {location.state?.placed && (
        <p role="status" className="notice" data-testid="order-success">
          Thank you, your order is confirmed.
        </p>
      )}
      <h1>Order details</h1>
      <p className="muted" data-testid="order-id">
        {order.id}
      </p>
      <ul>
        {order.items.map((i) => (
          <li key={i.productId} data-testid="order-line">
            {i.quantity} x {i.name} ({money(i.priceCents)})
          </li>
        ))}
      </ul>
      <p>
        Total <strong data-testid="order-total">{money(order.totalCents)}</strong>
      </p>
      <p className="muted">
        Ships to {order.shipping.fullName}, {order.shipping.address}, {order.shipping.postalCode} {order.shipping.city}
      </p>
    </section>
  );
}
