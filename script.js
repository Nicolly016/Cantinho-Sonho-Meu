const SITE = {
  // Só números, com DDI 55 e DDD. Exemplo: 5581999999999
  whatsapp: "",
  // Usuário do Instagram, sem @. Exemplo: cantinhosonhomeu
  instagram: "",
};

const DEFAULT_MESSAGE =
  "Olá! Vim pelo site do Cantinho Sonho Meu e quero um orçamento.";

const CART_KEY = "sonho-pedido";
const MAX_QTY = 20;
const cart = new Map();

function loadCart() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    saved.forEach((item) => {
      const qty = Number(item.qty);
      if (item && item.name && qty > 0) {
        cart.set(item.name, Math.min(MAX_QTY, qty));
      }
    });
  } catch {
    /* storage unreadable */
  }
}

function saveCart() {
  const items = [...cart.entries()].map(([name, qty]) => ({ name, qty }));
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
}

function totalQty() {
  let total = 0;
  cart.forEach((qty) => {
    total += qty;
  });
  return total;
}

function pieceWord(qty) {
  return qty === 1 ? "peça" : "peças";
}

function orderMessage() {
  const lines = [...cart.entries()].map(
    ([name, qty]) => `• ${name} — ${qty} ${pieceWord(qty)}`
  );
  const total = totalQty();
  return [
    DEFAULT_MESSAGE,
    "",
    "Peças:",
    ...lines,
    "",
    `Total: ${total} ${pieceWord(total)}.`,
  ].join("\n");
}

function messageFor(link) {
  if (link.hasAttribute("data-order") && totalQty() > 0) return orderMessage();
  return link.dataset.whatsapp || DEFAULT_MESSAGE;
}

function whatsappUrl(message) {
  const text = encodeURIComponent(message || DEFAULT_MESSAGE);
  if (!SITE.whatsapp) return "";
  return `https://wa.me/${SITE.whatsapp}?text=${text}`;
}

document.querySelectorAll("[data-whatsapp]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const url = whatsappUrl(messageFor(link));
    if (!url) {
      event.preventDefault();
      return;
    }
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
});

function renderCart() {
  const total = totalQty();
  const toggle = document.querySelector("#cart-toggle");
  const count = toggle.querySelector("[data-cart-count]");
  count.hidden = total === 0;
  count.textContent = String(total);
  toggle.setAttribute(
    "aria-label",
    total > 0 ? `Abrir pedido, ${total} ${pieceWord(total)}` : "Abrir pedido"
  );

  document.querySelectorAll("[data-piece]").forEach((card) => {
    const qty = cart.get(card.dataset.piece) || 0;
    const note = card.querySelector("[data-piece-note]");
    note.hidden = qty === 0;
    note.textContent = qty > 0 ? `${qty} ${pieceWord(qty)} no pedido` : "";
  });

  const empty = document.querySelector("[data-cart-empty]");
  const lines = document.querySelector("[data-cart-lines]");
  const totalEl = document.querySelector("[data-cart-total]");
  const messageEl = document.querySelector("[data-cart-message]");
  const send = document.querySelector("[data-cart-send]");
  lines.replaceChildren();
  empty.hidden = total > 0;
  totalEl.hidden = total === 0;
  messageEl.hidden = total === 0;
  send.hidden = total === 0;
  if (!total) return;

  cart.forEach((qty, name) => {
    const item = document.createElement("li");
    item.className = "cart-line";
    const title = document.createElement("p");
    title.className = "cart-line-name";
    title.textContent = name;
    item.append(title, qtyControl(name, qty));
    lines.append(item);
  });
  totalEl.textContent = `Total: ${total} ${pieceWord(total)}`;
  messageEl.textContent = orderMessage();
}

