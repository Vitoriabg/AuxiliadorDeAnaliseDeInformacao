const btnAnalisar = document.getElementById('btn-analisar');
const btnExemplo = document.getElementById('btn-exemplo');
const inputTexto = document.getElementById('texto-input');
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

// Substituir por chamada real à API quando disponível
async function analisarTexto(texto) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    resultados: [
      { sentenca: 'O Instituto de Pesquisas divulgou um novo relatório hoje.', is_claim: false },
      { sentenca: 'Segundo os dados, a vacina reduziu as internações em 85%.', is_claim: true },
      { sentenca: 'A população comemorou a notícia nas redes sociais.', is_claim: false },
      { sentenca: 'Especialistas afirmam que o desmatamento na região aumentou 20% no último trimestre.', is_claim: true },
      { sentenca: 'O governo ainda não se pronunciou sobre as medidas que serão tomadas.', is_claim: false }
    ]
  };
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

  if (!inputTexto.value.trim()) {
    mostrarErro('Por favor, cole um texto antes de analisar.');
    inputTexto.focus();
    return;
  }

  areaResultado.classList.remove('ativo');
  btnTexto.textContent = 'Analisando com IA...';
  btnAnalisar.disabled = true;

  try {
    const dados = await analisarTexto(inputTexto.value);
    renderizar(dados.resultados);
    adicionarAoHistorico(inputTexto.value, dados.resultados);
  } catch (erro) {
    console.error(erro);
    mostrarErro('Não foi possível processar o texto. Tente novamente.');
  } finally {
    btnTexto.textContent = 'Analisar Texto';
    btnAnalisar.disabled = false;
  }
}

btnAnalisar.addEventListener('click', enviar);
btnExemplo.addEventListener('click', () => {
  inputTexto.value = TEXTO_EXEMPLO;
  mostrarErro('');
  inputTexto.focus();
});

// Histórico (salvo no navegador)
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
    inputTexto.value = item.texto;
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

// Menu mobile
function alternarMenu(aberto) {
  menu.classList.toggle('aberto', aberto);
  menuBtn.setAttribute('aria-expanded', String(aberto));
  menuBtn.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
}
menuBtn.addEventListener('click', () => alternarMenu(!menu.classList.contains('aberto')));
menu.addEventListener('click', e => { if (e.target.closest('a')) alternarMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') alternarMenu(false); });