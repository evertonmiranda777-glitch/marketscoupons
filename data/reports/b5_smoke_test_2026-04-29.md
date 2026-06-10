# B.5, Smoke Test Report (Geocoder helper `fetchAddressByZip`)

**Data:** 2026-04-29
**Commit:** `5d0adf5` (rebased → `5370d4e`)
**Método:** Node v24.14.1 com fetch nativo, lógica do helper extraída literal de `app.js` (paridade 1:1 com prod), executando contra APIs reais de produção (ViaCEP + Zippopotam).
**Runner:** `.tmp/b5_smoke.mjs`
**Status final:** ✅ **APROVADO, 9/9 PASS**

---

## Resultados

| # | Case | Input | Esperado | Obtido | Tempo | Status |
|---|---|---|---|---|---|---|
| 1 | BR válido com hífen | `('01310-100','BR')` | `ok:true`, Av. Paulista, São Paulo, SP | `ok:true, address:"Avenida Paulista", city:"São Paulo", state:"SP", country:"BR", zip:"01310-100"` | 529.7ms | ✅ |
| 2 | BR sem hífen (normalização) | `('01310100','BR')` | Idêntico ao #1 (mesmo cacheKey) | Idêntico ao #1 (cache hit) | 0.0ms | ✅ |
| 3 | BR inexistente | `('99999999','BR')` | `ok:false, error:'zip_not_found'` | `ok:false, error:"zip_not_found", zip:"99999999"` | 385.4ms | ✅ |
| 4 | BR formato inválido (4 dígitos) | `('1234','BR')` | `ok:false, error:'invalid_format'` | `ok:false, error:"invalid_format", zip:"1234"` | 0.0ms (short-circuit pré-fetch) | ✅ |
| 5 | US 90210 (Beverly Hills) | `('90210','US')` | `ok:true`, Beverly Hills, CA | `ok:true, city:"Beverly Hills", state:"CA", state_full:"California", country:"US"` | 112.4ms | ✅ |
| 6 | MX 06600 (CDMX) | `('06600','MX')` | `ok:true`, lugar em CDMX | `ok:true, city:"Juarez", state:"DIF", state_full:"Distrito Federal", country:"MX"` | 23.2ms | ✅ |
| 7 | PT 1100-001 (Lisboa) | `('1100-001','PT')` | `ok:true`, Lisboa | `ok:true, city:"Lisboa", state:"11", state_full:"Lisboa", country:"PT"` | 21.7ms | ✅ |
| 8 | País fake | `('00000','XY')` | `ok:false, error:'zip_not_found'` (Zippopotam 404) | `ok:false, error:"zip_not_found", zip:"00000"` | 19.3ms | ✅ |
| 9 | Cache hit (BR `01310-100` 2ª call) | idem #1 | <5ms | **0.03ms** (Map sync, sem fetch) | 0.03ms | ✅ |

---

## Validações específicas

- **Normalização BR:** `01310-100` e `01310100` resolvem pro mesmo `cacheKey "BR:01310100"`. Caso #2 retornou em 0ms confirmando que o helper deduplica via Map antes de chamar API.
- **Short-circuit pré-fetch:** caso #4 (BR com 4 dígitos) retornou em 0ms, `_normalizeZip` removeu não-dígitos e o branch `if (norm.length !== 8)` cortou antes do fetch. Confirma proteção contra calls inválidas.
- **Fallback Zippopotam:** casos 5/6/7/8 cobriram US, MX, PT e país fake. 4/4 normalizados pro formato unificado.
- **404 → `zip_not_found`:** caso #8 confirmou que Zippopotam 404 mapeia corretamente pro erro semântico.
- **Cache hit <5ms:** target era <5ms; obtido **0.03ms** (167× mais rápido). Pass com folga.

---

## Observações pra B.4 (form integration)

Pontos que o form vai precisar decidir ao consumir o helper:

1. **`state` vs `state_full` pra display:** caso #6 retornou `state:"DIF"` (sigla interna do Zippopotam, não-padrão; comum seria "CMX"/"CDMX"). Caso #7 retornou `state:"11"` (código numérico de distrito de Portugal). Decisão sugerida: **mostrar `state_full` pro user** (sempre legível) e **enviar `state` pra CAPI** (mantém a abreviação que a Meta usa pra hash).
2. **`address` vazio em Zippopotam:** APIs internacionais não retornam logradouro. Form precisa deixar campo `address` editável e pré-preenchido com `''`. User digita rua/número manualmente quando o país não é BR.
3. **Latência 1ª call:** ViaCEP 385-530ms, Zippopotam 19-112ms. Spinner deve aparecer no campo após blur do CEP, esconder quando resolve. Cache subsequente é instantâneo.
4. **Detectar país automaticamente:** form precisa puxar `country` de `window._geo.geo_country` no boot OU do dropdown selecionado. Ambas opções já existem no estado atual.

---

## Conclusão

Helper `fetchAddressByZip` em prod funciona conforme spec. Cobertura: BR (ViaCEP) + 60+ países (Zippopotam). Cache, normalização, error mapping e formato unificado validados. **Pronto pra ser consumido pela Fase B.4.**

**Próximo passo imediato:** segundo commit removendo `window.fetchAddressByZip = ...` (limpar expose global pós-validação).
