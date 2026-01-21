const toggle = document.getElementById("toggle-theme");

toggle.addEventListener("click", () => {
    const html = document.documentElement;
    const theme = html.getAttribute("data-theme");
    html.setAttribute("data-theme", theme === "dark" ? "light" : "dark");
});

document.getElementById("buy-btn").addEventListener("click", () => {
    alert("Aqui você integra Pix / Stripe / Mercado Pago");
});
