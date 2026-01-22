import { addToCart, getCart, clearCart } from "./cart.js";

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Falha: " + url);
  return r.json();
}

// Detecta qual página é pelo body[data-page]
const page = document.body.dataset.page;

// HOME: monta menu de nichos
if (page === "home") {
  const niches = await fetchJSON("/api/niches");
  const menu = document.querySelector("#nicheMenu");
menu.innerHTML = niches.map(n =>
  `<a class="chip" href="/c/${encodeURIComponent(n.id)}">${n.name}</a>`
).join("");


}

// NICHO: lista produtos do nicho em grid
if (page === "niche") {
  // pega o nicho pela URL bonita: /c/educacao
  const niche = location.pathname.split("/").pop();

  const niches = await fetchJSON("/api/niches");
  const nicheObj = niches.find(n => n.id === niche);

  document.querySelector("#nicheTitle").textContent = nicheObj?.name || "Nicho";
  document.querySelector("#nicheDesc").textContent = nicheObj?.desc || "";

  const products = await fetchJSON("/api/products?niche=" + encodeURIComponent(niche));
  const grid = document.querySelector("#productsGrid");

  



grid.innerHTML = products.map(p => `
  <article class="card">
    <img class="thumb" src="${p.previews?.[0] || ""}" alt="${p.title}">
    <h3>${p.title}</h3>
    <p class="muted">${p.shortDesc}</p>
    <div class="row">
      <span class="price">R$ ${p.price.toFixed(2).replace(".", ",")}</span>
      <a class="btn" href="/p/${encodeURIComponent(p.slug)}">Ver detalhes</a>
    </div>
  </article>
`).join("");
}

// PRODUTO: detalhes + previews + add carrinho
// PRODUTO: detalhes + previews + add carrinho
if (page === "product") {
  const slug = location.pathname.split("/").pop();
  const p = await fetchJSON("/api/product/" + encodeURIComponent(slug));

  // SEO básico do lado do cliente (melhor que nada no MVP)
  document.getElementById("metaTitle").textContent = `${p.title} | Prontix`;
  document.getElementById("metaDesc").setAttribute("content", p.shortDesc || p.longDesc || "Produto Prontix");

  document.querySelector("#prodTitle").textContent = p.title;
  document.querySelector("#prodLong").textContent = p.longDesc;

  // badge do nicho (id)
  const badge = document.querySelector("#nicheBadge");
  badge.textContent = (p.niche || "Nicho").toUpperCase();

  // preço
  document.querySelector("#prodPrice").textContent =
    `R$ ${p.price.toFixed(2).replace(".", ",")}`;

  // formato (se existir no JSON)
  const formatEl = document.querySelector("#prodFormat");
  formatEl.textContent = p.format || "PDF/ZIP";

  // previews
  const prev = document.querySelector("#previews");
  prev.innerHTML = (p.previews || []).map(src =>
    `<img class="preview" src="${src}" alt="Prévia ${p.title}">`
  ).join("");

  // "o que você recebe" (se existir no JSON, senão default)
  const whatsIn = document.querySelector("#prodWhatsIn");
  const defaultWhatsIn = [
    "Arquivo principal em alta qualidade",
    "Pré-estruturado para uso imediato",
    "Download liberado após pagamento aprovado"
  ];
  const list = Array.isArray(p.whatsIn) && p.whatsIn.length ? p.whatsIn : defaultWhatsIn;

  whatsIn.innerHTML = list.map(item => `<li>${item}</li>`).join("");

  // botões
  document.querySelector("#addCart").addEventListener("click", () => {
    addToCart(p.slug, 1);
    location.href = "/checkout";
  });

  document.querySelector("#buyNow").addEventListener("click", () => {
    addToCart(p.slug, 1);
    location.href = "/checkout";
  });
}
  

// CHECKOUT: cria pedido e aprova (simulado) e vai pro success
if (page === "checkout") {
  const cart = getCart();
  const list = document.querySelector("#cartItems");
  const products = await fetchJSON("/api/products");

  if (cart.length === 0) {
    list.innerHTML = `<p class="muted">Seu carrinho está vazio.</p>`;
  } else {
    list.innerHTML = cart.map(i => {
      const p = products.find(x => x.slug === i.slug);
      return `<div class="cartline">
        <span>${p?.title || i.slug}</span>
        <span>x${i.qty}</span>
      </div>`;
    }).join("");
  }

  document.querySelector("#payBtn").addEventListener("click", async () => {
    if (cart.length === 0) return;

    const order = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart })
    }).then(r => r.json());

    // SIMULA aprovação — depois você troca isso por gateway (webhook)
   const approved = await fetch(`/api/order/${order.orderId}/approve`, { method: "POST" })
  .then(r => r.json());

clearCart();

// slugs em query (simples). Depois dá pra melhorar.
const slugsParam = approved.slugs.map(encodeURIComponent).join(",");
location.href = `/success?token=${encodeURIComponent(approved.token)}&slugs=${slugsParam}`;
  });
}

// SUCCESS: mostra botão de download protegido
if (page === "success") {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const slug = params.get("slug");

  const btn = document.querySelector("#downloadBtn");
  btn.href = `/download?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
}
