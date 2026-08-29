import type { ImgHTMLAttributes } from 'react';

interface MockImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}

function MockImage({ src, alt, width, height, ...props }: MockImageProps) {
  return <img src={src} alt={alt} width={width} height={height} {...props} />;
}

export default MockImage;