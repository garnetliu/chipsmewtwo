import { SetContextLink } from "@apollo/client/link/context";

export const authLink = new SetContextLink(async (prevContext) => {
  console.log(
    "=========> apollo authLink => ",
    typeof window === "undefined" ? "server" : "client",
  );

  return { credentials: "include", headers: prevContext.headers };
});
