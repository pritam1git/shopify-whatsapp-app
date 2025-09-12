document.addEventListener("DOMContentLoaded", function () {
  const wrapper = document.querySelector(".whatsapp-wrapper");
  if (!wrapper) return;

  const phone = wrapper.dataset.phone;
  const message = wrapper.dataset.message;
  const buttonText = wrapper.dataset.text;
  const position = wrapper.dataset.position;
  const buttonColor = wrapper.dataset.color;

  // Set position
  if (position.includes("bottom")) {
    wrapper.style.bottom = "20px";
  } else {
    wrapper.style.top = "20px";
  }
  if (position.includes("right")) {
    wrapper.style.right = "20px";
    wrapper.style.flexDirection = "row";
  } else {
    wrapper.style.left = "20px";
    wrapper.style.flexDirection = "row-reverse";
  }

  // Button
  const btn = document.createElement("div");
  btn.className = "whatsapp-btn";
  btn.style.background = buttonColor;
  btn.innerHTML =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.24 13.61c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.13-.57.13-.17.25-.65.8-.8.96-.14.17-.28.19-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.28.37-.42.12-.14.16-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.88-.2-.49-.4-.43-.57-.44-.17-.01-.37-.01-.57-.01s-.53.08-.8.38c-.27.31-1.05 1.02-1.05 2.49s1.08 2.89 1.23 3.09c.14.19 2.12 3.24 5.14 4.55 2.81 1.21 2.81.81 3.31.76.5-.05 1.62-.66 1.85-1.3.23-.63.23-1.17.16-1.3-.07-.13-.25-.21-.5-.34z"/></svg>';

  // Label
  const label = document.createElement("div");
  label.className = "whatsapp-label";
  label.style.background = buttonColor;
  label.textContent = buttonText;

  wrapper.appendChild(btn);
  wrapper.appendChild(label);

  // Hover animation
  wrapper.addEventListener("mouseenter", () => {
    label.style.opacity = "1";
    label.style.transform = "translateX(0)";
  });
  wrapper.addEventListener("mouseleave", () => {
    label.style.opacity = "0";
    label.style.transform = "translateX(10px)";
  });

  // Click → WhatsApp open
  wrapper.addEventListener("click", () => {
    let finalMessage = message;

    // Detect product detail page (rough check: URL has '/products/')
    if (window.location.pathname.includes("/products/")) {
      // Try to get product name
      const productTitleEl = document.querySelector("h1.product__title, h1.product-title, h1"); 
      const productName = productTitleEl ? productTitleEl.innerText.trim() : "";

      if (productName) {
        finalMessage += `\nProduct: ${productName}`;
      }
    }

    const encodedMsg = encodeURIComponent(finalMessage);
    const mobileUrl = `whatsapp://send?phone=${phone}&text=${encodedMsg}`;
    const webUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

    // Device check
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.open(mobileUrl, "_blank"); // WhatsApp App
    } else {
      window.open(webUrl, "_blank"); // WhatsApp Web
    }
  });

});
