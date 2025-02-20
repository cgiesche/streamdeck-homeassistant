type Nullable<T> = T | undefined | null
type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>

declare module 'eslint-plugin-import' {
  export const flatConfigs: {
    recommended: never
    typescript: never
  }
}
