/**
 * Sistema centralizado de back handler para Android/iOS (Capacitor) e Web/PWA.
 *
 * Mantém uma pilha de handlers. O mais recente registrado é o primeiro a ser
 * chamado quando o usuário pressiona voltar. Se retornar `true`, o evento é
 * consumido. Se retornar `false`, passa para o próximo na pilha.
 *
 * Uso:
 *   const { pushBack, popBack } = useBackHandler()
 *   useEffect(() => {
 *     if (isOpen) {
 *       const id = pushBack(() => { setIsOpen(false); return true })
 *       return () => popBack(id)
 *     }
 *   }, [isOpen])
 */

type BackHandlerFn = () => boolean

interface BackEntry {
  id: number
  handler: BackHandlerFn
}

let _counter = 0
const _stack: BackEntry[] = []
let _globalRegistered = false
let _capacitorHandle: { remove: () => void } | null = null

function _dispatch(): boolean {
  for (let i = _stack.length - 1; i >= 0; i--) {
    const consumed = _stack[i].handler()
    if (consumed) return true
  }
  return false
}

function _ensureGlobal() {
  if (_globalRegistered) return
  _globalRegistered = true

  const isCapacitor =
    typeof (window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor !==
      "undefined" &&
    (window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative === true

  if (isCapacitor) {
    import("@capacitor/app")
      .then(({ App }) => {
        App.addListener("backButton", () => {
          _dispatch()
          // nunca propaga para o sistema (não fecha o app)
        }).then((handle) => {
          _capacitorHandle = handle
        })
      })
      .catch(() => {
        _registerPopstate()
      })
  } else {
    _registerPopstate()
  }
}

function _registerPopstate() {
  // Garante estado sentinela
  if (!window.history.state?.bulletpoint) {
    window.history.replaceState({ bulletpoint: "home" }, "")
  }

  window.addEventListener("popstate", () => {
    const consumed = _dispatch()
    if (!consumed) {
      // Nada consumiu: repõe o sentinela para não sair do app
      window.history.pushState({ bulletpoint: "home" }, "")
    } else {
      // Consumido: repõe o sentinela para a próxima vez
      setTimeout(() => {
        window.history.pushState({ bulletpoint: "home" }, "")
      }, 0)
    }
  })

  // Estado inicial sempre na pilha
  window.history.pushState({ bulletpoint: "home" }, "")
}

export function pushBack(handler: BackHandlerFn): number {
  if (typeof window !== "undefined") _ensureGlobal()
  const id = ++_counter
  _stack.push({ id, handler })
  // Para web/PWA: empurra um estado na pilha do browser para que o gesto
  // de deslizar/botão voltar dispare o popstate
  const isCapacitor =
    typeof (window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor !==
      "undefined" &&
    (window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative === true
  if (!isCapacitor && typeof window !== "undefined") {
    window.history.pushState({ bulletpoint: "modal", id }, "")
  }
  return id
}

export function popBack(id: number) {
  const idx = _stack.findIndex((e) => e.id === id)
  if (idx !== -1) _stack.splice(idx, 1)
}
