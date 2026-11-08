import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { CartT, ProductT } from '@shop/shared/schemas';
import { api, ApiFailure, money } from '../api';
import { useSession } from '../session';

interface Page {
  items: ProductT[];
  total: number;
  page: number;
  pageSize: number;
}

const categories = ['Plants', 'Pots', 'Tools'];

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const { user, setCart } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState(params.get('q') ?? '');

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'name';
  const page = Number(params.get('page') ?? 1);

  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== q) update({ q: search, page: '' });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const query = new URLSearchParams({ sort, page: String(page) });
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    let stale = false;
    setError('');
    api<Page>(`/products?${query}`)
      .then((res) => !stale && setData(res))
      .catch((err: ApiFailure) => !stale && setError(err.message));
    return () => {
      stale = true;
    };
  }, [q, category, sort, page]);

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    setParams(merged);
  }

  async function addToCart(product: ProductT) {
    if (!user) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    setNotice('');
    try {
      setCart(await api<CartT>('/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1 } }));
      setNotice(`${product.name} added to the cart`);
    } catch (err) {
      setNotice(err instanceof ApiFailure ? err.message : 'Could not add the item');
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <h1>Plants for every windowsill</h1>
      <div className="filters">
        <input
          data-testid="search-input"
          type="search"
          placeholder="Search plants, pots and tools"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          data-testid="category-filter"
          aria-label="Category"
          value={category}
          onChange={(e) => update({ category: e.target.value, page: '' })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          data-testid="sort-select"
          aria-label="Sort"
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'name' ? '' : e.target.value, page: '' })}
        >
          <option value="name">Name</option>
          <option value="price_asc">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
        </select>
      </div>

      {notice && (
        <p role="status" data-testid="cart-notice" className="notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error" data-testid="products-error">
          {error}
        </p>
      )}
      {data && data.items.length === 0 && <p data-testid="no-results">No products match your search.</p>}

      <ul className="grid" data-testid="product-list">
        {data?.items.map((p) => (
          <li key={p.id} className="card" data-testid="product-card" data-product-id={p.id}>
            <h2 data-testid="product-name">{p.name}</h2>
            <p className="muted">{p.description}</p>
            <p className="price" data-testid="product-price">
              {money(p.priceCents)}
            </p>
            <p className={p.stock === 0 ? 'error' : 'muted'} data-testid="product-stock">
              {p.stock === 0 ? 'Sold out' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}
            </p>
            <button data-testid="add-to-cart" disabled={p.stock === 0} onClick={() => addToCart(p)}>
              Add to cart
            </button>
          </li>
        ))}
      </ul>

      {data && pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            Previous
          </button>
          <span data-testid="page-info">
            Page {page} of {pages}
          </span>
          <button disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
            Next
          </button>
        </div>
      )}
    </section>
  );
}
