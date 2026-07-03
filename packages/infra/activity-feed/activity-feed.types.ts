/**
 * A single activity entry in the feed.
 *
 * Follows the [Activity Streams 2.0](https://www.w3.org/TR/activitystreams-core/)
 * pattern: **actor** performed a **verb** on an **object** optionally within a **target**.
 */
export interface Activity {
  id: string;
  /** Who performed the action (e.g. user ID, system name). */
  actorId: string;
  /** Action verb (e.g. `'post'`, `'like'`, `'comment'`, `'follow'`). */
  verb: string;
  /** ID of the primary object the action was performed on. */
  objectId: string;
  /** Type of the primary object (e.g. `'post'`, `'photo'`, `'comment'`). */
  objectType?: string;
  /** ID of the target context (e.g. group, album, parent comment). */
  targetId?: string;
  /** Type of the target context. */
  targetType?: string;
  /** Arbitrary extra data attached to this activity. */
  metadata?: Record<string, unknown>;
  /** When the activity occurred. */
  createdAt: Date;
}

/** Filters for querying a feed. */
export interface FeedFilters {
  /** Only return activities from these actors. */
  userIds?: string[];
  /** Filter by verb(s). */
  verbs?: string[];
  /** Max results (default 20). */
  limit?: number;
  /** Offset-based pagination. */
  offset?: number;
  /** Cursor-based pagination token. */
  cursor?: string;
  /** Start of date range. */
  from?: Date;
  /** End of date range. */
  to?: Date;
}

/** Paginated feed result. */
export interface PaginatedFeed {
  items: Activity[];
  total?: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Storage interface for activity-feed backends.
 *
 * Implement this interface to provide a custom storage layer.
 */
export interface ActivityFeedStore {
  /** Persist a new activity. */
  save(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity>;

  /** Query activities matching the given filters. */
  getFeed(filters: FeedFilters): Promise<PaginatedFeed>;

  /** Follow an entity (user, topic, etc.). */
  follow(followerId: string, followingId: string): Promise<void>;

  /** Unfollow an entity. */
  unfollow(followerId: string, followingId: string): Promise<void>;

  /** Get all followers of a given entity. */
  getFollowers(userId: string): Promise<string[]>;

  /** Get all entities a user follows. */
  getFollowing(userId: string): Promise<string[]>;
}

/** Options accepted by `ActivityFeedModule.forRoot()`. */
export interface ActivityFeedModuleOptions {
  /** Storage adapter implementation. */
  store: ActivityFeedStore;
  /** Register the module as global (default `true`). */
  global?: boolean;
}

/** Options accepted by `ActivityFeedModule.forRootAsync()`. */
export interface ActivityFeedModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => Promise<ActivityFeedModuleOptions> | ActivityFeedModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}
