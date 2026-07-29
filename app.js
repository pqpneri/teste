const STORAGE_KEY = 'unigames_transferencias_v1';
const PRODUCT_CATALOG_KEY = 'unigames_catalogo_produtos_v1';

const form = document.getElementById('transferForm');
const lojaOrigem = document.getElementById('lojaOrigem');
const lojaAtual = document.getElementById('lojaAtual');
const quantidade = document.getElementById('quantidade');
const codigoProduto = document.getElementById('codigoProduto');
const produto = document.getElementById('produto');
const productCodeList = document.getElementById('productCodeList');
const productNameList = document.getElementById('productNameList');
const productSearchHint = document.getElementById('productSearchHint');
const transporte = document.getElementById('transporte');
const motivo = document.getElementById('motivo');
const observacoes = document.getElementById('observacoes');
const formMessage = document.getElementById('formMessage');
const historyBody = document.getElementById('historyBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const totalRegistrado = document.getElementById('totalRegistrado');
const totalHoje = document.getElementById('totalHoje');
const detailDialog = document.getElementById('detailDialog');
const dialogContent = document.getElementById('dialogContent');

const DEFAULT_PRODUCT_CATALOG = [
  { code: 'C71-8-256-VERDE', name: 'CELULAR REALME C71 8GB + 256GB VERDE NFC' },
  { code: 'C75-8-256-PRETO', name: 'CELULAR REALME C75 8GB + 256GB PRETO NFC' },
  { code: 'PS5-SLIM-1TB', name: 'PLAYSTATION 5 SLIM 1TB' },
  { code: 'SWITCH-OLED-BR', name: 'NINTENDO SWITCH OLED 64GB BRANCO' }
];

function loadProductCatalog() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_CATALOG_KEY));
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_PRODUCT_CATALOG;
  } catch {
    return DEFAULT_PRODUCT_CATALOG;
  }
}

let productCatalog = loadProductCatalog();

function saveProductCatalog() {
  localStorage.setItem(PRODUCT_CATALOG_KEY, JSON.stringify(productCatalog));
}

function normalizeText(value = '') {
  return String(value).trim().toLocaleUpperCase('pt-BR');
}

function renderProductOptions() {
  const sorted = [...productCatalog].sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'));
  productCodeList.innerHTML = sorted.map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)}</option>`).join('');
  productNameList.innerHTML = sorted.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.code)}</option>`).join('');
}

function findProductByCode(value) {
  const code = normalizeText(value);
  return productCatalog.find(item => normalizeText(item.code) === code);
}

function findProductByName(value) {
  const name = normalizeText(value);
  return productCatalog.find(item => normalizeText(item.name) === name);
}

function updateProductFromCode() {
  const match = findProductByCode(codigoProduto.value);
  if (match) {
    produto.value = match.name;
    productSearchHint.textContent = `Produto encontrado: ${match.name}`;
    productSearchHint.className = 'field-hint found';
  } else if (codigoProduto.value.trim()) {
    productSearchHint.textContent = 'Código novo. Preencha o produto e ele será guardado automaticamente após o registro.';
    productSearchHint.className = 'field-hint not-found';
  } else {
    productSearchHint.textContent = 'Ao selecionar um código, o produto será preenchido automaticamente.';
    productSearchHint.className = 'field-hint';
  }
}

function updateCodeFromProduct() {
  const match = findProductByName(produto.value);
  if (match) {
    codigoProduto.value = match.code;
    updateProductFromCode();
  }
}

function rememberProduct(code, name) {
  const cleanCode = code.trim();
  const cleanName = name.trim();
  const existing = findProductByCode(cleanCode);
  if (existing) {
    existing.name = cleanName;
  } else {
    productCatalog.push({ code: cleanCode, name: cleanName });
  }
  saveProductCatalog();
  renderProductOptions();
}

let transfers = loadTransfers();

