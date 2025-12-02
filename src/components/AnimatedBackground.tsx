import { useEffect, useState } from 'react';

interface Bubble {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

export const AnimatedBackground = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Generate bubbles
    const newBubbles: Bubble[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 20 + Math.random() * 80,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 5,
    }));
    
    setBubbles(newBubbles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute bottom-0 rounded-full opacity-10 animate-float"
          style={{
            left: `${bubble.left}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            background: 'linear-gradient(135deg, hsl(189 95% 52% / 0.3), hsl(217 91% 60% / 0.3))',
            animation: `float ${bubble.duration}s ease-in-out ${bubble.delay}s infinite`,
            boxShadow: '0 0 20px hsl(189 95% 52% / 0.2)',
          }}
        />
      ))}
    </div>
  );
};
