// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


const PRODUCTS_PATH = path.join(__dirname, "data", "products.json");
const ORDERS_PATH = path.join(__dirname, "data", "orders.json");
const PRIVATE_DIR = path.join(__dirname, "private_files");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function getProducts() {
  return readJson(PRODUCTS_PATH, { niches: [], products: [] });
}

function getOrders() {
  return readJson(ORDERS_PATH, { orders: [] });
}

function saveOrders(ordersObj) {
  writeJson(ORDERS_PATH, ordersObj);
}

// --- API: Nichos e produtos ---
app.get("/api/niches", (req, res) => {
  const db = getProducts();
  res.json(db.niches);
});

app.get("/api/products", (req, res) => {
  const { niche } = req.query;
  const db = getProducts();
  const list = niche ? db.products.filter(p => p.niche === niche) : db.products;
  res.json(list);
});

app.get("/api/product/:slug", (req, res) => {
  const db = getProducts();
  const product = db.products.find(p => p.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(product);
});

// --- Pedido / Checkout ---
app.post("/api/order", (req, res) => {
  const { items } = req.body; // [{slug, qty}]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Carrinho vazio" });
  }

  const db = getProducts();
  const productsMap = new Map(db.products.map(p => [p.slug, p]));

  let total = 0;
  const normalized = [];

  for (const it of items) {
    const p = productsMap.get(it.slug);
    const qty = Math.max(1, Number(it.qty || 1));
    if (!p) return res.status(400).json({ error: `Produto inválido: ${it.slug}` });
    total += p.price * qty;
    normalized.push({ slug: p.slug, qty, price: p.price });
  }

  const orderId = nanoid(10);
  const ordersObj = getOrders();

  ordersObj.orders.push({
    id: orderId,
    items: normalized,
    total: Number(total.toFixed(2)),
    status: "pending",         // pending | paid | canceled
    token: null,               // vira token depois de pago
    createdAt: new Date().toISOString()
  });

  saveOrders(ordersObj);

  // No MVP: redireciona para uma página de checkout local
  res.json({ orderId });
});

// --- Simulação de pagamento aprovado (trocar por gateway depois) ---
app.post("/api/order/:id/approve", (req, res) => {
  const ordersObj = getOrders();
  const order = ordersObj.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

  order.status = "paid";
  order.token = nanoid(24);

  saveOrders(ordersObj);

  res.json({
    ok: true,
    token: order.token,
    slugs: order.items.map(i => i.slug)
  });
});

// --- Ver status do pedido ---
app.get("/api/order/:id", (req, res) => {
  const ordersObj = getOrders();
  const order = ordersObj.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ id: order.id, total: order.total, status: order.status });
});

// --- Download protegido por token ---
app.get("/download", (req, res) => {
  const { token, slug } = req.query;
  if (!token || !slug) return res.status(400).send("Token/slug ausentes.");

  const ordersObj = getOrders();
  const order = ordersObj.orders.find(o => o.token === token);

  if (!order) return res.status(403).send("Token inválido.");
  if (order.status !== "paid") return res.status(403).send("Pagamento não aprovado.");

  // Verifica se o pedido contém esse produto
  const hasItem = order.items.some(i => i.slug === slug);
  if (!hasItem) return res.status(403).send("Esse produto não está no seu pedido.");

  const db = getProducts();
  const product = db.products.find(p => p.slug === slug);
  if (!product) return res.status(404).send("Produto não encontrado.");

  const filePath = path.join(PRIVATE_DIR, product.file);
  if (!fs.existsSync(filePath)) return res.status(404).send("Arquivo não encontrado no servidor.");

  // Envia o arquivo como download
  res.download(filePath, product.file);
});
// Rotas "bonitas" (SEO/UX) que servem os templates
app.get("/c/:niche", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "niche.html"));
});

app.get("/p/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "success.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/c/:niche", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "niche.html"));
});

app.get("/p/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "success.html"));
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Prontix rodando em http://localhost:${PORT}`);
});
