// Rodada completa: para cada nicho (em ordem de prioridade) coleta preços, atualiza o histórico,
// acha quedas reais, posta no canal do nicho e regera a página.
// Cada nicho roda isolado: se um falhar, os outros seguem.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { analisar, marcaConfiavel } from './produto.js';
import { registrar, limpar } from './historico.js';
import { ehOfertaReal, escolherPosts, ranking } from './oferta.js';
import { montarPost, criarTelegram } from './telegram.js';
import { montarPagina } from './pagina.js';
import { criarShopee } from './shopee.js';

const lerJson = (p, padrao) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : padrao);
const REGRA = { diasMinimosDeHistorico: 7, quedaMinima: 0.1, naoRepetirPorDias: 7 };

export function carregarNichos(dir = 'nichos') {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
    .filter((n) => n.ativo !== false)
    .sort((a, b) => a.prioridade - b.prioridade);
}

export async function rodarNicho({ nicho, fontes, telegram, env, dadosDir, agora, log, filtroLoja }) {
  const histArq = `${dadosDir}/${nicho.id}-historico.json`;
  const postArq = `${dadosDir}/${nicho.id}-postados.json`;
  const hist = lerJson(histArq, {});
  const postados = lerJson(postArq, {});

  // 1. Coleta em todas as fontes e categorias
  const porId = new Map();
  for (const cat of nicho.categorias) {
    for (const termo of cat.busca) {
      for (const fonte of fontes) {
        try {
          for (const bruto of await fonte.buscar(termo, 2)) {
            if (porId.has(bruto.id) || !filtroLoja(bruto) || !marcaConfiavel(bruto.titulo, nicho.marcasConfiaveis)) continue;
            const a = analisar(bruto, nicho);
            if (a) porId.set(bruto.id, { ...bruto, ...a });
          }
        } catch (e) {
          log(`[${nicho.id}] falha em "${termo}": ${e.message}`);
        }
      }
    }
  }
  const produtos = [...porId.values()];
  log(`[${nicho.id}] ${produtos.length} anúncios válidos`);

  // 2. Compara com o histórico ANTES de registrar o preço de hoje
  const cats = Object.fromEntries(nicho.categorias.map((c) => [c.id, c]));
  const candidatos = [];
  for (const p of produtos) {
    const oferta = hist[p.id] ? ehOfertaReal(p, hist[p.id], agora, REGRA) : null;
    if (oferta) candidatos.push({ produto: p, oferta, cat: cats[p.categoria] });
  }
  for (const p of produtos) registrar(hist, p, agora);
  limpar(hist, agora);

  // 3. Posta as melhores quedas (limite por nicho = hierarquia)
  const escolhidos = escolherPosts(candidatos, postados, agora, { ...REGRA, postsPorRodada: nicho.postsPorRodada });
  const canal = env[nicho.canalTelegram];
  for (const c of escolhidos) {
    if (!telegram || !canal) {
      log(`[${nicho.id}] (sem Telegram configurado) post seria:\n${montarPost(c)}`);
      continue;
    }
    try {
      await telegram.enviar(canal, montarPost(c));
      postados[c.produto.id] = agora.toISOString();
    } catch (e) {
      log(`[${nicho.id}] Telegram falhou: ${e.message}`);
    }
  }

  writeFileSync(histArq, JSON.stringify(hist));
  writeFileSync(postArq, JSON.stringify(postados, null, 1));
  return {
    nicho,
    ofertas: candidatos.sort((a, b) => b.oferta.queda - a.oferta.queda).slice(0, 6),
    rankings: nicho.categorias.map((cat) => ({ cat, itens: ranking(produtos, cat.id, 10) })),
  };
}

export async function rodar({
  nichosDir = 'nichos',
  dadosDir = 'dados',
  siteDir = 'site',
  env = process.env,
  fontes,
  telegram,
  agora = new Date(),
  log = console.log,
} = {}) {
  if (!fontes) {
    fontes = [];
    if (env.SHOPEE_APP_ID && env.SHOPEE_SECRET) fontes.push(criarShopee({ appId: env.SHOPEE_APP_ID, segredo: env.SHOPEE_SECRET, log }));
    if (!fontes.length) log('AVISO: nenhuma fonte configurada (faltam os secrets SHOPEE_APP_ID e SHOPEE_SECRET). Rodando sem coletar.');
  }
  if (telegram === undefined) telegram = env.TELEGRAM_TOKEN ? criarTelegram({ token: env.TELEGRAM_TOKEN }) : null;

  const nota = Number(env.NOTA_MINIMA || 4.5);
  const vendas = Number(env.VENDAS_MINIMAS || 50);
  const filtroLoja = (b) => b.loja !== 'Shopee' || (b.nota >= nota && b.vendas >= vendas);

  mkdirSync(dadosDir, { recursive: true });
  mkdirSync(siteDir, { recursive: true });
  const resultados = [];
  for (const nicho of carregarNichos(nichosDir)) {
    try {
      resultados.push(await rodarNicho({ nicho, fontes, telegram, env, dadosDir, agora, log, filtroLoja }));
    } catch (e) {
      log(`[${nicho.id}] rodada falhou: ${e.stack || e.message}`);
    }
  }
  writeFileSync(`${siteDir}/index.html`, montarPagina({ nichos: resultados, agora }));
  return resultados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rodar().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
