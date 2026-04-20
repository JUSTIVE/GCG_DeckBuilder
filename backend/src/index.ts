import { Elysia } from "elysia";
import { createYoga } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { loadFilesSync } from "@graphql-tools/load-files";
import { resolvers } from "./resolvers";
import { createContext } from "./context";

const typeDefs = loadFilesSync("./schema/**/*.graphql");
const schema = makeExecutableSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  context: () => createContext(),
  graphqlEndpoint: "/graphql",
});

new Elysia()
  .all("/graphql", ({ request }) => yoga.fetch(request))
  .get("/", () => "GCG DeckBuilder API")
  .listen(process.env.PORT ?? 4000);