function qtyControl(name, qty) {
  const wrap = document.createElement("div");
  wrap.className = "qty";
  const minus = document.createElement("button");
  minus.type = "button";
  minus.dataset.cartStep = "-1";
  minus.dataset.cartPiece = name;
  minus.textContent = "−";
  minus.setAttribute(
    "aria-label",
    qty === 1 ? `Tirar ${name} do pedido` : `Diminuir ${name}`
  );
  const value = document.createElement("span");
  value.textContent = String(qty);
  const plus = document.createElement("button");
  plus.type = "button";
  plus.dataset.cartStep = "1";
  plus.dataset.cartPiece = name;
  plus.textContent = "+";
  plus.disabled = qty >= MAX_QTY;
  plus.setAttribute("aria-label", `Aumentar ${name}`);
  wrap.append(minus, value, plus);
  return wrap;
}

function setAddQty(card, next) {
  const qty = Math.min(MAX_QTY, Math.max(1, next));
  const value = card.querySelector("[data-add-qty]");
  value.textContent = String(qty);
  card.querySelector('[data-step="-1"]').disabled = qty <= 1;
  card.querySelector('[data-step="1"]').disabled = qty >= MAX_QTY;
}

document.querySelector("#pecas").addEventListener("click", (event) => {
  const stepButton = event.target.closest("[data-step]");
  if (stepButton) {
    const card = stepButton.closest("[data-piece]");
    const current = Number(card.querySelector("[data-add-qty]").textContent) || 1;
    setAddQty(card, current + Number(stepButton.dataset.step));
    return;
  }

  const addButton = event.target.closest("[data-add]");
  if (!addButton) return;
  const card = addButton.closest("[data-piece]");
  const name = card.dataset.piece;
  const adding = Number(card.querySelector("[data-add-qty]").textContent) || 1;
  cart.set(name, Math.min(MAX_QTY, (cart.get(name) || 0) + adding));
  saveCart();
  renderCart();
});

document.querySelector("#cart").addEventListener("click", (event) => {
  const stepButton = event.target.closest("[data-cart-step]");
  if (!stepButton) return;
  const name = stepButton.dataset.cartPiece;
  const next = (cart.get(name) || 0) + Number(stepButton.dataset.cartStep);
  if (next <= 0) cart.delete(name);
  else cart.set(name, Math.min(MAX_QTY, next));
  saveCart();
  renderCart();
});

const cartDialog = document.querySelector("#cart");
document.querySelector("#cart-toggle").addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});
document.querySelector("#cart-close").addEventListener("click", () => {
  cartDialog.close();
});
cartDialog.addEventListener("click", (event) => {
  if (event.target !== cartDialog) return;
  const rect = cartDialog.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inside) cartDialog.close();
});

loadCart();
renderCart();

document.querySelectorAll("[data-instagram]").forEach((link) => {
  const user = SITE.instagram.replace(/^@/, "").trim();
  if (!user) return;
  link.hidden = false;
  link.href = `https://instagram.com/${user}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

const setupNote = document.querySelector("#setup-note");
if (setupNote && SITE.whatsapp && SITE.instagram) {
  setupNote.hidden = true;
}

const header = document.querySelector(".site-header");
const onScroll = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const dialog = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const piece = button.closest(".piece");
    const photo = piece.querySelector(".piece-photo");
    const image = photo.querySelector("img");
    const source = button.querySelector("img");
    image.src = source.src;
    image.alt = button.dataset.alt || image.alt;
    photo.dataset.caption = button.dataset.caption || photo.dataset.caption;
    piece.querySelectorAll("[data-view]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  });
});

document.querySelectorAll("[data-zoom]").forEach((button) => {
  button.addEventListener("click", () => {
    const image = button.querySelector("img");
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = button.dataset.caption || image.alt;
    dialog.showModal();
  });
});

dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inside) dialog.close();
});

dialog.addEventListener("close", () => {
  lightboxImage.removeAttribute("src");
});

document.documentElement.classList.add("js");

const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-in"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item, index) => {
    item.style.setProperty("--d", `${(index % 3) * 90}ms`);
    observer.observe(item);
  });
}
