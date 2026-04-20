import { GraphQLResolveInfo } from 'graphql';
import { Context } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AbilityToken = {
  __typename?: 'AbilityToken';
  keyword: CardKeyword;
  n?: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
};

export type AddCardToDeckResult = AddCardToDeckSuccess | CardBannedError | CardCopyLimitExceededError | DeckColorLimitExceededError | DeckFullError | DeckNotFoundError;

export type AddCardToDeckSuccess = {
  __typename?: 'AddCardToDeckSuccess';
  deck: Deck;
};

export type BaseCard = Node & {
  __typename?: 'BaseCard';
  AP: Scalars['Int']['output'];
  HP: Scalars['Int']['output'];
  blocked: Scalars['Boolean']['output'];
  color: Color;
  cost: Scalars['Int']['output'];
  defaultPrinting: Printing;
  description: Array<DescriptionLine>;
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  keywords: Array<Keyword>;
  level: Scalars['Int']['output'];
  limit: Scalars['Int']['output'];
  name: LocalizedString;
  package: CardPackage;
  printings: Array<Printing>;
  rarity: CardRarity;
  relatedTraits: Array<Trait>;
  series: Series;
  traits: Array<Trait>;
  zone: Array<Zone>;
};

export type BaseDeckCard = {
  __typename?: 'BaseDeckCard';
  card: BaseCard;
  count: Scalars['Int']['output'];
};

export type Card = BaseCard | CommandCard | PilotCard | Resource | UnitCard;

export type CardBannedError = {
  __typename?: 'CardBannedError';
  cardId: Scalars['ID']['output'];
};

export type CardColor =
  | 'BLUE'
  | 'GREEN'
  | 'PURPLE'
  | 'RED'
  | 'WHITE'
  | 'YELLOW';

