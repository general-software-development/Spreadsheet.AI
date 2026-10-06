module.exports = [
"[project]/site/components/GoogleSignInButton.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GoogleSignInButton",
    ()=>GoogleSignInButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/script.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/site/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
class GoogleSignInController {
    api;
    constructor(api){
        this.api = api;
    }
    async signIn(credential) {
        await this.api.signInWithGoogle(credential);
        window.location.assign("/sheets");
    }
}
function GoogleSignInButton({ clientId }) {
    const buttonRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const initializedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const controllerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    if (controllerRef.current === null) {
        controllerRef.current = new GoogleSignInController(new __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SpreadsheetApi"]());
    }
    const renderGoogleButton = ()=>{
        if (initializedRef.current || !buttonRef.current || !window.google || !clientId) {
            return;
        }
        initializedRef.current = true;
        window.google.accounts.id.initialize({
            client_id: clientId,
            ux_mode: "popup",
            callback: (response)=>{
                setError("");
                void controllerRef.current?.signIn(response.credential).catch((_error)=>{
                    setError("Google sign-in failed. Please try again.");
                });
            }
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: "248"
        });
    };
    if (!clientId) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "signin-error",
            children: "Sign in with Google is not configured."
        }, void 0, false, {
            fileName: "[project]/site/components/GoogleSignInButton.tsx",
            lineNumber: 95,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "google-signin-shell",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                src: "https://accounts.google.com/gsi/client",
                strategy: "afterInteractive",
                onReady: renderGoogleButton
            }, void 0, false, {
                fileName: "[project]/site/components/GoogleSignInButton.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: buttonRef,
                className: "google-signin-button",
                "aria-label": "Sign in with Google"
            }, void 0, false, {
                fileName: "[project]/site/components/GoogleSignInButton.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this),
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "signin-error",
                role: "alert",
                children: error
            }, void 0, false, {
                fileName: "[project]/site/components/GoogleSignInButton.tsx",
                lineNumber: 102,
                columnNumber: 16
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/site/components/GoogleSignInButton.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
}
}),
"[project]/site/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "SpreadsheetApi",
    ()=>SpreadsheetApi
]);
class ApiError extends Error {
    status;
    constructor(status, message){
        super(message);
        this.status = status;
    }
}
class SpreadsheetApi {
    baseUrl;
    constructor(baseUrl = ("TURBOPACK compile-time value", "http://localhost:8000") ?? "http://localhost:8000"){
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }
    async request(path, init) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...init?.headers
            }
        });
        if (!response.ok) {
            const message = await response.text();
            throw new ApiError(response.status, message || response.statusText);
        }
        if (response.status === 204) {
            return undefined;
        }
        return await response.json();
    }
    async signInWithGoogle(credential) {
        return await this.request("/auth/google", {
            method: "POST",
            headers: {
                "X-Google-Sign-In": "google-identity-services"
            },
            body: JSON.stringify({
                credential
            })
        });
    }
    async currentUser() {
        return await this.request("/auth/me");
    }
    async list() {
        return await this.request("/api/spreadsheets");
    }
    async get(id) {
        return await this.request(`/api/spreadsheets/${encodeURIComponent(id)}`);
    }
    async create(title, workbook) {
        return await this.request("/api/spreadsheets", {
            method: "POST",
            body: JSON.stringify({
                title,
                workbook
            })
        });
    }
    async update(id, title, workbook) {
        return await this.request(`/api/spreadsheets/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: JSON.stringify({
                title,
                workbook
            })
        });
    }
    async delete(id) {
        await this.request(`/api/spreadsheets/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
    }
    async logout() {
        await this.request("/auth/logout", {
            method: "POST"
        });
    }
}
;
}),
];

//# sourceMappingURL=site_1hkpp1v._.js.map