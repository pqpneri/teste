const form = document.getElementById('transferForm');
const lojaOrigem = document.getElementById('lojaOrigem');
const lojaAtual = document.getElementById('lojaAtual');
const quantidade = document.getElementById('quantidade');
const produto = document.getElementById('produto');
const transporte = document.getElementById('transporte');
const motivo = document.getElementById('motivo');
const formMessage = document.getElementById('formMessage');
const whatsappDialog = document.getElementById('whatsappDialog');
const whatsappMessage = document.getElementById('whatsappMessage');
const copyMessage = document.getElementById('copyMessage');

const productSuggestions = document.getElementById('productSuggestions');
const productAutocomplete = document.getElementById('productAutocomplete');
const clearProductButton = document.getElementById('clearProductButton');
const productSearchHint = document.getElementById('productSearchHint');
let activeProductIndex = -1;
let currentProductMatches = [];

function normalizeSearch(value) {
  return value
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
  if (!terms.every(term => item.normalized.includes(term))) {
    if (!item.compact.includes(compactQuery)) return -1;
  }

  let score = 0;
  if (item.normalized === query) score += 1000;
  if (item.normalized.startsWith(query)) score += 500;
  if (item.compact.startsWith(compactQuery)) score += 420;
  if (item.normalized.includes(` ${query} `)) score += 300;
  if (item.normalized.includes(query)) score += 220;
  if (item.compact.includes(compactQuery)) score += 180;

  terms.forEach(term => {
    if (item.normalized.split(' ').some(word => word.startsWith(term))) score += 45;
    if (item.normalized.includes(term)) score += 20;
  });

  score -= item.name.length * 0.02;
  return score;
}

function closeProductSuggestions() {
  productSuggestions.hidden = true;
  productSuggestions.innerHTML = '';
  produto.setAttribute('aria-expanded', 'false');
  produto.removeAttribute('aria-activedescendant');
  activeProductIndex = -1;
}

function selectProduct(name) {
  produto.value = name;
  clearProductButton.hidden = false;
  productSearchHint.textContent = 'Produto selecionado com sucesso.';
  productSearchHint.classList.add('selected-hint');
  closeProductSuggestions();
  produto.focus();
}

function setActiveProduct(index) {
  const options = [...productSuggestions.querySelectorAll('[role="option"]')];
  if (!options.length) return;
  activeProductIndex = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => option.classList.toggle('active', optionIndex === activeProductIndex));
  const active = options[activeProductIndex];
  produto.setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}

function renderProductSuggestions() {
  const query = normalizeSearch(produto.value);
  clearProductButton.hidden = produto.value.length === 0;
  productSearchHint.classList.remove('selected-hint');

  if (!query) {
    productSearchHint.textContent = 'Pesquise entre 1.346 produtos pelo nome completo, modelo ou abreviação.';
    closeProductSuggestions();
    return;
  }

  currentProductMatches = searchableProducts
    .map(item => ({ ...item, score: scoreProduct(item, query) }))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 12);

  productSuggestions.innerHTML = '';
  activeProductIndex = -1;

  if (!currentProductMatches.length) {
    const empty = document.createElement('div');
    empty.className = 'no-product-results';
    empty.innerHTML = '<strong>Nenhum produto encontrado</strong><span>Tente outra abreviação ou confira a digitação.</span>';
    productSuggestions.appendChild(empty);
    productSuggestions.hidden = false;
    produto.setAttribute('aria-expanded', 'true');
    productSearchHint.textContent = 'Nenhum resultado encontrado para esta pesquisa.';
    return;
  }

  currentProductMatches.forEach((item, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.id = `product-option-${index}`;
    option.className = 'product-option';
    option.setAttribute('role', 'option');
    option.innerHTML = `<span class="product-option-icon">📦</span><span>${item.name}</span><span class="select-arrow">›</span>`;
    option.addEventListener('mousedown', event => event.preventDefault());
    option.addEventListener('click', () => selectProduct(item.name));
    productSuggestions.appendChild(option);
  });

  productSuggestions.hidden = false;
  produto.setAttribute('aria-expanded', 'true');
  productSearchHint.textContent = `${currentProductMatches.length} sugestão(ões) exibida(s). Use as setas e pressione Enter.`;
}

produto.addEventListener('input', renderProductSuggestions);
produto.addEventListener('focus', () => {
  if (produto.value.trim()) renderProductSuggestions();
});
produto.addEventListener('keydown', event => {
  if (productSuggestions.hidden) {
    if (event.key === 'ArrowDown' && produto.value.trim()) renderProductSuggestions();
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setActiveProduct(activeProductIndex + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setActiveProduct(activeProductIndex - 1);
  } else if (event.key === 'Enter' && activeProductIndex >= 0) {
    event.preventDefault();
    selectProduct(currentProductMatches[activeProductIndex].name);
  } else if (event.key === 'Escape') {
    closeProductSuggestions();
  }
});

clearProductButton.addEventListener('click', () => {
  produto.value = '';
  clearProductButton.hidden = true;
  productSearchHint.textContent = 'Pesquise entre 1.346 produtos pelo nome completo, modelo ou abreviação.';
  productSearchHint.classList.remove('selected-hint');
  closeProductSuggestions();
  produto.focus();
});

document.addEventListener('click', event => {
  if (!productAutocomplete.contains(event.target)) closeProductSuggestions();
});

function showMessage(message, type = '') {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`.trim();
}

function validateForm() {
  if (!form.checkValidity()) {
    form.reportValidity();
    showMessage('Preencha corretamente todos os campos para gerar o relatório.', 'error');
    return false;
  }

  if (!/^\d+$/.test(quantidade.value)) {
    showMessage('A quantidade deve conter apenas números, incluindo 0 quando necessário.', 'error');
    quantidade.focus();
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
  const quantidadeInformada = quantidade.value;
  return [
    'RELATÓRIO DE TRANSFERÊNCIA',
    '',
    `${quantidadeInformada} - ${produto.value.trim().toUpperCase()}`,
    '',
    `${lojaOrigem.value.toUpperCase()} >>> ${lojaAtual.value.toUpperCase()}`,
    '',
    `MOTIVO: ${motivo.value}`,
    '',
    `OBS: ${transporte.value.toUpperCase()}`
  ].join('\n');
}

quantidade.addEventListener('input', () => {
  quantidade.value = quantidade.value.replace(/\D/g, '');
});

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
    showMessage('');
    clearProductButton.hidden = true;
    productSearchHint.textContent = 'Pesquise entre 1.346 produtos pelo nome completo, modelo ou abreviação.';
    productSearchHint.classList.remove('selected-hint');
    closeProductSuggestions();
  }, 0);
});

document.getElementById('closeWhatsappDialogButton').addEventListener('click', () => whatsappDialog.close());

whatsappDialog.addEventListener('click', event => {
  const rect = whatsappDialog.getBoundingClientRect();
  const clickedOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (clickedOutside) whatsappDialog.close();
});

document.getElementById('copyWhatsappButton').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(whatsappMessage.value);
  } catch {
    whatsappMessage.select();
    document.execCommand('copy');
  }

  copyMessage.textContent = 'Relatório copiado com sucesso.';
  copyMessage.className = 'form-message success';
});

document.getElementById('openWhatsappButton').addEventListener('click', () => {
  const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage.value)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});
