// A regra que separa "oferta de verdade" de "desconto de mentira".
import { resumo } from './historico.js';

export function ehOfertaReal(produto, h, agora, regra) {
  const r = resumo(h, agora);
  if (r.dias < regra.diasMinimosDeHistorico) return null;
  if (r.mediana90 == null || r.minimo30 == null) return null;
  const queda = 1 - produto.pu / r.mediana90;
  if (queda < regra.quedaMinima) return null; // pelo menos X% abaixo do preço normal
  if (produto.pu > r.minimo30) return null; // e o menor preço dos últimos 30 dias
  return { ...r, queda: Math.round(queda * 100) };
}

// Escolhe o que postar: maiores quedas primeiro, sem repetir o mesmo anúncio em poucos dias.
export function escolherPosts(candidatos, postados, agora, regra) {
  const limite = agora.getTime() - regra.naoRepetirPorDias * 86400000;
  return candidatos
    .filter((c) => !postados[c.produto.id] || Date.parse(postados[c.produto.id]) < limite)
    .sort((a, b) => b.oferta.queda - a.oferta.queda)
    .slice(0, regra.postsPorRodada);
}

// Ranking do dia: os mais baratos por unidade de medida de cada categoria, um anúncio por vendedor.
export function ranking(produtos, categoria, n = 10) {
  const vistos = new Set();
  return produtos
    .filter((p) => p.categoria === categoria)
    .sort((a, b) => a.pu - b.pu)
    .filter((p) => {
      const chave = `${p.loja}|${p.vendedor}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .slice(0, n);
}
