// Uma página por produto com o gráfico do histórico de preço por unidade (feita para busca no Google),
// mais o sitemap.xml. Só entra produto com histórico suficiente e visto recentemente.
import { reais, esc } from './telegram.js';
import { normal, rotuloUnidade, rotuloQuantidade } from './produto.js';

export const MIN_DIAS_PAGINA = 3;
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function slug(id, h) {
  let base = normal(h.titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (base.length > 70) base = base.slice(0, 70).replace(/-[^-]*$/, ''); // corta na última palavra inteira
  return `${base}-${id.split(':').pop()}`;
}

export function grafico(pontos, un) {
  const W = 640, H = 220, P = { l: 56, r: 12, t: 12, b: 28 };
  const ys = pontos.map((p) => p.pu);
  const min = Math.min(...ys), max = Math.max(...ys);
  const pad = (max - min) * 0.15 || max * 0.05;
  const y0 = min - pad, y1 = max + pad;
  const t0 = Date.parse(pontos[0].d), t1 = Date.parse(pontos.at(-1).d) || t0 + 1;
  const x = (d) => P.l + ((Date.parse(d) - t0) / Math.max(t1 - t0, 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const linha = pontos.map((p) => `${x(p.d).toFixed(1)},${y(p.pu).toFixed(1)}`).join(' ');
  const ticks = [y0 + (y1 - y0) * 0.2, (y0 + y1) / 2, y1 - (y1 - y0) * 0.2];
  const dataBr = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Histórico do preço por ${esc(un)}" style="width:100%;height:auto">
${ticks.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--line)"/><text x="${P.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)">${reais(v)}</text>`).join('\n')}
<polyline points="${linha}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
${pontos.length <= 40 ? pontos.map((p) => `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.pu).toFixed(1)}" r="3" fill="var(--accent)"><title>${dataBr(p.d)}: ${reais(p.pu)}</title></circle>`).join('') : ''}
<text x="${P.l}" y="${H - 8}" font-size="11" fill="var(--muted)">${dataBr(pontos[0].d)}</text><text x="${W - P.r}" y="${H - 8}" text-anchor="end" font-size="11" fill="var(--muted)">${dataBr(pontos.at(-1).d)}</text>
</svg>`;
}

export function paginaProduto({ id, h, cat, nicho, css, site }) {
  const un = rotuloUnidade(cat);
  const tam = rotuloQuantidade(cat, h.quantidade);
  const atual = h.pontos.at(-1);
  const pus = h.pontos.map((p) => p.pu);
  const menor = h.pontos.reduce((a, b) => (b.pu < a.pu ? b : a));
  const media = pus.reduce((a, b) => a + b, 0) / pus.length;
  const titulo = `${h.titulo}: histórico de preço por ${un}`;
  const desc = `Preço de ${h.titulo} (${tam}) nos últimos ${h.pontos.length} dias: hoje ${reais(atual.pu)} por ${un}, menor ${reais(menor.pu)}, média ${reais(media)}.`;
  const url = `${site}p/${slug(id, h)}.html`;
  const veredito = atual.pu <= menor.pu ? 'Está no menor preço que já registramos.' : atual.pu < media * 0.95 ? 'Está abaixo da média do período.' : atual.pu > media * 1.05 ? 'Está acima da média: talvez valha esperar.' : 'Está perto da média do período.';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}"><style>${css}</style>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: h.titulo, offers: { '@type': 'Offer', price: atual.preco.toFixed(2), priceCurrency: 'BRL', url: h.link } }).replace(/</g, '\\u003c')}</script></head>
<body><main><p class="muted"><a href="../index.html#${esc(nicho.id)}">← Preço Real ${esc(nicho.nome)}</a></p>
<h1>${esc(h.titulo)}</h1><p class="muted">${esc(cat.nome)}${h.subtipo ? ` · ${esc(h.subtipo)}` : ''} · ${tam} · ${esc(h.loja)}</p>
<p><b>${reais(atual.preco)}</b> hoje, ou <b>${reais(atual.pu)} por ${un}</b>. ${veredito}</p>
${grafico(h.pontos, un)}
<table><tr><th>Menor preço</th><th>Média</th><th>Dias acompanhados</th></tr><tr><td>${reais(menor.pu)} por ${un} (${menor.d.split('-').reverse().join('/')})</td><td>${reais(media)} por ${un}</td><td>${h.pontos.length}</td></tr></table>
<p><a href="${esc(h.link)}" rel="sponsored nofollow">Ver na ${esc(h.loja)} →</a></p>
<p class="muted">Preço por ${un} calculado a partir do título do anúncio; registramos o menor preço de cada dia. Link de afiliado: podemos ganhar comissão, sem custo extra para você.</p></main></body></html>`;
}

// Quais produtos ganham página: vistos nos últimos 7 dias e com histórico mínimo.
export function produtosComPagina(hist, agora) {
  const hoje = agora.toISOString().slice(0, 10);
  return Object.entries(hist).filter(([, h]) => h.pontos.length >= MIN_DIAS_PAGINA && diasEntre(h.visto, hoje) <= 7);
}

export function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
