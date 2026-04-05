import {
  Environment,
  Network,
  Observable,
  type FetchFunction,
  type GraphQLResponse,
} from "relay-runtime";
import { serveGraphQL } from "./serve";

const fetchGraphQL: FetchFunction = (request, variables) =>
  Observable.create<GraphQLResponse>((sink) => {
    try {
      const resp = serveGraphQL(request.text ?? "", variables);
      if (process.env.NODE_ENV === "development") {
        console.log(
          "fetching",
          request.text?.split("\n").at(0),
          variables,
          resp,
        );
      }
      sink.next(resp as GraphQLResponse);
      sink.complete();
    } catch (err) {
      sink.error(err as Error);
    }
  });

export const relayEnvironment = new Environment({
  network: Network.create(fetchGraphQL),
});
