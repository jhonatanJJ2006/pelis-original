'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@pelis/ui/utils';

type RemoteImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string;
  alt: string;
};

export function RemoteImage({ src, alt, className, onError, ...rest }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn('bg-cinema-elevated', className)}
        role="img"
        aria-label={alt || undefined}
        aria-hidden={!alt}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      {...rest}
    />
  );
}
