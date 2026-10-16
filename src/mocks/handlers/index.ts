import { httpHandlers } from './http'
import { socketHandlers } from './socket'

export const handlers = [...httpHandlers, ...socketHandlers]
