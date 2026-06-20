/**
 * Shared cassette building blocks.
 * CassetteScrews renders the four corner screws used by ScrollToTop and UpdatePrompt.
 * CSS lives in editorial-ritual.css under .cs-screw.
 */
export function CassetteScrews() {
    return (
        <>
            <span className="cs-screw tl" aria-hidden="true" />
            <span className="cs-screw tr" aria-hidden="true" />
            <span className="cs-screw bl" aria-hidden="true" />
            <span className="cs-screw br" aria-hidden="true" />
        </>
    );
}
