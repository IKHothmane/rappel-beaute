import React from "react";
export const useRouter = () => ({ replace() {} });
export default function Link({ href, children, ...props }: React.ComponentProps<"a">) {
  return <a href={href} {...props}>{children}</a>;
}
