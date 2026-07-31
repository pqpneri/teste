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
function getHistory(){return window.UnigamesDB?.getTransfers?.() || []}
function createReportData(){const data={id:`TR-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:new Date().toISOString(),origin:lojaOrigem.value,destination:lojaAtual.value,reason:motivo.value,transport:transporte.value,products:getProductRowsData()};data.message=buildWhatsappReport(data);return data}
async function saveReport(report){await window.UnigamesDB.saveTransfer(report);renderHistory()}
function formatDateParts(iso){const date=new Date(iso);return{day:String(date.getDate()).padStart(2,'0'),month:date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase(),full:date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function renderHistory(){const history=getHistory();const query=normalizeSearch(historySearch.value);const store=normalizeSearch(historyStoreFilter.value);const filtered=history.filter(item=>{const haystack=normalizeSearch([item.origin,item.destination,item.reason,item.transport,...item.products.map(p=>p.product)].join(' '));const storeMatch=!store||normalizeSearch(item.origin)===store||normalizeSearch(item.destination)===store;return(!query||haystack.includes(query))&&storeMatch});document.getElementById('historyCountBadge').textContent=history.length;document.getElementById('totalReports').textContent=history.length;document.getElementById('totalProducts').textContent=history.reduce((sum,item)=>sum+item.products.reduce((n,p)=>n+Number(p.quantity||1),0),0);const today=new Date().toDateString();document.getElementById('reportsToday').textContent=history.filter(item=>new Date(item.createdAt).toDateString()===today).length;historyList.innerHTML='';historyEmpty.hidden=filtered.length>0;filtered.forEach(item=>{const date=formatDateParts(item.createdAt);const productPreview=item.products.slice(0,2).map(p=>`<span><b>${escapeHtml(String(p.quantity||1))}×</b> ${escapeHtml(p.product)}</span>`).join('');const more=item.products.length>2?`<span class="history-more">+${item.products.length-2} item(ns)</span>`:'';const card=document.createElement('article');card.className='history-item';card.innerHTML=`<div class="history-date"><span>${date.day}</span><span>${date.month}</span></div><div class="history-main"><div class="history-route"><span>${escapeHtml(item.origin)}</span><i>→</i><span>${escapeHtml(item.destination)}</span></div><p class="history-meta">${escapeHtml(date.full)}${item.createdByName?` · ${escapeHtml(item.createdByName)}`:''}</p><div class="history-products-preview">${productPreview}${more}</div><div class="history-tags"><span class="history-tag">${escapeHtml(item.reason)}</span><span class="history-tag">${escapeHtml(item.transport)}</span></div></div><div class="history-actions"><button class="icon-action view-report" type="button" title="Visualizar">Abrir</button><button class="icon-action duplicate-report" type="button" title="Usar novamente">Reutilizar</button><button class="icon-action danger delete-report" type="button" title="Excluir">Excluir</button></div>`;card.querySelector('.view-report').addEventListener('click',()=>openHistoryReport(item));card.querySelector('.duplicate-report').addEventListener('click',()=>loadReportIntoForm(item));card.querySelector('.delete-report').addEventListener('click',()=>deleteReport(item.id));historyList.appendChild(card)})}
function openHistoryReport(item){activeHistoryReport=item;historyMessagePreview.value=item.message;document.getElementById('historyCopyMessage').textContent='';historyDialog.showModal()}
async function deleteReport(id){if(!confirm('Deseja excluir este relatório do histórico?'))return;try{await window.UnigamesDB.deleteTransfer(id);renderHistory()}catch(error){window.showAppMessage?.('Não foi possível excluir: '+error.message, 'error')}}
function loadReportIntoForm(item){lojaOrigem.value=item.origin;lojaAtual.value=item.destination;motivo.value=item.reason;transporte.value=item.transport;productsContainer.innerHTML='';item.products.forEach(product=>{createProductRow();const row=productsContainer.lastElementChild;row.querySelector('.quantity-input').value=product.quantity;row.querySelector('.product-input').value=product.product;row.querySelector('.clear-product-button').hidden=false});refreshProductRows();switchTab('formTab');window.scrollTo({top:0,behavior:'smooth'});showMessage('Dados do relatório carregados. Faça as alterações e gere um novo registro.','success')}
function switchTab(tabId){document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tabId));document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===tabId));if(tabId==='historyTab')renderHistory()}

document.querySelectorAll('.tab-button').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
addProductButton.addEventListener('click',createProductRow);

document.getElementById('whatsappButton').addEventListener('click',async()=>{showMessage('');if(!validateForm())return;const button=document.getElementById('whatsappButton');button.disabled=true;try{const report=createReportData();await saveReport(report);whatsappMessage.value=report.message;copyMessage.textContent='';copyMessage.className='form-message';whatsappDialog.showModal()}catch(error){showMessage('Não foi possível salvar no banco: '+error.message,'error')}finally{button.disabled=false}});
form.addEventListener('reset',()=>{setTimeout(()=>{productsContainer.innerHTML='';createProductRow();showMessage('')},0)});
historySearch.addEventListener('input',renderHistory);historyStoreFilter.addEventListener('change',renderHistory);
document.getElementById('clearHistoryButton').addEventListener('click',async()=>{if(!getHistory().length)return;if(confirm('Deseja apagar todo o histórico do banco de dados? Esta ação não poderá ser desfeita.')){try{await window.UnigamesDB.clearTransfers();renderHistory()}catch(error){window.showAppMessage?.('Não foi possível limpar o histórico: '+error.message, 'error')}}});
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

// Cadastro de clientes, múltiplos produtos e imagem compatível com WebView
// Cadastro de clientes, múltiplos produtos, valores e integração Android WebView
(()=>{
  const $=id=>document.getElementById(id);
  const form=$('customerForm');
  if(!form)return;
  const fields={name:$('customerName'),phone:$('customerPhone'),type:$('customerType'),date:$('customerDate'),store:$('customerStore'),channel:$('customerChannel'),service:$('customerService'),notes:$('customerNotes')};
  const box=$('customerProductsContainer'), count=$('customerProductCount'), msg=$('customerFormMessage');
  const dialog=$('customerImageDialog'), img=$('generatedCustomerImage'), dialogMsg=$('imageDialogMessage');
  let code='',seq=0,dataUrl='',blob=null,filename='';

  const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const parseMoney=v=>{const d=String(v||'').replace(/\D/g,'');return d?Number(d)/100:0};
  const moneyInput=v=>{const d=String(v||'').replace(/\D/g,'');return d?money(Number(d)/100):''};
  const phone=v=>{const d=v.replace(/\D/g,'').slice(0,11);if(d.length<=2)return d;if(d.length<=7)return`(${d.slice(0,2)}) ${d.slice(2)}`;return d.length<=10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`};
  const initials=n=>{const a=n.trim().split(/\s+/).filter(Boolean);return a.length?(a[0][0]+(a.length>1?a.at(-1)[0]:'')).toUpperCase():'CL'};
  const dateLabel=v=>{if(!v)return'Data não informada';const d=new Date(v+'T12:00:00');const t=new Date();t.setHours(0,0,0,0);const diff=Math.round((d-t)/86400000);return `${d.toLocaleDateString('pt-BR')} (${diff===0?'hoje':diff>0?diff+'d':Math.abs(diff)+'d atrás'})`};
  const show=(text,type='')=>{msg.textContent=text;msg.className=`form-message ${type}`.trim()};
  const newCode=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';code='UNI-'+Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join('');if($('customerCode'))$('customerCode').textContent=code;if($('previewCode'))$('previewCode').textContent=code};

  function addProduct(data={quantity:'1',product:'',value:'',payment:'PIX',details:''}){
    const row=document.createElement('section');row.className='customer-product-row customer-product-row-v3';row.dataset.id=++seq;
    row.innerHTML=`
      <div class="customer-product-row-head"><div><span class="product-card-kicker">PRODUTO DO CLIENTE</span><strong>Item <span class="customer-product-number"></span></strong></div><button class="customer-product-remove" type="button">Remover</button></div>
      <div class="customer-product-grid-v3">
        <label class="field compact-field"><span>Quantidade</span><input class="customer-product-quantity" inputmode="numeric" maxlength="4" required value="${escapeHtml(data.quantity)}"></label>
        <div class="field customer-product-search-field"><label>Produto</label><div class="autocomplete customer-autocomplete"><span class="search-icon">⌕</span><input class="customer-product-name" autocomplete="off" placeholder="Digite nome, modelo ou abreviação" required value="${escapeHtml(data.product)}"><button class="clear-product-button" type="button" ${data.product?'':'hidden'}>×</button><div class="product-suggestions" hidden></div></div></div>
        <label class="field value-field"><span>Valor unitário</span><input class="customer-product-value" inputmode="decimal" placeholder="R$ 0,00" required value="${escapeHtml(data.value)}"></label>
      </div>
      <div class="customer-payment-grid-v3">
        <label class="field"><span>Forma de pagamento</span><select class="customer-product-payment" required><option>PIX</option><option>DINHEIRO</option><option>CARTÃO DE DÉBITO</option><option>CARTÃO DE CRÉDITO</option><option>CREDIÁRIO</option><option>PAYJOY</option><option>PARCELEX</option><option>OUTRO</option></select></label>
        <label class="field"><span>Condição / parcelas</span><input class="customer-product-payment-details" placeholder="Ex.: 10x de R$ 260,00" maxlength="100" value="${escapeHtml(data.details||'')}"></label>
        <div class="customer-product-subtotal"><span>Subtotal</span><strong>R$ 0,00</strong></div>
      </div>`;
    box.appendChild(row);row.querySelector('.customer-product-payment').value=data.payment||'PIX';attach(row);refresh();update();
  }
  function refresh(){const rows=[...box.querySelectorAll('.customer-product-row')];rows.forEach((r,i)=>{r.querySelector('.customer-product-number').textContent=String(i+1).padStart(2,'0');r.querySelector('.customer-product-remove').hidden=rows.length===1});count.textContent=`${rows.length} ${rows.length===1?'produto':'produtos'}`}
  function attach(row){
    const qty=row.querySelector('.customer-product-quantity'), product=row.querySelector('.customer-product-name'), val=row.querySelector('.customer-product-value'), pay=row.querySelector('.customer-product-payment'), details=row.querySelector('.customer-product-payment-details'), sug=row.querySelector('.product-suggestions'), clear=row.querySelector('.clear-product-button'), auto=row.querySelector('.customer-autocomplete');let matches=[],active=-1;
    const close=()=>{sug.hidden=true;sug.innerHTML='';active=-1};
    const choose=n=>{product.value=n;clear.hidden=false;close();update()};
    const render=()=>{const q=normalizeSearch(product.value);clear.hidden=!product.value;if(!q)return close();matches=searchableProducts.map(x=>({...x,score:scoreProduct(x,q)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,10);sug.innerHTML=matches.length?'':'<div class="no-product-results"><strong>Nenhum produto encontrado</strong></div>';matches.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.className='product-option';b.innerHTML=`<span class="product-option-icon">📦</span><span>${escapeHtml(x.name)}</span>`;b.onclick=()=>choose(x.name);sug.appendChild(b)});sug.hidden=false};
    const setActive=n=>{const opts=[...sug.querySelectorAll('.product-option')];if(!opts.length)return;active=(n+opts.length)%opts.length;opts.forEach((o,i)=>o.classList.toggle('active',i===active));opts[active].scrollIntoView({block:'nearest'})};
    qty.oninput=()=>{qty.value=qty.value.replace(/\D/g,'');update()};product.oninput=()=>{render();update()};product.onfocus=()=>product.value&&render();product.onkeydown=e=>{if(sug.hidden)return;if(e.key==='ArrowDown'){e.preventDefault();setActive(active+1)}else if(e.key==='ArrowUp'){e.preventDefault();setActive(active-1)}else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(matches[active].name)}else if(e.key==='Escape')close()};val.oninput=()=>{val.value=moneyInput(val.value);update()};pay.onchange=update;details.oninput=update;clear.onclick=()=>{product.value='';clear.hidden=true;close();product.focus();update()};row.querySelector('.customer-product-remove').onclick=()=>{row.remove();refresh();update()};document.addEventListener('click',e=>!auto.contains(e.target)&&close());
  }
  function products(){return[...box.querySelectorAll('.customer-product-row')].map(r=>{const q=r.querySelector('.customer-product-quantity').value.trim(),v=r.querySelector('.customer-product-value').value.trim(),unit=parseMoney(v),subtotal=(Number(q)||0)*unit,payment=r.querySelector('.customer-product-payment').value,details=r.querySelector('.customer-product-payment-details').value.trim();r.querySelector('.customer-product-subtotal strong').textContent=money(subtotal);return{quantity:q,product:r.querySelector('.customer-product-name').value.trim(),value:v,unit,subtotal,payment,details,paymentLabel:[payment,details].filter(Boolean).join(' • ')}})}
  function data(){const ps=products();return{name:fields.name.value.trim(),phone:fields.phone.value.trim(),type:fields.type.value,date:dateLabel(fields.date.value),products:ps,total:ps.reduce((s,p)=>s+p.subtotal,0),store:fields.store.value,channel:fields.channel.value,service:fields.service.value,notes:fields.notes.value.trim(),code,rawDate:fields.date.value}}
  function valid(){if(!form.checkValidity()){form.reportValidity();show('Preencha todos os campos obrigatórios.','error');return false}const ps=products();if(ps.some(p=>!/^\d+$/.test(p.quantity))){show('Informe quantidades válidas.','error');return false}if(ps.some(p=>p.unit<=0)){show('Informe o valor unitário de todos os produtos.','error');return false}return true}
  function update(){const d=data();$('previewInitials').textContent=initials(d.name);$('previewName').textContent=(d.name||'NOME DO CLIENTE').toUpperCase();$('previewPhone').textContent=d.phone||'Telefone não informado';$('previewDate').textContent=d.date;$('previewType').textContent=d.type;$('previewStore').textContent=d.store||'Não informada';$('previewChannel').textContent=d.channel||'Não informado';$('previewService').textContent=d.service||'Não informado';$('previewNotes').textContent=d.notes||'Sem observações.';$('previewProductsCount').textContent=`${d.products.length} ${d.products.length===1?'item':'itens'}`;$('previewGrandTotal').textContent=money(d.total);$('previewPaymentSummary').textContent=[...new Set(d.products.map(p=>p.paymentLabel).filter(Boolean))].join(' • ')||'Condição conforme os itens';$('previewProductsList').innerHTML=d.products.map(p=>`<div class="compact-product-line"><strong>${escapeHtml(p.product||'Produto não informado')}</strong><small>${escapeHtml(p.quantity||'0')} un. · ${escapeHtml(p.paymentLabel||'Pagamento não informado')}</small><b>${money(p.subtotal)}</b></div>`).join('')}
  async function saveCustomerReport(d, action='generated'){
    const report={...d,id:d.code,createdAt:new Date().toISOString(),action};
    await window.UnigamesDB.saveCustomer(report);
    window.dispatchEvent(new CustomEvent('customerReportsUpdated'));
    return report;
  }
  function script(d){return [`*ATENDIMENTO DIGITAL UNIGAMES*`,``,`*Cliente:* ${d.name}`,`*WhatsApp:* ${d.phone}`,`*Data prevista:* ${d.date}`,`*Tipo:* ${d.type}`,``,...d.products.flatMap((p,i)=>[`*PRODUTO ${i+1}*`,`${p.quantity}x ${p.product}`,`Valor unitário: ${money(p.unit)}`,`Pagamento: ${p.paymentLabel}`,`Subtotal: ${money(p.subtotal)}`,``]),`*VALOR TOTAL: ${money(d.total)}*`,``,`*Loja:* ${d.store}`,`*Canal:* ${d.channel}`,`*Atendimento:* ${d.service}`,d.notes?`*Observação:* ${d.notes}`:'',``,`*Código digital:* ${d.code}`,`Apresente este código na loja para garantir seus benefícios.`].filter(x=>x!== '').join('\n')}

  function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
  function wrap(c,text,x,y,max,line,maxLines=3){const words=String(text).split(' ');let l='',n=0;for(const w of words){const t=l?l+' '+w:w;if(c.measureText(t).width>max&&l){c.fillText(l,x,y+n*line);n++;l=w;if(n>=maxLines-1)break}else l=t}if(n<maxLines)c.fillText(l,x,y+n*line)}
  function canvas(d){
    const w=560,itemH=58,base=282,h=base+d.products.length*itemH;
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');
    c.fillStyle='#eaf0f8';c.fillRect(0,0,w,h);
    c.shadowColor='rgba(7,23,55,.22)';c.shadowBlur=24;c.shadowOffsetY=10;rr(c,14,14,w-28,h-28,26,'#ffffff');c.shadowColor='transparent';
    const head=c.createLinearGradient(14,14,w-14,112);head.addColorStop(0,'#071a38');head.addColorStop(.62,'#0a4d92');head.addColorStop(1,'#11a8c8');
    c.save();c.beginPath();c.roundRect(14,14,w-28,104,[26,26,0,0]);c.clip();c.fillStyle=head;c.fillRect(14,14,w-28,104);
    c.fillStyle='rgba(255,255,255,.08)';c.beginPath();c.arc(498,18,92,0,Math.PI*2);c.fill();c.restore();
    rr(c,34,34,34,34,11,'rgba(255,255,255,.16)','rgba(255,255,255,.22)');c.fillStyle='#fff';c.font='900 15px Arial';c.textAlign='center';c.fillText('U',51,56);c.textAlign='left';
    c.fillStyle='#fff';c.font='900 18px Arial';c.fillText('UNIGAMES',80,49);c.font='700 7px Arial';c.globalAlpha=.66;c.fillText('PROPOSTA DIGITAL',80,64);c.globalAlpha=1;
    rr(c,402,34,124,34,11,'rgba(4,15,42,.24)','rgba(255,255,255,.20)');c.fillStyle='#c9eaff';c.font='700 7px Arial';c.fillText('CÓDIGO',414,48);c.fillStyle='#fff';c.font='900 12px Arial';c.fillText(d.code,414,61);
    rr(c,30,88,500,74,18,'#ffffff','#e4eaf3');
    rr(c,44,102,42,42,13,'#e8f4ff');c.fillStyle='#0b5ea8';c.font='900 12px Arial';c.textAlign='center';c.fillText(initials(d.name),65,128);c.textAlign='left';
    c.fillStyle='#0a74b8';c.font='900 7px Arial';c.fillText((d.type||'ATENDIMENTO').toUpperCase(),100,105);c.fillStyle='#17243b';c.font='900 15px Arial';wrap(c,(d.name||'NOME DO CLIENTE').toUpperCase(),100,126,300,18,1);c.fillStyle='#738197';c.font='9px Arial';c.fillText(`${d.phone||'Telefone não informado'}  •  ${d.date}`,100,145);
    c.fillStyle='#7b8799';c.font='900 7px Arial';c.fillText(`ITENS DA PROPOSTA  •  ${d.products.length}`,34,184);
    let y=195;
    d.products.forEach(p=>{
      rr(c,30,y,500,48,12,'#f7f9fc','#e8edf4');
      c.fillStyle='#1d2940';c.font='800 10px Arial';wrap(c,p.product||'Produto não informado',42,y+17,315,12,1);
      c.fillStyle='#7a8799';c.font='7px Arial';c.fillText(`${p.quantity} un. × ${money(p.unit)}  •  ${p.paymentLabel||'Pagamento não informado'}`,42,y+34);
      c.fillStyle='#075ea8';c.font='900 11px Arial';c.textAlign='right';c.fillText(money(p.subtotal),516,y+28);c.textAlign='left';y+=itemH;
    });
    const total=c.createLinearGradient(30,y,530,y+52);total.addColorStop(0,'#081d3c');total.addColorStop(.58,'#0b4f8f');total.addColorStop(1,'#0aa2bd');rr(c,30,y,500,52,14,total);
    c.fillStyle='#bcd7ec';c.font='800 7px Arial';c.fillText('VALOR TOTAL',44,y+20);c.fillStyle='#fff';c.font='900 20px Arial';c.textAlign='right';c.fillText(money(d.total),516,y+32);c.textAlign='left';
    y+=65;c.fillStyle='#8793a5';c.font='800 7px Arial';c.fillText('LOJA',34,y+8);c.fillText('CANAL',314,y+8);c.fillStyle='#27344a';c.font='800 9px Arial';c.fillText(d.store||'Não informada',34,y+23);c.fillText(d.channel||'Não informado',314,y+23);
    return cv
  }
  const toBlob=cv=>new Promise(r=>cv.toBlob?r(cv.toBlob(r,'image/png',1)):r(null));
  async function generate(){const d=data();await saveCustomerReport(d,'image');const cv=canvas(d);dataUrl=cv.toDataURL('image/png');blob=await new Promise(r=>cv.toBlob(r,'image/png',1));filename=`atendimento-${d.code}.png`;img.src=dataUrl;dialogMsg.textContent='Imagem gerada. Escolha como salvar.';dialog.showModal();show('Cartão gerado com o novo layout.','success')}
  async function nativeSave(){if(!dataUrl)return;const base64=dataUrl.split(',')[1];dialogMsg.textContent='Enviando imagem para a galeria...';try{
      if(window.Android&&typeof window.Android.saveImageToGallery==='function'){window.Android.saveImageToGallery(dataUrl,filename);dialogMsg.textContent='Solicitação enviada ao aplicativo.';return}
      if(window.Android&&typeof window.Android.saveBase64Image==='function'){window.Android.saveBase64Image(base64,filename);dialogMsg.textContent='Solicitação enviada ao aplicativo.';return}
      if(window.Android&&typeof window.Android.saveImage==='function'){window.Android.saveImage(dataUrl,filename);dialogMsg.textContent='Solicitação enviada ao aplicativo.';return}
      if(window.ReactNativeWebView&&typeof window.ReactNativeWebView.postMessage==='function'){window.ReactNativeWebView.postMessage(JSON.stringify({type:'SAVE_IMAGE_TO_GALLERY',dataUrl,base64,filename,mimeType:'image/png'}));dialogMsg.textContent='Solicitação enviada ao aplicativo.';return}
      dialogMsg.textContent='Ponte Android não encontrada. O APK precisa implementar Android.saveImageToGallery().';
    }catch(e){dialogMsg.textContent='Falha ao enviar a imagem ao Android: '+(e&&e.message?e.message:'erro desconhecido')}}
  window.onAndroidImageSaved=(ok,text)=>{dialogMsg.textContent=text||(ok?'Imagem salva na galeria.':'Falha ao salvar a imagem.')};
  async function share(){if(!blob)return;const f=new File([blob],filename,{type:'image/png'});try{if(navigator.share&&navigator.canShare?.({files:[f]}))await navigator.share({files:[f],title:'Atendimento Unigames'});else await nativeSave()}catch(e){if(e.name!=='AbortError')dialogMsg.textContent='Compartilhamento indisponível neste WebView.'}}
  function open(){if(!dataUrl)return;const w=window.open('','_blank');if(w){w.document.write(`<img src="${dataUrl}" style="width:100%;height:auto">`);w.document.close()}else dialogMsg.textContent='O WebView bloqueou uma nova janela. Use Salvar no aparelho.'}
  async function copy(t){try{await navigator.clipboard.writeText(t)}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}}

  Object.values(fields).forEach(f=>{f.addEventListener('input',update);f.addEventListener('change',update)});fields.phone.oninput=()=>{fields.phone.value=phone(fields.phone.value);update()};$('addCustomerProduct').onclick=()=>addProduct();const newCodeButton=$('newCustomerCode');if(newCodeButton)newCodeButton.onclick=()=>{newCode();show('Novo código gerado.','success')};$('copyCustomerScript').onclick=async()=>{if(!valid())return;const d=data();await saveCustomerReport(d,'script');await copy(script(d));show('Script copiado e relatório salvo.','success')};$('openCustomerWhatsapp').onclick=async()=>{if(valid()){const d=data();await saveCustomerReport(d,'whatsapp');window.open('https://wa.me/?text='+encodeURIComponent(script(d)),'_blank')}};$('generateCustomerImage').onclick=()=>valid()&&generate();$('closeCustomerImageDialog').onclick=()=>dialog.close();$('downloadCustomerImage').onclick=nativeSave;$('shareCustomerImage').onclick=share;$('openCustomerImage').onclick=open;form.addEventListener('reset',()=>setTimeout(()=>{box.innerHTML='';addProduct();newCode();update();show('')},0));fields.date.value=new Date().toISOString().slice(0,10);addProduct();newCode();update();
})();


