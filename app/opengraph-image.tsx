import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Kishore Kumar Sharma — Senior Full Stack Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function HomeOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0B",
          color: "#F5F2ED",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top meta */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#9B9CA3" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#A8C8A1" }} />
            kishore-kumar-sharma.dev
          </span>
          <span>Senior Full Stack Engineer · Noida</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 124, lineHeight: 1, letterSpacing: "-0.04em", color: "#F5F2ED" }}>
            End to end.
          </div>
          <div
            style={{
              fontSize: 124,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "#C9A8FF",
              fontStyle: "italic",
              marginTop: 4,
            }}
          >
            No handoffs.
          </div>
        </div>

        {/* Bottom meta */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, color: "#F5F2ED", marginBottom: 6 }}>Kishore Kumar Sharma</div>
            <div style={{ fontSize: 18, color: "#9B9CA3" }}>
              6.5+ yrs · Java · Spring Boot · Node · React · AWS
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Telecom", "FinTech", "GovTech", "EdTech"].map((d) => (
              <span
                key={d}
                style={{
                  fontSize: 14,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #2C2D33",
                  color: "#9B9CA3",
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
