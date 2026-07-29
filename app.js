const STORAGE_KEY = 'unigames_transferencias_v1';

const form = document.getElementById('transferForm');
const lojaOrigem = document.getElementById('lojaOrigem');
const lojaAtual = document.getElementById('lojaAtual');
const quantidade = document.getElementById('quantidade');
const produto = document.getElementById('produto');
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
    produto: produto.value.trim(),
    transporte: transporte.value,
    motivo: motivo.value.trim(),
    observacoes: observacoes.value.trim()
  };

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

  const headers = ['Data', 'Loja de Origem', 'Loja Atual', 'Produto', 'Quantidade', 'Transporte', 'Motivo', 'Observações'];
  const rows = transfers.map(item => [
    formatDate(item.createdAt), item.lojaOrigem, item.lojaAtual, item.produto,
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

renderTransfers();
