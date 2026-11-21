window.__ModuleLoader__.load({
  id: 'dsh-ui-configure',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React

    const NS = 'ui-configure'
    const ENABLED_KEY = 'dsh-ui-configure.enabled'
    const SIZE_KEY = 'dsh-ui-configure.size'
    const POSITION_KEY = 'dsh-ui-configure.position'
    const POINT_KEY = 'dsh-ui-configure.point'
    const CHANGE_EVENT = 'dsh-ui-configure:change'
    // Matches the desktop shell's own floor (lib/main.js createWindow).
    const MIN_WIDTH = 520
    const MIN_HEIGHT = 600
    const SAVE_DELAY = 400
    const POLL_INTERVAL = 800
    const MOVE_SETTLE = 120
    const RESTORE_SETTLE = 700
    const POSITION_MODES = ['remember', 'center', 'off']

    // DSH locale dictionaries are FLAT maps keyed by the dotted string passed to
    // t(...); nesting them makes every lookup miss and fall back to the key.
    const zh = {
      'nav': '界面配置',
      'remember.title': '记住窗口尺寸',
      'remember.description': '启动桌面应用时恢复上次的窗口大小。',
      'position.title': '窗口位置',
      'position.description': '记住窗口停在哪里，或每次启动都摆到屏幕中央。',
      'position.remember': '记住位置',
      'position.center': '启动居中',
      'position.off': '不记录',
      'saved.title': '记录的窗口尺寸',
      'saved.description': '窗口调整大小后自动记录，启动时按记录恢复。',
      'saved.empty': '尚未记录。调整窗口大小后自动写入。',
      'saved.value': '{width} × {height}',
      'saved.reset': '清除记录',
      'desktopOnly': '窗口尺寸只在 DSH 桌面应用中生效，当前页面无法调整窗口。',
    }

    const en = {
      'nav': 'Interface',
      'remember.title': 'Remember window size',
      'remember.description': 'Restore the last window size when the desktop app starts.',
      'position.title': 'Window position',
      'position.description': 'Bring the window back where it was, or open it centered every time.',
      'position.remember': 'Remember',
      'position.center': 'Center',
      'position.off': 'Off',
      'saved.title': 'Recorded window size',
      'saved.description': 'Saved automatically after you resize the window and restored on start.',
      'saved.empty': 'Nothing recorded yet. Resize the window to record one.',
      'saved.value': '{width} × {height}',
      'saved.reset': 'Clear',
      'desktopOnly': 'Window size applies to the DSH desktop app only; this page cannot resize its window.',
    }

    const CSS = `
.ui-configure { display: flex; flex-direction: column; width: 100%; }
.ui-configure-notice { margin: 4px 0 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.ui-configure-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }
.ui-configure-row:last-child { border-bottom: none; }
.ui-configure-copy { min-width: 0; }
.ui-configure-title { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 20px; }
.ui-configure-description { margin-top: 4px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.ui-configure-switch { position: relative; flex: none; width: 36px; height: 20px; padding: 0; border: 0; border-radius: 999px; background: var(--dsw-alias-fill-l2, rgba(120, 120, 128, 0.32)); cursor: pointer; transition: background 0.15s ease; }
.ui-configure-switch[aria-checked='true'] { background: var(--dsw-alias-brand-primary, #4d6bfe); }
.ui-configure-switch:disabled { opacity: 0.45; cursor: not-allowed; }
.ui-configure-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe); outline-offset: 2px; }
.ui-configure-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); transition: transform 0.15s ease; }
.ui-configure-switch[aria-checked='true'] .ui-configure-knob { transform: translateX(16px); }
.ui-configure-segment { display: flex; flex: 0 1 auto; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 4px 18px; min-width: 0; }
.ui-configure-option { position: relative; border: 0; padding: 0 0 6px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; cursor: pointer; transition: color 0.15s ease; }
.ui-configure-option::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; border-radius: 1px; background: transparent; transition: background 0.15s ease; }
.ui-configure-option:hover:not(:disabled):not([aria-pressed='true']) { color: var(--dsw-alias-label-primary); }
.ui-configure-option[aria-pressed='true'] { color: var(--dsw-alias-label-primary); cursor: default; }
.ui-configure-option[aria-pressed='true']::after { background: var(--dsw-alias-brand-primary, currentColor); }
.ui-configure-option:disabled { opacity: 0.45; cursor: not-allowed; }
.ui-configure-option:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe); outline-offset: 1px; }
.ui-configure-button { flex: none; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 4px 10px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; cursor: pointer; }
.ui-configure-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.ui-configure-button:disabled { opacity: 0.4; cursor: not-allowed; }
`

    // A restore writes geometry itself; the observers below must not record the
    // intermediate frames it produces.
    let restoringUntil = 0

    function isRestoring() {
      return Date.now() < restoringUntil
    }

    function holdRestore(milliseconds) {
      restoringUntil = Math.max(restoringUntil, Date.now() + milliseconds)
    }

    function storage() {
      try { return window.localStorage } catch (error) { return undefined }
    }

    function readFlag(key) {
      const store = storage()
      return store === undefined ? false : store.getItem(key) === '1'
    }

    function writeFlag(key, enabled) {
      const store = storage()
      if (store === undefined) return
      store.setItem(key, enabled ? '1' : '0')
    }

    function readEnabled() {
      return readFlag(ENABLED_KEY)
    }

    function writeEnabled(enabled) {
      writeFlag(ENABLED_KEY, enabled)
    }

    function readSize() {
      const store = storage()
      if (store === undefined) return undefined
      const raw = store.getItem(SIZE_KEY)
      if (raw === null) return undefined
      try {
        const parsed = JSON.parse(raw)
        const width = Math.round(Number(parsed.width))
        const height = Math.round(Number(parsed.height))
        if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined
        if (width < MIN_WIDTH || height < MIN_HEIGHT) return undefined
        return { width, height }
      } catch (error) {
        return undefined
      }
    }

    function writeSize(size) {
      const store = storage()
      if (store === undefined) return
      store.setItem(SIZE_KEY, JSON.stringify(size))
    }

    function clearSize() {
      const store = storage()
      if (store === undefined) return
      store.removeItem(SIZE_KEY)
    }

    function readPositionMode() {
      const store = storage()
      if (store === undefined) return POSITION_MODES[0]
      const raw = store.getItem(POSITION_KEY)
      return POSITION_MODES.includes(raw) ? raw : POSITION_MODES[0]
    }

    function writePositionMode(mode) {
      const store = storage()
      if (store === undefined) return
      store.setItem(POSITION_KEY, mode)
    }

    function readPoint() {
      const store = storage()
      if (store === undefined) return undefined
      const raw = store.getItem(POINT_KEY)
      if (raw === null) return undefined
      try {
        const parsed = JSON.parse(raw)
        const x = Math.round(Number(parsed.x))
        const y = Math.round(Number(parsed.y))
        if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
        return { x, y }
      } catch (error) {
        return undefined
      }
    }

    function writePoint(point) {
      const store = storage()
      if (store === undefined) return
      store.setItem(POINT_KEY, JSON.stringify(point))
    }

    function clearPoint() {
      const store = storage()
      if (store === undefined) return
      store.removeItem(POINT_KEY)
    }

    function canResize() {
      return typeof window.resizeTo === 'function' && typeof window.outerWidth === 'number'
    }

    function canMove() {
      return typeof window.moveTo === 'function' && typeof window.screenX === 'number'
    }

    function isDesktop() {
      return typeof globalThis.dshDesktop !== 'undefined' && canResize() && canMove()
    }

    function availableArea() {
      const screen = window.screen
      const left = screen && Number.isFinite(Number(screen.availLeft)) ? Number(screen.availLeft) : 0
      const top = screen && Number.isFinite(Number(screen.availTop)) ? Number(screen.availTop) : 0
      const width = screen && Number(screen.availWidth) > 0 ? Number(screen.availWidth) : 0
      const height = screen && Number(screen.availHeight) > 0 ? Number(screen.availHeight) : 0
      return { left, top, width, height }
    }

    // A maximized window reports the work area; recording that would make the
    // next start open maximized whatever size the user actually chose.
    function isMaximized() {
      const area = availableArea()
      if (area.width === 0 || area.height === 0) return false
      return window.outerWidth >= area.width - 1 && window.outerHeight >= area.height - 1
    }

    // The renderer can only observe its content box, and `resizeTo` takes that
    // same box, so the recorded value round-trips without drifting on the
    // invisible resize border a hidden-title-bar window carries.
    function currentSize() {
      return { width: Math.round(window.innerWidth), height: Math.round(window.innerHeight) }
    }

    function currentPoint() {
      return { x: Math.round(window.screenX), y: Math.round(window.screenY) }
    }

    function sameSize(a, b) {
      return a.width === b.width && a.height === b.height
    }

    function samePoint(a, b) {
      return a.x === b.x && a.y === b.y
    }

    function clamp(size) {
      const area = availableArea()
      const width = area.width > 0 ? Math.min(size.width, area.width) : size.width
      const height = area.height > 0 ? Math.min(size.height, area.height) : size.height
      return { width: Math.max(width, MIN_WIDTH), height: Math.max(height, MIN_HEIGHT) }
    }

    // `moveTo` grows a hidden-title-bar window by its invisible border and
    // `resizeTo` then shifts it left by half of it; aiming twice the border
    // width to the right lands the content box exactly on the recorded point.
    function borderCompensation() {
      const border = window.outerWidth - window.innerWidth
      return border > 0 ? 2 * Math.floor(border / 2) : 0
    }

    function centerPoint(size) {
      const area = availableArea()
      return {
        x: area.left + Math.round((area.width - size.width) / 2),
        y: area.top + Math.round((area.height - size.height) / 2),
      }
    }

    function pointOnScreen(point, size) {
      const area = availableArea()
      const visibleWidth = Math.min(point.x + size.width, area.left + area.width) - Math.max(point.x, area.left)
      const visibleHeight = Math.min(point.y + size.height, area.top + area.height) - Math.max(point.y, area.top)
      return visibleWidth >= 160 && visibleHeight >= 80
    }

    function rememberCurrentSize() {
      if (!canResize() || isMaximized()) return
      const size = currentSize()
      if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) return
      writeSize(size)
    }

    function rememberCurrentPoint() {
      if (!canMove() || isMaximized()) return
      writePoint(currentPoint())
    }

    function rememberCurrentGeometry() {
      rememberCurrentSize()
      if (readPositionMode() === 'remember') rememberCurrentPoint()
    }

    function restoreGeometry() {
      if (!canResize()) return
      const storedSize = readSize()
      const size = storedSize === undefined ? currentSize() : clamp(storedSize)
      const mode = readPositionMode()
      const storedPoint = mode === 'remember' ? readPoint() : undefined

      let point
      if (mode === 'center') point = centerPoint(size)
      else if (storedPoint !== undefined && pointOnScreen(storedPoint, size)) point = storedPoint
      // "Remember" with a point that no longer lands on any display starts centered.
      else if (mode === 'remember') point = centerPoint(size)

      if (point === undefined && sameSize(size, currentSize())) return
      if (point !== undefined && samePoint(point, currentPoint()) && sameSize(size, currentSize())) return

      holdRestore(RESTORE_SETTLE)
      if (point !== undefined) {
        window.moveTo(point.x + borderCompensation(), point.y)
        // Every move grows the window; re-apply the size once the move settles.
        window.setTimeout(() => {
          window.resizeTo(size.width, size.height)
        }, MOVE_SETTLE)
        return
      }
      window.resizeTo(size.width, size.height)
    }

    function announceChange() {
      window.dispatchEvent(new Event(CHANGE_EVENT))
    }

    function sameGeometry(a, b) {
      return sameSize(a, b)
    }

    function InterfaceSection(props) {
      const t = props.t
      const [enabled, setEnabled] = useState(readEnabled)
      const [saved, setSaved] = useState(readSize)
      const [positionMode, setPositionMode] = useState(readPositionMode)
      const desktop = isDesktop()

      useEffect(() => {
        const sync = () => {
          setEnabled(readEnabled())
          setSaved(readSize())
          setPositionMode(readPositionMode())
        }
        window.addEventListener(CHANGE_EVENT, sync)
        return () => { window.removeEventListener(CHANGE_EVENT, sync) }
      }, [])

      const toggle = (next) => {
        writeEnabled(next)
        if (next) rememberCurrentGeometry()
        announceChange()
      }

      const choosePosition = (mode) => {
        writePositionMode(mode)
        if (mode === 'remember') rememberCurrentPoint()
        else if (mode === 'off') clearPoint()
        announceChange()
      }

      const reset = () => {
        clearSize()
        clearPoint()
        announceChange()
      }

      const savedText = saved === undefined
        ? t('saved.empty')
        : t('saved.value', { width: saved.width, height: saved.height })

      return h('div', { className: 'ui-configure' },
        h('style', null, CSS),
        desktop ? null : h('div', { className: 'ui-configure-notice', role: 'note' }, t('desktopOnly')),
        h('div', { className: 'ui-configure-row' },
          h('div', { className: 'ui-configure-copy' },
            h('div', { className: 'ui-configure-title' }, t('remember.title')),
            h('div', { className: 'ui-configure-description' }, t('remember.description'))),
          h('button', {
            type: 'button',
            role: 'switch',
            'aria-checked': enabled ? 'true' : 'false',
            'aria-label': t('remember.title'),
            className: 'ui-configure-switch',
            disabled: !desktop,
            onClick: () => { toggle(!enabled) },
          }, h('span', { className: 'ui-configure-knob' }))),
        h('div', { className: 'ui-configure-row' },
          h('div', { className: 'ui-configure-copy' },
            h('div', { className: 'ui-configure-title' }, t('position.title')),
            h('div', { className: 'ui-configure-description' }, t('position.description'))),
          h('div', { className: 'ui-configure-segment', role: 'group', 'aria-label': t('position.title') },
            ...['remember', 'center', 'off'].map((mode) => h('button', {
              key: mode,
              type: 'button',
              className: 'ui-configure-option',
              'aria-pressed': positionMode === mode ? 'true' : 'false',
              disabled: !desktop,
              onClick: () => { if (positionMode !== mode) choosePosition(mode) },
            }, t('position.' + mode))))),
        h('div', { className: 'ui-configure-row' },
          h('div', { className: 'ui-configure-copy' },
            h('div', { className: 'ui-configure-title' }, t('saved.title')),
            h('div', { className: 'ui-configure-description' }, savedText)),
          h('button', {
            type: 'button',
            className: 'ui-configure-button',
            disabled: saved === undefined,
            onClick: reset,
          }, t('saved.reset'))))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ui-configure: dictionaries')

        ctx.effect(() => {
          if (!isDesktop()) return () => {}
          let timer
          let poll
          const schedule = () => {
            if (!readEnabled() || isRestoring()) return
            window.clearTimeout(timer)
            timer = window.setTimeout(rememberCurrentSize, SAVE_DELAY)
          }
          const onChange = () => {
            window.clearTimeout(timer)
            if (!readEnabled() || isRestoring()) return
            rememberCurrentGeometry()
          }
          // No DOM event reports a window drag, so a cheap poll records the
          // resting point once the user lets go.
          const startPoll = () => {
            window.clearInterval(poll)
            poll = window.setInterval(() => {
              if (!readEnabled() || isRestoring() || document.hidden) return
              if (readPositionMode() !== 'remember') return
              const point = currentPoint()
              const savedPoint = readPoint()
              if (savedPoint === undefined || !samePoint(point, savedPoint)) rememberCurrentPoint()
            }, POLL_INTERVAL)
          }
          if (readEnabled()) restoreGeometry()
          window.addEventListener('resize', schedule)
          window.addEventListener(CHANGE_EVENT, onChange)
          startPoll()
          return () => {
            window.clearTimeout(timer)
            window.clearInterval(poll)
            window.removeEventListener('resize', schedule)
            window.removeEventListener(CHANGE_EVENT, onChange)
          }
        }, 'dsh-ui-configure: window geometry tracking')

        const t = ctx.locale.bind(NS)
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'ui-configure',
          order: 60,
          label: () => t('nav'),
          locale: NS,
        }, InterfaceSection))
      },
    }
  },
})
