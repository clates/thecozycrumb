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
    emptyEl.hidden = !empty;
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

  // Earliest day: 2 days from today (1–2 day lead time)
  var day = document.getElementById('order-day');
  var d = new Date(); d.setDate(d.getDate() + 2);
  day.min = d.toISOString().slice(0, 10);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
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
      'Pickup or delivery: ' + f.get('method'),
      'Preferred day: ' + (f.get('day') || 'Flexible'),
      f.get('notes') ? 'Notes: ' + f.get('notes') : ''
    ].join('\n');
    var subject = 'Cozy Crumb order from ' + f.get('name');
    document.getElementById('order-text').value = 'To: ' + ORDER_EMAIL + '\nSubject: ' + subject + '\n\n' + body.trim();
    var backup = document.getElementById('order-backup');
    backup.hidden = false;
    setTimeout(function () { backup.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 300);
    window.location.href = 'mailto:' + ORDER_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
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
