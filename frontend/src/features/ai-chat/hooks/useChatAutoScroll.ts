import { useEffect, useRef, useState, useCallback } from 'react';

export function useChatAutoScroll<T>(dependency: T) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    // Se o usuário está a mais de 100px do final, considera que ele rolou para cima
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsUserScrolledUp(distanceToBottom > 100);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom();
    }
  }, [dependency, isUserScrolledUp, scrollToBottom]);

  return {
    containerRef,
    bottomRef,
    scrollToBottom,
    isUserScrolledUp,
    handleScroll,
  };
}
