// Página "Produtos dos vídeos": o link da bio dos vídeos curtos.
// Lê videos.json (preenchido pelo canal de vídeos) e, para cada vídeo, mostra as melhores opções
// de hoje na categoria citada, com preço, menor preço já visto, histórico e link de afiliado.
import { reais, esc } from './telegram.js';
import { normal, rotuloUnidade, rotuloQuantidade } from './produto.js';
import { ranking } from './oferta.js';

export function opcoesDoVideo(item, resultados, n = 3) {
  const r = resultados.find((x) => x.nicho.id === item.nicho);
  const cat = r?.nicho.categorias.find((c) => c.id === item.categoria);
  if (!cat) return { cat: null, opcoes: [] };
  const palavras = (item.palavras || []).map(normal);
  const candidatos = r.produtos.filter((p) => p.categoria === cat.id && palavras.every((w) => normal(p.titulo).includes(w)));
  const opcoes = ranking(candidatos, cat.id, n, cat.ranking).map((p) => {
    const h = r.hist[p.id];
    const menor = h?.pontos?.length ? Math.min(...h.pontos.map((x) => x.pu)) : p.pu;
    return { ...p, menor, dias: h?.pontos?.length || 1 };
  });
  return { cat, opcoes };
}

export function montarPaginaVideos({ videos, resultados, css, agora }) {
  const quando = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  const cards = [...videos].sort((a, b) => String(b.data).localeCompare(String(a.data))).map((v) => {
    const blocos = (v.produtos || []).map((item) => {
      const { cat, opcoes } = opcoesDoVideo(item, resultados);
      if (!cat) return '';
      const titulo = `<h3>${esc(item.rotulo || cat.nome)}</h3>`;
      if (!opcoes.length) return `${titulo}<p class="muted">Sem oferta confiável agora. O robô confere de novo em algumas horas.</p>`;
      return titulo + opcoes.map((p) => `<div class="oferta"><a href="${esc(p.link)}" rel="sponsored nofollow"><b>${esc(p.titulo)}</b></a><br>${reais(p.preco)}${cat.medida !== 'item' ? ` · ${reais(p.pu)} por ${rotuloUnidade(cat)}` : ''} · ${rotuloQuantidade(cat, p.quantidade)}<br><span class="muted">${p.pu <= p.menor ? 'Menor preço que já vimos' : `Menor preço em ${p.dias} dias: ${reais(p.menor)}${cat.medida !== 'item' ? ` por ${rotuloUnidade(cat)}` : ''}`}${p.pagina ? ` · <a href="${esc(p.pagina)}">histórico</a>` : ''}</span></div>`).join('');
    }).join('');
    return `<section><h2>${esc(v.titulo)}</h2><p class="muted">${esc(String(v.data || '').split('-').reverse().join('/'))}${v.link ? ` · <a href="${esc(v.link)}">ver o vídeo</a>` : ''}</p>${blocos}</section>`;
  });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Produtos dos vídeos</title><meta name="description" content="Os produtos citados nos vídeos, com o melhor preço de hoje e o histórico de preço."><style>${css}</style></head>
<body><main><h1>Produtos dos vídeos</h1><p class="muted">Para cada vídeo, as opções com melhor preço hoje e o menor preço que o nosso robô já registrou. Atualizado em ${quando}. <a href="index.html">Ver todos os rankings</a></p>
${cards.join('\n') || '<p class="muted">Os produtos aparecem aqui assim que o primeiro vídeo for publicado.</p>'}
<p class="muted" style="margin-top:40px">Os links são de afiliado: podemos ganhar comissão, sem custo extra para você. Preços e estoque mudam rápido; confira na loja antes de comprar.</p></main></body></html>`;
}
