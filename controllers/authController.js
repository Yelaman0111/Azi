const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const Role = require("../schemas/RoleSchema");
const User = require("../schemas/UserSchema");
const { secret } = require("../config");

const generateAccessToken = (id, roles) => {
  const payload = {
    id,
    roles,
  };

  return jwt.sign(payload, secret, { expiresIn: "24h" });
};

class authController {
  async registration(req, res, next) {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Registration error", errors });
      }

      const { username, password } = req.body;
      const candidate = await User.findOne({ username });

      if (candidate) {
        return res.status(400).json({ message: "User exists" });
      }

      var hashPassword = bcrypt.hashSync(password, 7);
      const userRole = await Role.findOne({ value: "USER" });
      const user = new User({
        username,
        password: hashPassword,
        roles: [userRole.value],
      });
      user.save();

      return res.json({ messge: "User registered", user: user });
    } catch (e) {
      console.log(e);
      req.status(400).json({ message: "Registration error" });
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });

      if (!user) {
        return res.status(400).json({ message: "login or password incorrect" });
      }

      const validPassword = bcrypt.compareSync(password, user.password);

      if (!validPassword) {
        return res.status(400).json({ message: "login or password incorrect" });
      }

      const token = generateAccessToken(user._id, user.roles);

      return res.json({ token });
    } catch (e) {
      console.log(e);
      req.status(400).json({ message: "Login error" });
    }
  }
  async getUsers(req, res, next) {
    try {
        const users = await User.find();

      res.json(users);
    } catch (e) {}
  }
}

module.exports = new authController();
