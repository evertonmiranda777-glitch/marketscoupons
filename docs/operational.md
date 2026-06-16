# Operacional , Everton (Markets Coupons) , conteúdo da LP /operational

Timeframes: opera no 5min, contexto no Diário / 60min / 15min.

- Diário: EMA 50 + EMA 200
- 60min: EMA 21
- 15min: RSI (50 marcado, F6) + EMA 9 + EMA 21
- 5min (execução): SMA 20 + EMA 9 · RSI 14 (smooth 3, linhas 30/70) · VolumeFilter (2 TES: size filter 4 e size filter 2)
- RSI zonas: abaixo de 30 = SOBREVENDIDO (oversold) · acima de 70 = SOBRECOMPRADO (overbought)  [corrigido]

Setups:
- COMPRA: preço > EMA9, EMA9 > SMA20, RSI > 50% → só compra. Gatilho definitivo = volume (VolumeFilter). Cuidado lateral.
- VENDA: preço < EMA9, EMA9 < SMA20, RSI < 50% → só venda. Gatilho definitivo = volume (VolumeFilter). Cuidado lateral.

Disciplina é o que faz acontecer. Mais indicadores serão liberados aos poucos.
Sempre testar no simulador antes de arriscar.
