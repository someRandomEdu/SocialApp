import { CSSProperties, HTMLAttributes, ReactNode } from "react";

// interface BoxProps extends HTMLAttributes<HTMLDivElement> {
//     flexDirection?: CSSProperties["flexDirection"];
//     gap?: CSSProperties["gap"];
// }
//
// function Box({ flexDirection, gap, style, ...props }: BoxProps) {
//     return <div style={{ display: "flex", flexDirection, gap, ...style }} {...props}></div>;
// }
//
// export function VBox({flexDirection = "row", ...props}: BoxProps & {
//     flexDirection?: Exclude<CSSProperties["flexDirection"], "column" | "column-reverse" | undefined> }) {
//     return <Box flexDirection={flexDirection} {...props}></Box>;
// }
//
// export function HBox({flexDirection = "column", ...props}: BoxProps & {
//     flexDirection?: Exclude<CSSProperties["flexDirection"], "row" | "row-reverse" | undefined> }) {
//     return <Box flexDirection={flexDirection} {...props}></Box>;
// }
