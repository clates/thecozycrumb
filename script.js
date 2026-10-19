// The Cozy Crumb: menu categories, cart, and order-by-email.
// Everything runs in the visitor's browser; nothing is charged online.
(function () {
  var ORDER_EMAIL = 'orders@ashleylates.com';
  var STORE_KEY = 'cozy-crumb-cart';

  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

  // ---- Categories: tap one to show its items ----
  var buttons = document.querySelectorAll('.category');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('aria-controls'));
      var opening = btn.getAttribute('aria-expanded') !== 'true';
      buttons.forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = true;
      });
      if (opening) {
        btn.setAttribute('aria-expanded', 'true');
        target.hidden = false;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---- Cookie sizes update the shown price ----
  document.querySelectorAll('.sizes input').forEach(function (input) {
    input.addEventListener('change', function () {
      var item = input.closest('.item');
      item.querySelector('.price').textContent = '$' + input.dataset.price;
    });
  });

  // ---- Cart ----
  var cart = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function money(n) { return '$' + n; }

  document.querySelectorAll('.item .add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.item');
      var size = item.querySelector('.sizes input:checked');
      var price = Number(size ? size.dataset.price : item.dataset.price);
      var key = item.dataset.id + (size ? '|' + size.value : '');
      var line = cart.find(function (l) { return l.key === key; });
      if (line) { line.qty += 1; }
      else { cart.push({ key: key, name: item.dataset.name, size: size ? size.value : '', price: price, qty: 1 }); }
      save(); render();
      bumpCart();
      showToast((size ? size.value + ' ' : '') + item.querySelector('h4').textContent + ' added to your cart!');
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      setTimeout(function () { btn.textContent = 'Add to cart'; btn.classList.remove('added'); }, 1400);
    });
  });

  var dialog = document.getElementById('cart');
  var linesEl = document.getElementById('cart-lines');
  var countEl = document.getElementById('cart-count');
  var totalEl = document.getElementById('cart-total');
  var emptyEl = document.getElementById('cart-empty');
  var totalRow = document.getElementById('cart-total-row');
  var form = document.getElementById('order-form');

  var cartButton = document.getElementById('cart-button');
  var toast = document.getElementById('toast');
  var toastTimer;
  function bumpCart() {
    cartButton.classList.remove('bump');
    void cartButton.offsetWidth; // restart the animation
    cartButton.classList.add('bump');
  }
  function showToast(msg) {
    document.getElementById('toast-text').textContent = msg;
    toast.hidden = false;
    toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3500);
  }
  document.getElementById('toast-view').addEventListener('click', function () { toast.hidden = true; openCart(); });

  function total() { return cart.reduce(function (t, l) { return t + l.price * l.qty; }, 0); }

  function render() {
    var count = cart.reduce(function (t, l) { return t + l.qty; }, 0);
    countEl.textContent = count;
    linesEl.innerHTML = '';
    cart.forEach(function (l, i) {
      var li = document.createElement('li');
      li.innerHTML =
        '<div class="line-name"><strong></strong><span class="line-size"></span></div>' +
        '<div class="line-qty">' +
        '<button type="button" data-act="minus" aria-label="One less">−</button>' +
        '<span class="qty"></span>' +
        '<button type="button" data-act="plus" aria-label="One more">+</button>' +
        '</div>' +
        '<span class="line-price"></span>' +
        '<button type="button" class="line-remove" data-act="remove">Remove</button>';
      li.querySelector('strong').textContent = l.name;
      li.querySelector('.line-size').textContent = l.size;
      li.querySelector('.qty').textContent = l.qty;
      li.querySelector('.line-price').textContent = money(l.price * l.qty);
      li.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var act = b.dataset.act;
          if (act === 'plus') l.qty += 1;
          if (act === 'minus') l.qty -= 1;
          if (act === 'remove' || l.qty < 1) cart.splice(i, 1);
          save(); render();
        });
      });
      linesEl.appendChild(li);
    });
    totalEl.textContent = money(total());
    var empty = cart.length === 0;
    if (!empty) { document.getElementById('order-thanks').hidden = true; document.getElementById('order-backup').hidden = true; }
    emptyEl.hidden = !empty || !document.getElementById('order-thanks').hidden;
    totalRow.hidden = empty;
    form.hidden = empty;
  }

  function openCart() {
    render();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
  }
  document.getElementById('cart-button').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', function () { dialog.close ? dialog.close() : dialog.removeAttribute('open'); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog && dialog.close) dialog.close(); });

  // Show the address box only for delivery
  var addressField = document.getElementById('address-field');
  form.querySelectorAll('input[name="method"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var delivery = form.querySelector('input[name="method"]:checked').value === 'Local delivery';
      addressField.hidden = !delivery;
      addressField.querySelector('textarea').required = delivery;
    });
  });

  // ---- Calendar: pick a day; blocked days and the lead time are greyed out ----
  var LEAD_DAYS = 2;            // earliest day = today + 2 (1–2 day lead time)
  var MONTHS_AHEAD = 6;         // how far ahead customers can book
  var blocked = window.BLOCKED_DAYS || [];
  var dayInput = document.getElementById('order-day');
  var calGrid = document.getElementById('cal-grid');
  var calTitle = document.getElementById('cal-title');
  var calPicked = document.getElementById('cal-picked');
  var calError = document.getElementById('cal-error');
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pretty(d) { return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate(); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var earliest = new Date(today); earliest.setDate(earliest.getDate() + LEAD_DAYS);
  var firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var lastMonth = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, 1);
  var viewMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  var picked = null;

  function drawCalendar() {
    calTitle.textContent = MONTH_NAMES[viewMonth.getMonth()] + ' ' + viewMonth.getFullYear();
    document.getElementById('cal-prev').disabled = viewMonth <= firstMonth;
    document.getElementById('cal-next').disabled = viewMonth >= lastMonth;
    calGrid.innerHTML = '';
    ['S','M','T','W','T','F','S'].forEach(function (n) {
      var h = document.createElement('span'); h.className = 'cal-dow'; h.textContent = n; h.setAttribute('aria-hidden', 'true');
      calGrid.appendChild(h);
    });
    var start = viewMonth.getDay();
    for (var i = 0; i < start; i++) { calGrid.appendChild(document.createElement('span')); }
    var daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    for (var dnum = 1; dnum <= daysInMonth; dnum++) {
      var date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dnum);
      var key = ymd(date);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-day';
      b.textContent = dnum;
      var isBlocked = blocked.indexOf(key) !== -1;
      var tooSoon = date < earliest;
      if (isBlocked || tooSoon) {
        b.disabled = true;
        b.classList.add(isBlocked ? 'off' : 'past');
        b.setAttribute('aria-label', pretty(date) + (isBlocked ? ', not available' : ', too soon'));
        if (isBlocked) b.title = 'Not available';
      } else {
        b.setAttribute('aria-label', pretty(date));
        if (picked === key) { b.classList.add('selected'); b.setAttribute('aria-pressed', 'true'); }
        b.addEventListener('click', (function (k, dt) {
          return function () {
            picked = k; dayInput.value = pretty(dt);
            calPicked.textContent = 'You picked: ' + pretty(dt);
            calPicked.classList.add('chosen');
            calError.hidden = true;
            drawCalendar();
          };
        })(key, date));
      }
      calGrid.appendChild(b);
    }
  }
  document.getElementById('cal-prev').addEventListener('click', function () { viewMonth.setMonth(viewMonth.getMonth() - 1); drawCalendar(); });
  document.getElementById('cal-next').addEventListener('click', function () { viewMonth.setMonth(viewMonth.getMonth() + 1); drawCalendar(); });
  function resetCalendar() {
    picked = null; dayInput.value = '';
    calPicked.textContent = 'Tap an open day to choose it.'; calPicked.classList.remove('chosen');
    viewMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    drawCalendar();
  }
  drawCalendar();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!dayInput.value) {
      calError.hidden = false;
      calError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    var f = new FormData(form);
    var lines = cart.map(function (l) {
      return '• ' + l.qty + ' × ' + l.name + (l.size ? ' (' + l.size + ')' : '') + ' — ' + money(l.price * l.qty);
    });
    var body = [
      'Hi Ashley! I would like to place an order:',
      '',
      lines.join('\n'),
      '',
      'Total: ' + money(total()),
      '',
      'Name: ' + f.get('name'),
      'Contact: ' + f.get('contact'),
      'Pickup or delivery: ' + f.get('method') + (f.get('method') === 'Local delivery' ? '\nDelivery address: ' + f.get('address') : ''),
      'Payment: ' + f.get('pay'),
      'Preferred day: ' + f.get('day'),
      f.get('notes') ? 'Notes: ' + f.get('notes') : ''
    ].join('\n');
    var subject = 'Cozy Crumb order from ' + f.get('name');
    document.getElementById('order-text').value = 'To: ' + ORDER_EMAIL + '\nSubject: ' + subject + '\n\n' + body.trim();
    var backup = document.getElementById('order-backup');
    backup.hidden = false;
    document.getElementById('order-thanks').hidden = false;
    cart = []; save();
    form.reset(); addressField.hidden = true; resetCalendar();
    render();
    linesEl.innerHTML = '';
    setTimeout(function () { dialog.scrollTop = 0; }, 50);
    window.location.href = 'mailto:' + ORDER_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });

  // Once the thank-you has been seen, the next visit to the cart starts fresh
  dialog.addEventListener('close', function () {
    if (cart.length === 0) {
      document.getElementById('order-thanks').hidden = true;
      document.getElementById('order-backup').hidden = true;
      render();
    }
  });

  document.getElementById('back-to-menu').addEventListener('click', function () {
    if (dialog.close) dialog.close(); else dialog.removeAttribute('open');
    document.getElementById('order-thanks').hidden = true;
    document.getElementById('order-backup').hidden = true;
    render();
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
  });

  // ---- Backup for when the email app doesn't open ----
  var giftLink = document.getElementById('gifting-email');
  if (giftLink) giftLink.addEventListener('click', function () {
    document.getElementById('gift-backup').hidden = false;
  });

  function copyText(text, statusEl) {
    function done() { statusEl.textContent = 'Copied! Now paste it into an email or text.'; }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { statusEl.textContent = 'Please select the text and copy it.'; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
  }
  document.querySelectorAll('.copy-button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('.email-backup');
      var text = btn.dataset.copyText || document.getElementById(btn.dataset.copyFrom).value;
      copyText(text, box.querySelector('.copy-status'));
    });
  });

  render();
})();
