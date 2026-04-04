export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: #F9FAFB; }

    :root {
      --v-bg:           #F9FAFB;
      --v-surface:      #ffffff;
      --v-surface-2:    #F3F4F6;
      --v-border:       #E5E7EB;
      --v-green:        #00C896;
      --v-green-dark:   #00A87D;
      --v-green-glow:   rgba(0, 200, 150, 0.08);
      --v-text-1:       #111827;
      --v-text-2:       #6B7280;
      --v-text-muted:   #9CA3AF;
      --v-red:          #FF4D4D;
    }

    @keyframes ring-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    @keyframes cta-pulse {
      0%,  100% { box-shadow: 0 0 0 0   rgba(0, 200, 150, 0.5); }
      50%        { box-shadow: 0 0 36px 10px rgba(0, 200, 150, 0.10); }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </>
  );
}
