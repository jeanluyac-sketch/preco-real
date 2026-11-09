// Métricas diárias para o painel semanal: uma linha por nicho por dia em dados/metricas.csv.
// Colunas vazias = ainda sem fonte (cliques e comissão entram quando a Shopee estiver ligada).
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

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

// Data no horário de Brasília (AAAA-MM-DD).
export const dataBrasilia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);

// Formato longo do painel semanal (claude-tarefas/painel/METRICAS.md): metricas.csv na raiz,
// só acrescenta linhas; numa mesma data vale a última linha de cada métrica+ref,
// por isso "posts" grava o total do dia até agora (lido do resumo diário).
export function acrescentarPainel(arq, resumoArq, data, nichos) {
  const diario = readFileSync(resumoArq, 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
  const linhas = [];
  for (const nicho of nichos) {
    const r = diario.find((c) => c[0] === data && c[1] === nicho);
    if (!r) continue;
    const [, , anuncios, ofertas, posts, inscritos, cliques, comissao] = r;
    linhas.push(`${data},anuncios_validos,${anuncios},${nicho}`, `${data},ofertas_reais,${ofertas},${nicho}`, `${data},posts,${posts},${nicho}`);
    if (inscritos !== '') linhas.push(`${data},inscritos,${inscritos},${nicho}`);
    if (cliques) linhas.push(`${data},cliques,${cliques},${nicho}`);
    if (comissao) linhas.push(`${data},comissao_brl,${comissao},${nicho}`);
  }
  if (!existsSync(arq)) writeFileSync(arq, 'data,metrica,valor,ref\n');
  if (linhas.length) appendFileSync(arq, linhas.join('\n') + '\n');
}