export type CardConnection = {
  __typename?: 'CardConnection';
  edges: Array<CardEdges>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CardCopyLimitExceededError = {
  __typename?: 'CardCopyLimitExceededError';
  cardId: Scalars['ID']['output'];
  current: Scalars['Int']['output'];
  limit: Scalars['Int']['output'];
};

export type CardEdges = {
  __typename?: 'CardEdges';
  cursor: Scalars['String']['output'];
  node: Card;
};

export type CardFilterInput = {
  color?: InputMaybe<Array<CardColor>>;
  cost?: InputMaybe<Array<Scalars['Int']['input']>>;
  keyword?: InputMaybe<Array<CardKeyword>>;
  kind: Array<CardKind>;
  level?: InputMaybe<Array<Scalars['Int']['input']>>;
  package?: InputMaybe<CardPackage>;
  query?: InputMaybe<Scalars['String']['input']>;
  rarity?: InputMaybe<CardRarity>;
  series?: InputMaybe<Array<GundamSeries>>;
  trait?: InputMaybe<Array<CardTrait>>;
  zone?: InputMaybe<Array<Zone>>;
};

export type CardGrouping = Color | Keyword | Series | Trait;

export type CardKeyword =
  | 'ACTION'
  | 'ACTIVATE_ACTION'
  | 'ACTIVATE_MAIN'
  | 'ATTACK'
  | 'BLOCKER'
  | 'BREACH'
  | 'BURST'
  | 'DEPLOY'
  | 'DESTROYED'
  | 'DURING_LINK'
  | 'DURING_PAIR'
  | 'END_OF_TURN'
  | 'FIRST_STRIKE'
  | 'HIGH_MANEUVER'
  | 'MAIN'
  | 'ONCE_PER_TURN'
  | 'PILOT'
  | 'REPAIR'
  | 'SUPPORT'
  | 'SUPPRESSION'
  | 'WHEN_LINKED'
  | 'WHEN_PAIRED';

export type CardKind =
  | 'BASE'
  | 'COMMAND'
  | 'PILOT'
  | 'RESOURCE'
  | 'UNIT';

export type CardPackage =
  | 'BASIC_CARDS'
  | 'EDITION_BETA'
  | 'GD01'
  | 'GD02'
  | 'GD03'
  | 'OTHER_PRODUCT_CARD'
  | 'PROMOTION_CARD'
  | 'ST01'
  | 'ST02'
  | 'ST03'
  | 'ST04'
  | 'ST05'
  | 'ST06'
  | 'ST07'
  | 'ST08'
  | 'ST09';

export type CardRarity =
  | 'COMMON'
  | 'COMMON_PLUS'
  | 'COMMON_PLUS_PLUS'
  | 'LEGENDARY_RARE'
  | 'LEGENDARY_RARE_PLUS'
  | 'LEGENDARY_RARE_PLUS_PLUS'
  | 'P'
  | 'RARE'
  | 'RARE_PLUS'
  | 'UNCOMMON'
  | 'UNCOMMON_PLUS';

export type CardSort =
  | 'AP_ASC'
  | 'AP_DESC'
  | 'COST_ASC'
  | 'COST_DESC'
  | 'HP_ASC'
  | 'HP_DESC'
  | 'LEVEL_ASC'
  | 'LEVEL_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC';

export type CardTrait =
  | 'ACADEMY'
  | 'AEUG'
  | 'AGE_SYSTEM'
  | 'ALAYA_VIJNANA'
  | 'ASUNO_FAMILY'
  | 'BIOLOGICAL_CPU'
  | 'CB'
  | 'CIVILIAN'
  | 'CLAN'
  | 'COORDINATOR'
  | 'CYBER_NEWTYPE'
  | 'CYCLOPS_TEAM'
  | 'EARTH_ALLIANCE'
  | 'EARTH_FEDERATION'
  | 'GJALLARHORN'
  | 'GN_DRIVE'
  | 'GUNDAM_FRAME'
  | 'G_TEAM'
  | 'INNOVADE'
  | 'JUPITRIS'
  | 'MAFTY'
  | 'MAGANAC_CORPS'
  | 'MINERVA_SQUAD'
  | 'NEO_ZEON'
  | 'NEWTYPE'
  | 'NEW_UNE'
  | 'OLD_UNE'
  | 'OPERATION_METEOR'
  | 'ORB'
  | 'OZ'
  | 'SIDE_6'
  | 'SRA'
  | 'STRONGHOLD'
  | 'SUPERPOWER_BLOC'
  | 'SUPER_SOLDIER'
  | 'TEIWAZ'
  | 'TEKKADAN'
  | 'TITANS'
  | 'TRIPLE_SHIP_ALLIANCE'
  | 'UE'
  | 'UN'
  | 'VAGAN'
  | 'VANADIS_INSTITUTE'
  | 'VULTURE'
  | 'WARSHIP'
  | 'WHITE_BASE_TEAM'
  | 'WHITE_FANG'
  | 'X_ROUNDER'
  | 'ZAFT'
  | 'ZEON';

export type CardViewHistory = Node & {
  __typename?: 'CardViewHistory';
  card: Card;
  id: Scalars['ID']['output'];
  searchedAt: Scalars['String']['output'];
};

export type Color = Node & {
  __typename?: 'Color';
  cards: Array<PlayableCard>;
  id: Scalars['ID']['output'];
  value: CardColor;
};

export type CommandCard = Node & {
  __typename?: 'CommandCard';
  blocked: Scalars['Boolean']['output'];
  color: Color;
  cost: Scalars['Int']['output'];
  defaultPrinting: Printing;
  description: Array<DescriptionLine>;
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  keywords: Array<Keyword>;
  level: Scalars['Int']['output'];
  limit: Scalars['Int']['output'];
  name: LocalizedString;
  package: CardPackage;
  pilot?: Maybe<Pilot>;
  printings: Array<Printing>;
  rarity: CardRarity;
  relatedTraits: Array<Trait>;
  series: Series;
  traits: Array<Trait>;
};

export type CommandDeckCard = {
  __typename?: 'CommandDeckCard';
  card: CommandCard;
  count: Scalars['Int']['output'];
};

export type Deck = Node & {
  __typename?: 'Deck';
  cards: Array<DeckCard>;
  colors: Array<CardColor>;
  createdAt: Scalars['String']['output'];
  hasLinkWarning: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  topKeywords: Array<CardKeyword>;
  topTraits: Array<CardTrait>;
};


export type DeckTopKeywordsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type DeckTopTraitsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type DeckCard = BaseDeckCard | CommandDeckCard | PilotDeckCard | ResourceDeckCard | UnitDeckCard;

export type DeckCardInput = {
  cardId: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
};

export type DeckColorLimitExceededError = {
  __typename?: 'DeckColorLimitExceededError';
  currentColors: Array<CardColor>;
  max: Scalars['Int']['output'];
};

export type DeckFullError = {
  __typename?: 'DeckFullError';
  current: Scalars['Int']['output'];
  max: Scalars['Int']['output'];
};

export type DeckList = Node & {
  __typename?: 'DeckList';
  decks: Array<Deck>;
  id: Scalars['ID']['output'];
};

export type DeckNotFoundError = {
  __typename?: 'DeckNotFoundError';
  deckId: Scalars['ID']['output'];
};

export type DescriptionLine = {
  __typename?: 'DescriptionLine';
  tokens: Array<DescriptionToken>;
};

export type DescriptionToken = AbilityToken | ProseToken | TriggerToken;

export type FilterSearchHistory = Node & {
  __typename?: 'FilterSearchHistory';
  filter: SearchHistoryFilter;
  id: Scalars['ID']['output'];
  searchedAt: Scalars['String']['output'];
};

export type GundamSeries =
  | 'AFTER_WAR_GUNDAM_X'
  | 'MOBILE_SUIT_GUNDAM'
  | 'MOBILE_SUIT_GUNDAM_00'
  | 'MOBILE_SUIT_GUNDAM_0080_WAR_IN_THE_POCKET'
  | 'MOBILE_SUIT_GUNDAM_AGE'
  | 'MOBILE_SUIT_GUNDAM_CHARS_COUNTERATTACK'
  | 'MOBILE_SUIT_GUNDAM_GQUUUUUUX'
  | 'MOBILE_SUIT_GUNDAM_HATHAWAYS_FLASH'
  | 'MOBILE_SUIT_GUNDAM_IRON_BLOODED_ORPHANS'
  | 'MOBILE_SUIT_GUNDAM_SEED'
  | 'MOBILE_SUIT_GUNDAM_SEED_DESTINY'
  | 'MOBILE_SUIT_GUNDAM_THE_WITCH_FROM_MERCURY'
  | 'MOBILE_SUIT_GUNDAM_UNICORN'
  | 'MOBILE_SUIT_GUNDAM_WING'
  | 'MOBILE_SUIT_Z_GUNDAM';

export type Keyword = Node & {
  __typename?: 'Keyword';
  cards: Array<PlayableCard>;
  id: Scalars['ID']['output'];
  value: CardKeyword;
};

export type LinkPilot = {
  __typename?: 'LinkPilot';
  pilot: Pilot;
};

export type LinkTrait = {
  __typename?: 'LinkTrait';
  trait: CardTrait;
};

export type LocalizedString = {
  __typename?: 'LocalizedString';
  en: Scalars['String']['output'];
  ko: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addCardToDeck: AddCardToDeckResult;
  addCardView: SearchHistoryList;
  addFilterSearch: SearchHistoryList;
  clearSearchHistory: Scalars['Boolean']['output'];
  createDeck: DeckList;
  deleteDeck: DeckList;
  removeCardFromDeck: Deck;
  removeSearchHistory: Scalars['Boolean']['output'];
  renameDeck: Deck;
  setDeckCards: Deck;
};


export type MutationAddCardToDeckArgs = {
  cardId: Scalars['ID']['input'];
  deckId: Scalars['ID']['input'];
};


export type MutationAddCardViewArgs = {
  cardId: Scalars['ID']['input'];
};


export type MutationAddFilterSearchArgs = {
  filter: CardFilterInput;
  sort?: InputMaybe<CardSort>;
};


export type MutationCreateDeckArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteDeckArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveCardFromDeckArgs = {
  cardId: Scalars['ID']['input'];
  deckId: Scalars['ID']['input'];
};


export type MutationRemoveSearchHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRenameDeckArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type MutationSetDeckCardsArgs = {
  cards: Array<DeckCardInput>;
  deckId: Scalars['ID']['input'];
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type Pilot = {
  __typename?: 'Pilot';
  AP: Scalars['Int']['output'];
  HP: Scalars['Int']['output'];
  name: LocalizedString;
};

export type PilotCard = Node & {
  __typename?: 'PilotCard';
  blocked: Scalars['Boolean']['output'];
  color: Color;
  cost: Scalars['Int']['output'];
  defaultPrinting: Printing;
  description: Array<DescriptionLine>;
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  keywords: Array<Keyword>;
  level: Scalars['Int']['output'];
  limit: Scalars['Int']['output'];
  package: CardPackage;
  pilot: Pilot;
  printings: Array<Printing>;
  rarity: CardRarity;
  relatedTraits: Array<Trait>;
  series: Series;
  traits: Array<Trait>;
};

export type PilotDeckCard = {
  __typename?: 'PilotDeckCard';
  card: PilotCard;
  count: Scalars['Int']['output'];
  hasLinkingUnit: Scalars['Boolean']['output'];
};

export type PlayableCard = BaseCard | CommandCard | PilotCard | UnitCard;

export type Printing = {
  __typename?: 'Printing';
  block: Scalars['String']['output'];
  imageUrl: Scalars['String']['output'];
  rarity: CardRarity;
};

export type ProseToken = {
  __typename?: 'ProseToken';
  text: LocalizedString;
  type: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  cards: CardConnection;
  color?: Maybe<Color>;
  deckList: DeckList;
  keyword?: Maybe<Keyword>;
  node?: Maybe<Node>;
  quicksearch: Array<Card>;
  randomCard?: Maybe<Card>;
  randomCards: Array<Card>;
  searchHistory: SearchHistoryList;
  series?: Maybe<Series>;
  trait?: Maybe<Trait>;
};


export type QueryCardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CardFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<CardSort>;
};


export type QueryColorArgs = {
  value: CardColor;
};


export type QueryKeywordArgs = {
  value: CardKeyword;
};


export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryQuicksearchArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryRandomCardArgs = {
  kind: CardKind;
};


export type QueryRandomCardsArgs = {
  count: Scalars['Int']['input'];
  kind: CardKind;
};


export type QuerySeriesArgs = {
  value: GundamSeries;
};


export type QueryTraitArgs = {
  value: CardTrait;
};

export type Resource = Node & {
  __typename?: 'Resource';
  id: Scalars['ID']['output'];
  name: LocalizedString;
  rarity: CardRarity;
};

export type ResourceDeckCard = {
  __typename?: 'ResourceDeckCard';
  card: Resource;
  count: Scalars['Int']['output'];
};

export type SearchHistory = CardViewHistory | FilterSearchHistory;

export type SearchHistoryFilter = {
  __typename?: 'SearchHistoryFilter';
  color?: Maybe<Array<CardColor>>;
  cost?: Maybe<Array<Scalars['Int']['output']>>;
  keyword?: Maybe<Array<CardKeyword>>;
  kind: Array<CardKind>;
  level?: Maybe<Array<Scalars['Int']['output']>>;
  package?: Maybe<CardPackage>;
  query?: Maybe<Scalars['String']['output']>;
  rarity?: Maybe<CardRarity>;
  sort?: Maybe<CardSort>;
  trait?: Maybe<Array<CardTrait>>;
  zone?: Maybe<Array<Zone>>;
};

export type SearchHistoryList = Node & {
  __typename?: 'SearchHistoryList';
  id: Scalars['ID']['output'];
  items: Array<SearchHistory>;
};

export type Series = Node & {
  __typename?: 'Series';
  cards: Array<PlayableCard>;
  id: Scalars['ID']['output'];
  value: GundamSeries;
};

export type Trait = Node & {
  __typename?: 'Trait';
  cards: Array<PlayableCard>;
  id: Scalars['ID']['output'];
  value: CardTrait;
};

export type TriggerToken = {
  __typename?: 'TriggerToken';
  keyword: CardKeyword;
  qualifier?: Maybe<LocalizedString>;
  type: Scalars['String']['output'];
};

export type UnitCard = Node & {
  __typename?: 'UnitCard';
  AP: Scalars['Int']['output'];
  HP: Scalars['Int']['output'];
  blocked: Scalars['Boolean']['output'];
  color: Color;
  cost: Scalars['Int']['output'];
  defaultPrinting: Printing;
  description: Array<DescriptionLine>;
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  keywords: Array<Keyword>;
  level: Scalars['Int']['output'];
  limit: Scalars['Int']['output'];
  links: Array<UnitLink>;
  name: LocalizedString;
  package: CardPackage;
  printings: Array<Printing>;
  rarity: CardRarity;
  relatedTraits: Array<Trait>;
  series: Series;
  traits: Array<Trait>;
  zone: Array<Zone>;
};

export type UnitDeckCard = {
  __typename?: 'UnitDeckCard';
  card: UnitCard;
  count: Scalars['Int']['output'];
  pilotLinked: Scalars['Boolean']['output'];
};

export type UnitLink = LinkPilot | LinkTrait;

export type Zone =
  | 'EARTH'
  | 'SPACE';

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  AddCardToDeckResult: ( Omit<AddCardToDeckSuccess, 'deck'> & { deck: _RefType['Deck'] } ) | ( CardBannedError ) | ( CardCopyLimitExceededError ) | ( DeckColorLimitExceededError ) | ( DeckFullError ) | ( DeckNotFoundError );
  Card: ( Omit<BaseCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<CommandCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<PilotCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Resource ) | ( Omit<UnitCard, 'color' | 'description' | 'keywords' | 'links' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, links: Array<_RefType['UnitLink']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } );
  CardGrouping: ( Omit<Color, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<Keyword, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<Series, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<Trait, 'cards'> & { cards: Array<_RefType['PlayableCard']> } );
  DeckCard: ( Omit<BaseDeckCard, 'card'> & { card: _RefType['BaseCard'] } ) | ( Omit<CommandDeckCard, 'card'> & { card: _RefType['CommandCard'] } ) | ( Omit<PilotDeckCard, 'card'> & { card: _RefType['PilotCard'] } ) | ( ResourceDeckCard ) | ( Omit<UnitDeckCard, 'card'> & { card: _RefType['UnitCard'] } );
  DescriptionToken: ( AbilityToken ) | ( ProseToken ) | ( TriggerToken );
  PlayableCard: ( Omit<BaseCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<CommandCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<PilotCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<UnitCard, 'color' | 'description' | 'keywords' | 'links' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, links: Array<_RefType['UnitLink']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } );
  SearchHistory: ( Omit<CardViewHistory, 'card'> & { card: _RefType['Card'] } ) | ( FilterSearchHistory );
  UnitLink: ( LinkPilot ) | ( LinkTrait );
}>;

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( Omit<BaseCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<CardViewHistory, 'card'> & { card: _RefType['Card'] } ) | ( Omit<Color, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<CommandCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Omit<Deck, 'cards'> & { cards: Array<_RefType['DeckCard']> } ) | ( Omit<DeckList, 'decks'> & { decks: Array<_RefType['Deck']> } ) | ( FilterSearchHistory ) | ( Omit<Keyword, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<PilotCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } ) | ( Resource ) | ( Omit<SearchHistoryList, 'items'> & { items: Array<_RefType['SearchHistory']> } ) | ( Omit<Series, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<Trait, 'cards'> & { cards: Array<_RefType['PlayableCard']> } ) | ( Omit<UnitCard, 'color' | 'description' | 'keywords' | 'links' | 'relatedTraits' | 'series' | 'traits'> & { color: _RefType['Color'], description: Array<_RefType['DescriptionLine']>, keywords: Array<_RefType['Keyword']>, links: Array<_RefType['UnitLink']>, relatedTraits: Array<_RefType['Trait']>, series: _RefType['Series'], traits: Array<_RefType['Trait']> } );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AbilityToken: ResolverTypeWrapper<AbilityToken>;
  AddCardToDeckResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AddCardToDeckResult']>;
  AddCardToDeckSuccess: ResolverTypeWrapper<Omit<AddCardToDeckSuccess, 'deck'> & { deck: ResolversTypes['Deck'] }>;
  BaseCard: ResolverTypeWrapper<Omit<BaseCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversTypes['Color'], description: Array<ResolversTypes['DescriptionLine']>, keywords: Array<ResolversTypes['Keyword']>, relatedTraits: Array<ResolversTypes['Trait']>, series: ResolversTypes['Series'], traits: Array<ResolversTypes['Trait']> }>;
  BaseDeckCard: ResolverTypeWrapper<Omit<BaseDeckCard, 'card'> & { card: ResolversTypes['BaseCard'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Card: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['Card']>;
  CardBannedError: ResolverTypeWrapper<CardBannedError>;
  CardColor: CardColor;
  CardConnection: ResolverTypeWrapper<Omit<CardConnection, 'edges'> & { edges: Array<ResolversTypes['CardEdges']> }>;
  CardCopyLimitExceededError: ResolverTypeWrapper<CardCopyLimitExceededError>;
  CardEdges: ResolverTypeWrapper<Omit<CardEdges, 'node'> & { node: ResolversTypes['Card'] }>;
  CardFilterInput: CardFilterInput;
  CardGrouping: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CardGrouping']>;
  CardKeyword: CardKeyword;
  CardKind: CardKind;
  CardPackage: CardPackage;
  CardRarity: CardRarity;
  CardSort: CardSort;
  CardTrait: CardTrait;
  CardViewHistory: ResolverTypeWrapper<Omit<CardViewHistory, 'card'> & { card: ResolversTypes['Card'] }>;
  Color: ResolverTypeWrapper<Omit<Color, 'cards'> & { cards: Array<ResolversTypes['PlayableCard']> }>;
  CommandCard: ResolverTypeWrapper<Omit<CommandCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversTypes['Color'], description: Array<ResolversTypes['DescriptionLine']>, keywords: Array<ResolversTypes['Keyword']>, relatedTraits: Array<ResolversTypes['Trait']>, series: ResolversTypes['Series'], traits: Array<ResolversTypes['Trait']> }>;
  CommandDeckCard: ResolverTypeWrapper<Omit<CommandDeckCard, 'card'> & { card: ResolversTypes['CommandCard'] }>;
  Deck: ResolverTypeWrapper<Omit<Deck, 'cards'> & { cards: Array<ResolversTypes['DeckCard']> }>;
  DeckCard: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['DeckCard']>;
  DeckCardInput: DeckCardInput;
  DeckColorLimitExceededError: ResolverTypeWrapper<DeckColorLimitExceededError>;
  DeckFullError: ResolverTypeWrapper<DeckFullError>;
  DeckList: ResolverTypeWrapper<Omit<DeckList, 'decks'> & { decks: Array<ResolversTypes['Deck']> }>;
  DeckNotFoundError: ResolverTypeWrapper<DeckNotFoundError>;
  DescriptionLine: ResolverTypeWrapper<Omit<DescriptionLine, 'tokens'> & { tokens: Array<ResolversTypes['DescriptionToken']> }>;
  DescriptionToken: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['DescriptionToken']>;
  FilterSearchHistory: ResolverTypeWrapper<FilterSearchHistory>;
  GundamSeries: GundamSeries;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Keyword: ResolverTypeWrapper<Omit<Keyword, 'cards'> & { cards: Array<ResolversTypes['PlayableCard']> }>;
  LinkPilot: ResolverTypeWrapper<LinkPilot>;
  LinkTrait: ResolverTypeWrapper<LinkTrait>;
  LocalizedString: ResolverTypeWrapper<LocalizedString>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Pilot: ResolverTypeWrapper<Pilot>;
  PilotCard: ResolverTypeWrapper<Omit<PilotCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversTypes['Color'], description: Array<ResolversTypes['DescriptionLine']>, keywords: Array<ResolversTypes['Keyword']>, relatedTraits: Array<ResolversTypes['Trait']>, series: ResolversTypes['Series'], traits: Array<ResolversTypes['Trait']> }>;
  PilotDeckCard: ResolverTypeWrapper<Omit<PilotDeckCard, 'card'> & { card: ResolversTypes['PilotCard'] }>;
  PlayableCard: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['PlayableCard']>;
  Printing: ResolverTypeWrapper<Printing>;
  ProseToken: ResolverTypeWrapper<ProseToken>;
  Query: ResolverTypeWrapper<{}>;
  Resource: ResolverTypeWrapper<Resource>;
  ResourceDeckCard: ResolverTypeWrapper<ResourceDeckCard>;
  SearchHistory: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SearchHistory']>;
  SearchHistoryFilter: ResolverTypeWrapper<SearchHistoryFilter>;
  SearchHistoryList: ResolverTypeWrapper<Omit<SearchHistoryList, 'items'> & { items: Array<ResolversTypes['SearchHistory']> }>;
  Series: ResolverTypeWrapper<Omit<Series, 'cards'> & { cards: Array<ResolversTypes['PlayableCard']> }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Trait: ResolverTypeWrapper<Omit<Trait, 'cards'> & { cards: Array<ResolversTypes['PlayableCard']> }>;
  TriggerToken: ResolverTypeWrapper<TriggerToken>;
  UnitCard: ResolverTypeWrapper<Omit<UnitCard, 'color' | 'description' | 'keywords' | 'links' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversTypes['Color'], description: Array<ResolversTypes['DescriptionLine']>, keywords: Array<ResolversTypes['Keyword']>, links: Array<ResolversTypes['UnitLink']>, relatedTraits: Array<ResolversTypes['Trait']>, series: ResolversTypes['Series'], traits: Array<ResolversTypes['Trait']> }>;
  UnitDeckCard: ResolverTypeWrapper<Omit<UnitDeckCard, 'card'> & { card: ResolversTypes['UnitCard'] }>;
  UnitLink: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['UnitLink']>;
  Zone: Zone;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AbilityToken: AbilityToken;
  AddCardToDeckResult: ResolversUnionTypes<ResolversParentTypes>['AddCardToDeckResult'];
  AddCardToDeckSuccess: Omit<AddCardToDeckSuccess, 'deck'> & { deck: ResolversParentTypes['Deck'] };
  BaseCard: Omit<BaseCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversParentTypes['Color'], description: Array<ResolversParentTypes['DescriptionLine']>, keywords: Array<ResolversParentTypes['Keyword']>, relatedTraits: Array<ResolversParentTypes['Trait']>, series: ResolversParentTypes['Series'], traits: Array<ResolversParentTypes['Trait']> };
  BaseDeckCard: Omit<BaseDeckCard, 'card'> & { card: ResolversParentTypes['BaseCard'] };
  Boolean: Scalars['Boolean']['output'];
  Card: ResolversUnionTypes<ResolversParentTypes>['Card'];
  CardBannedError: CardBannedError;
  CardConnection: Omit<CardConnection, 'edges'> & { edges: Array<ResolversParentTypes['CardEdges']> };
  CardCopyLimitExceededError: CardCopyLimitExceededError;
  CardEdges: Omit<CardEdges, 'node'> & { node: ResolversParentTypes['Card'] };
  CardFilterInput: CardFilterInput;
  CardGrouping: ResolversUnionTypes<ResolversParentTypes>['CardGrouping'];
  CardViewHistory: Omit<CardViewHistory, 'card'> & { card: ResolversParentTypes['Card'] };
  Color: Omit<Color, 'cards'> & { cards: Array<ResolversParentTypes['PlayableCard']> };
  CommandCard: Omit<CommandCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversParentTypes['Color'], description: Array<ResolversParentTypes['DescriptionLine']>, keywords: Array<ResolversParentTypes['Keyword']>, relatedTraits: Array<ResolversParentTypes['Trait']>, series: ResolversParentTypes['Series'], traits: Array<ResolversParentTypes['Trait']> };
  CommandDeckCard: Omit<CommandDeckCard, 'card'> & { card: ResolversParentTypes['CommandCard'] };
  Deck: Omit<Deck, 'cards'> & { cards: Array<ResolversParentTypes['DeckCard']> };
  DeckCard: ResolversUnionTypes<ResolversParentTypes>['DeckCard'];
  DeckCardInput: DeckCardInput;
  DeckColorLimitExceededError: DeckColorLimitExceededError;
  DeckFullError: DeckFullError;
  DeckList: Omit<DeckList, 'decks'> & { decks: Array<ResolversParentTypes['Deck']> };
  DeckNotFoundError: DeckNotFoundError;
  DescriptionLine: Omit<DescriptionLine, 'tokens'> & { tokens: Array<ResolversParentTypes['DescriptionToken']> };
  DescriptionToken: ResolversUnionTypes<ResolversParentTypes>['DescriptionToken'];
  FilterSearchHistory: FilterSearchHistory;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Keyword: Omit<Keyword, 'cards'> & { cards: Array<ResolversParentTypes['PlayableCard']> };
  LinkPilot: LinkPilot;
  LinkTrait: LinkTrait;
  LocalizedString: LocalizedString;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Pilot: Pilot;
  PilotCard: Omit<PilotCard, 'color' | 'description' | 'keywords' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversParentTypes['Color'], description: Array<ResolversParentTypes['DescriptionLine']>, keywords: Array<ResolversParentTypes['Keyword']>, relatedTraits: Array<ResolversParentTypes['Trait']>, series: ResolversParentTypes['Series'], traits: Array<ResolversParentTypes['Trait']> };
  PilotDeckCard: Omit<PilotDeckCard, 'card'> & { card: ResolversParentTypes['PilotCard'] };
  PlayableCard: ResolversUnionTypes<ResolversParentTypes>['PlayableCard'];
  Printing: Printing;
  ProseToken: ProseToken;
  Query: {};
  Resource: Resource;
  ResourceDeckCard: ResourceDeckCard;
  SearchHistory: ResolversUnionTypes<ResolversParentTypes>['SearchHistory'];
  SearchHistoryFilter: SearchHistoryFilter;
  SearchHistoryList: Omit<SearchHistoryList, 'items'> & { items: Array<ResolversParentTypes['SearchHistory']> };
  Series: Omit<Series, 'cards'> & { cards: Array<ResolversParentTypes['PlayableCard']> };
  String: Scalars['String']['output'];
  Trait: Omit<Trait, 'cards'> & { cards: Array<ResolversParentTypes['PlayableCard']> };
  TriggerToken: TriggerToken;
  UnitCard: Omit<UnitCard, 'color' | 'description' | 'keywords' | 'links' | 'relatedTraits' | 'series' | 'traits'> & { color: ResolversParentTypes['Color'], description: Array<ResolversParentTypes['DescriptionLine']>, keywords: Array<ResolversParentTypes['Keyword']>, links: Array<ResolversParentTypes['UnitLink']>, relatedTraits: Array<ResolversParentTypes['Trait']>, series: ResolversParentTypes['Series'], traits: Array<ResolversParentTypes['Trait']> };
  UnitDeckCard: Omit<UnitDeckCard, 'card'> & { card: ResolversParentTypes['UnitCard'] };
  UnitLink: ResolversUnionTypes<ResolversParentTypes>['UnitLink'];
}>;

