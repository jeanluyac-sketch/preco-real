// Histórico de preço por anúncio: um ponto por dia (o menor preço visto no dia).
// Fica em dados/historico.json e é salvo no repositório a cada rodada.

const DIAS_GUARDADOS = 120;
const dia = (d) => d.toISOString().slice(0, 10);
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function registrar(hist, produto, agora) {
  const hoje = dia(agora);
  const h = (hist[produto.id] ||= { pontos: [] });
  Object.assign(h, { titulo: produto.titulo, categoria: produto.categoria, subtipo: produto.subtipo, loja: produto.loja, quantidade: produto.quantidade, link: produto.link, visto: hoje });
  const ult = h.pontos.at(-1);
  if (ult?.d === hoje) {
    if (produto.pu < ult.pu) Object.assign(ult, { pu: produto.pu, preco: produto.preco });
  } else {
    h.pontos.push({ d: hoje, pu: produto.pu, preco: produto.preco });
  }
  h.pontos = h.pontos.filter((p) => diasEntre(p.d, hoje) <= DIAS_GUARDADOS);
}

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Resumo dos dias ANTERIORES a hoje (o preço de hoje não entra na comparação).
export function resumo(h, agora) {
  const hoje = dia(agora);
  const antes = h.pontos.filter((p) => p.d < hoje);
  const em = (n) => antes.filter((p) => diasEntre(p.d, hoje) <= n).map((p) => p.pu);
  const u90 = em(90);
  const u30 = em(30);
  return {
    dias: antes.length,
    mediana90: u90.length ? Math.round(mediana(u90) * 100) / 100 : null,
    minimo30: u30.length ? Math.min(...u30) : null,
  };
}

export function limpar(hist, agora) {
  const hoje = dia(agora);
  for (const [id, h] of Object.entries(hist)) if (diasEntre(h.visto, hoje) > DIAS_GUARDADOS) delete hist[id];
}
