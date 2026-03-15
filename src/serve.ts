import { execute, GraphQLSchema, parse } from "graphql";

export async function serveGraphQL(
  schema: GraphQLSchema,
  query: string,
  variables?: Record<string, unknown>,
) {
  return execute({
    schema,
    document: parse(query),
    variableValues: variables,
  });
}
