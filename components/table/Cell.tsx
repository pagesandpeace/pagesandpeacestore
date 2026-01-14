export function Cell({
  children,
  align = "left",
  strong = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  strong?: boolean;
}) {
  return (
    <td
      className={`px-6 py-5 ${
        align === "right" ? "text-right" : "text-left"
      } ${strong ? "font-medium" : ""}`}
    >
      {children}
    </td>
  );
}
