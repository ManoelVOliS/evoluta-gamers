/**
 * Roda só na página de redirect da Epic (ver `matches` no manifest), que
 * mostra um JSON cru com `authorizationCode` depois do login. Formato
 * confirmado no código-fonte do `legendary`, mas é uma página não-documentada
 * da Epic — pode mudar sem aviso.
 */
try {
  const parsed = JSON.parse(document.body.innerText) as {
    authorizationCode?: string
  }
  if (parsed.authorizationCode) {
    chrome.runtime.sendMessage({
      type: 'auth-code-captured',
      code: parsed.authorizationCode,
    })
  }
} catch {
  // Página não veio como esperado — usuário cai no fallback manual de colar o código.
}
