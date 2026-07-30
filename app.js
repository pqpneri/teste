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
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historySearch = document.getElementById('historySearch');
const historyStoreFilter = document.getElementById('historyStoreFilter');
const historyDialog = document.getElementById('historyDialog');
const historyMessagePreview = document.getElementById('historyMessagePreview');
const STORAGE_KEY = 'unigames_transfer_reports_v2';
let productRowCounter = 0;
let activeHistoryReport = null;

function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}
const searchableProducts = PRODUCT_CATALOG.map((name,index)=>({name,index,normalized:normalizeSearch(name),compact:normalizeSearch(name).replace(/\s+/g,'')}));
function scoreProduct(item,query){const compactQuery=query.replace(/\s+/g,'');const terms=query.split(' ').filter(Boolean);if(!terms.every(term=>item.normalized.includes(term))&&!item.compact.includes(compactQuery))return-1;let score=0;if(item.normalized===query)score+=1000;if(item.normalized.startsWith(query))score+=500;if(item.compact.startsWith(compactQuery))score+=420;if(item.normalized.includes(query))score+=220;if(item.compact.includes(compactQuery))score+=180;terms.forEach(term=>{if(item.normalized.split(' ').some(word=>word.startsWith(term)))score+=45;if(item.normalized.includes(term))score+=20});return score-item.name.length*.02}

