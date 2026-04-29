import {
  Environment,
  Network,
  Observable,
  type FetchFunction,
  type GraphQLResponse,
} from "relay-runtime";
import { serveGraphQL } from "./serve";

const BACKEND_URL = import.meta.env.VITE_GRAPHQL_URL as string | undefined;

const LOCAL_ONLY = /Deck|History|AddFilterSearch|AddCardView|MainPage/;

const fetchGraphQL: FetchFunction = (request, variables) => {
  if (BACKEND_URL && !LOCAL_ONLY.test(request.name)) {
    return Observable.create<GraphQLResponse>((sink) => {
      fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: request.text, variables }),
      })
        .then((res) => res.json())
        .then((data) => {
          sink.next(data as GraphQLResponse);
          sink.complete();
        })
        .catch((err) => sink.error(err as Error));
    });
  }

  return Observable.create<GraphQLResponse>((sink) => {
    try {
      const resp = serveGraphQL(request.text ?? "", variables);
      if (process.env.NODE_ENV === "development") {
        console.log("fetching", request.text?.split("\n").at(0), variables, resp);
      }
      sink.next(resp as GraphQLResponse);
      sink.complete();
    } catch (err) {
      sink.error(err as Error);
    }
  });
};

export const relayEnvironment = new Environment({
  network: Network.create(fetchGraphQL),
});
