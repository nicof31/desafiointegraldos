import mongoose from "mongoose";

const userCollection = "users";

const roleType = {
  USER: "USER",
  ADMIN: "ADMIN",
  PUBLIC: "PUBLIC",
};

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true, minLength: 3, maxLength: 60 },
  last_name: { type: String, required: true, minLength: 3, maxLength: 60 },
  email: { type: String, required: true, unique: true, index: true },
  age: { type: Number, required: true, min: 18, max: 100 },
  password: { type: String },
  role: {
    type: String,
    enum: Object.values(roleType),
    default: roleType.USER,
  },
  cart: { type: mongoose.Schema.Types.ObjectId, default: null }
});

const UserModel = mongoose.model(userCollection, userSchema);

export default UserModel;
