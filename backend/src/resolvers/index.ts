import { cardResolvers } from "./cards";
import { deckResolvers } from "./decks";

const { Query: cardQuery, Mutation: cardMutation, ...cardTypes } = cardResolvers;
const { Query: deckQuery, Mutation: deckMutation, ...deckTypes } = deckResolvers;

export const resolvers = {
  Query:    { ...cardQuery,    ...deckQuery },
  Mutation: { ...cardMutation, ...deckMutation },
  ...cardTypes,
  ...deckTypes,
};
