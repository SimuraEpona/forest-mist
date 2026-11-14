import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

// Morning mist by day, the same forest at night. No purple anywhere:
// `pro` (literals in code) is a pine teal instead.
const { theme, problems } = makeColors({
  label: 'Forest mist',
  roles: { accent: '#3d7a5a', danger: '#b04a3a', success: '#5e8f2a', warning: '#b5791a', pro: '#2b8590' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e8eee7',
        'surface-1': '#eef2ed',
        'surface-2': '#f5f8f4',
        'text-primary': '#18241d',
        'text-secondary': '#36463c',
        'text-muted': '#4e5e53',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#111914',
        'surface-1': '#17201a',
        'surface-2': '#1c2620',
        'surface-3': '#212c25',
        'text-primary': '#eaefe5',
        'text-secondary': '#c6cfc1',
        'text-muted': '#a2ae9f',
      },
    },
  },
})

const SCENE_NAME = 'forest-mist'

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE_NAME, glass: { blur: 18, opacity: 0.62 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    await $.command.register({ name: 'plain', description: 'Take the forest mist theme off' })
    await $.command.register({ name: 'forest', description: 'Put the forest mist theme back on' })

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name || e.props.scene !== SCENE_NAME) {
      return next(e)
    }

    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="Pine forest at dusk with slowly drifting mist and fireflies" isInteractive />
  })

  on('command.run', { command: 'plain' }, async $ => {
    const cleared = await $.theme.clear()

    return { text: cleared.isDrawn ? 'Forest mist is off' : cleared.reason }
  })

  on('command.run', { command: 'forest' }, async $ => {
    const set = await $.theme.set(LOOK)

    return { text: set.isDrawn ? 'Forest mist is back' : set.reason }
  })
}
