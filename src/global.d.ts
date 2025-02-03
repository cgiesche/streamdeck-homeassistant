type Nullable<T> = T | undefined | null

declare module 'eslint-plugin-import' {
  export const flatConfigs: {
    recommended: never
    typescript: never
  }
}
