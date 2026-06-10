import session from "express-session";
import { query } from "./db.js";
import type { RuntimeConfig } from "./config.js";

const SESSION_TABLE = "app_sessions";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function getSessionExpiration(sess: session.SessionData): Date {
  const cookie = sess.cookie as session.Cookie & {
    originalMaxAge?: number | null;
  };

  if (cookie.expires) return new Date(cookie.expires);

  const maxAge =
    typeof cookie.originalMaxAge === "number"
      ? cookie.originalMaxAge
      : DEFAULT_SESSION_TTL_MS;

  return new Date(Date.now() + maxAge);
}

export class PostgreSqlSessionStore extends session.Store {
  get(
    sid: string,
    callback: (err: unknown, session?: session.SessionData | null) => void,
  ): void {
    void query<{ sess: session.SessionData }>(
      `SELECT sess FROM ${SESSION_TABLE} WHERE sid = $1 AND expire > NOW()`,
      [sid],
    )
      .then((result) => callback(null, result.rows[0]?.sess ?? null))
      .catch((error) => callback(error));
  }

  set(
    sid: string,
    sess: session.SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    void query(
      `INSERT INTO ${SESSION_TABLE} (sid, sess, expire)
       VALUES ($1, $2, $3)
       ON CONFLICT (sid)
       DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
      [sid, sess, getSessionExpiration(sess)],
    )
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    void query(`DELETE FROM ${SESSION_TABLE} WHERE sid = $1`, [sid])
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  touch(
    sid: string,
    sess: session.SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    void query(`UPDATE ${SESSION_TABLE} SET expire = $2 WHERE sid = $1`, [
      sid,
      getSessionExpiration(sess),
    ])
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }
}

export function createSessionOptions(
  config: RuntimeConfig,
): session.SessionOptions {
  return {
    name: "exclusive.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: config.isProduction ? new PostgreSqlSessionStore() : undefined,
    cookie: {
      httpOnly: true,
      sameSite: config.isProduction ? "none" : "lax",
      secure: config.isProduction,
      maxAge: DEFAULT_SESSION_TTL_MS,
    },
  };
}
