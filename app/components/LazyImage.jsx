import React, { useState, useEffect } from 'react';

/**
 * LazyImage component that lazy loads images when they enter the viewport
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Image alt text
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @param {string} props.placeholderSrc - Placeholder image URL
 * @param {number} props.threshold - Intersection observer threshold
 * @param {string} props.loadingColor - Color of loading placeholder
 * @returns {JSX.Element} - Lazy loaded image component
 */
const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  placeholderSrc = null,
  threshold = 0.1,
  loadingColor = '#f1f1f1',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const placeholderStyle = {
    backgroundColor: loadingColor,
    width: '100%',
    height: '100%',
    display: 'block',
    ...style
  };

  useEffect(() => {
    // Only set up the observer if IntersectionObserver is available
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const element = document.getElementById(`lazy-img-${src.replace(/[^\w]/g, '')}`);
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: '100px',
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [src, threshold]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div
      id={`lazy-img-${src.replace(/[^\w]/g, '')}`}
      className={`lazy-image-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {(!isInView || !isLoaded) && (
        <div
          className="lazy-image-placeholder"
          style={placeholderStyle}
          aria-hidden="true"
        />
      )}
      
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'lazy-image-loaded' : 'lazy-image-loading'}`}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style
          }}
          onLoad={handleImageLoad}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
