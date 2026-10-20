---
name: FIAP Lost and Found
colors:
  surface: '#1A1A1A'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e5bcc0'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ac888b'
  outline-variant: '#5c3f42'
  surface-tint: '#ffb2bb'
  primary: '#ffb2bb'
  on-primary: '#670022'
  primary-container: '#ff4f76'
  on-primary-container: '#5a001d'
  inverse-primary: '#bd0045'
  secondary: '#c8c6c6'
  on-secondary: '#303030'
  secondary-container: '#474747'
  on-secondary-container: '#b6b5b4'
  tertiary: '#6ddc99'
  on-tertiary: '#00391e'
  tertiary-container: '#30a467'
  on-tertiary-container: '#003119'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd9dd'
  primary-fixed-dim: '#ffb2bb'
  on-primary-fixed: '#400012'
  on-primary-fixed-variant: '#910033'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#8af9b4'
  tertiary-fixed-dim: '#6ddc99'
  on-tertiary-fixed: '#00210f'
  on-tertiary-fixed-variant: '#00522e'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  surface-elevated: '#242424'
  border: '#2E2E2E'
  text-primary: '#FFFFFF'
  text-secondary: '#A3A3A3'
  text-disabled: '#5C5C5C'
  accent-pressed: '#C10F4A'
  status-stored: '#3B82F6'
  status-requested: '#F59E0B'
  status-returned: '#22C55E'
  status-archived: '#737373'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1.25rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

# DESIGN.md — Achados e Perdidos FIAP

## Product
Lost-and-found web app for FIAP (university in São Paulo, Brazil).
Profiles: Monitor (mobile), Student (mobile), Staff (desktop), Manager (desktop).
All UI text in Brazilian Portuguese.

## Principles
- Fast: a monitor registers an item in under 30 seconds.
- Minimal: one main action per screen, lots of empty space.
- One-hand use on mobile: primary actions at the bottom, large touch targets.
- Clear status: the user always knows where the item is and what happens next.

## Colors (dark mode)
| Token | Hex | Use |
|---|---|---|
| background | #0D0D0D | App background |
| surface | #1A1A1A | Cards, inputs, sheets |
| surface-elevated | #242424 | Modals, hover |
| border | #2E2E2E | Dividers, input borders |
| text-primary | #FFFFFF | Titles, main text |
| text-secondary | #A3A3A3 | Labels, helper text |
| text-disabled | #5C5C5C | Disabled |
| accent | #ED145B | Primary buttons, active states, links |
| accent-pressed | #C10F4A | Pressed primary |

## Item status colors
| Status | Label (PT-BR) | Hex |
|---|---|---|
| Stored | Guardado | #3B82F6 |
| Requested | Solicitado | #F59E0B |
| Returned | Devolvido | #22C55E |
| Donated/Discarded | Arquivado | #737373 |

Status always shown as a small pill badge: colored dot + label.

## Typography
Font: Inter (fallback: system sans-serif).
| Style | Size / Weight |
|---|---|
| Display | 28px / 700 |
| Title | 20px / 600 |
| Body | 16px / 400 |
| Label | 14px / 500 |
| Caption | 12px / 400 |

## Spacing and shape
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px.
- Screen padding: 20px (mobile), 32px (desktop).
- Border radius: 12px (cards, inputs, buttons), 999px (pills, chips).
- Minimum touch target: 48px.
- No heavy shadows; use surface color changes for depth.

## Components
- Primary button: full width on mobile, accent background, white text, 52px height.
- Secondary button: transparent, 1px border, white text.
- Input: surface background, 1px border, label above, accent border on focus.
- Select lists (classroom, class group, category): bottom sheet on mobile, never free typing.
- Filter chips: pill shape; selected = accent background.
- Item card: photo on the left (square, 72px, rounded), category as title, classroom + date as secondary text, status badge on the right.
- Camera screen: full-screen preview, large round capture button at the bottom.
- Empty state: simple icon, one sentence, one action.
- Toast/confirmation: short message with a check icon.

## Layout
- Mobile (Monitor, Student): 390x844, single column, sticky primary button at the bottom.
- Desktop (Staff, Manager): 1440px, left sidebar navigation, content in a table or card grid.
- Dashboard: KPI cards on top (4), charts below in a 2-column grid.

## Icons
Outline icons, 24px, 1.5px stroke (Lucide style).

## Copy tone
Direct, friendly, short. Use "você". Examples:
- "Item cadastrado com sucesso."
- "Ainda não foi encontrado. Volte a consultar amanhã."
- "Retire no Achados e Perdidos com sua carteirinha."