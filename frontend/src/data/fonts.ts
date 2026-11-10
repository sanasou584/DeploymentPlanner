import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const FONT_VARIABLES = [
  jakartaSans.variable,
  jetbrainsMono.variable,
  spaceGrotesk.variable,
];
