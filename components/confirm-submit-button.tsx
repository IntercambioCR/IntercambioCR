"use client";

import type React from "react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className: string;
  message: string;
};

export function ConfirmSubmitButton({
  children,
  pendingLabel = "Procesando...",
  className,
  message
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
