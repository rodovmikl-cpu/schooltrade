// Security headers configuration
// Note: These are configured at the HTML level and through meta tags
// For production deployment, these should also be configured at the CDN/hosting level

export const securityHeaders = {
  // Content Security Policy - Strict protection against XSS
  csp: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s+/g, ' ').trim(),
  
  // Prevent clickjacking
  xFrameOptions: 'DENY',
  
  // Prevent MIME type sniffing
  xContentTypeOptions: 'nosniff',
  
  // Referrer policy
  referrerPolicy: 'no-referrer',
  
  // Strict Transport Security (HSTS)
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  
  // Permissions policy
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
};

// Function to apply meta tags for security headers
export function applySecurityHeaders() {
  // CSP
  let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!cspMeta) {
    cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    document.head.appendChild(cspMeta);
  }
  cspMeta.setAttribute('content', securityHeaders.csp);

  // Referrer Policy
  let refMeta = document.querySelector('meta[name="referrer"]');
  if (!refMeta) {
    refMeta = document.createElement('meta');
    refMeta.setAttribute('name', 'referrer');
    document.head.appendChild(refMeta);
  }
  refMeta.setAttribute('content', securityHeaders.referrerPolicy);

  // X-Content-Type-Options (via meta tag)
  let xContentMeta = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
  if (!xContentMeta) {
    xContentMeta = document.createElement('meta');
    xContentMeta.setAttribute('http-equiv', 'X-Content-Type-Options');
    document.head.appendChild(xContentMeta);
  }
  xContentMeta.setAttribute('content', securityHeaders.xContentTypeOptions);
}

// Initialize security headers on app load
if (typeof window !== 'undefined') {
  applySecurityHeaders();
}