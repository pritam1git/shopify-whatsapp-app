import { getShopSettings } from "../utils/database.js";

export async function serveWidget(req, res) {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");

  const shop = req.query.shop || "";

  // Default settings
  let settings = {
    phone: "919888969340",
    message: "Hello, I need help!",
    buttonText: "Chat with us",
    position: "bottom-right",
    buttonColor: "#25D366"
  };

  // Fetch shop-specific settings from DB
  if (shop) {
    try {
      const shopSettings = await getShopSettings(shop);
      if (shopSettings) {
        settings = {
          phone: shopSettings.phone || settings.phone,
          message: shopSettings.message || settings.message,
          buttonText: shopSettings.buttonText || settings.buttonText,
          position: shopSettings.position || settings.position,
          buttonColor: shopSettings.buttonColor || settings.buttonColor
        };
      }
    } catch (err) {
      console.error("❌ Error fetching shop settings:", err);
    }
  }

  const js = `
(function(){
  function init() {
    const wrapper = document.createElement('div');
    wrapper.style.position='fixed';
    wrapper.style.zIndex='999999';
    wrapper.style.cursor='pointer';
    wrapper.style.display='flex';
    wrapper.style.alignItems='center';
    wrapper.style.justifyContent='center';
    wrapper.style.transition='all 0.3s ease';

    // Position
    wrapper.style.${settings.position.includes('bottom') ? 'bottom' : 'top'}='20px';
    wrapper.style.${settings.position.includes('right') ? 'right' : 'left'}='20px';

    // WhatsApp Button Circle
    const btn = document.createElement('div');
    btn.style.width='60px';
    btn.style.height='60px';
    btn.style.background='${settings.buttonColor}';
    btn.style.borderRadius='50%';
    btn.style.display='flex';
    btn.style.alignItems='center';
    btn.style.justifyContent='center';
    btn.style.cursor='pointer';
    btn.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)';
    btn.style.transition='all 0.3s ease';

    // WhatsApp icon
    btn.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.24 13.61c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.13-.57.13-.17.25-.65.8-.8.96-.14.17-.28.19-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.28.37-.42.12-.14.16-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.88-.2-.49-.4-.43-.57-.44-.17-.01-.37-.01-.57-.01s-.53.08-.8.38c-.27.31-1.05 1.02-1.05 2.49s1.08 2.89 1.23 3.09c.14.19 2.12 3.24 5.14 4.55 2.81 1.21 2.81.81 3.31.76.5-.05 1.62-.66 1.85-1.3.23-.63.23-1.17.16-1.3-.07-.13-.25-.21-.5-.34z"/></svg>';

    // Text on hover
    const label = document.createElement('div');
    label.innerText='${settings.buttonText}';
    label.style.background='${settings.buttonColor}';
    label.style.color='#fff';
    label.style.padding='8px 12px';
    label.style.borderRadius='24px';
    label.style.marginLeft='10px';
    label.style.fontFamily='Arial, sans-serif';
    label.style.fontSize='14px';
    label.style.fontWeight='bold';
    label.style.whiteSpace='nowrap';
    label.style.cursor='pointer';
    label.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)';
    label.style.opacity='0';
    label.style.transition='opacity 0.3s, transform 0.3s';
    label.style.transform='translateX(10px)';

    wrapper.appendChild(btn);
    wrapper.appendChild(label);
    document.body.appendChild(wrapper);

    wrapper.addEventListener('mouseenter', () => {
      label.style.opacity='1';
      label.style.transform='translateX(0)';
    });
    wrapper.addEventListener('mouseleave', () => {
      label.style.opacity='0';
      label.style.transform='translateX(10px)';
    });

    wrapper.addEventListener('click', () => {
      let finalMessage = "${settings.message}";

      // If product page detected, append product title
      const productTitle = document.querySelector('[data-product-title], h1.product-title, h1')?.innerText;
      if (productTitle) {
        finalMessage = finalMessage + " | Product: " + productTitle;
      }

      const encodedMsg = encodeURIComponent(finalMessage);
      const phone = "${settings.phone}";
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      const url = isMobile
        ? "https://api.whatsapp.com/send?phone=" + phone + "&text=" + encodedMsg
        : "https://web.whatsapp.com/send?phone=" + phone + "&text=" + encodedMsg;

      window.open(url, "_blank");
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
  `;

  res.send(js);
};
