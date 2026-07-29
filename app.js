const form = document.getElementById('transferForm');
const lojaOrigem = document.getElementById('lojaOrigem');
const lojaAtual = document.getElementById('lojaAtual');
const transporte = document.getElementById('transporte');
const motivo = document.getElementById('motivo');
const formMessage = document.getElementById('formMessage');
const whatsappDialog = document.getElementById('whatsappDialog');
const whatsappMessage = document.getElementById('whatsappMessage');
const copyMessage = document.getElementById('copyMessage');
const productsContainer = document.getElementById('productsContainer');
const addProductButton = document.getElementById('addProductButton');
let productRowCounter = 0;

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

const searchableProducts = PRODUCT_CATALOG.map((name, index) => ({
  name,
  index,
  normalized: normalizeSearch(name),
  compact: normalizeSearch(name).replace(/\s+/g, '')
}));

function scoreProduct(item, query) {
  const compactQuery = query.replace(/\s+/g, '');
  const terms = query.split(' ').filter(Boolean);
  if (!terms.every(term => item.normalized.includes(term)) && !item.compact.includes(compactQuery)) return -1;

  let score = 0;
  if (item.normalized === query) score += 1000;
  if (item.normalized.startsWith(query)) score += 500;
  if (item.compact.startsWith(compactQuery)) score += 420;
  if (item.normalized.includes(query)) score += 220;
  if (item.compact.includes(compactQuery)) score += 180;
  terms.forEach(term => {
    if (item.normalized.split(' ').some(word => word.startsWith(term))) score += 45;
    if (item.normalized.includes(term)) score += 20;
  });
  return score - item.name.length * 0.02;
}

function createProductRow() {
  productRowCounter += 1;
  const row = document.createElement('div');
  row.className = 'product-item';
  row.dataset.productRow = String(productRowCounter);
  row.innerHTML = `
    <div class="product-item-header">
      <strong>Produto <span class="product-number"></span></strong>
      <button type="button" class="remove-product-button" aria-label="Remover produto">Remover</button>
    </div>
    <div class="product-item-grid">
      <label class="field quantity-field">
        <span>Quantidade</span>
        <input class="quantity-input" type="text" inputmode="numeric" pattern="[0-9]+" placeholder="Ex.: 0" maxlength="10" required />
        <small>Aceita zero e mantém o valor digitado.</small>
      </label>
      <div class="field product-search-field">
        <label>Produto</label>
        <div class="autocomplete">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input class="product-input" type="text" placeholder="Digite o nome ou abreviação, ex.: C75, PS5..." maxlength="160" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" required />
          <button type="button" class="clear-product-button" aria-label="Limpar produto" hidden>×</button>
          <div class="product-suggestions" role="listbox" hidden></div>
        </div>
        <small class="product-search-hint">Pesquise pelo nome completo, modelo ou abreviação.</small>
      </div>
    </div>`;

  productsContainer.appendChild(row);
  attachProductRowEvents(row);
  refreshProductRows();
  row.querySelector('.product-input').focus();
}

function refreshProductRows() {
  const rows = [...productsContainer.querySelectorAll('.product-item')];
  rows.forEach((row, index) => {
    row.querySelector('.product-number').textContent = index + 1;
    row.querySelector('.remove-product-button').hidden = rows.length === 1;
  });
}

