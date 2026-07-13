import { useEffect, useRef } from 'react';

export function useDesktopNotification(count: number, title: string = 'New Notification', message: string = 'You have a new update.') {
  const prevCountRef = useRef(count);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not already granted or denied
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Trigger notification if count increased
    if (count > prevCountRef.current) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: message,
          icon: '/favicon.ico', // Optional icon
        });

        // Optional: Play a sound
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play prevented by browser', e));
        } catch (error) {
          // Ignore audio errors
        }

        // Close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    }

    prevCountRef.current = count;
  }, [count, title, message]);
}
