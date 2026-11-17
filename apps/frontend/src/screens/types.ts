/** Props every mode screen receives from App. */
export type ScreenProps = {
  models: string[]
  model: string
  onModelChange: (model: string) => void
  onHome: () => void
}
