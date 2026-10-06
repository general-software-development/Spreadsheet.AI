/** @vitest-environment jsdom */

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

vi.mock("next/script", async () => {
  const ReactModule = await import("react");
  return {
    default: ({ onReady }: { onReady?: () => void }) => {
      ReactModule.useEffect(() => {
        onReady?.();
      }, [onReady]);
      return null;
    },
  };
});

describe("GoogleSignInButton integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.google = undefined;
  });

  it("renders the GIS button and submits the returned credential", async () => {
    let credentialCallback: ((response: { credential: string }) => void) | undefined;
    const initialize = vi.fn((configuration: { callback: (response: { credential: string }) => void }) => {
      credentialCallback = configuration.callback;
    });
    const renderButton = vi.fn();
    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    };

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => await new Promise<Response>(() => undefined),
    );

    render(<GoogleSignInButton clientId="google-client-id" />);

    await waitFor(() => expect(renderButton).toHaveBeenCalledOnce());
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: "google-client-id", ux_mode: "popup" }));

    act(() => {
      credentialCallback?.({ credential: "google-signed-id-token" });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/auth/google",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ credential: "google-signed-id-token" }),
      }),
    ));
  });
});
