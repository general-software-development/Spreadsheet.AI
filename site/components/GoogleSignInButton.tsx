"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { SpreadsheetApi } from "@/lib/api";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(configuration: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "rectangular";
      logo_alignment: "left";
      width: string;
    },
  ): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

class GoogleSignInController {
  private readonly api: SpreadsheetApi;

  constructor(api: SpreadsheetApi) {
    this.api = api;
  }

  async signIn(credential: string): Promise<void> {
    await this.api.signInWithGoogle(credential);
    window.location.assign("/sheets");
  }
}

interface GoogleSignInButtonProps {
  clientId: string;
}

export function GoogleSignInButton({ clientId }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const controllerRef = useRef<GoogleSignInController | null>(null);
  const [error, setError] = useState("");

  if (controllerRef.current === null) {
    controllerRef.current = new GoogleSignInController(new SpreadsheetApi());
  }

  const renderGoogleButton = () => {
    if (initializedRef.current || !buttonRef.current || !window.google || !clientId) {
      return;
    }
    initializedRef.current = true;
    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      callback: (response) => {
        setError("");
        void controllerRef.current?.signIn(response.credential).catch((_error: unknown) => {
          setError("Google sign-in failed. Please try again.");
        });
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: "248",
    });
  };

  if (!clientId) {
    return <p className="signin-error">Sign in with Google is not configured.</p>;
  }

  return (
    <div className="google-signin-shell">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={renderGoogleButton} />
      <div ref={buttonRef} className="google-signin-button" aria-label="Sign in with Google" />
      {error ? <p className="signin-error" role="alert">{error}</p> : null}
    </div>
  );
}
