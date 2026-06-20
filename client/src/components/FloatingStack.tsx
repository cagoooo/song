import { type ReactNode } from 'react';

interface FloatingStackProps {
    children: ReactNode;
}

/**
 * Fixed bottom-right container that stacks FAB children from bottom to top.
 * Uses flex-direction: column-reverse so the first child sits lowest.
 * All has-up-next-bar offset logic lives in .fab-stack CSS (editorial-ritual.css).
 */
export function FloatingStack({ children }: FloatingStackProps) {
    return (
        <div className="fab-stack">
            {children}
        </div>
    );
}
