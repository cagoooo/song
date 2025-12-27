import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import { 
  firestore, 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  query, 
  where, 
  doc,
  Timestamp,
  COLLECTIONS
} from "../db/firebase";

const crypto = {
  hash: async (password: string) => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    return bcrypt.compare(suppliedPassword, storedPassword);
  },
};

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      password: string;
      isAdmin: boolean;
      createdAt: any;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "guitar-song-vote-system",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000,
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
      try {
        const usersRef = collection(firestore, COLLECTIONS.users);
        const userQuery = query(usersRef, where("username", "==", username));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          return done(null, false, { message: "帳號或密碼錯誤" });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        const user = {
          id: userDoc.id,
          username: userData.username,
          password: userData.password,
          isAdmin: userData.isAdmin,
          createdAt: userData.createdAt
        };

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "帳號或密碼錯誤" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const userRef = doc(firestore, COLLECTIONS.users, id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return done(null, null);
      }
      
      const userData = userDoc.data();
      const user = {
        id: userDoc.id,
        username: userData.username,
        password: userData.password,
        isAdmin: userData.isAdmin,
        createdAt: userData.createdAt
      };
      
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const usersRef = collection(firestore, COLLECTIONS.users);
      const existingQuery = query(usersRef, where("username", "==", username));
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        return res.status(400).send("使用者名稱已存在");
      }

      const hashedPassword = await crypto.hash(password);

      const newUserRef = await addDoc(usersRef, {
        username,
        password: hashedPassword,
        isAdmin: false,
        createdAt: Timestamp.now()
      });

      const newUser = {
        id: newUserRef.id,
        username,
        password: hashedPassword,
        isAdmin: false,
        createdAt: new Date()
      };

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "註冊成功",
          user: { id: newUser.id, username: newUser.username, isAdmin: newUser.isAdmin },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send("請輸入帳號和密碼");
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "登入失敗");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "登入成功",
          user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
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
