export type CharacterRole =
  'beer-lover' | 'bartender' | 'soda-lover' | 'general'
export type CharacterClip =
  'idle' | 'talking' | 'argue' | 'fight' | 'calm' | 'break'
export type QuivrCharacter = {
  id: string
  name: string
  role: CharacterRole
  colorClass: string // a Tailwind class built from existing Quivr tokens
  persona: string // short system-prompt fragment: how this character talks
  animations: Record<'idle' | 'talking', unknown> &
    Partial<Record<CharacterClip, unknown>>
}