function createProductRow(){productRowCounter+=1;const row=document.createElement('div');row.className='product-item';row.dataset.productRow=String(productRowCounter);row.innerHTML=`<div class="product-item-header"><strong>Produto <span class="product-number"></span></strong><button type="button" class="remove-product-button" aria-label="Remover produto">Remover</button></div><div class="product-item-grid"><label class="field quantity-field"><span>Quantidade</span><input class="quantity-input" type="text" inputmode="numeric" pattern="[0-9]+" placeholder="Ex.: 0" maxlength="10" required><small>Aceita zero.</small></label><div class="field product-search-field"><label>Produto</label><div class="autocomplete"><span class="search-icon" aria-hidden="true">⌕</span><input class="product-input" type="text" placeholder="Ex.: C75, PS5, cabo HDMI..." maxlength="160" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" required><button type="button" class="clear-product-button" aria-label="Limpar produto" hidden>×</button><div class="product-suggestions" role="listbox" hidden></div></div><small class="product-search-hint">Pesquise pelo nome completo, modelo ou abreviação.</small></div></div>`;productsContainer.appendChild(row);attachProductRowEvents(row);refreshProductRows();if(productsContainer.children.length>1)row.querySelector('.product-input').focus()}
function refreshProductRows(){const rows=[...productsContainer.querySelectorAll('.product-item')];rows.forEach((row,index)=>{row.querySelector('.product-number').textContent=index+1;row.querySelector('.remove-product-button').hidden=rows.length===1})}
function attachProductRowEvents(row){const quantityInput=row.querySelector('.quantity-input');const productInput=row.querySelector('.product-input');const suggestions=row.querySelector('.product-suggestions');const clearButton=row.querySelector('.clear-product-button');const hint=row.querySelector('.product-search-hint');const autocomplete=row.querySelector('.autocomplete');let activeIndex=-1;let matches=[];function closeSuggestions(){suggestions.hidden=true;suggestions.innerHTML='';productInput.setAttribute('aria-expanded','false');productInput.removeAttribute('aria-activedescendant');activeIndex=-1}function selectProduct(name){productInput.value=name;clearButton.hidden=false;hint.textContent='Produto selecionado.';hint.classList.add('selected-hint');closeSuggestions();productInput.focus()}function setActive(index){const options=[...suggestions.querySelectorAll('[role="option"]')];if(!options.length)return;activeIndex=(index+options.length)%options.length;options.forEach((option,i)=>option.classList.toggle('active',i===activeIndex));const active=options[activeIndex];productInput.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'})}function renderSuggestions(){const query=normalizeSearch(productInput.value);clearButton.hidden=!productInput.value;hint.classList.remove('selected-hint');if(!query){hint.textContent='Pesquise pelo nome completo, modelo ou abreviação.';closeSuggestions();return}matches=searchableProducts.map(item=>({...item,score:scoreProduct(item,query)})).filter(item=>item.score>=0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,12);suggestions.innerHTML='';activeIndex=-1;if(!matches.length){suggestions.innerHTML='<div class="no-product-results"><strong>Nenhum produto encontrado</strong><span>Tente outra abreviação.</span></div>';suggestions.hidden=false;productInput.setAttribute('aria-expanded','true');hint.textContent='Nenhum resultado encontrado.';return}matches.forEach((item,index)=>{const option=document.createElement('button');option.type='button';option.className='product-option';option.id=`product-option-${row.dataset.productRow}-${index}`;option.setAttribute('role','option');option.innerHTML=`<span class="product-option-icon">📦</span><span>${item.name}</span>`;option.addEventListener('click',()=>selectProduct(item.name));suggestions.appendChild(option)});suggestions.hidden=false;productInput.setAttribute('aria-expanded','true');hint.textContent=`${matches.length} sugestão(ões) encontrada(s).`}quantityInput.addEventListener('input',()=>{quantityInput.value=quantityInput.value.replace(/\D/g,'')});productInput.addEventListener('input',renderSuggestions);productInput.addEventListener('focus',()=>{if(productInput.value)renderSuggestions()});productInput.addEventListener('keydown',event=>{if(suggestions.hidden)return;if(event.key==='ArrowDown'){event.preventDefault();setActive(activeIndex+1)}if(event.key==='ArrowUp'){event.preventDefault();setActive(activeIndex-1)}if(event.key==='Enter'&&activeIndex>=0){event.preventDefault();selectProduct(matches[activeIndex].name)}if(event.key==='Escape')closeSuggestions()});clearButton.addEventListener('click',()=>{productInput.value='';clearButton.hidden=true;hint.textContent='Pesquise pelo nome completo, modelo ou abreviação.';hint.classList.remove('selected-hint');closeSuggestions();productInput.focus()});row.querySelector('.remove-product-button').addEventListener('click',()=>{row.remove();refreshProductRows()});document.addEventListener('click',event=>{if(!autocomplete.contains(event.target))closeSuggestions()})}

function showMessage(message,type=''){formMessage.textContent=message;formMessage.className=`form-message ${type}`.trim()}
function getProductRowsData(){return[...productsContainer.querySelectorAll('.product-item')].map(row=>({quantity:row.querySelector('.quantity-input').value,product:row.querySelector('.product-input').value.trim()}))}
function validateForm(){if(!form.checkValidity()){form.reportValidity();showMessage('Preencha corretamente todos os campos para gerar o relatório.','error');return false}const rows=getProductRowsData();if(rows.find(item=>!/^\d+$/.test(item.quantity))){showMessage('Todas as quantidades devem conter apenas números, incluindo 0.','error');return false}if(lojaOrigem.value===lojaAtual.value){showMessage('A loja de origem e a loja de destino precisam ser diferentes.','error');lojaAtual.focus();return false}return true}
function buildWhatsappReport(data){const productLines=data.products.map(item=>`${item.quantity} - ${item.product.toUpperCase()}`);return['RELATÓRIO DE TRANSFERÊNCIA','',...productLines,'',`${data.origin.toUpperCase()} >>> ${data.destination.toUpperCase()}`,'',`MOTIVO: ${data.reason}`,'',`OBS: ${data.transport.toUpperCase()}`].join('\n')}
function getHistory(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function saveHistory(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}
function createReportData(){const data={id:`TR-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:new Date().toISOString(),origin:lojaOrigem.value,destination:lojaAtual.value,reason:motivo.value,transport:transporte.value,products:getProductRowsData()};data.message=buildWhatsappReport(data);return data}
function saveReport(report){const history=getHistory();history.unshift(report);saveHistory(history);renderHistory()}
function formatDateParts(iso){const date=new Date(iso);return{day:String(date.getDate()).padStart(2,'0'),month:date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase(),full:date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function renderHistory(){const history=getHistory();const query=normalizeSearch(historySearch.value);const store=normalizeSearch(historyStoreFilter.value);const filtered=history.filter(item=>{const haystack=normalizeSearch([item.origin,item.destination,item.reason,item.transport,...item.products.map(p=>p.product)].join(' '));const storeMatch=!store||normalizeSearch(item.origin)===store||normalizeSearch(item.destination)===store;return(!query||haystack.includes(query))&&storeMatch});document.getElementById('historyCountBadge').textContent=history.length;document.getElementById('totalReports').textContent=history.length;document.getElementById('totalProducts').textContent=history.reduce((sum,item)=>sum+item.products.length,0);const today=new Date().toDateString();document.getElementById('reportsToday').textContent=history.filter(item=>new Date(item.createdAt).toDateString()===today).length;historyList.innerHTML='';historyEmpty.hidden=filtered.length>0;filtered.forEach(item=>{const date=formatDateParts(item.createdAt);const card=document.createElement('article');card.className='history-item';card.innerHTML=`<div class="history-date"><span>${date.day}</span><span>${date.month}</span></div><div class="history-main"><h3>${escapeHtml(item.origin)} → ${escapeHtml(item.destination)}</h3><p>${item.products.length} produto(s) • ${escapeHtml(date.full)}</p><div class="history-tags"><span class="history-tag">${escapeHtml(item.reason)}</span><span class="history-tag">${escapeHtml(item.transport)}</span></div></div><div class="history-actions"><button class="icon-action view-report" type="button" title="Visualizar">◉</button><button class="icon-action duplicate-report" type="button" title="Usar novamente">↻</button><button class="icon-action danger delete-report" type="button" title="Excluir">⌫</button></div>`;card.querySelector('.view-report').addEventListener('click',()=>openHistoryReport(item));card.querySelector('.duplicate-report').addEventListener('click',()=>loadReportIntoForm(item));card.querySelector('.delete-report').addEventListener('click',()=>deleteReport(item.id));historyList.appendChild(card)})}
function openHistoryReport(item){activeHistoryReport=item;historyMessagePreview.value=item.message;document.getElementById('historyCopyMessage').textContent='';historyDialog.showModal()}
function deleteReport(id){if(!confirm('Deseja excluir este relatório do histórico?'))return;saveHistory(getHistory().filter(item=>item.id!==id));renderHistory()}
function loadReportIntoForm(item){lojaOrigem.value=item.origin;lojaAtual.value=item.destination;motivo.value=item.reason;transporte.value=item.transport;productsContainer.innerHTML='';item.products.forEach(product=>{createProductRow();const row=productsContainer.lastElementChild;row.querySelector('.quantity-input').value=product.quantity;row.querySelector('.product-input').value=product.product;row.querySelector('.clear-product-button').hidden=false});refreshProductRows();switchTab('formTab');window.scrollTo({top:0,behavior:'smooth'});showMessage('Dados do relatório carregados. Faça as alterações e gere um novo registro.','success')}
function switchTab(tabId){document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tabId));document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===tabId));if(tabId==='historyTab')renderHistory()}

document.querySelectorAll('.tab-button').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
addProductButton.addEventListener('click',createProductRow);
document.getElementById('swapButton').addEventListener('click',()=>{const origem=lojaOrigem.value;lojaOrigem.value=lojaAtual.value;lojaAtual.value=origem});
document.getElementById('whatsappButton').addEventListener('click',()=>{showMessage('');if(!validateForm())return;const report=createReportData();saveReport(report);whatsappMessage.value=report.message;copyMessage.textContent='';copyMessage.className='form-message';whatsappDialog.showModal()});
form.addEventListener('reset',()=>{setTimeout(()=>{productsContainer.innerHTML='';createProductRow();showMessage('')},0)});
historySearch.addEventListener('input',renderHistory);historyStoreFilter.addEventListener('change',renderHistory);
document.getElementById('clearHistoryButton').addEventListener('click',()=>{if(!getHistory().length)return;if(confirm('Deseja apagar todo o histórico de relatórios? Esta ação não poderá ser desfeita.')){localStorage.removeItem(STORAGE_KEY);renderHistory()}});
document.getElementById('closeWhatsappDialogButton').addEventListener('click',()=>whatsappDialog.close());
document.getElementById('closeHistoryDialogButton').addEventListener('click',()=>historyDialog.close());
[whatsappDialog,historyDialog].forEach(dialog=>dialog.addEventListener('click',event=>{const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}));
async function copyText(text,messageElement){try{await navigator.clipboard.writeText(text)}catch{const temp=document.createElement('textarea');temp.value=text;document.body.appendChild(temp);temp.select();document.execCommand('copy');temp.remove()}messageElement.textContent='Relatório copiado com sucesso.';messageElement.className='form-message success'}
document.getElementById('copyWhatsappButton').addEventListener('click',()=>copyText(whatsappMessage.value,copyMessage));
document.getElementById('openWhatsappButton').addEventListener('click',()=>window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage.value)}`,'_blank','noopener,noreferrer'));
document.getElementById('copyHistoryButton').addEventListener('click',()=>copyText(historyMessagePreview.value,document.getElementById('historyCopyMessage')));
document.getElementById('sendHistoryWhatsappButton').addEventListener('click',()=>window.open(`https://wa.me/?text=${encodeURIComponent(historyMessagePreview.value)}`,'_blank','noopener,noreferrer'));

createProductRow();renderHistory();

// Splash art e informações visuais do cabeçalho
(function initializeVisualExperience(){
  const splash=document.getElementById('pageSplash');
  const dateElement=document.getElementById('topbarDate');
  if(dateElement){
    dateElement.textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date());
  }
  const startedAt=performance.now();
  const finishLoading=()=>{
    const elapsed=performance.now()-startedAt;
    const wait=Math.max(0,1100-elapsed);
    window.setTimeout(()=>{
      splash?.classList.add('is-hidden');
      document.body.classList.remove('is-loading');
      window.setTimeout(()=>splash?.remove(),650);
    },wait);
  };
  if(document.readyState==='complete') finishLoading();
  else window.addEventListener('load',finishLoading,{once:true});
})();

// Cadastro de clientes, script WhatsApp e geração de imagem
(function initializeCustomerModule(){
  const customerForm=document.getElementById('customerForm');
  if(!customerForm) return;
  const $=id=>document.getElementById(id);
  const fields={
    name:$('customerName'),phone:$('customerPhone'),type:$('customerType'),date:$('customerDate'),
    product:$('customerProduct'),quantity:$('customerQuantity'),payment:$('customerPayment'),store:$('customerStore'),
    channel:$('customerChannel'),service:$('customerService'),notes:$('customerNotes')
  };
  const message=$('customerFormMessage');
  const suggestions=$('customerProductSuggestions');
  const clearProduct=$('clearCustomerProduct');
  let customerCode='';

  function generateCode(){
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix='';
    for(let i=0;i<4;i++) suffix+=alphabet[Math.floor(Math.random()*alphabet.length)];
    customerCode=`UNI-${suffix}`;
    $('customerCode').textContent=customerCode;
    $('previewCode').textContent=customerCode;
  }
  function formatPhone(value){
    const digits=value.replace(/\D/g,'').slice(0,11);
    if(digits.length<=2) return digits;
    if(digits.length<=7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if(digits.length<=10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  function dateLabel(value){
    if(!value) return 'DATA';
    const d=new Date(`${value}T12:00:00`);
    const today=new Date(); today.setHours(0,0,0,0);
    const diff=Math.round((d-today)/86400000);
    const suffix=diff===0?'hoje':diff>0?`${diff}d`:`${Math.abs(diff)}d atrás`;
    return `${d.toLocaleDateString('pt-BR')} (${suffix})`;
  }
  function initials(name){
    const parts=name.trim().split(/\s+/).filter(Boolean);
    if(!parts.length) return 'CL';
    return (parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase();
  }
  function updatePreview(){
    const name=fields.name.value.trim();
    $('previewInitials').textContent=initials(name);
    $('previewName').textContent=(name||'NOME DO CLIENTE').toUpperCase();
    $('previewPhone').textContent=fields.phone.value||'Telefone não informado';
    $('previewDate').textContent=dateLabel(fields.date.value);
    $('previewType').textContent=`🛒 ${fields.type.value}`;
    $('previewProduct').textContent=`${fields.quantity.value||'1'}x ${fields.product.value.trim()||'Produto selecionado'}`;
    $('previewPayment').textContent=fields.payment.value.trim()||'Não informado';
    $('previewStore').textContent=fields.store.value||'Não informada';
    $('previewChannel').textContent=fields.channel.value||'Não informado';
    $('previewService').textContent=fields.service.value||'Não informado';
    $('previewNotes').textContent=(fields.notes.value.trim()||'SEM OBSERVAÇÕES ADICIONAIS.').toUpperCase();
  }
  function customerData(){
    return {name:fields.name.value.trim(),phone:fields.phone.value.trim(),type:fields.type.value,date:dateLabel(fields.date.value),product:fields.product.value.trim(),quantity:fields.quantity.value.trim(),payment:fields.payment.value.trim(),store:fields.store.value,channel:fields.channel.value,service:fields.service.value,notes:fields.notes.value.trim(),code:customerCode};
  }
  function validateCustomer(){
    if(!customerForm.checkValidity()){customerForm.reportValidity();showCustomerMessage('Preencha os campos obrigatórios para continuar.','error');return false}
    if(!/^\d+$/.test(fields.quantity.value)){showCustomerMessage('A quantidade deve conter apenas números.','error');fields.quantity.focus();return false}
    return true;
  }
  function buildCustomerScript(data){
    return [
      '🎟️ *ATENDIMENTO DIGITAL UNIGAMES*','',
      `👤 *Cliente:* ${data.name.toUpperCase()}`,
      `📞 *Telefone:* ${data.phone}`,
      `📅 *Data prevista:* ${data.date}`,'',
      `🛒 *Atendimento:* ${data.type}`,
      `📦 *Produto:* ${data.quantity}x ${data.product}`,
      `💳 *Pagamento:* ${data.payment}`,
      `🏬 *Loja:* ${data.store}`,
      `💬 *Canal:* ${data.channel}`,
      `🎧 *Origem do atendimento:* ${data.service}`,
      data.notes?`📝 *Observação:* ${data.notes}`:'', '',
      '🎫 *CÓDIGO DE ATENDIMENTO DIGITAL*',
      `*${data.code}*`,
      'Apresente na loja para garantir seus benefícios.','',
      '✅ Garantia presencial em loja',
      '✅ Suporte especializado vitalício',
      '✅ Programa de recompra'
    ].filter((line,index,array)=>line!==''||array[index-1]!=='').join('\n');
  }
  function showCustomerMessage(text,type=''){message.textContent=text;message.className=`form-message ${type}`.trim()}
  function copyCustomerText(text){
    if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const temp=document.createElement('textarea');temp.value=text;document.body.appendChild(temp);temp.select();document.execCommand('copy');temp.remove();return Promise.resolve();
  }

  function searchCustomerProducts(){
    const query=normalizeSearch(fields.product.value);
    clearProduct.hidden=!fields.product.value;
    if(!query){suggestions.hidden=true;suggestions.innerHTML='';return}
    const matches=searchableProducts.map(item=>({...item,score:scoreProduct(item,query)})).filter(item=>item.score>=0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,10);
    suggestions.innerHTML='';
    if(!matches.length){suggestions.innerHTML='<div class="no-product-results"><strong>Nenhum produto encontrado</strong><span>Tente outra abreviação.</span></div>';suggestions.hidden=false;return}
    matches.forEach(item=>{const btn=document.createElement('button');btn.type='button';btn.className='product-option';btn.innerHTML=`<span class="product-option-icon">📦</span><span>${escapeHtml(item.name)}</span>`;btn.addEventListener('click',()=>{fields.product.value=item.name;suggestions.hidden=true;clearProduct.hidden=false;updatePreview()});suggestions.appendChild(btn)});
    suggestions.hidden=false;
  }

  function roundedRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=10){
    const words=String(text).split(/\s+/);let line='',lines=[];
    words.forEach(word=>{const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test});if(line)lines.push(line);
    lines=lines.slice(0,maxLines);lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return y+lines.length*lineHeight;
  }
  function generateCustomerImage(data){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1500;const ctx=canvas.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,1080,1500);grad.addColorStop(0,'#080d16');grad.addColorStop(.6,'#10141e');grad.addColorStop(1,'#070a10');ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1500);
    const side=ctx.createLinearGradient(0,0,0,1500);side.addColorStop(0,'#62d9ef');side.addColorStop(1,'#52c7b5');ctx.fillStyle=side;ctx.fillRect(0,0,12,1500);
    ctx.fillStyle='#131722';ctx.beginPath();ctx.arc(112,120,52,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f5f8ff';ctx.font='700 32px Arial';ctx.textAlign='center';ctx.fillText(initials(data.name),112,131);ctx.textAlign='left';
    ctx.font='700 36px Arial';wrapText(ctx,data.name.toUpperCase(),190,102,610,44,2);ctx.fillStyle='#8e97a8';ctx.font='28px Arial';ctx.fillText(data.phone,190,188);
    roundedRect(ctx,800,60,220,64,18,'#18345c');ctx.fillStyle='#7ec9f2';ctx.font='700 23px Arial';ctx.textAlign='center';ctx.fillText(data.date,910,101);ctx.textAlign='left';
    roundedRect(ctx,70,244,300,58,29,'#0e2c20','#246844');ctx.fillStyle='#56db84';ctx.font='700 25px Arial';ctx.fillText(`🛒 ${data.type}`,92,282);
    ctx.fillStyle='#292f39';ctx.fillRect(70,340,940,2);
    const rows=[['Produto',`${data.quantity}x ${data.product}`],['Pagamento',data.payment],['Loja',data.store],['Canal',data.channel],['Atendimento',data.service]];let y=405;
    rows.forEach(([label,value],i)=>{ctx.fillStyle='#929aa9';ctx.font='26px Arial';ctx.fillText(label,70,y);ctx.fillStyle=i===1?'#53df77':'#f5f8ff';ctx.font='28px Arial';wrapText(ctx,value,300,y,700,36,2);y+=i===0?105:72});
    roundedRect(ctx,70,y+8,940,150,20,'#171a22');ctx.fillStyle='#e4e8f0';ctx.font='25px Arial';wrapText(ctx,(data.notes||'SEM OBSERVAÇÕES ADICIONAIS.').toUpperCase(),102,y+55,875,36,3);y+=190;
    const codeGrad=ctx.createLinearGradient(70,y,1010,y+210);codeGrad.addColorStop(0,'#172a4e');codeGrad.addColorStop(1,'#28436f');roundedRect(ctx,70,y,940,220,24,codeGrad,'#83bfff');ctx.setLineDash([14,10]);ctx.lineWidth=3;ctx.strokeStyle='#83bfff';ctx.strokeRect(75,y+5,930,210);ctx.setLineDash([]);ctx.textAlign='center';ctx.fillStyle='#98c8ff';ctx.font='700 24px Arial';ctx.fillText('🎟 CÓDIGO DE ATENDIMENTO DIGITAL',540,y+52);ctx.fillStyle='#fff';ctx.font='700 62px monospace';ctx.fillText(data.code,540,y+132);ctx.fillStyle='#c1ccdd';ctx.font='24px Arial';ctx.fillText('Apresente na loja para garantir seus benefícios',540,y+183);
    y+=255;const benefits=[['🏬 Garantia presencial em loja','#17375e','#9bcaff'],['🛠 Suporte especializado vitalício','#143848','#68ddd2'],['🔄 Programa de recompra','#30253d','#ff9298']];benefits.forEach(([text,bg,color],i)=>{const w=i===1?540:470;roundedRect(ctx,(1080-w)/2,y,w,55,28,bg);ctx.fillStyle=color;ctx.font='700 23px Arial';ctx.fillText(text,540,y+36);y+=72});
    ctx.fillStyle='#4d586a';ctx.font='700 19px Arial';ctx.fillText('UNIGAMES • ATENDIMENTO DIGITAL',540,1452);ctx.textAlign='left';
    const link=document.createElement('a');link.download=`atendimento-${data.code}.png`;link.href=canvas.toDataURL('image/png');link.click();
  }

  Object.values(fields).forEach(field=>field.addEventListener('input',updatePreview));
  Object.values(fields).forEach(field=>field.addEventListener('change',updatePreview));
  fields.phone.addEventListener('input',()=>{fields.phone.value=formatPhone(fields.phone.value);updatePreview()});
  fields.quantity.addEventListener('input',()=>{fields.quantity.value=fields.quantity.value.replace(/\D/g,'');updatePreview()});
  fields.product.addEventListener('input',searchCustomerProducts);
  fields.product.addEventListener('focus',()=>{if(fields.product.value)searchCustomerProducts()});
  clearProduct.addEventListener('click',()=>{fields.product.value='';clearProduct.hidden=true;suggestions.hidden=true;updatePreview();fields.product.focus()});
  document.addEventListener('click',event=>{if(!event.target.closest('.customer-autocomplete'))suggestions.hidden=true});
  $('newCustomerCode').addEventListener('click',()=>{generateCode();showCustomerMessage('Novo código gerado.','success')});
  $('copyCustomerScript').addEventListener('click',async()=>{if(!validateCustomer())return;await copyCustomerText(buildCustomerScript(customerData()));showCustomerMessage('Script copiado. Agora é só colar no WhatsApp.','success')});
  $('openCustomerWhatsapp').addEventListener('click',()=>{if(!validateCustomer())return;window.open(`https://wa.me/?text=${encodeURIComponent(buildCustomerScript(customerData()))}`,'_blank','noopener,noreferrer')});
  $('generateCustomerImage').addEventListener('click',()=>{if(!validateCustomer())return;generateCustomerImage(customerData());showCustomerMessage('Imagem PNG gerada com sucesso.','success')});
  customerForm.addEventListener('reset',()=>setTimeout(()=>{generateCode();updatePreview();showCustomerMessage('')},0));
  fields.date.value=new Date().toISOString().slice(0,10);generateCode();updatePreview();
})();