// Dashboard dos relatórios de clientes
(()=>{
  const $=id=>document.getElementById(id);
  if(!$('customerDashboardTab'))return;
  const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const initials=n=>{const a=String(n||'').trim().split(/\s+/).filter(Boolean);return a.length?(a[0][0]+(a.length>1?a.at(-1)[0]:'')).toUpperCase():'CL'};
  const get=()=>window.UnigamesDB?.getCustomers?.()||[];
  async function remove(id){if(!confirm('Excluir este relatório de cliente?'))return;try{await window.UnigamesDB.deleteCustomer(id);render()}catch(error){window.showAppMessage?.('Não foi possível excluir: '+error.message, 'error')}}
  function render(){
    const all=get();$('customerDashboardBadge').textContent=all.length;$('dashTotalCustomers').textContent=all.length;$('dashTotalValue').textContent=money(all.reduce((s,r)=>s+Number(r.total||0),0));$('dashTotalItems').textContent=all.reduce((s,r)=>s+(r.products||[]).reduce((a,p)=>a+(Number(p.quantity)||0),0),0);const today=new Date().toDateString();$('dashToday').textContent=all.filter(r=>new Date(r.createdAt).toDateString()===today).length;
    const stores={};all.forEach(r=>stores[r.store||'Não informada']=(stores[r.store||'Não informada']||0)+1);const max=Math.max(1,...Object.values(stores));$('dashStoreBars').innerHTML=Object.entries(stores).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([name,val])=>`<div class="dash-store-row"><strong>${esc(name)}</strong><div class="dash-store-track"><div class="dash-store-fill" style="width:${val/max*100}%"></div></div><b>${val}</b></div>`).join('')||'<div class="empty-mini">Sem dados por loja.</div>';
    const pays={};all.flatMap(r=>r.products||[]).forEach(p=>pays[p.payment||'Não informado']=(pays[p.payment||'Não informado']||0)+1);$('dashPaymentList').innerHTML=Object.entries(pays).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,val])=>`<div class="dash-payment-item"><span>${esc(name)}</span><b>${val}</b></div>`).join('')||'<div class="empty-mini">Sem pagamentos registrados.</div>';
    const q=($('customerDashSearch').value||'').toLowerCase();const store=$('customerDashStore').value;const filtered=all.filter(r=>{const text=[r.name,r.code,r.store,...(r.products||[]).map(p=>p.product)].join(' ').toLowerCase();return(!q||text.includes(q))&&(!store||r.store===store)});$('customerReportsEmpty').hidden=filtered.length>0;$('customerReportsList').innerHTML=filtered.map(r=>`<article class="customer-report-card"><div class="customer-report-avatar">${esc(initials(r.name))}</div><div class="customer-report-main"><h4>${esc(r.name||'Cliente não informado')}</h4><p>${esc(r.code)} • ${new Date(r.createdAt).toLocaleString('pt-BR')}</p><div class="customer-report-tags"><span>${esc(r.store||'Sem loja')}</span><span>${(r.products||[]).length} produto(s)</span></div></div><div class="customer-report-value"><strong>${money(r.total)}</strong><small>${esc(r.type||'Atendimento')}</small></div><div class="customer-report-actions"><button type="button" class="copy-customer-report" data-id="${esc(r.id)}" title="Copiar script">⧉</button><button type="button" class="delete-customer-report" data-id="${esc(r.id)}" title="Excluir">⌫</button></div></article>`).join('');
    document.querySelectorAll('.delete-customer-report').forEach(b=>b.onclick=()=>remove(b.dataset.id));document.querySelectorAll('.copy-customer-report').forEach(b=>b.onclick=async()=>{const r=get().find(x=>x.id===b.dataset.id);if(!r)return;const text=[`ATENDIMENTO DIGITAL UNIGAMES`,`Cliente: ${r.name}`,`WhatsApp: ${r.phone}`,`Código: ${r.code}`,'',...(r.products||[]).map(p=>`${p.quantity}x ${p.product} — ${money(p.subtotal)} (${p.paymentLabel||p.payment})`),'',`VALOR TOTAL: ${money(r.total)}`,`Loja: ${r.store}`].join('\n');try{await navigator.clipboard.writeText(text);b.textContent='✓';setTimeout(()=>b.textContent='⧉',1200)}catch{}})
  }
  $('customerDashSearch').addEventListener('input',render);$('customerDashStore').addEventListener('change',render);window.addEventListener('customerReportsUpdated',render);document.querySelector('[data-tab="customerDashboardTab"]')?.addEventListener('click',render);render();
})();


// Atualiza as telas sempre que o banco remoto mudar.
window.addEventListener('unigames:data-updated', () => {
  renderHistory();
  window.dispatchEvent(new CustomEvent('customerReportsUpdated'));
});
window.addEventListener('unigames:authenticated', () => {
  renderHistory();
  window.dispatchEvent(new CustomEvent('customerReportsUpdated'));
});
