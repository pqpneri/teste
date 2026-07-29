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
  setTimeout(() => showMessage(''), 0);
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
