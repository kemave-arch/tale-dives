import { Swords, Moon, Compass, Eye, MessageCircle, Heart, CloudFog, Sun, Pause } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TurnState } from '../types.ts'

// §4.3 9-Tier Turn State Matrix — icon mapping per §6.1b, colors reused from
// the same badge recipe (pale fill / mid border / dark text) but expressed
// as a left-accent + icon on each log entry rather than a full-page retint,
// which would fight with the parchment reading surface's own fixed tone.
export const TURN_STATE_META: Record<TurnState, { icon: LucideIcon; label: string; accent: string }> = {
  PEACE: { icon: Sun, label: 'Peace', accent: '#d97706' },
  COMBAT: { icon: Swords, label: 'Combat', accent: '#e11d48' },
  STEALTH: { icon: Moon, label: 'Stealth', accent: '#7c3aed' },
  DESPAIR: { icon: CloudFog, label: 'Despair', accent: '#57534e' },
  EXPLORE: { icon: Compass, label: 'Explore', accent: '#059669' },
  INSIGHT: { icon: Eye, label: 'Insight', accent: '#0891b2' },
  SOCIAL: { icon: MessageCircle, label: 'Social', accent: '#ca8a04' },
  INTIMACY: { icon: Heart, label: 'Intimacy', accent: '#db2777' },
  PAUSE: { icon: Pause, label: 'Paused', accent: '#78716c' },
}
