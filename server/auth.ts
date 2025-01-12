import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool } from "@db";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "guitar-song-vote-system",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM users WHERE username = $1',
          [username]
        );
        const user = result.rows[0];

        if (!user) {
          return done(null, false, { message: "帳號或密碼錯誤" });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "帳號或密碼錯誤" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      } finally {
        client.release();
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      done(null, result.rows[0]);
    } catch (err) {
      done(err);
    } finally {
      client.release();
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { username, password } = req.body;

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).send("使用者名稱已存在");
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const result = await client.query(
        'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING *',
        [username, hashedPassword, false]
      );
      const newUser = result.rows[0];

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "註冊成功",
          user: { id: newUser.id, username: newUser.username, isAdmin: newUser.is_admin },
        });
      });
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  });

  app.post("/api/login", (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send("請輸入帳號和密碼");
    }

    const cb = (err: any, user: any, info?: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info?.message ?? "登入失敗");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "登入成功",
          user: { id: user.id, username: user.username, isAdmin: user.is_admin },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("登出失敗");
      }

      res.json({ message: "登出成功" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    res.status(401).send("未登入");
  });
}