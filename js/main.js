const CART_KEY = 'earthwear_cart';
const ORDERS_KEY = 'earthwear_orders';
const PROMO_CODES = {
    STORE15: { type: 'percent', value: 15, label: '-15%' }
};

let activePromo = null;

function loadCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function loadOrders() {
    try {
        const raw = localStorage.getItem(ORDERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function updateCartCount() {
    const cart = loadCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
}

function formatPrice(num) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    }).format(num);
}

function formatDate(iso) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
}

function addToCart(product, qty = 1) {
    const cart = loadCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ ...product, qty });
    }
    saveCart(cart);
    updateCartCount();
    alert('Товар добавлен в корзину');
}

function initAddToCartButtons() {
    const buttons = document.querySelectorAll('[data-add-to-cart]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const id = String(btn.dataset.id);
            const name = btn.dataset.name;
            const price = Number(btn.dataset.price || 0);

            let qty = 1;
            const qtyInputId = btn.dataset.qtyInput;
            if (qtyInputId) {
                const input = document.getElementById(qtyInputId);
                if (input && input.value) {
                    qty = Math.max(1, Number(input.value));
                }
            }

            addToCart({ id, name, price }, qty);
        });
    });
}

function initCatalogFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.product-card[data-category]');
    if (!buttons.length || !cards.length) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            cards.forEach(card => {
                const cardCat = card.getAttribute('data-category');
                card.style.display =
                    category === 'all' || category === cardCat ? '' : 'none';
            });
        });
    });
}

function getPromoDiscount(subtotal) {
    if (!activePromo) return 0;
    if (activePromo.type === 'percent') {
        return Math.round(subtotal * activePromo.value / 100);
    }
    return activePromo.value;
}

function applyPromoCode(code) {
    const normalized = String(code || '').trim().toUpperCase();
    const promo = PROMO_CODES[normalized];
    if (!promo) {
        resetPromo();
        return { success: false, message: 'Данный промокод не найден.' };
    }
    activePromo = { ...promo, code: normalized };
    return { success: true, message: 'Промокод применен' };
}

function resetPromo() {
    activePromo = null;
}

function renderCart(promoResult = null) {
    const itemsContainer = document.getElementById('cart-items');
    const emptyBlock = document.getElementById('cart-empty');
    const cartContent = document.getElementById('cart-content');
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const finalEl = document.getElementById('cart-final-price');
    const promoMessageEl = document.getElementById('promo-message');
    const promoApplyInput = document.getElementById('promo-code-input');

    if (!itemsContainer || !emptyBlock || !cartContent || !subtotalEl || !discountEl || !finalEl) return;

    const cart = loadCart();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = getPromoDiscount(subtotal);
    const total = Math.max(0, subtotal - discount);

    if (cart.length === 0) {
        emptyBlock.style.display = '';
        cartContent.style.display = 'none';
        subtotalEl.textContent = '0 ₽';
        discountEl.textContent = '0 ₽';
        finalEl.textContent = '0 ₽';
        if (promoMessageEl) promoMessageEl.textContent = '';
        if (promoApplyInput) promoApplyInput.value = '';
        resetPromo();
        return;
    }

    emptyBlock.style.display = 'none';
    cartContent.style.display = '';
    itemsContainer.innerHTML = '';

    cart.forEach(item => {
        const row = document.createElement('tr');

        const nameTd = document.createElement('td');
        nameTd.textContent = item.name;

        const priceTd = document.createElement('td');
        priceTd.textContent = formatPrice(item.price);

        const qtyTd = document.createElement('td');
        const qtyControls = document.createElement('div');
        qtyControls.className = 'cart-qty-controls';

        const decBtn = document.createElement('button');
        decBtn.textContent = '-';
        const qtySpan = document.createElement('span');
        qtySpan.textContent = item.qty;
        const incBtn = document.createElement('button');
        incBtn.textContent = '+';

        decBtn.addEventListener('click', () => {
            changeItemQty(item.id, item.qty - 1);
        });

        incBtn.addEventListener('click', () => {
            changeItemQty(item.id, item.qty + 1);
        });

        qtyControls.append(decBtn, qtySpan, incBtn);
        qtyTd.appendChild(qtyControls);

        const sumTd = document.createElement('td');
        const sum = item.price * item.qty;
        sumTd.textContent = formatPrice(sum);

        const removeTd = document.createElement('td');
        const removeBtn = document.createElement('button');
        removeBtn.className = 'cart-remove-btn';
        removeBtn.textContent = 'Удалить';
        removeBtn.addEventListener('click', () => removeItem(item.id));
        removeTd.appendChild(removeBtn);

        row.append(nameTd, priceTd, qtyTd, sumTd, removeTd);
        itemsContainer.appendChild(row);
    });

    subtotalEl.textContent = formatPrice(subtotal);
    discountEl.textContent = formatPrice(discount);
    finalEl.textContent = formatPrice(total);

    if (promoMessageEl) {
        const promoMessage = promoResult || (activePromo
            ? { success: true, message: 'Промокод применен' }
            : { success: null, message: 'Введите промокод для скидки.' });

        promoMessageEl.textContent = promoMessage.message;
        promoMessageEl.classList.toggle('cart-promo__message--success', promoMessage.success === true);
        promoMessageEl.classList.toggle('cart-promo__message--error', promoMessage.success === false);
    }
    if (promoApplyInput && activePromo) {
        promoApplyInput.value = activePromo.code;
    }
}

