const form = document.getElementById('link-form') as HTMLFormElement
const apiOriginInput = document.getElementById('api-origin') as HTMLInputElement
const linkTokenInput = document.getElementById('link-token') as HTMLInputElement
const status = document.getElementById('status') as HTMLParagraphElement

form.addEventListener('submit', (event) => {
  event.preventDefault()

  const apiOrigin = apiOriginInput.value.trim()
  const linkToken = linkTokenInput.value.trim()
  if (!apiOrigin || !linkToken) return

  status.textContent = 'Abrindo login da Epic...'
  chrome.runtime.sendMessage(
    { type: 'start-link', linkToken, apiOrigin },
    () => {
      window.close()
    }
  )
})
