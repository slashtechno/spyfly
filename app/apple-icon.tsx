import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same vector plane path as app/icon.svg — a Unicode ✈ glyph rendered
// through next/og's font stack is unreliable across environments (missing
// glyph, wrong style, tofu box); an actual SVG path always renders right.
const PLANE_PATH =
  "M32 10 C33.4 10 34.3 11.3 34.3 13.2 L34.3 24.6 L50.5 33.6 C51.6 34.2 51.6 36.2 50.5 36.8 L34.3 34.6 L34.3 44.4 L39.6 48.8 C40.3 49.4 40.3 50.8 39.6 51.3 L32 49.3 L24.4 51.3 C23.7 50.8 23.7 49.4 24.4 48.8 L29.7 44.4 L29.7 34.6 L13.5 36.8 C12.4 36.2 12.4 34.2 13.5 33.6 L29.7 24.6 L29.7 13.2 C29.7 11.3 30.6 10 32 10 Z";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05060a",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 120,
            height: 120,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 26,
            background: "#d9a441",
          }}
        >
          <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
            <path d={PLANE_PATH} fill="#05060a" />
          </svg>
        </div>
      </div>
    ),
    { ...size },
  );
}
