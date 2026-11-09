// Gera a página estática (GitHub Pages) com o ranking de cada nicho, na ordem de prioridade.
import { reais, esc } from './telegram.js';
import { rotuloUnidade, rotuloQuantidade } from './produto.js';

const CSS = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#e4e1d8;--accent:#0b7a4b;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--fg:#eceae4;--muted:#a3a19a;--line:#2f2e2a;--accent:#4cc38a;--card:#1f1f1c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.6rem;margin:0 0 4px}h2{margin:40px 0 4px;font-size:1.3rem}h3{margin:24px 0 8px;font-size:1.05rem}
.muted{color:var(--muted);font-size:.9rem}nav a{margin-right:12px;color:var(--accent)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}
td,th{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:.92rem}th{color:var(--muted);font-weight:600}
td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}a{color:var(--accent)}
th.n{white-space:nowrap}@media (max-width:560px){.tam{display:none}td,th{padding:6px 7px;font-size:.86rem}}
.oferta{background:var(--card);border:1px solid var(--accent);border-radius:8px;padding:10px 12px;margin:8px 0}`;

export function montarPagina({ nichos, agora }) {
  const quando = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  const blocos = nichos.map(({ nicho, rankings, ofertas }) => {
    const ofs = ofertas.length
      ? ofertas.map(({ produto, oferta, cat }) => `<div class="oferta"><b>${esc(cat.nome)}</b>: <a href="${esc(produto.link)}" rel="sponsored nofollow">${esc(produto.titulo)}</a><br>${reais(produto.preco)} · ${reais(produto.pu)} por ${rotuloUnidade(cat)} · ${oferta.queda}% abaixo da média de 90 dias</div>`).join('')
      : '<p class="muted">Nenhuma queda real de preço nesta rodada.</p>';
    const tabelas = rankings.map(({ cat, itens }) => `<h3>${esc(cat.nome)}: mais barato por ${rotuloUnidade(cat)}</h3>
<table><tr><th>Produto</th><th class="tam">Tamanho</th><th class="n">Preço</th><th class="n">Por ${rotuloUnidade(cat).replace(' ', '&nbsp;')}</th></tr>
${itens.map((p) => `<tr><td><a href="${esc(p.link)}" rel="sponsored nofollow">${esc(p.titulo)}</a><div class="muted">${esc(p.loja)} · ${rotuloQuantidade(cat, p.quantidade)}${p.subtipo ? ` · ${esc(p.subtipo)}` : ''}</div></td><td class="tam">${rotuloQuantidade(cat, p.quantidade)}</td><td class="n">${reais(p.preco)}</td><td class="n"><b>${reais(p.pu)}</b></td></tr>`).join('\n')}
</table>`).join('\n');
    return `<section id="${esc(nicho.id)}"><h2>${esc(nicho.nome)}</h2><h3>Ofertas reais agora</h3>${ofs}${tabelas}</section>`;
  });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preço Real</title><meta name="description" content="Ranking de preço por grama, por kg e por fralda, atualizado várias vezes ao dia. Só mostramos queda de preço de verdade."><style>${CSS}</style></head>
<body><main><h1>Preço Real</h1><p class="muted">Comparamos o preço por grama, por kg ou por unidade e guardamos o histórico. "Oferta real" só aparece quando o preço está pelo menos 10% abaixo da média dos últimos 90 dias e é o menor dos últimos 30. Atualizado em ${quando}.</p>
<nav>${nichos.map(({ nicho }) => `<a href="#${esc(nicho.id)}">${esc(nicho.nome)}</a>`).join('')}</nav>
${blocos.join('\n')}
<p class="muted" style="margin-top:40px">Os links são de afiliado: podemos ganhar comissão, sem custo extra para você. Preços e estoque mudam rápido; confira na loja antes de comprar.</p></main></body></html>`;
}