function loadTransfers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTransfers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(dateValue));
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function updateStats() {
  totalRegistrado.textContent = transfers.length;
  const now = new Date();
  totalHoje.textContent = transfers.filter(item => sameLocalDay(new Date(item.createdAt), now)).length;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTransfers(query = '') {
  const normalized = query.trim().toLowerCase();
  const filtered = transfers.filter(item => {
    const searchable = [
      item.lojaOrigem,
      item.lojaAtual,
      item.codigoProduto,
      item.produto,
      item.transporte,
      item.motivo,
      item.observacoes,
      item.quantidade
    ].join(' ').toLowerCase();
    return searchable.includes(normalized);
  });

  historyBody.innerHTML = filtered.map(item => `
    <tr>
      <td>${escapeHtml(formatDate(item.createdAt))}</td>
      <td>${escapeHtml(item.lojaOrigem)}</td>
      <td>${escapeHtml(item.lojaAtual)}</td>
      <td>${escapeHtml(item.codigoProduto || '—')}</td>
      <td>${escapeHtml(item.produto)}</td>
      <td><span class="badge">${escapeHtml(item.quantidade)}</span></td>
      <td>${escapeHtml(item.transporte)}</td>
      <td>${escapeHtml(item.motivo)}</td>
      <td class="actions-cell">
        <button class="table-action" data-action="view" data-id="${item.id}">Ver</button>
        <button class="table-action delete" data-action="delete" data-id="${item.id}">Excluir</button>
      </td>
    </tr>
  `).join('');

  emptyState.classList.toggle('show', filtered.length === 0);
  updateStats();
}

function showMessage(message, type = '') {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`.trim();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  showMessage('');

  if (!form.checkValidity()) {
    form.reportValidity();
    showMessage('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  if (lojaOrigem.value === lojaAtual.value) {
    showMessage('A loja de origem e a loja atual precisam ser diferentes.', 'error');
    lojaAtual.focus();
    return;
  }

  const transfer = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    lojaOrigem: lojaOrigem.value,
    lojaAtual: lojaAtual.value,
    quantidade: Number(quantidade.value),
    codigoProduto: codigoProduto.value.trim(),
    produto: produto.value.trim(),
    transporte: transporte.value,
    motivo: motivo.value.trim(),
    observacoes: observacoes.value.trim()
  };

  rememberProduct(transfer.codigoProduto, transfer.produto);
  transfers.unshift(transfer);
  saveTransfers();
  renderTransfers(searchInput.value);
  form.reset();
  showMessage('Transferência registrada com sucesso.', 'success');
  lojaOrigem.focus();
});

form.addEventListener('reset', () => {
  setTimeout(() => showMessage(''), 0);
});

document.getElementById('swapButton').addEventListener('click', () => {
  const origin = lojaOrigem.value;
  lojaOrigem.value = lojaAtual.value;
  lojaAtual.value = origin;
});

searchInput.addEventListener('input', event => renderTransfers(event.target.value));

historyBody.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = transfers.find(transfer => transfer.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === 'delete') {
    if (!confirm(`Excluir a transferência do produto “${item.produto}”?`)) return;
    transfers = transfers.filter(transfer => transfer.id !== item.id);
    saveTransfers();
    renderTransfers(searchInput.value);
  }

  if (button.dataset.action === 'view') {
    dialogContent.innerHTML = `
      <dl class="detail-list">
        <dt>Data</dt><dd>${escapeHtml(formatDate(item.createdAt))}</dd>
        <dt>Loja de origem</dt><dd>${escapeHtml(item.lojaOrigem)}</dd>
        <dt>Loja atual</dt><dd>${escapeHtml(item.lojaAtual)}</dd>
        <dt>Código do produto</dt><dd>${escapeHtml(item.codigoProduto || '—')}</dd>
        <dt>Produto</dt><dd>${escapeHtml(item.produto)}</dd>
        <dt>Quantidade</dt><dd>${escapeHtml(item.quantidade)}</dd>
        <dt>Transporte</dt><dd>${escapeHtml(item.transporte)}</dd>
        <dt>Motivo</dt><dd>${escapeHtml(item.motivo)}</dd>
        <dt>Observações</dt><dd>${escapeHtml(item.observacoes || '—')}</dd>
      </dl>
    `;
    detailDialog.showModal();
  }
});

document.getElementById('closeDialogButton').addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', event => {
  const rect = detailDialog.getBoundingClientRect();
  const clickedOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (clickedOutside) detailDialog.close();
});

document.getElementById('clearHistoryButton').addEventListener('click', () => {
  if (!transfers.length) return;
  if (!confirm('Deseja apagar todo o histórico de transferências?')) return;
  transfers = [];
  saveTransfers();
  renderTransfers(searchInput.value);
});

document.getElementById('exportButton').addEventListener('click', () => {
  if (!transfers.length) {
    alert('Não há transferências para exportar.');
    return;
  }

  const headers = ['Data', 'Loja de Origem', 'Loja Atual', 'Código do Produto', 'Produto', 'Quantidade', 'Transporte', 'Motivo', 'Observações'];
  const rows = transfers.map(item => [
    formatDate(item.createdAt), item.lojaOrigem, item.lojaAtual, item.codigoProduto || '', item.produto,
    item.quantidade, item.transporte, item.motivo, item.observacoes
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `transferencias-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

codigoProduto.addEventListener('input', updateProductFromCode);
codigoProduto.addEventListener('change', updateProductFromCode);
produto.addEventListener('change', updateCodeFromProduct);
form.addEventListener('reset', () => {
  setTimeout(() => {
    productSearchHint.textContent = 'Ao selecionar um código, o produto será preenchido automaticamente.';
    productSearchHint.className = 'field-hint';
  }, 0);
});

renderProductOptions();
renderTransfers();

const whatsappDialog = document.getElementById('whatsappDialog');
const whatsappMessage = document.getElementById('whatsappMessage');
const copyMessage = document.getElementById('copyMessage');

function buildWhatsappMessage() {
  return [
    'TRANSFERENCIA',
    '',
    `${quantidade.value.trim()} - ${produto.value.trim()}`,
    '',
    `${lojaOrigem.value.toUpperCase()} >>> ${lojaAtual.value.toUpperCase()}`,
    '',
    `MOTIVO: ${motivo.value.trim()}`,
    '',
    `OBS: ${observacoes.value.trim()}`
  ].join('\n');
}

function validateTransferFormForMessage() {
  if (!form.checkValidity()) {
    form.reportValidity();
    showMessage('Preencha todos os campos obrigatórios para gerar a mensagem.', 'error');
    return false;
  }

  if (lojaOrigem.value === lojaAtual.value) {
    showMessage('A loja de origem e a loja atual precisam ser diferentes.', 'error');
    lojaAtual.focus();
    return false;
  }

  return true;
}

document.getElementById('whatsappButton').addEventListener('click', () => {
  showMessage('');
  if (!validateTransferFormForMessage()) return;
  whatsappMessage.value = buildWhatsappMessage();
  copyMessage.textContent = '';
  whatsappDialog.showModal();
});

document.getElementById('copyWhatsappButton').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(whatsappMessage.value);
    copyMessage.textContent = 'Mensagem copiada com sucesso.';
    copyMessage.className = 'form-message success';
  } catch {
    whatsappMessage.select();
    document.execCommand('copy');
    copyMessage.textContent = 'Mensagem copiada com sucesso.';
    copyMessage.className = 'form-message success';
  }
});

document.getElementById('openWhatsappButton').addEventListener('click', () => {
  const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage.value)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

document.getElementById('closeWhatsappDialogButton').addEventListener('click', () => whatsappDialog.close());
whatsappDialog.addEventListener('click', event => {
  const rect = whatsappDialog.getBoundingClientRect();
  const clickedOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (clickedOutside) whatsappDialog.close();
});
