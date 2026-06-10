# B.4, Proposta de Diff: Form de Signup Expandido

**Data:** 2026-04-29
**Fase:** B.4 (Fix #1.6, Match Quality CAPI series)
**Status:** PROPOSTA, aguardando OK do user antes de aplicar.

---

## 1. Auditoria do form atual (`index.html:3262-3299`)

**Estrutura existente (10 campos visíveis):**
- Botão Google OAuth
- Divisor "ou cadastre-se com e-mail"
- Nome completo (1 campo único, não separa first/last/nickname)
- Email
- Senha
- Telefone (placeholder `+55 11 99999-9999`, sem validação por país)
- Cidade + Estado (row, ambos `<input>` texto livre)
- País, `<select>` com **labels em português** (`value="Brasil"`, `value="Estados Unidos"`, ...), ❌ **incompatível com helper B.5** que espera ISO-2 (`BR`, `US`)
- Botão "Criar Conta"
- Switch login + footer privacy/terms

**Campos faltando (B.1 já provisionou colunas no DB, mas form não coleta):**
- ❌ first_name
- ❌ last_name
- ❌ nickname
- ❌ birthday
- ❌ address
- ❌ zip
- ❌ checkbox terms_accepted

**Lógica JS atual (`app.js:6295-6342` doAuthSignup):**
- Lê `name/email/pass/phone/city/state/country` do form
- Valida só `name+email+pass` obrigatórios e senha ≥6 chars
- Chama `validateEmailMx` (B.3.2.1) ✅ já conectado
- Submete `signUp` com `data: { full_name, phone, city, state, country }` em `raw_user_meta_data`
- Trigger `handle_new_user` (B.1/B.3.3) já espera os 14 campos novos, falta o form mandar

**Helpers já disponíveis:**
- `validatePhone(raw)`, só conta dígitos (7-15), não valida E.164 nem por país
- `_phoneMinDigits`, map de `+55 → 10, +1 → 10, ...` já definido
- `_emailFormatRe`, regex format
- `validateEmailMx`, server validation
- `fetchAddressByZip(zip, country)`, B.5, espera `country` ISO-2
- `_geo.geo_country`, country code ISO-2 do IP (ipinfo)

---

## 2. Mudanças propostas

### 2.1 HTML do form (`index.html:3262-3299` rewrite)

```html
<!-- SIGNUP FORM (B.4, expandido) -->
<div class="auth-form" id="auth-signup-form" style="display:none;">
  <div class="auth-form-title" data-i18n="signup_titulo_new">Criar Conta</div>
  <div class="auth-sub" data-i18n="signup_subtitulo">Desbloqueie oportunidades ilimitadas no trading.</div>

  <div class="auth-error" id="signup-error"></div>
  <div class="auth-success" id="signup-success"></div>

  <button class="auth-google-btn" onclick="doGoogleAuth()">
   <svg ...>...</svg><span data-i18n="auth_google_signup">Cadastrar com Google</span>
  </button>
  <div class="auth-divider" data-i18n="auth_ou_email">ou cadastre-se com e-mail</div>

  <!-- Header copy (NOVO) -->
  <div class="auth-required-note" data-i18n="signup_dados_reais">
    Para participar das promoções e sorteios precisamos dos seus dados reais e seu melhor email.
  </div>

  <!-- 1. Nome + Sobrenome -->
  <div class="auth-row">
    <div class="auth-field"><label data-i18n="signup_first_name">Nome</label><input type="text" id="auth-signup-first" placeholder="João"></div>
    <div class="auth-field"><label data-i18n="signup_last_name">Sobrenome</label><input type="text" id="auth-signup-last" placeholder="Silva"></div>
  </div>

  <!-- 2. Apelido -->
  <div class="auth-field">
    <label data-i18n="signup_nickname">Apelido</label>
    <input type="text" id="auth-signup-nickname" placeholder="jaozin">
  </div>

  <!-- 3. Email -->
  <div class="auth-field"><label data-i18n="signup_email">E-mail</label><input type="email" id="auth-signup-email" placeholder="email@example.com"></div>

  <!-- 4. Senha -->
  <div class="auth-field">
    <label data-i18n="signup_senha">Senha (mín. 6 caracteres)</label>
    <div class="auth-field-pw"><input type="password" id="auth-signup-pass" placeholder="••••••••"><button class="auth-pw-toggle" ...></button></div>
  </div>

  <!-- 5. Telefone -->
  <div class="auth-field">
    <label data-i18n="signup_telefone">Telefone</label>
    <input type="tel" id="auth-signup-phone" placeholder="+55 11 99999-9999">
  </div>

  <!-- 6. Data de nascimento -->
  <div class="auth-field">
    <label data-i18n="signup_birthday">Data de nascimento</label>
    <input type="date" id="auth-signup-birthday" max="2008-01-01">
  </div>

  <!-- 7. País (DROPDOWN ISO-2, não mais labels em PT) -->
  <div class="auth-field">
    <label data-i18n="signup_pais">País</label>
    <select id="auth-signup-country" onchange="onCountryChange()">
      <option value="BR">Brasil</option>
      <option value="US">United States</option>
      <option value="PT">Portugal</option>
      <option value="ES">España</option>
      <option value="MX">México</option>
      <option value="AR">Argentina</option>
      <option value="CO">Colombia</option>
      <option value="CL">Chile</option>
      <option value="PE">Perú</option>
      <option value="UY">Uruguay</option>
      <option value="PY">Paraguay</option>
      <option value="VE">Venezuela</option>
      <option value="EC">Ecuador</option>
      <option value="BO">Bolivia</option>
      <option value="CA">Canada</option>
      <option value="GB">United Kingdom</option>
      <option value="DE">Deutschland</option>
      <option value="FR">France</option>
      <option value="IT">Italia</option>
      <option value="NL">Nederland</option>
      <option value="BE">België</option>
      <option value="CH">Schweiz</option>
      <option value="AT">Österreich</option>
      <option value="AU">Australia</option>
      <option value="JP">日本</option>
      <option value="OTHER" data-i18n="country_other">Outro</option>
    </select>
  </div>

  <!-- 8. CEP/ZIP (auto-preenche endereço/cidade/estado via B.5 helper) -->
  <div class="auth-field">
    <label data-i18n="signup_zip">CEP</label>
    <div style="position:relative;">
      <input type="text" id="auth-signup-zip" placeholder="00000-000" onblur="onZipBlur()">
      <div id="auth-signup-zip-spin" class="auth-zip-spin" style="display:none;"></div>
    </div>
    <div class="auth-zip-msg" id="auth-signup-zip-msg" style="display:none;"></div>
  </div>

  <!-- 9. Endereço -->
  <div class="auth-field"><label data-i18n="signup_address">Endereço</label><input type="text" id="auth-signup-address" placeholder="Rua, número"></div>

  <!-- 10. Cidade + 11. Estado (estado: select dinâmico BR/US, input outros) -->
  <div class="auth-row">
    <div class="auth-field"><label data-i18n="signup_cidade">Cidade</label><input type="text" id="auth-signup-city" placeholder="Sua cidade"></div>
    <div class="auth-field" id="auth-signup-state-wrap">
      <label data-i18n="signup_estado">Estado</label>
      <input type="text" id="auth-signup-state" placeholder="UF">
    </div>
  </div>

  <!-- 12. Checkbox termos (OBRIGATÓRIO) -->
  <div class="auth-terms">
    <label class="auth-terms-row">
      <input type="checkbox" id="auth-signup-terms">
      <span data-i18n="signup_terms_label">Li e aceito a <a href="/privacy" target="_blank">Política de Privacidade</a> e os <a href="/terms" target="_blank">Termos de Uso</a></span>
    </label>
  </div>

  <button class="auth-btn" id="signup-btn" onclick="doAuthSignup()" data-i18n="signup_criar">Criar Conta</button>
  <div class="auth-switch">...</div>
  <div class="auth-footer">...</div>
</div>
```

### 2.2 CSS adições (no bloco `<style>` global)

```css
.auth-required-note{font-size:13px;color:var(--t2);background:rgba(240,180,41,.06);border:1px solid rgba(240,180,41,.18);border-radius:10px;padding:11px 14px;margin-bottom:18px;line-height:1.45;}
.auth-zip-spin{position:absolute;right:14px;top:50%;transform:translateY(-50%);width:14px;height:14px;border:2px solid var(--t3);border-top-color:transparent;border-radius:50%;animation:cemSpin 1s linear infinite;}
.auth-zip-msg{font-size:12px;color:var(--t3);margin-top:6px;}
.auth-zip-msg.error{color:var(--red);}
.auth-zip-msg.ok{color:var(--green);}
.auth-terms{margin:14px 0 6px;}
.auth-terms-row{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--t2);line-height:1.45;cursor:pointer;}
.auth-terms-row input[type=checkbox]{margin-top:2px;flex-shrink:0;width:16px;height:16px;accent-color:var(--gold);cursor:pointer;}
.auth-terms-row a{color:var(--gold);text-decoration:none;}
.auth-terms-row a:hover{text-decoration:underline;}
```

### 2.3 JS, novas funções e revisão de `doAuthSignup`

**Inserir em `app.js` (próximo a `validateEmailMx` ~5459):**

```js
// B.4, country → state dropdown options
const STATES_BR = [['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
const STATES_US = [['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];

const ZIP_RE = {
  BR: /^\d{5}-?\d{3}$/,
  US: /^\d{5}(-\d{4})?$/,
  MX: /^\d{5}$/,
  PT: /^\d{4}-\d{3}$/,
};

const PHONE_PREFIX_BY_COUNTRY = {
  BR:'+55', US:'+1', CA:'+1', PT:'+351', ES:'+34', MX:'+52', AR:'+54',
  CO:'+57', CL:'+56', PE:'+51', UY:'+598', PY:'+595', VE:'+58', EC:'+593',
  BO:'+591', GB:'+44', DE:'+49', FR:'+33', IT:'+39', NL:'+31', BE:'+32',
  CH:'+41', AT:'+43', AU:'+61', JP:'+81',
};

function normalizePhoneE164(raw, country) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  // Se já começa com +, preserva (E.164)
  if (trimmed.startsWith('+')) return '+' + trimmed.replace(/\D/g,'');
  // Senão, prefixa com prefixo do país
  const digits = trimmed.replace(/\D/g,'');
  if (!digits) return '';
  const prefix = PHONE_PREFIX_BY_COUNTRY[country] || '';
  return prefix + digits;
}

function validateBirthdayAdult(iso) {
  if (!iso) return false;
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 18;
}

function renderStateField(country) {
  const wrap = document.getElementById('auth-signup-state-wrap');
  if (!wrap) return;
  const label = wrap.querySelector('label')?.outerHTML || '<label>Estado</label>';
  let inner;
  if (country === 'BR' || country === 'US') {
    const list = country === 'BR' ? STATES_BR : STATES_US;
    inner = `<select id="auth-signup-state"><option value="">--</option>${list.map(([c,n])=>`<option value="${c}">${c}, ${n}</option>`).join('')}</select>`;
  } else {
    inner = '<input type="text" id="auth-signup-state" placeholder="State / Region">';
  }
  wrap.innerHTML = label + inner;
}

function onCountryChange() {
  const country = document.getElementById('auth-signup-country').value;
  renderStateField(country);
  // Atualiza placeholder do telefone com prefix do país
  const ph = document.getElementById('auth-signup-phone');
  if (ph) ph.placeholder = (PHONE_PREFIX_BY_COUNTRY[country] || '+') + ' XXX...';
}

let _zipDebounce = null;
async function onZipBlur() {
  clearTimeout(_zipDebounce);
  const zip = document.getElementById('auth-signup-zip')?.value.trim();
  const country = document.getElementById('auth-signup-country')?.value;
  if (!zip || !country) return;
  const spin = document.getElementById('auth-signup-zip-spin');
  const msg = document.getElementById('auth-signup-zip-msg');
  if (spin) spin.style.display = 'block';
  if (msg) msg.style.display = 'none';
  try {
    const r = await fetchAddressByZip(zip, country);
    if (spin) spin.style.display = 'none';
    if (r.ok) {
      const addr = document.getElementById('auth-signup-address');
      const city = document.getElementById('auth-signup-city');
      const state = document.getElementById('auth-signup-state');
      if (addr && r.address) addr.value = r.address;
      if (city && r.city) city.value = r.city;
      if (state && r.state) state.value = r.state;
      if (msg) { msg.style.display='block'; msg.className='auth-zip-msg ok'; msg.textContent = t('zip_ok')||'Address found'; }
    } else {
      if (msg) { msg.style.display='block'; msg.className='auth-zip-msg error'; msg.textContent = t('zip_'+r.error) || t('zip_not_found') || 'CEP não encontrado, preencha manualmente'; }
    }
  } catch(e) {
    if (spin) spin.style.display = 'none';
  }
}

function prefillCountryFromGeo() {
  if (!_geo?.geo_country) return;
  const sel = document.getElementById('auth-signup-country');
  if (!sel) return;
  const cc = _geo.geo_country.toUpperCase();
  if ([...sel.options].some(o=>o.value===cc)) {
    sel.value = cc;
    onCountryChange();
  }
}
```

**Revisão de `doAuthSignup` (`app.js:6295`):**

```js
async function doAuthSignup() {
  const first    = document.getElementById('auth-signup-first').value.trim();
  const last     = document.getElementById('auth-signup-last').value.trim();
  const nickname = document.getElementById('auth-signup-nickname').value.trim();
  const email    = document.getElementById('auth-signup-email').value.trim();
  const pass     = document.getElementById('auth-signup-pass').value;
  const phone    = document.getElementById('auth-signup-phone').value.trim();
  const birthday = document.getElementById('auth-signup-birthday').value;
  const country  = document.getElementById('auth-signup-country').value;
  const zip      = document.getElementById('auth-signup-zip').value.trim();
  const address  = document.getElementById('auth-signup-address').value.trim();
  const city     = document.getElementById('auth-signup-city').value.trim();
  const state    = document.getElementById('auth-signup-state').value.trim();
  const terms    = document.getElementById('auth-signup-terms').checked;

  // Hard-required
  if (!first || !last || !nickname || !email || !pass) return showAuthError('signup-error', t('auth_campos_obrigatorios')||'Preencha todos os campos obrigatórios');
  if (pass.length < 6) return showAuthError('signup-error', t('auth_senha_minimo'));
  if (!terms) return showAuthError('signup-error', t('auth_aceite_termos')||'Aceite os termos para continuar');

  // Soft-required: birthday se preenchido tem que ser adulto
  if (birthday && !validateBirthdayAdult(birthday)) return showAuthError('signup-error', t('auth_idade_minima')||'Você deve ter 18 anos ou mais');

  // ZIP validation por país (se preenchido)
  if (zip && country && ZIP_RE[country]) {
    if (!ZIP_RE[country].test(zip)) return showAuthError('signup-error', t('auth_cep_invalido')||'CEP/ZIP inválido para o país selecionado');
  }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = t('auth_validando_email')||'Validating email...';

  // B.3.2.1, email validation
  const validation = await validateEmailMx(email);
  if (validation && validation.valid === false) {
    btn.disabled = false; btn.textContent = t('auth_btn_criar');
    const reasonKey = 've_' + (validation.reason || 'cached_invalid');
    return showAuthError('signup-error', t(reasonKey) || t('ve_cached_invalid'));
  }

  btn.textContent = t('auth_criando');

  const phoneE164 = phone ? normalizePhoneE164(phone, country) : '';
  const fullName = `${first} ${last}`.trim();

  const { data, error } = await db.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        first_name: first,
        last_name:  last,
        nickname,
        full_name:  fullName,
        phone:      phoneE164,
        birthday:   birthday || '',
        address,
        city,
        state,
        country,
        zip,
        terms_accepted: 'true',
      }
    }
  });
  btn.disabled = false; btn.textContent = t('auth_btn_criar');

  if (error) return showAuthError('signup-error', error.message);

  // [resto idêntico ao atual: data.session branch + data.user!data.session branch]
  // Inclui hook B.3.2 send_confirm + showConfirmEmailModal('pending')
}
```

**Inicialização (boot):**

Adicionar ao `DOMContentLoaded` ou `openAuthModal('signup')`:

```js
// Quando modal de signup abre, inicializar dropdowns
function initSignupForm() {
  prefillCountryFromGeo();
  renderStateField(document.getElementById('auth-signup-country').value);
}
```

E chamar em `openAuthModal('signup')` ou no carregamento inicial.

---

## 3. i18n entries novas (7 idiomas)

| Chave | PT | EN |
|---|---|---|
| `signup_dados_reais` | Para participar das promoções e sorteios precisamos dos seus dados reais e seu melhor email. | To join promotions and giveaways we need your real data and best email. |
| `signup_first_name` | Nome | First name |
| `signup_last_name` | Sobrenome | Last name |
| `signup_nickname` | Apelido | Nickname |
| `signup_birthday` | Data de nascimento | Date of birth |
| `signup_zip` | CEP | ZIP code |
| `signup_address` | Endereço | Address |
| `signup_terms_label` | Li e aceito a [Política de Privacidade] e os [Termos de Uso] | I have read and accept the [Privacy Policy] and [Terms of Use] |
| `auth_campos_obrigatorios` | Preencha todos os campos obrigatórios | Please fill all required fields |
| `auth_aceite_termos` | Aceite os termos para continuar | Accept terms to continue |
| `auth_idade_minima` | Você deve ter 18 anos ou mais | You must be 18 or older |
| `auth_cep_invalido` | CEP/ZIP inválido para o país | Invalid ZIP for selected country |
| `zip_ok` | Endereço encontrado | Address found |
| `zip_zip_not_found` | CEP não encontrado, preencha manualmente | ZIP not found, fill manually |
| `zip_invalid_format` | Formato de CEP inválido | Invalid ZIP format |
| `zip_network_error` | Erro de conexão, preencha manualmente | Connection error, fill manually |
| `country_other` | Outro | Other |

ES/FR/DE/IT/AR seguem mesmo padrão. **Total: 17 chaves × 7 idiomas = 119 entries.**

---

## 4. Breaking changes esperados

1. **`document.getElementById('auth-signup-name')` deixa de existir**, busca por callers no codebase (caller único é `doAuthSignup` que será reescrito).
2. **`document.getElementById('auth-signup-country').value` antes era "Brasil"/"Estados Unidos"** → agora ISO-2 ("BR"/"US"). Qualquer caller fora do `doAuthSignup` que dependia da string em PT vai quebrar. **Audit:** grep por `auth-signup-country` mostra que só `doAuthSignup` lê esse valor, sem outros callers.
3. **Estado vai como código ISO** (SP, NY, ...) em vez de texto livre quando BR/US, aumenta Match Quality CAPI mas pode quebrar dashboards admin que filtram por nome completo do estado. **Mitigação:** trigger / coluna no DB já é texto livre, aceita ambos. Dashboards eventualmente precisarão atualizar lookup pra aceitar siglas.

---

## 5. Plano de teste (executo via console + headless)

| # | Cenário | Esperado |
|---|---|---|
| 1 | Submit só com first/last/nickname/email/pass/terms (sem soft fields) | ✅ signUp ok, demais colunas NULL no profiles |
| 2 | Submit com todos os 14 campos preenchidos | ✅ todos chegam em raw_user_meta_data, trigger insere completo |
| 3 | CEP BR `01310-100` (country=BR) → blur | endereço="Avenida Paulista", cidade="São Paulo", state="SP" auto-preenchidos |
| 4 | ZIP US `90210` (country=US) → blur | city="Beverly Hills", state dropdown US seleciona "CA"; address vazio (user preenche) |
| 5 | CEP `00000-000` (country=BR) → blur | mensagem erro "CEP não encontrado, preencha manualmente", form NÃO trava |
| 6 | Country muda BR → US → AR | dropdown estado vira US dropdown; depois vira input texto; placeholder phone muda |
| 7 | Telefone `(11) 99999-9999` (country=BR) → submit | normalizePhoneE164 → `+5511999999999` no DB |
| 8 | Birthday `2010-01-01` (15 anos) → submit | erro "Você deve ter 18 anos ou mais"; signUp não chamado |
| 9 | Email `aaa@bbbbb.zzz` → submit | erro "Esse email não parece existir" (B.3.2.1 já cobre); signUp não chamado |
| 10 | Termos não-marcados → submit | erro "Aceite os termos para continuar"; signUp não chamado |
| 11 | OAuth Google → submit | doGoogleAuth segue funcionando (sem alteração); trigger marca email_verified=true (B.3.3) |
| 12 | Country=BR + ZIP=`12345` (regex falha) → submit | erro "CEP/ZIP inválido para o país" |
| 13 | Country=BR sem digitar ZIP → submit | aceita (zip é soft-required) |

---

## 6. Pendências antes de aplicar

**Decisões pra você confirmar:**

1. **Country=Brasil em users existentes:** os 14 users legacy têm `country='Brasil'` (string PT). Migração: SQL UPDATE pra converter pra ISO-2? Ou deixa misto e aceita no admin? Sugestão: deixa, dashboards eventualmente filtram por ambos.
2. **CSP `accent-color` em checkbox:** usa `var(--gold)`, funciona em browsers modernos. IE11/legacy ignora silenciosamente (irrelevante).
3. **CEP debounce vs blur:** propus `onblur`. Alternativa: `oninput` + debounce 500ms (dispara enquanto user digita). Blur é mais conservador (só dispara quando user sai do campo), sugiro manter blur.
4. **Lista de países do dropdown:** propus 26 países cobrindo LATAM + Europa principal + AU/JP/CA. **Outro** vira `value="OTHER"` (helper rejeita com `unsupported_country` de propósito). Quer expandir? Reduzir? Reordenar?
5. **`max="2008-01-01"` no input date:** trava picker do browser em datas que dariam <18 anos (defesa em profundidade complementar à validação JS). Quer mexer?

---

## 7. Diff stat estimado

- `index.html`: +120/-40 linhas (form HTML expandido + CSS +14 linhas)
- `app.js`: +180/-30 (helpers state/phone/birthday/zip + doAuthSignup reescrito)
- `i18n.js`: +119 entries × 7 = ~120 linhas (média ~1 entry/linha)
- **Total: ~430 linhas insertions** entre os 3 arquivos.

---

## 8. Próximos passos

1. **Você confirma os 5 pontos da seção 6**
2. Ajusto a proposta conforme feedback
3. Backup `.tmp/` → aplica → smoke test 13 cases (executo via headless ou node) → reporta em `data/reports/b4_smoke_test_2026-04-29.md`
4. Após validado, B.4 ✅ → libera B.6 (modal completar perfil pra users legacy + pós-OAuth nickname).

**Fix #1 e #1.5:** seguem em validação paralela.
