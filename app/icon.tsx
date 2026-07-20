import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 340,
            height: 340,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 64,
            background: "#d9a441",
            fontSize: 220,
          }}
        >
          ✈
        </div>
      </div>
    ),
    { ...size },
  );
}
