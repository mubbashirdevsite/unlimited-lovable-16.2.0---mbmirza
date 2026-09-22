/**
 * lovax - User-facing copy: English translations + strip internal/hosting/vendor branding.
 */
function stripInternalBranding(value) {
  if (value == null) return value;
  var brand = typeof EXTENSION_NAME !== "undefined" ? String(EXTENSION_NAME) : "Mirza-Lovable";
  var s = String(value);

  var rules = [
    [/gringow\s*store/gi, brand],
    [/gringow/gi, brand],
    [/vendor\s+license\s+pool/gi, "license service"],
    [/vendor\s+ql\s+keys?/gi, "license keys"],
    [/vendor\s+ql/gi, "license"],
    [/vendor\s+license/gi, "license"],
    [/vendor\s+key/gi, "license key"],
    [/vendor\s+supabase/gi, "service"],
    [/vendor\s+/gi, ""],
    [/plesk(\s+php)?/gi, ""],
    [/supabase\s+anon\s+key/gi, "service configuration"],
    [/supabase\s+url/gi, "service"],
    [/on\s+supabase/gi, ""],
    [/admin\s*→[^.]*\.?/gi, ""],
    [/check\s+admin[^.]*\.?/gi, "Contact support"],
    [/upload\s+(the\s+)?latest\s+backend[^.]*\.?/gi, ""],
    [/lovablefeaturescontroller[^.]*\.?/gi, ""],
    [/lovableapiservice[^.]*\.?/gi, ""],
    [/not\s+the\s+vendor\s+[^.]*\.?/gi, ""],
    [/infinity\/ql\s+key/gi, "license key"],
    [/\bteam\s+pk-/gi, ""],
    [/\bteam\s+license/gi, "license"],
    [/use your team/gi, "use your"],
    [/your team license/gi, "your license"],
    [/\(\s*not\s+the\s+[^)]+\)/gi, ""],
    [/powerkits\s+server/gi, brand + " service"],
    [/\s{2,}/g, " "],
    [/\. \./g, "."],
    [/\s+\./g, "."],
    [/^\s+|\s+$/g, ""]
  ];

  for (var i = 0; i < rules.length; i++) {
    s = s.replace(rules[i][0], rules[i][1]);
  }
  return s;
}

function translateUserMessage(value) {
  if (value == null) return value;
  var s = String(value);
  var map = [
    [/Licen[çc]a\s+n[aã]o\s+encontrada\s+ou\s+inativa/ig,
      "License could not be validated. Check your key or contact official channel."],
    [/Licen[çc]a\s+n[aã]o\s+encontrada/ig, "License not found"],
    [/Licen[çc]a\s+inativa/ig, "License inactive"],
    [/Licen[çc]a\s+V[aá]lida/ig, "Valid license"],
    [/Licen[çc]a\s+inv[aá]lida/ig, "Invalid license"],
    [/Chave\s+inv[aá]lida/ig, "Invalid key"],
    [/Sess[aã]o\s+inv[aá]lida\.?\s*Fa[çc]a\s+login\s+novamente\.?/ig, "Invalid session. Please log in again."],
    [/Sess[aã]o\s+inv[aá]lida/ig, "Invalid session"],
    [/Fa[çc]a\s+login\s+novamente/ig, "Please log in again"],
    [/Erro\s+de\s+conex[aã]o/ig, "Connection error"],
    [/Projeto\s+n[aã]o\s+sincronizado/ig, "Project not synced"],
    [/Token\s+n[aã]o\s+capturado/ig, "Token not captured"],
    [/Licen[çc]a\s+expirada/ig, "License expired"],
    [/Acesso\s+Negado/ig, "Access denied"],
    [/Falha\s+ao\s+criar\s+projeto/ig, "Failed to create project"],
    [/Erro\s+no\s+envio/ig, "Send error"],
    [/Prompt\s+Enviado\s+com\s+Sucesso\.?/ig, "Prompt sent successfully"],
    [/Todos\s+os\s+QLs?\s+falharam/ig, "License service is temporarily unavailable. Try again later."],
    [/Nenhum\s+QL\s+configurado/ig, "Service is temporarily unavailable. Contact support."],
    [/No\s+vendor\s+license\s+configured[^.]*/ig, "Service is temporarily unavailable. Contact support."],
    [/Vendor\s+license\s+not\s+found[^.]*/ig, "License could not be validated. Contact official channel."],
    [/Token\s+e\s+projectId\s+s[aã]o\s+obrigat[oó]rios\.?/ig,
      "Lovable token and project are required. Open your project on lovable.dev, wait for Synced, then try again."],
    // Chrome Identity / OAuth runtime errors (often shown raw without a catalog key)
    [/Authorization\s+page\s+could\s+not\s+be\s+loaded\.?/ig,
      "Authorization page could not be loaded."],
    [/The\s+authorization\s+page\s+could\s+not\s+be\s+loaded\.?/ig,
      "Authorization page could not be loaded."],
    [/Authorization\s+page\s+could\s+not\s+be\s+displayed\.?/ig,
      "Authorization page could not be loaded."],
    [/OAuth2\s+request\s+failed[:\s].*/ig, "Sign-in failed"],
    [/OAuth2\s+not\s+granted\s+or\s+revoked/ig, "Sign-in cancelled"],
    [/The\s+user\s+did\s+not\s+approve\s+access/ig, "Sign-in cancelled"],
    [/User\s+cancell?ed\s+(the\s+)?(sign[- ]?in|login|flow|auth).*/ig, "Sign-in cancelled"],
    [/The\s+user\s+turned\s+off\s+the\s+accounts?\s+sign[- ]?in/ig, "Sign-in cancelled"],
    [/Authorization\s+failed/ig, "Sign-in failed"],
    [/Access\s+has\s+been\s+denied/ig, "Sign-in cancelled"],
    [/net::ERR_/ig, "Connection error"],
    [/Failed\s+to\s+fetch/ig, "Connection error"],
    [/NetworkError/ig, "Connection error"],
    [/Extension\s+context\s+invalidated/ig, "Extension was reloaded. Refresh this page and try again."],
    [/Receiving\s+end\s+does\s+not\s+exist/ig,
      "Lovable tab is not connected. Open your project on lovable.dev, refresh that tab, reload the extension, then send again."],
    [/Could\s+not\s+establish\s+connection/ig,
      "Lovable tab is not connected. Open your project on lovable.dev, refresh that tab, reload the extension, then send again."],
  ];
  for (var i = 0; i < map.length; i++) {
    s = s.replace(map[i][0], map[i][1]);
  }
  s = stripInternalBranding(s);
  // Apply admin-managed extension translations (EN key → current language).
  try {
    if (typeof window !== "undefined") {
      if (window.SP_I18N && typeof window.SP_I18N.t === "function") return window.SP_I18N.t(s);
      if (window.QL_I18N && typeof window.QL_I18N.t === "function") return window.QL_I18N.t(s);
    }
  } catch (_) {}
  return s;
}
