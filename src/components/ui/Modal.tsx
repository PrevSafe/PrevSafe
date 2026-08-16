import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
};

export default function Modal({ aberto, titulo, onFechar, children, rodape }: Props) {
  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return createPortal(
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0, left: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(46,49,50,0.45)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            boxSizing: 'border-box',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #c1c8cb',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: '#00242d' }}>
            {titulo}
          </h3>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: 'none',
              borderRadius: '9999px',
              background: 'transparent',
              cursor: 'pointer',
              color: '#41484b',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div
          style={{
            boxSizing: 'border-box',
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '8px 12px',
          }}
        >
          {children}
        </div>

        {rodape && (
          <div
            style={{
              boxSizing: 'border-box',
              flex: '0 0 auto',
              display: 'flex',
              gap: '12px',
              padding: '16px 20px',
              borderTop: '1px solid #c1c8cb',
            }}
          >
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
