import { Router } from "express";
import UserModel from "../dao/models/users.model.js";
import UserManager from "../dao/managers/UserManager.js";
import cartsModel from "../dao/models/carts.model.js";
import cartsManagerMongo from "../dao/managers/cartsmanager.mongodb.js";
import { createHashValue, isValidPasswd } from "../utils/encrypt.js";
import passport from "passport";
import { generateJWT, passportCall } from "../utils/jwt.js";
import authorization from "../middleware/authorization.middleware.js";
import { appConfig } from "../config/config.js";
import handlePolicies from "../middleware/handle-policies.middleware.js";

const routerSession = Router();
const userManager = new UserManager();
const { JWT_COOKIE_NAME } = appConfig;
const cartListMongo = new cartsManagerMongo(
  "src/dao/managers/cartsmanager.mongodb.js"
);

//--------RUTA ALTA USUARIO ---------------
routerSession.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, password, age, role } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.render("user/registererror", {
        error: "El correo electrónico ya está registrado",
      });
    }

    const pswHashed = await createHashValue(password);
    const newUser = await UserModel.create({
      email,
      password: pswHashed,
      first_name,
      last_name,
      age,
      role,
      cart: null,
    });

    console.log("Usuario registrado exitosamente:", newUser);

    const newUserWithCart = await cartListMongo.addCartsRegister();
    console.log("Usuario con carrito registrado exitosamente:", newUserWithCart);

    newUser.cart = newUserWithCart._id;
    await newUser.save();

    console.log("Usuario con carrito registrado exitosamente:", newUser);
    return res.redirect("/login");
  } catch (error) {
    console.error("Error en el registro de usuario:", error);
    return res.render("user/registererror", {
      error: "Ocurrió un error en el registro de usuario",
    });
  }
});


//--------RUTA INICIO DE SESION POR TOKEN----------------
routerSession.post("/login", (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    console.log("🚀 ~ file: session.router.js:77 ~ passport.authenticate ~ user:", user)
    if (err) {
      console.error("Error en la autenticación:", err);
      return res.render("user/loginerror", {
        error: "(401): Ocurrió un error en la autenticación",
      });
    }
    if (!user) {
      return res.render("user/loginerror", {
        error: "(401): Credenciales inválidas",
      });
    }
    try {
      const signUser = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        cart: user.cart,
        id: user._id,
      };
      const token = await generateJWT({ ...signUser });
      console.log(
        "🚀 ~ file: session.routes.js:43 ~ router.post ~ token:",
        token
      );
      res.cookie(JWT_COOKIE_NAME, token).redirect("/products");
    } catch (error) {
      console.error("Error al generar el token:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
  })(req, res, next);
});

//--------LOG OUT----------------
routerSession.get("/logout", async (req, res) => {
  try {
    res.clearCookie(JWT_COOKIE_NAME).redirect("/login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    res.status(500).send({ error: "Ocurrió un error al cerrar sesión" });
  }
});

//--------RECOVER----------------
routerSession.post("/recover-psw", async (req, res) => {
  try {
    const { email, new_password } = req.body;
    // Verificar si el usuario ya existe en la base de datos
    const existingUser = await UserModel.findOne({ email });
    if (!existingUser) {
      console.log(`el usaurio con el mail:${email} no existe`);
    }
    console.log("el usaurio existe");
    const newPswHashed = await createHashValue(new_password);
    await UserModel.findByIdAndUpdate(existingUser._id, {
      password: newPswHashed,
    });
    console.log("🚀 Password cambiado correctamente");
    return res.redirect("/login");
  } catch (error) {
    console.log(
      "🚀 ~ file: session.routes.js:117 ~ router.post ~ error:",
      error
    );
    return res.render("user/recovererror", {
      error: "Ocurrió un error en el cambio de parametros de usuario",
    });
  }
});
//--------LOG IN GITHUB---------------
/*
routerSession.get(
  "/github",
  passport.authenticate("github", {
    session: false,
    successRedirect: "/products",
    failureRedirect: "/login",
  })
);



// Ruta de callback después de la autenticación exitosa
routerSession.get(
  "/github",
  passport.authenticate("github", {
    session: false,
  })
);*/

routerSession.get("/github", passport.authenticate("github"));

routerSession.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
  }),
  async (req, res) => {
    try {
      const token = req.user;
      res
        .cookie(JWT_COOKIE_NAME, token, { httpOnly: true })
        .redirect("/products");
    } catch (error) {
      console.log("Error en el enrutamiento de GitHub callback:", error);
      res.redirect("/login");
    }
  }
);

routerSession.get(
  "/current",
  [passportCall("jwt"),
  handlePolicies(["ADMIN","USER"])],
  (req, res) => {
    console.log(
      "🚀 ~ file: session.router.js:206 ~ routerView.get ~ req.user:",
      req.user
    );
    const { iat, exp } = req.user;
    console.log(
      "🚀 ~ file: session.router.js:154 ~ routerSession.get ~ iat, exp:",
      iat,
      exp
    );
    const { first_name, last_name, email, role, cart, id } = req.user.user;
    const user = {
      first_name,
      last_name,
      email,
      role,
      cart,
      id,
      iat,
      exp,
    };
    console.log(
      "🚀 ~ file: session.router.js:214 ~ routerView.get ~  user:",
      user
    );
    res.render("user/current", { user });
  }
);

export default routerSession;
