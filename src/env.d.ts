/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare const wx: {
  cloud?: {
    init(options: { env: string; traceUser?: boolean }): void
    callFunction<T = unknown>(options: {
      name: string
      data?: Record<string, unknown>
    }): Promise<{ result: T }>
    getTempFileURL(options: {
      fileList: string[]
    }): Promise<{
      fileList: Array<{
        fileID: string
        tempFileURL: string
        status: number
        errMsg?: string
      }>
    }>
  }
}
