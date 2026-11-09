// Entende o título de um anúncio dentro de um nicho: qual categoria, qual tamanho,
// qual quantidade total e quanto custa por unidade de medida (100 g, kg ou fralda).
// Na dúvida devolve null e o anúncio fica de fora: melhor perder uma oferta do que postar errado.

const LB = 453.592;

export const normal = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const palavra = (t, termos) => termos?.some((w) => new RegExp(`(^|[^a-z0-9])${normal(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(t));

export function categoriaDe(titulo, nicho) {
  const t = normal(titulo);
  if (palavra(t, nicho.excluir)) return null;
  const achadas = nicho.categorias.filter((c) => palavra(t, c.incluir) && (!c.exigir || palavra(t, c.exigir)) && !palavra(t, c.excluir));
  return achadas.length === 1 ? achadas[0] : null; // combos (ex.: whey + creatina) ficam de fora
}

export function subtipoDe(titulo, cat) {
  if (!cat.subtipos?.length) return null;
  const t = normal(titulo);
  return cat.subtipos.find((s) => new RegExp(s.padrao).test(t))?.id ?? null;
}

// Gramas de UMA embalagem. Tamanhos diferentes no mesmo título ("1kg 3kg 10kg")
// indicam anúncio com variações: devolve null.
export function gramas(titulo) {
  const t = normal(titulo).replace(/(\d),(\d)/g, '$1.$2');
  const achados = new Set();
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilos?|quilos?|g|gr|grs|gramas|lbs?|libras?)(?![a-z])/g)) {
    const n = Number(m[1]);
    const u = m[2];
    const g = u.startsWith('k') || u.startsWith('q') ? n * 1000 : u.startsWith('l') ? n * LB : n;
    if (g >= 50 && g <= 30000) achados.add(Math.round(g));
  }
  return achados.size === 1 ? [...achados][0] : null;
}

// Quantidade de itens de UMA embalagem (fraldas, sachês...).
export function itens(titulo) {
  const t = normal(titulo);
  const achados = new Set();
  for (const m of t.matchAll(/(\d{1,3})\s*(?:unidades|unidade|unids?|un|fraldas|tiras)(?![a-z])/g)) achados.add(Number(m[1]));
  for (const m of t.matchAll(/(?:com|c\/)\s*(\d{1,3})(?![\d.,a-z])/g)) achados.add(Number(m[1]));
  const v = [...achados].filter((n) => n >= 4);
  return v.length === 1 ? v[0] : null;
}

// Quantas embalagens vêm no anúncio ("kit 3", "2 pacotes", "2x 300g").
export function embalagens(titulo, medida) {
  const t = normal(titulo);
  const m =
    t.match(/\bkit\s*(?:com\s*)?(\d{1,2})\b(?!\s*(?:un|unidades|fraldas|g|kg))/) ||
    t.match(/\b(\d{1,2})\s*(?:pacotes|pcts?|potes|embalagens|sacos)\b/) ||
    t.match(/\b(\d{1,2})\s*x\s*\d/) ||
    (medida === 'peso' ? t.match(/\b(\d{1,2})\s*(?:unidades|un)\b/) : null);
  const n = m ? Number(m[1]) : 1;
  return n >= 1 && n <= 12 ? n : 1;
}

export function analisar({ titulo, preco }, nicho) {
  if (!(preco > 0)) return null;
  const cat = categoriaDe(titulo, nicho);
  if (!cat) return null;
  const subtipo = subtipoDe(titulo, cat);
  if (cat.exigirSubtipo && !subtipo) return null;
  const porEmbalagem = cat.medida === 'peso' ? gramas(titulo) : itens(titulo);
  if (!porEmbalagem) return null;
  const quantidade = porEmbalagem * embalagens(titulo, cat.medida);
  const pu = Math.round((preco / quantidade) * cat.por * 100) / 100;
  if (pu < cat.faixa[0] || pu > cat.faixa[1]) return null; // valor absurdo = título mal lido
  return { categoria: cat.id, subtipo, quantidade, pu };
}

export function marcaConfiavel(titulo, marcas) {
  if (!marcas?.length) return true;
  const t = normal(titulo);
  return marcas.some((m) => t.includes(normal(m)));
}

// Texto da unidade: "100 g", "kg", "fralda".
export function rotuloUnidade(cat) {
  if (cat.medida === 'unidade') return cat.rotulo || 'unidade';
  return cat.por === 1000 ? 'kg' : `${cat.por} g`;
}

export function rotuloQuantidade(cat, q) {
  if (cat.medida === 'unidade') return `${q} ${cat.rotulo || 'unidade'}${q > 1 ? 's' : ''}`;
  return q >= 1000 ? `${(q / 1000).toLocaleString('pt-BR')} kg` : `${q} g`;
}
