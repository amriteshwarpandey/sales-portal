'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;

function getSocket() {
  if (!socket) {
    // The HTTP-only session cookie authenticates the handshake.
    socket = io(SOCKET_URL, { withCredentials: true, reconnectionAttempts: 5 });
  }
  return socket;
}

/** Call on logout so the next login gets a fresh, correctly authenticated connection. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Subscribe to a Socket.IO event while the component is mounted. */
export function useSocketEvent(event, handler, enabled = true) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const s = getSocket();
    const listener = (payload) => handlerRef.current(payload);
    s.on(event, listener);
    return () => {
      s.off(event, listener);
    };
  }, [event, enabled]);
}
