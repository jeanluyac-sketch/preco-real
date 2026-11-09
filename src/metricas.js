// Métricas diárias para o painel semanal: uma linha por nicho por dia em dados/metricas.csv.
// Colunas vazias = ainda sem fonte (cliques e comissão entram quando a Shopee estiver ligada).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const COLUNAS = ['data', 'nicho', 'anuncios', 'ofertas', 'posts', 'inscritos', 'cliques', 'comissao'];

export function atualizarMetricas(arq, linhas) {
  const existentes = existsSync(arq) ? readFileSync(arq, 'utf8').trim().split('\n').slice(1).filter(Boolean) : [];
  const mapa = new Map(existentes.map((l) => [l.split(',').slice(0, 2).join(','), l.split(',')]));
  for (const l of linhas) {
    const chave = `${l.data},${l.nicho}`;
    const antiga = mapa.get(chave);
    // Ao longo do dia: soma posts, mantém o maior número de anúncios/ofertas, guarda o último valor conhecido do resto.
    const novo = COLUNAS.map((c, i) => {
      const v = l[c];
      const a = antiga?.[i];
      if (c === 'posts') return String(Number(a || 0) + Number(v || 0));
      if (c === 'anuncios' || c === 'ofertas') return String(Math.max(Number(a || 0), Number(v || 0)));
      return v === undefined || v === null || v === '' ? a ?? '' : String(v);
    });
    mapa.set(chave, novo);
  }
  const corpo = [...mapa.values()].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1])).map((r) => r.join(','));
  writeFileSync(arq, [COLUNAS.join(','), ...corpo].join('\n') + '\n');
}
