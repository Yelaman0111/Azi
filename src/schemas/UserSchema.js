const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    username: { type: String, unique: true, require: true },
    password: { type: String, require: true },
    roles: [{ type: String, ref: "Role" }],
    balance: { type: Number }, 

  },
  { timestamps: true }
);

module.exports = model("User", UserSchema);
