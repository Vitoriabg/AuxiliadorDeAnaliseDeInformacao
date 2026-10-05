const btnAnalisar = document.getElementById('btn-analisar');
const btnExemplo = document.getElementById('btn-exemplo');
const inputTexto = document.getElementById('texto-input');
const inputUrl = document.getElementById('url-input'); // Novo campo de URL
const btnTexto = btnAnalisar.querySelector('span');
const areaResultado = document.getElementById('area-resultado');
const divTextoFormatado = document.getElementById('texto-formatado');
const badgeContador = document.getElementById('badge-contador');
const msgErro = document.getElementById('erro');
const histLista = document.getElementById('hist-lista');
const histVazio = document.getElementById('hist-vazio');
const btnLimpar = document.getElementById('btn-limpar');
const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu');

const TEXTO_EXEMPLO = 'O Instituto de Pesquisas divulgou um novo relatório hoje. Segundo os dados, a vacina reduziu as internações em 85%. A população comemorou a notícia nas redes sociais. Especialistas afirmam que o desmatamento na região aumentou 20% no último trimestre. O governo ainda não se pronunciou sobre as medidas que serão tomadas.';

function mostrarErro(mensagem) {
  msgErro.textContent = mensagem;
  msgErro.hidden = !mensagem;
}

// Faz o pedido real ao seu backend (FastAPI)
async function analisarTexto(texto, url) {
  // NOTA: Usando a porta 7860 de acordo com o que apareceu no seu terminal.
  // Se futuramente o servidor arrancar noutra porta (ex: 8000), altere aqui.
  const resposta = await fetch('http://localhost:7860/api/analisar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ texto: texto || null, url: url || null })
  });

  if (!resposta.ok) {
    const erroData = await resposta.json().catch(() => ({}));
    throw new Error(erroData.detail || 'Erro na comunicação com o servidor.');
  }

  const dados = await resposta.json();

  // Transforma o formato recebido do backend no formato esperado pela interface visual
  const resultadosFormatados = dados.sentencas.map(item => {
    // Identifica se a classe gerada pelo modelo representa uma "Claim"
    const nomeClasse = String(item.classe).toLowerCase();
    const eClaim = item.classe === 1 || nomeClasse === 'claim' || nomeClasse === 'verdadeiro' || nomeClasse === 'sim';
    
    return {
      sentenca: item.sentenca_corrigida,
      is_claim: eClaim
    };
  });

  return { resultados: resultadosFormatados, origem: dados.origem };
}

function urlGoogle(sentenca) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(sentenca);
}

function renderizar(resultados) {
  const fragmento = document.createDocumentFragment();
  let totalClaims = 0;

  resultados.forEach(item => {
    if (item.is_claim === true) {
      const link = document.createElement('a');
      link.className = 'claim-grifada';
      link.href = urlGoogle(item.sentenca);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = 'Pesquisar esta afirmação no Google';
      link.textContent = item.sentenca;
      fragmento.append(link);
      totalClaims++;
    } else {
      fragmento.append(item.sentenca);
    }
    fragmento.append(' ');
  });

  divTextoFormatado.replaceChildren(fragmento);
  badgeContador.textContent = totalClaims === 1 ? '1 claim detectada' : `${totalClaims} claims detectadas`;
  areaResultado.classList.add('ativo');
  areaResultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  areaResultado.focus({ preventScroll: true });
}

async function enviar() {
  mostrarErro('');

  const textoValue = inputTexto.value.trim();
  const urlValue = inputUrl ? inputUrl.value.trim() : '';

  if (!textoValue && !urlValue) {
    mostrarErro('Por favor, cole um texto ou um link do Instagram antes de analisar.');
    if (inputUrl) inputUrl.focus();
    else inputTexto.focus();
    return;
  }

  areaResultado.classList.remove('ativo');
  btnTexto.textContent = 'Analisando com IA...';
  btnAnalisar.disabled = true;

  try {
    const dados = await analisarTexto(textoValue, urlValue);
    renderizar(dados.resultados);
    
    const textoParaHistorico = textoValue ? textoValue : `Análise de Link (${dados.origem}): ${urlValue}`;
    adicionarAoHistorico(textoParaHistorico, dados.resultados);
  } catch (erro) {
    console.error(erro);
    mostrarErro(erro.message);
  } finally {
    btnTexto.textContent = 'Analisar Texto';
    btnAnalisar.disabled = false;
  }
}

