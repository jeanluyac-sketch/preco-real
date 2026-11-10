# Preço Real (radar de preço em 3 nichos)

Robô que acompanha preços de **suplementos** (creatina e whey), **pet** (ração e areia) e **fraldas**, calcula o preço por 100 g, por kg ou por fralda, guarda o histórico e só publica quando a queda é real: pelo menos 10% abaixo da média de 90 dias e o menor preço dos últimos 30 dias. Cada post leva link de afiliado.

- `nichos/*.json`: um arquivo por nicho. O número no nome e o campo `prioridade` definem a ordem; `postsPorRodada` define quanto espaço cada nicho tem. Para criar um nicho novo, copie um arquivo e troque os termos.
- `src/`: coleta (Shopee), leitura do título, histórico, regra de oferta, Telegram e página.
- `dados/`: histórico salvo no próprio repositório a cada rodada.
- Roda 4 vezes por dia no GitHub Actions (`.github/workflows/rodada.yml`) e publica a página no GitHub Pages.

Testes: `npm test`. Rodada local: `SHOPEE_APP_ID=... SHOPEE_SECRET=... npm run rodar` (sem Telegram, só mostra os posts no terminal).

## Produtos dos vídeos (`videos.json`)
O canal de vídeos acrescenta uma entrada por vídeo publicado; a página `videos.html` é regerada a cada rodada.
```json
[
  {
    "id": "014-gato-agua",
    "titulo": "Por que gatos preferem água corrente",
    "data": "2026-11-12",
    "link": "https://youtube.com/shorts/...",
    "produtos": [
      { "nicho": "pet", "categoria": "fonte-agua", "rotulo": "Fonte de água", "palavras": ["inox"] }
    ]
  }
]
```
`categoria` é um `id` de `nichos/*.json` (pet: racao-caes, racao-gatos, areia-gatos, petisco, fonte-agua, arranhador, brinquedo). `palavras` (opcional) filtra anúncios que tenham todas essas palavras no título; `rotulo` (opcional) é o título do bloco.
