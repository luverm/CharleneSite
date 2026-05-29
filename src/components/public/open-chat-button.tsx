"use client";

/**
 * Opens the floating chat widget by dispatching the event it listens
 * for — lets server components link into the chat without prop drilling.
 */
export function OpenChatButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("hbj:open-chat"))}
      className={className}
    >
      {children}
    </button>
  );
}
