import { useEffect, useSyncExternalStore } from 'react'
import { connectSocket, disconnectSocket, getSocket } from './socket'

function subscribe(onChange: () => void) {
  const socket = getSocket()
  socket.on('connect', onChange)
  socket.on('disconnect', onChange)
  return () => {
    socket.off('connect', onChange)
    socket.off('disconnect', onChange)
  }
}

function getConnected() {
  return getSocket().connected
}

export function useSocketConnection() {
  useEffect(() => {
    connectSocket()
    return () => disconnectSocket()
  }, [])

  const isConnected = useSyncExternalStore(subscribe, getConnected)
  return { socket: getSocket(), isConnected }
}
