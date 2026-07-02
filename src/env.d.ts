/// <reference types="vite/client" />
import type { CanvasAPI } from './types'

declare global {
  interface Window {
    canvas: CanvasAPI
  }
}
