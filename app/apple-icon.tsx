import { ImageResponse } from "next/og";
import Logo from "./logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the home-screen icon is drawn square.
export default function AppleIcon() {
  return new ImageResponse(<Logo size={180} radius={0} />, size);
}
