export interface RenderingConfig {
  feedbackLayout: string
  feedback: {
    title?: string
    icon?: string
    value?: string
  }
  icon: Nullable<string>
  color: string
  labelTemplates: Nullable<string[]>
  customTitle?: Nullable<string>
  isAction?: boolean
  isMultiAction?: boolean
}