export type AbilityTokenResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AbilityToken'] = ResolversParentTypes['AbilityToken']> = ResolversObject<{
  keyword?: Resolver<ResolversTypes['CardKeyword'], ParentType, ContextType>;
  n?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AddCardToDeckResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AddCardToDeckResult'] = ResolversParentTypes['AddCardToDeckResult']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AddCardToDeckSuccess' | 'CardBannedError' | 'CardCopyLimitExceededError' | 'DeckColorLimitExceededError' | 'DeckFullError' | 'DeckNotFoundError', ParentType, ContextType>;
}>;

export type AddCardToDeckSuccessResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AddCardToDeckSuccess'] = ResolversParentTypes['AddCardToDeckSuccess']> = ResolversObject<{
  deck?: Resolver<ResolversTypes['Deck'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BaseCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['BaseCard'] = ResolversParentTypes['BaseCard']> = ResolversObject<{
  AP?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  HP?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  blocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  color?: Resolver<ResolversTypes['Color'], ParentType, ContextType>;
  cost?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  defaultPrinting?: Resolver<ResolversTypes['Printing'], ParentType, ContextType>;
  description?: Resolver<Array<ResolversTypes['DescriptionLine']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  keywords?: Resolver<Array<ResolversTypes['Keyword']>, ParentType, ContextType>;
  level?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['LocalizedString'], ParentType, ContextType>;
  package?: Resolver<ResolversTypes['CardPackage'], ParentType, ContextType>;
  printings?: Resolver<Array<ResolversTypes['Printing']>, ParentType, ContextType>;
  rarity?: Resolver<ResolversTypes['CardRarity'], ParentType, ContextType>;
  relatedTraits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  series?: Resolver<ResolversTypes['Series'], ParentType, ContextType>;
  traits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  zone?: Resolver<Array<ResolversTypes['Zone']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BaseDeckCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['BaseDeckCard'] = ResolversParentTypes['BaseDeckCard']> = ResolversObject<{
  card?: Resolver<ResolversTypes['BaseCard'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Card'] = ResolversParentTypes['Card']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BaseCard' | 'CommandCard' | 'PilotCard' | 'Resource' | 'UnitCard', ParentType, ContextType>;
}>;

export type CardBannedErrorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardBannedError'] = ResolversParentTypes['CardBannedError']> = ResolversObject<{
  cardId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CardConnectionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardConnection'] = ResolversParentTypes['CardConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CardEdges']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CardCopyLimitExceededErrorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardCopyLimitExceededError'] = ResolversParentTypes['CardCopyLimitExceededError']> = ResolversObject<{
  cardId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  current?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CardEdgesResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardEdges'] = ResolversParentTypes['CardEdges']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Card'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CardGroupingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardGrouping'] = ResolversParentTypes['CardGrouping']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Color' | 'Keyword' | 'Series' | 'Trait', ParentType, ContextType>;
}>;

export type CardViewHistoryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardViewHistory'] = ResolversParentTypes['CardViewHistory']> = ResolversObject<{
  card?: Resolver<ResolversTypes['Card'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  searchedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ColorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Color'] = ResolversParentTypes['Color']> = ResolversObject<{
  cards?: Resolver<Array<ResolversTypes['PlayableCard']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['CardColor'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CommandCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CommandCard'] = ResolversParentTypes['CommandCard']> = ResolversObject<{
  blocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  color?: Resolver<ResolversTypes['Color'], ParentType, ContextType>;
  cost?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  defaultPrinting?: Resolver<ResolversTypes['Printing'], ParentType, ContextType>;
  description?: Resolver<Array<ResolversTypes['DescriptionLine']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  keywords?: Resolver<Array<ResolversTypes['Keyword']>, ParentType, ContextType>;
  level?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['LocalizedString'], ParentType, ContextType>;
  package?: Resolver<ResolversTypes['CardPackage'], ParentType, ContextType>;
  pilot?: Resolver<Maybe<ResolversTypes['Pilot']>, ParentType, ContextType>;
  printings?: Resolver<Array<ResolversTypes['Printing']>, ParentType, ContextType>;
  rarity?: Resolver<ResolversTypes['CardRarity'], ParentType, ContextType>;
  relatedTraits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  series?: Resolver<ResolversTypes['Series'], ParentType, ContextType>;
  traits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CommandDeckCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CommandDeckCard'] = ResolversParentTypes['CommandDeckCard']> = ResolversObject<{
  card?: Resolver<ResolversTypes['CommandCard'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeckResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Deck'] = ResolversParentTypes['Deck']> = ResolversObject<{
  cards?: Resolver<Array<ResolversTypes['DeckCard']>, ParentType, ContextType>;
  colors?: Resolver<Array<ResolversTypes['CardColor']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasLinkWarning?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  topKeywords?: Resolver<Array<ResolversTypes['CardKeyword']>, ParentType, ContextType, Partial<DeckTopKeywordsArgs>>;
  topTraits?: Resolver<Array<ResolversTypes['CardTrait']>, ParentType, ContextType, Partial<DeckTopTraitsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeckCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeckCard'] = ResolversParentTypes['DeckCard']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BaseDeckCard' | 'CommandDeckCard' | 'PilotDeckCard' | 'ResourceDeckCard' | 'UnitDeckCard', ParentType, ContextType>;
}>;

export type DeckColorLimitExceededErrorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeckColorLimitExceededError'] = ResolversParentTypes['DeckColorLimitExceededError']> = ResolversObject<{
  currentColors?: Resolver<Array<ResolversTypes['CardColor']>, ParentType, ContextType>;
  max?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeckFullErrorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeckFullError'] = ResolversParentTypes['DeckFullError']> = ResolversObject<{
  current?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  max?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeckListResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeckList'] = ResolversParentTypes['DeckList']> = ResolversObject<{
  decks?: Resolver<Array<ResolversTypes['Deck']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeckNotFoundErrorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeckNotFoundError'] = ResolversParentTypes['DeckNotFoundError']> = ResolversObject<{
  deckId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DescriptionLineResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DescriptionLine'] = ResolversParentTypes['DescriptionLine']> = ResolversObject<{
  tokens?: Resolver<Array<ResolversTypes['DescriptionToken']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DescriptionTokenResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DescriptionToken'] = ResolversParentTypes['DescriptionToken']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AbilityToken' | 'ProseToken' | 'TriggerToken', ParentType, ContextType>;
}>;

export type FilterSearchHistoryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['FilterSearchHistory'] = ResolversParentTypes['FilterSearchHistory']> = ResolversObject<{
  filter?: Resolver<ResolversTypes['SearchHistoryFilter'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  searchedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type KeywordResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Keyword'] = ResolversParentTypes['Keyword']> = ResolversObject<{
  cards?: Resolver<Array<ResolversTypes['PlayableCard']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['CardKeyword'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LinkPilotResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LinkPilot'] = ResolversParentTypes['LinkPilot']> = ResolversObject<{
  pilot?: Resolver<ResolversTypes['Pilot'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LinkTraitResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LinkTrait'] = ResolversParentTypes['LinkTrait']> = ResolversObject<{
  trait?: Resolver<ResolversTypes['CardTrait'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocalizedStringResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LocalizedString'] = ResolversParentTypes['LocalizedString']> = ResolversObject<{
  en?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ko?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  addCardToDeck?: Resolver<ResolversTypes['AddCardToDeckResult'], ParentType, ContextType, RequireFields<MutationAddCardToDeckArgs, 'cardId' | 'deckId'>>;
  addCardView?: Resolver<ResolversTypes['SearchHistoryList'], ParentType, ContextType, RequireFields<MutationAddCardViewArgs, 'cardId'>>;
  addFilterSearch?: Resolver<ResolversTypes['SearchHistoryList'], ParentType, ContextType, RequireFields<MutationAddFilterSearchArgs, 'filter'>>;
  clearSearchHistory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createDeck?: Resolver<ResolversTypes['DeckList'], ParentType, ContextType, RequireFields<MutationCreateDeckArgs, 'name'>>;
  deleteDeck?: Resolver<ResolversTypes['DeckList'], ParentType, ContextType, RequireFields<MutationDeleteDeckArgs, 'id'>>;
  removeCardFromDeck?: Resolver<ResolversTypes['Deck'], ParentType, ContextType, RequireFields<MutationRemoveCardFromDeckArgs, 'cardId' | 'deckId'>>;
  removeSearchHistory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveSearchHistoryArgs, 'id'>>;
  renameDeck?: Resolver<ResolversTypes['Deck'], ParentType, ContextType, RequireFields<MutationRenameDeckArgs, 'id' | 'name'>>;
  setDeckCards?: Resolver<ResolversTypes['Deck'], ParentType, ContextType, RequireFields<MutationSetDeckCardsArgs, 'cards' | 'deckId'>>;
}>;

export type NodeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BaseCard' | 'CardViewHistory' | 'Color' | 'CommandCard' | 'Deck' | 'DeckList' | 'FilterSearchHistory' | 'Keyword' | 'PilotCard' | 'Resource' | 'SearchHistoryList' | 'Series' | 'Trait' | 'UnitCard', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PilotResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Pilot'] = ResolversParentTypes['Pilot']> = ResolversObject<{
  AP?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  HP?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['LocalizedString'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PilotCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PilotCard'] = ResolversParentTypes['PilotCard']> = ResolversObject<{
  blocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  color?: Resolver<ResolversTypes['Color'], ParentType, ContextType>;
  cost?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  defaultPrinting?: Resolver<ResolversTypes['Printing'], ParentType, ContextType>;
  description?: Resolver<Array<ResolversTypes['DescriptionLine']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  keywords?: Resolver<Array<ResolversTypes['Keyword']>, ParentType, ContextType>;
  level?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  package?: Resolver<ResolversTypes['CardPackage'], ParentType, ContextType>;
  pilot?: Resolver<ResolversTypes['Pilot'], ParentType, ContextType>;
  printings?: Resolver<Array<ResolversTypes['Printing']>, ParentType, ContextType>;
  rarity?: Resolver<ResolversTypes['CardRarity'], ParentType, ContextType>;
  relatedTraits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  series?: Resolver<ResolversTypes['Series'], ParentType, ContextType>;
  traits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PilotDeckCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PilotDeckCard'] = ResolversParentTypes['PilotDeckCard']> = ResolversObject<{
  card?: Resolver<ResolversTypes['PilotCard'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  hasLinkingUnit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlayableCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PlayableCard'] = ResolversParentTypes['PlayableCard']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BaseCard' | 'CommandCard' | 'PilotCard' | 'UnitCard', ParentType, ContextType>;
}>;

export type PrintingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Printing'] = ResolversParentTypes['Printing']> = ResolversObject<{
  block?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rarity?: Resolver<ResolversTypes['CardRarity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProseTokenResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProseToken'] = ResolversParentTypes['ProseToken']> = ResolversObject<{
  text?: Resolver<ResolversTypes['LocalizedString'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  cards?: Resolver<ResolversTypes['CardConnection'], ParentType, ContextType, Partial<QueryCardsArgs>>;
  color?: Resolver<Maybe<ResolversTypes['Color']>, ParentType, ContextType, RequireFields<QueryColorArgs, 'value'>>;
  deckList?: Resolver<ResolversTypes['DeckList'], ParentType, ContextType>;
  keyword?: Resolver<Maybe<ResolversTypes['Keyword']>, ParentType, ContextType, RequireFields<QueryKeywordArgs, 'value'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<QueryNodeArgs, 'id'>>;
  quicksearch?: Resolver<Array<ResolversTypes['Card']>, ParentType, ContextType, RequireFields<QueryQuicksearchArgs, 'query'>>;
  randomCard?: Resolver<Maybe<ResolversTypes['Card']>, ParentType, ContextType, RequireFields<QueryRandomCardArgs, 'kind'>>;
  randomCards?: Resolver<Array<ResolversTypes['Card']>, ParentType, ContextType, RequireFields<QueryRandomCardsArgs, 'count' | 'kind'>>;
  searchHistory?: Resolver<ResolversTypes['SearchHistoryList'], ParentType, ContextType>;
  series?: Resolver<Maybe<ResolversTypes['Series']>, ParentType, ContextType, RequireFields<QuerySeriesArgs, 'value'>>;
  trait?: Resolver<Maybe<ResolversTypes['Trait']>, ParentType, ContextType, RequireFields<QueryTraitArgs, 'value'>>;
}>;

export type ResourceResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Resource'] = ResolversParentTypes['Resource']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['LocalizedString'], ParentType, ContextType>;
  rarity?: Resolver<ResolversTypes['CardRarity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResourceDeckCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ResourceDeckCard'] = ResolversParentTypes['ResourceDeckCard']> = ResolversObject<{
  card?: Resolver<ResolversTypes['Resource'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchHistoryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['SearchHistory'] = ResolversParentTypes['SearchHistory']> = ResolversObject<{
  __resolveType: TypeResolveFn<'CardViewHistory' | 'FilterSearchHistory', ParentType, ContextType>;
}>;

export type SearchHistoryFilterResolvers<ContextType = Context, ParentType extends ResolversParentTypes['SearchHistoryFilter'] = ResolversParentTypes['SearchHistoryFilter']> = ResolversObject<{
  color?: Resolver<Maybe<Array<ResolversTypes['CardColor']>>, ParentType, ContextType>;
  cost?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  keyword?: Resolver<Maybe<Array<ResolversTypes['CardKeyword']>>, ParentType, ContextType>;
  kind?: Resolver<Array<ResolversTypes['CardKind']>, ParentType, ContextType>;
  level?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  package?: Resolver<Maybe<ResolversTypes['CardPackage']>, ParentType, ContextType>;
  query?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rarity?: Resolver<Maybe<ResolversTypes['CardRarity']>, ParentType, ContextType>;
  sort?: Resolver<Maybe<ResolversTypes['CardSort']>, ParentType, ContextType>;
  trait?: Resolver<Maybe<Array<ResolversTypes['CardTrait']>>, ParentType, ContextType>;
  zone?: Resolver<Maybe<Array<ResolversTypes['Zone']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchHistoryListResolvers<ContextType = Context, ParentType extends ResolversParentTypes['SearchHistoryList'] = ResolversParentTypes['SearchHistoryList']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['SearchHistory']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SeriesResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Series'] = ResolversParentTypes['Series']> = ResolversObject<{
  cards?: Resolver<Array<ResolversTypes['PlayableCard']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['GundamSeries'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TraitResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Trait'] = ResolversParentTypes['Trait']> = ResolversObject<{
  cards?: Resolver<Array<ResolversTypes['PlayableCard']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['CardTrait'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TriggerTokenResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TriggerToken'] = ResolversParentTypes['TriggerToken']> = ResolversObject<{
  keyword?: Resolver<ResolversTypes['CardKeyword'], ParentType, ContextType>;
  qualifier?: Resolver<Maybe<ResolversTypes['LocalizedString']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UnitCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UnitCard'] = ResolversParentTypes['UnitCard']> = ResolversObject<{
  AP?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  HP?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  blocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  color?: Resolver<ResolversTypes['Color'], ParentType, ContextType>;
  cost?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  defaultPrinting?: Resolver<ResolversTypes['Printing'], ParentType, ContextType>;
  description?: Resolver<Array<ResolversTypes['DescriptionLine']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  keywords?: Resolver<Array<ResolversTypes['Keyword']>, ParentType, ContextType>;
  level?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  links?: Resolver<Array<ResolversTypes['UnitLink']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['LocalizedString'], ParentType, ContextType>;
  package?: Resolver<ResolversTypes['CardPackage'], ParentType, ContextType>;
  printings?: Resolver<Array<ResolversTypes['Printing']>, ParentType, ContextType>;
  rarity?: Resolver<ResolversTypes['CardRarity'], ParentType, ContextType>;
  relatedTraits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  series?: Resolver<ResolversTypes['Series'], ParentType, ContextType>;
  traits?: Resolver<Array<ResolversTypes['Trait']>, ParentType, ContextType>;
  zone?: Resolver<Array<ResolversTypes['Zone']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UnitDeckCardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UnitDeckCard'] = ResolversParentTypes['UnitDeckCard']> = ResolversObject<{
  card?: Resolver<ResolversTypes['UnitCard'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pilotLinked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UnitLinkResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UnitLink'] = ResolversParentTypes['UnitLink']> = ResolversObject<{
  __resolveType: TypeResolveFn<'LinkPilot' | 'LinkTrait', ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  AbilityToken?: AbilityTokenResolvers<ContextType>;
  AddCardToDeckResult?: AddCardToDeckResultResolvers<ContextType>;
  AddCardToDeckSuccess?: AddCardToDeckSuccessResolvers<ContextType>;
  BaseCard?: BaseCardResolvers<ContextType>;
  BaseDeckCard?: BaseDeckCardResolvers<ContextType>;
  Card?: CardResolvers<ContextType>;
  CardBannedError?: CardBannedErrorResolvers<ContextType>;
  CardConnection?: CardConnectionResolvers<ContextType>;
  CardCopyLimitExceededError?: CardCopyLimitExceededErrorResolvers<ContextType>;
  CardEdges?: CardEdgesResolvers<ContextType>;
  CardGrouping?: CardGroupingResolvers<ContextType>;
  CardViewHistory?: CardViewHistoryResolvers<ContextType>;
  Color?: ColorResolvers<ContextType>;
  CommandCard?: CommandCardResolvers<ContextType>;
  CommandDeckCard?: CommandDeckCardResolvers<ContextType>;
  Deck?: DeckResolvers<ContextType>;
  DeckCard?: DeckCardResolvers<ContextType>;
  DeckColorLimitExceededError?: DeckColorLimitExceededErrorResolvers<ContextType>;
  DeckFullError?: DeckFullErrorResolvers<ContextType>;
  DeckList?: DeckListResolvers<ContextType>;
  DeckNotFoundError?: DeckNotFoundErrorResolvers<ContextType>;
  DescriptionLine?: DescriptionLineResolvers<ContextType>;
  DescriptionToken?: DescriptionTokenResolvers<ContextType>;
  FilterSearchHistory?: FilterSearchHistoryResolvers<ContextType>;
  Keyword?: KeywordResolvers<ContextType>;
  LinkPilot?: LinkPilotResolvers<ContextType>;
  LinkTrait?: LinkTraitResolvers<ContextType>;
  LocalizedString?: LocalizedStringResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Pilot?: PilotResolvers<ContextType>;
  PilotCard?: PilotCardResolvers<ContextType>;
  PilotDeckCard?: PilotDeckCardResolvers<ContextType>;
  PlayableCard?: PlayableCardResolvers<ContextType>;
  Printing?: PrintingResolvers<ContextType>;
  ProseToken?: ProseTokenResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Resource?: ResourceResolvers<ContextType>;
  ResourceDeckCard?: ResourceDeckCardResolvers<ContextType>;
  SearchHistory?: SearchHistoryResolvers<ContextType>;
  SearchHistoryFilter?: SearchHistoryFilterResolvers<ContextType>;
  SearchHistoryList?: SearchHistoryListResolvers<ContextType>;
  Series?: SeriesResolvers<ContextType>;
  Trait?: TraitResolvers<ContextType>;
  TriggerToken?: TriggerTokenResolvers<ContextType>;
  UnitCard?: UnitCardResolvers<ContextType>;
  UnitDeckCard?: UnitDeckCardResolvers<ContextType>;
  UnitLink?: UnitLinkResolvers<ContextType>;
}>;

