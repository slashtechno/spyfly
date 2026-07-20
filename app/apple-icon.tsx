import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
            fontSize: 76,
          }}
        >
          ✈
        </div>
      </div>
    ),
    { ...size },
  );
}
