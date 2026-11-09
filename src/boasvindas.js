// Mensagem fixa de apresentação de cada canal. Serve também como teste de envio.
import { carregarNichos } from './rodar.js';
import { criarTelegram, esc } from './telegram.js';
import { rotuloUnidade } from './produto.js';

export function textoBoasVindas(nicho, site) {
  const cats = nicho.categorias.map((c) => `• ${esc(c.nome)}: preço por ${rotuloUnidade(c)}`).join('\n');
  return [
    `👋 <b>Preço Real ${esc(nicho.nome)}</b>`,
    '',
    'Aqui só aparece queda de preço de verdade. Um robô acompanha os preços várias vezes por dia e só posta quando o preço está pelo menos 10% abaixo da média dos últimos 90 dias e é o menor dos últimos 30. Nada de "promoção" que subiu antes de baixar.',
    '',
    cats,
    '',
    `📊 Ranking completo, atualizado o dia todo: ${esc(site)}#${esc(nicho.id)}`,
    '',
    `<i>No máximo ${nicho.postsPorRodada} posts por rodada. Os links são de afiliado: podemos ganhar comissão, sem custo extra para você.</i>`,
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  const site = env.SITE_URL || 'https://jeanluyac-sketch.github.io/preco-real/';
  const tg = criarTelegram({ token: env.TELEGRAM_TOKEN });
  let falhas = 0;
  for (const n of carregarNichos('nichos')) {
    const canal = env[n.canalTelegram];
    if (!canal) { console.log(`[${n.id}] sem canal configurado`); falhas++; continue; }
    try { await tg.enviar(canal, textoBoasVindas(n, site)); console.log(`[${n.id}] enviado para ${canal}`); }
    catch (e) { console.log(`[${n.id}] FALHOU: ${e.message}`); falhas++; }
  }
  process.exit(falhas ? 1 : 0);
}
