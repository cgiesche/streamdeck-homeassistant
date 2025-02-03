export type DisplayConfig = {
  _states: {
    [state: string]: StateConfig
  }
  [state: string]: DomainConfig
} & {
  _color: string
  _icon: string
  _labelTemplates: string[]
}

export interface StateConfig {
  labelTemplates?: string[]
  icon?: string
  color?: string
  feedbackLayout?: string
  feedback?: string
}

interface DomainConfig extends StateConfig {
  states?: {
    [state: string]: StateConfig
  }
  classes?: {
    [className: string]: DomainConfig
  }
}
