export type Service = {
  serviceId: string
  domain: string
  name: string
  title: string
  description: string
  dataFields: {
    name: string
    info: {
      required: boolean
      description: string
      example: string | boolean | number
    }
  }[]
  domains: string[]
}