function changeItemQty(id, newQty) {
    let cart = loadCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (newQty <= 0) {
        cart = cart.filter(i => i.id !== id);
    } else {
        item.qty = newQty;
    }

    saveCart(cart);
    updateCartCount();
    renderCart();
}

function removeItem(id) {
    const cart = loadCart().filter(i => i.id !== id);
    saveCart(cart);
    updateCartCount();
    renderCart();
}

function handlePromoApply() {
    const promoInput = document.getElementById('promo-code-input');
    const promoMessageEl = document.getElementById('promo-message');
    if (!promoInput || !promoMessageEl) return;

    const value = promoInput.value;
    const result = applyPromoCode(value);
    promoMessageEl.textContent = result.message;
    renderCart(result);
}

function handleCheckout() {
    const cart = loadCart();
    if (cart.length === 0) {
        alert('Ваша корзина пуста. Добавьте товар перед оформлением.');
        return;
    }

    // Показываем модальное окно оплаты
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.style.display = 'flex';
    }

    // Имитируем процесс оплаты (3 секунды)
    setTimeout(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const discount = getPromoDiscount(subtotal);
        const total = Math.max(0, subtotal - discount);

        const order = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            items: cart,
            subtotal,
            discount,
            total,
            promoCode: activePromo ? activePromo.code : null
        };

        const orders = loadOrders();
        orders.unshift(order);
        saveOrders(orders);
        saveCart([]);
        updateCartCount();
        renderCart();

        resetPromo();

        // Плавно перенаправляем на страницу заказов
        window.location.href = 'orders.html';
    }, 3000);
}

function renderOrdersPage() {
    const ordersList = document.getElementById('orders-list');
    const ordersEmpty = document.getElementById('orders-empty');
    if (!ordersList || !ordersEmpty) return;

    const orders = loadOrders();
    if (!orders.length) {
        ordersEmpty.style.display = '';
        ordersList.style.display = 'none';
        return;
    }

    ordersEmpty.style.display = 'none';
    ordersList.style.display = '';
    ordersList.innerHTML = '';

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';

        const header = document.createElement('div');
        header.className = 'order-card__header';

        const title = document.createElement('h2');
        title.className = 'order-card__title';
        title.textContent = `Заказ #${order.id}`;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn--ghost order-card__toggle';
        toggleBtn.textContent = 'Скрыть заказ';
        toggleBtn.setAttribute('data-order-id', order.id);

        header.append(title, toggleBtn);

        const details = document.createElement('div');
        details.className = 'order-card__details';

        const meta = document.createElement('p');
        meta.className = 'order-card__meta';
        meta.textContent = `Дата: ${formatDate(order.createdAt)} • Сумма: ${formatPrice(order.total)}`;
        if (order.promoCode) {
            meta.textContent += ` • Промокод: ${order.promoCode}`;
        }

        const itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'order-card__items';

        order.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'order-card__item';

            const name = document.createElement('span');
            name.textContent = item.name;

            const qty = document.createElement('span');
            qty.textContent = `x${item.qty}`;

            const sum = document.createElement('span');
            sum.textContent = formatPrice(item.price * item.qty);

            itemRow.append(name, qty, sum);
            itemsWrapper.appendChild(itemRow);
        });

        const totals = document.createElement('p');
        totals.className = 'order-card__meta';
        totals.textContent = `Итого: ${formatPrice(order.subtotal)} — скидка ${formatPrice(order.discount)} = ${formatPrice(order.total)}`;

        details.append(meta, itemsWrapper, totals);
        card.append(header, details);
        ordersList.appendChild(card);

        // Добавляем обработчик для кнопки
        toggleBtn.addEventListener('click', () => {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? '' : 'none';
            toggleBtn.textContent = isHidden ? 'Скрыть заказ' : 'Показать заказ';
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initAddToCartButtons();
    initCatalogFilters();
    renderCart();

    const promoBtn = document.getElementById('promo-apply-btn');
    if (promoBtn) {
        promoBtn.addEventListener('click', handlePromoApply);
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }

    renderOrdersPage();
});