function attachProductRowEvents(row) {
  const quantityInput = row.querySelector('.quantity-input');
  const productInput = row.querySelector('.product-input');
  const suggestions = row.querySelector('.product-suggestions');
  const clearButton = row.querySelector('.clear-product-button');
  const hint = row.querySelector('.product-search-hint');
  const autocomplete = row.querySelector('.autocomplete');
  let activeIndex = -1;
  let matches = [];

  function closeSuggestions() {
    suggestions.hidden = true;
    suggestions.innerHTML = '';
    productInput.setAttribute('aria-expanded', 'false');
    productInput.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  function selectProduct(name) {
    productInput.value = name;
    clearButton.hidden = false;
    hint.textContent = 'Produto selecionado com sucesso.';
    hint.classList.add('selected-hint');
    closeSuggestions();
    productInput.focus();
  }

  function setActive(index) {
    const options = [...suggestions.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    activeIndex = (index + options.length) % options.length;
    options.forEach((option, i) => option.classList.toggle('active', i === activeIndex));
    const active = options[activeIndex];
    productInput.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function renderSuggestions() {
    const query = normalizeSearch(productInput.value);
    clearButton.hidden = !productInput.value;
    hint.classList.remove('selected-hint');

    if (!query) {
      hint.textContent = 'Pesquise pelo nome completo, modelo ou abreviação.';
      closeSuggestions();
      return;
    }

    matches = searchableProducts
      .map(item => ({ ...item, score: scoreProduct(item, query) }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 12);

    suggestions.innerHTML = '';
    activeIndex = -1;

    if (!matches.length) {
      suggestions.innerHTML = '<div class="no-product-results"><strong>Nenhum produto encontrado</strong><span>Tente outra abreviação.</span></div>';
      suggestions.hidden = false;
      productInput.setAttribute('aria-expanded', 'true');
      hint.textContent = 'Nenhum resultado encontrado.';
      return;
    }

    matches.forEach((item, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'product-option';
      option.id = `product-option-${row.dataset.productRow}-${index}`;
      option.setAttribute('role', 'option');
      option.innerHTML = `<span class="product-option-icon">📦</span><span>${item.name}</span>`;
      option.addEventListener('click', () => selectProduct(item.name));
      suggestions.appendChild(option);
    });

    suggestions.hidden = false;
    productInput.setAttribute('aria-expanded', 'true');
    hint.textContent = `${matches.length} sugestão(ões) encontrada(s).`;
  }

  quantityInput.addEventListener('input', () => {
    quantityInput.value = quantityInput.value.replace(/\D/g, '');
  });

  productInput.addEventListener('input', renderSuggestions);
  productInput.addEventListener('focus', () => {
    if (productInput.value) renderSuggestions();
  });
  productInput.addEventListener('keydown', event => {
    if (suggestions.hidden) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
    if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); selectProduct(matches[activeIndex].name); }
    if (event.key === 'Escape') closeSuggestions();
  });

  clearButton.addEventListener('click', () => {
    productInput.value = '';
    clearButton.hidden = true;
    hint.textContent = 'Pesquise pelo nome completo, modelo ou abreviação.';
    hint.classList.remove('selected-hint');
    closeSuggestions();
    productInput.focus();
  });

  row.querySelector('.remove-product-button').addEventListener('click', () => {
    row.remove();
    refreshProductRows();
  });

  document.addEventListener('click', event => {
    if (!autocomplete.contains(event.target)) closeSuggestions();
  });
}

function showMessage(message, type = '') {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`.trim();
}

function getProductRowsData() {
  return [...productsContainer.querySelectorAll('.product-item')].map(row => ({
    quantity: row.querySelector('.quantity-input').value,
    product: row.querySelector('.product-input').value.trim()
  }));
}

function validateForm() {
  if (!form.checkValidity()) {
    form.reportValidity();
    showMessage('Preencha corretamente todos os campos para gerar o relatório.', 'error');
    return false;
  }

  const rows = getProductRowsData();
  const invalidQuantity = rows.find(item => !/^\d+$/.test(item.quantity));
  if (invalidQuantity) {
    showMessage('Todas as quantidades devem conter apenas números, incluindo 0 quando necessário.', 'error');
    return false;
  }

  if (lojaOrigem.value === lojaAtual.value) {
    showMessage('A loja de origem e a loja atual precisam ser diferentes.', 'error');
    lojaAtual.focus();
    return false;
  }
  return true;
}

function buildWhatsappReport() {
  const productLines = getProductRowsData().map(item => `${item.quantity} - ${item.product.toUpperCase()}`);
  return [
    'RELATÓRIO DE TRANSFERÊNCIA',
    '',
    ...productLines,
    '',
    `${lojaOrigem.value.toUpperCase()} >>> ${lojaAtual.value.toUpperCase()}`,
    '',
    `MOTIVO: ${motivo.value}`,
    '',
    `OBS: ${transporte.value.toUpperCase()}`
  ].join('\n');
}

addProductButton.addEventListener('click', createProductRow);

document.getElementById('swapButton').addEventListener('click', () => {
  const origem = lojaOrigem.value;
  lojaOrigem.value = lojaAtual.value;
  lojaAtual.value = origem;
});

document.getElementById('whatsappButton').addEventListener('click', () => {
  showMessage('');
  if (!validateForm()) return;
  whatsappMessage.value = buildWhatsappReport();
  copyMessage.textContent = '';
  copyMessage.className = 'form-message';
  whatsappDialog.showModal();
});

form.addEventListener('reset', () => {
  setTimeout(() => {
    productsContainer.innerHTML = '';
    createProductRow();
    showMessage('');
  }, 0);
});

document.getElementById('closeWhatsappDialogButton').addEventListener('click', () => whatsappDialog.close());
whatsappDialog.addEventListener('click', event => {
  const rect = whatsappDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) whatsappDialog.close();
});

document.getElementById('copyWhatsappButton').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(whatsappMessage.value); }
  catch { whatsappMessage.select(); document.execCommand('copy'); }
  copyMessage.textContent = 'Relatório copiado com sucesso.';
  copyMessage.className = 'form-message success';
});

document.getElementById('openWhatsappButton').addEventListener('click', () => {
  window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage.value)}`, '_blank', 'noopener,noreferrer');
});

createProductRow();