btnAnalisar.addEventListener('click', enviar);
btnExemplo.addEventListener('click', () => {
  inputTexto.value = TEXTO_EXEMPLO;
  if(inputUrl) inputUrl.value = '';
  mostrarErro('');
  inputTexto.focus();
});

// ==========================================
// Histórico (salvo no navegador)
// ==========================================
const CHAVE_HISTORICO = 'historico-claims';
const MAX_HISTORICO = 20;

function lerHistorico() {
  try { return JSON.parse(localStorage.getItem(CHAVE_HISTORICO)) || []; }
  catch { return []; }
}

function salvarHistorico(lista) {
  try { localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista)); }
  catch (erro) { console.error(erro); }
}

function adicionarAoHistorico(texto, resultados) {
  const total = resultados.filter(r => r.is_claim === true).length;
  const lista = lerHistorico();
  lista.unshift({ id: Date.now(), data: new Date().toISOString(), texto, resultados, total });
  salvarHistorico(lista.slice(0, MAX_HISTORICO));
  renderizarHistorico();
}

function renderizarHistorico() {
  const lista = lerHistorico();
  histVazio.hidden = lista.length > 0;
  btnLimpar.hidden = lista.length === 0;

  histLista.replaceChildren(...lista.map(item => {
    const li = document.createElement('li');
    li.className = 'hist-item';
    li.dataset.id = item.id;

    const abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'hist-abrir';

    const meta = document.createElement('span');
    meta.className = 'hist-meta';
    const data = document.createElement('time');
    data.dateTime = item.data;
    data.textContent = new Date(item.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.total === 1 ? '1 claim' : `${item.total} claims`;
    meta.append(data, badge);

    const trecho = document.createElement('span');
    trecho.className = 'hist-trecho';
    trecho.textContent = item.texto;

    abrir.append(meta, trecho);
    abrir.setAttribute('aria-label', `Abrir análise de ${data.textContent}`);

    const excluir = document.createElement('button');
    excluir.type = 'button';
    excluir.className = 'hist-del';
    excluir.textContent = '×';
    excluir.setAttribute('aria-label', `Excluir análise de ${data.textContent}`);

    li.append(abrir, excluir);
    return li;
  }));
}

histLista.addEventListener('click', e => {
  const li = e.target.closest('.hist-item');
  if (!li) return;
  const lista = lerHistorico();
  const item = lista.find(i => String(i.id) === li.dataset.id);
  if (!item) return;

  if (e.target.closest('.hist-del')) {
    salvarHistorico(lista.filter(i => i !== item));
    renderizarHistorico();
  } else if (e.target.closest('.hist-abrir')) {
    // Quando abre do histórico, coloca apenas o texto no inputTexto (para limpar o campo link)
    inputTexto.value = item.texto;
    if(inputUrl) inputUrl.value = '';
    mostrarErro('');
    renderizar(item.resultados);
    document.getElementById('analisador').scrollIntoView({ behavior: 'smooth' });
  }
});

btnLimpar.addEventListener('click', () => {
  if (confirm('Apagar todo o histórico de análises?')) {
    salvarHistorico([]);
    renderizarHistorico();
  }
});

renderizarHistorico();

// ==========================================
// Menu mobile
// ==========================================
function alternarMenu(aberto) {
  menu.classList.toggle('aberto', aberto);
  menuBtn.setAttribute('aria-expanded', String(aberto));
  menuBtn.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
}
menuBtn.addEventListener('click', () => alternarMenu(!menu.classList.contains('aberto')));
menu.addEventListener('click', e => { if (e.target.closest('a')) alternarMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') alternarMenu(false); });