const CART_KEY = "prontix_cart_v1";

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

export function addToCart(slug, qty = 1) {
  const cart = getCart();
  const found = cart.find(i => i.slug === slug);
  if (found) found.qty += qty;
  else cart.push({ slug, qty });
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}
