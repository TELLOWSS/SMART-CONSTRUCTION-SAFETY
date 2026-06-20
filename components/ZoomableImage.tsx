import React, { useState } from 'react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
}) => {
  const [coords, setCoords] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setCoords({ x, y });
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-zoom-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsHovered(false);
        setCoords({ x: 50, y: 50 });
      }}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          transformOrigin: `${coords.x}% ${coords.y}%`,
          transform: isHovered ? 'scale(2.2)' : 'scale(1)',
          transition: isHovered
            ? 'transform 0.1s ease-out'
            : 'transform 0.3s ease-out, transform-origin 0.3s ease-out',
        }}
      />
    </div>
  );
};
