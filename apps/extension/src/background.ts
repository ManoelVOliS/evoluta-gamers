/**
 * URL oficial de login da Epic que devolve um `authorizationCode` — confirmada
 * no código-fonte do `legendary` (que usa o encurtador `legendary.gl/epiclogin`,
 * resolvido pra esta URL). `clientId` é da própria Epic Games Launcher, não é
 * segredo nosso.
 */
const EPIC_LOGIN_URL =
  'https://www.epicgames.com/id/login?redirectUrl=' +
  encodeURIComponent(
    'https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code'
  )

type PendingLink = {
  linkToken: string
  apiOrigin: string
  tabId: number
}

type IncomingMessage = {
  type: string
  linkToken?: string
  apiOrigin?: string
  code?: string
}

async function startLink(linkToken: string, apiOrigin: string): Promise<void> {
  const tab = await chrome.tabs.create({ url: EPIC_LOGIN_URL })
  if (tab.id === undefined) return
  const pendingLink: PendingLink = { linkToken, apiOrigin, tabId: tab.id }
  await chrome.storage.session.set({ pendingLink })
}

async function exchangeCode(code: string): Promise<void> {
  const { pendingLink } = (await chrome.storage.session.get('pendingLink')) as {
    pendingLink?: PendingLink
  }
  if (!pendingLink) return

  const { linkToken, apiOrigin, tabId } = pendingLink
  await chrome.storage.session.remove('pendingLink')

  let outcome = 'ok'
  let errorCode = ''
  try {
    const res = await fetch(`${apiOrigin}/api/epic/link/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkToken, code }),
    })
    if (!res.ok) {
      outcome = 'error'
      const body = (await res.json().catch(() => ({}))) as { code?: string }
      errorCode = body.code ?? ''
    }
  } catch {
    outcome = 'error'
  }

  const params = new URLSearchParams({ epicLink: outcome })
  if (errorCode) params.set('code', errorCode)
  await chrome.tabs.update(tabId, {
    url: `${apiOrigin}/app/settings/epic?${params}`,
  })
}

function handleMessage(
  message: IncomingMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { ok: boolean }) => void
): true | undefined {
  if (message.type === 'ping') {
    sendResponse({ ok: true })
    return
  }
  if (message.type === 'start-link' && message.linkToken && message.apiOrigin) {
    startLink(message.linkToken, message.apiOrigin).then(() =>
      sendResponse({ ok: true })
    )
    return true
  }
  if (message.type === 'auth-code-captured' && message.code) {
    exchangeCode(message.code).then(() => sendResponse({ ok: true }))
    return true
  }
}

// Popup (mensagem interna) e web app (`externally_connectable`, Fase 3) usam o
// mesmo protocolo — um único handler atende os dois.
chrome.runtime.onMessage.addListener(handleMessage)
chrome.runtime.onMessageExternal.addListener(handleMessage)
