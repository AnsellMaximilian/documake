export function BrandPattern({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 420 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M66 27H188C206 27 220 41 220 59V194C220 212 206 226 188 226H66C48 226 34 212 34 194V59C34 41 48 27 66 27Z" stroke="currentColor" strokeWidth="2" opacity=".2" />
      <path d="M34 89H220M99 27V226" stroke="currentColor" strokeWidth="2" opacity=".12" />
      <rect x="246" y="40" width="68" height="68" rx="16" fill="currentColor" opacity=".18" />
      <rect x="326" y="40" width="68" height="68" rx="16" fill="currentColor" opacity=".38" />
      <rect x="246" y="120" width="68" height="68" rx="16" fill="currentColor" opacity=".34" />
      <rect x="326" y="120" width="68" height="68" rx="16" fill="currentColor" opacity=".14" />
      <path d="M208 129H246" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" opacity=".55" />
      <circle cx="226" cy="129" r="4" fill="currentColor" />
    </svg>
  );
}
