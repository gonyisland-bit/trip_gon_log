import { BRAND_LOGO_VIEWBOX, BRAND_LOGO_PATHS } from './brandLogoData';

interface BrandLogoProps {
  className?: string;
  title?: string;
}

// Inline vector logotype; fills with currentColor so it follows the text colour / theme
export function BrandLogo({ className, title = 'Tripgon log' }: BrandLogoProps) {
  return (
    <svg viewBox={BRAND_LOGO_VIEWBOX} className={className} fill="currentColor" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      {BRAND_LOGO_PATHS.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
