import { Request, Response } from "express";
import { validationResult } from "express-validator";
import sendMail from "../services/emailService";
import { JWT_SECRET, SALT } from "../env";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/userModel";

import {
  doesUserExist,
  writeUserToDatabase,
  updateUserRecordWithEmail,
} from "../services/userService";

export const defaultController = (_req: Request, res: Response) => {
  res.send("Welcome E-move");
};

interface tokenData {
  email: string;
  token?: any;
}

interface UserDataType {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  dateOfBirth?: string;
  gender?: string;
  isVerified?: boolean;
}

const secret = JWT_SECRET as string;

export const signUp = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  //no validation errors
  const { firstName, lastName, email, password, dateOfBirth, gender } =
    req.body;
  //check if user exists
  const userExists = await doesUserExist(email);
  if (userExists) {
    return res.status(400).json({ errors: [{ msg: "User already exists" }] });
  }
  const hashedPassword = await bcrypt.hashSync(password, Number(`${SALT}`));
  const newUser = {
    firstName,
    lastName,
    email,
    password: hashedPassword,
    dateOfBirth,
    gender,
    isVerified: false,
  };

  //write the new user to the database
  const User = await writeUserToDatabase(newUser);

  if (!User) {
    return res
      .status(400)
      .json({ errors: [{ msg: "User could not be created" }] });
  }

  //user created successfully
  //send email notification
  try {
    sendMail(email);
    return res.status(201).json({
      User,
      message: "User created successfully",
      success: true,
    });
  } catch (error) {
    return res.status(201).json({
      User,
      message: "Email could not be sent",
      success: false,
    });
  }
};

//verify email
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.params;
  console.log(`Verifying email`);
  console.log(`token: ${token}`);
  const verifyToken = jwt.verify(token, secret) as string;
  console.log(`verifyToken: ${verifyToken}`);
  if (!verifyToken) {
    return res.status(400).json({ message: "Invalid token" });
  }
  const user = (await doesUserExist(verifyToken)) as UserDataType;
  if (!user) {
    return res.status(400).json({ message: "Invalid email address" });
  }
  const newUser = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: user.password,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    isVerified: true,
  };
  const updateUser = updateUserRecordWithEmail(verifyToken, newUser);

  if (!updateUser) {
    //please retry
    return res.status(500).json({ message: "Please try again" });
  }
  return res.status(200).json({ message: "Account verified" });

  //change password
  //change password
};
export const changePassword = async (req: Request, res: Response) => {
  try {
    //get password from request body
    const { password, newPassword, confirmPassword } = req.body;
    //hashed password
    const hashedPassword = await bcrypt.hashSync(
      newPassword,
      Number(`${SALT}`)
    );
    //check if user exists
    const userExists = (await doesUserExist(req.body.email)) as UserDataType;
    if (!userExists) {
      return res.status(400).json({ errors: [{ msg: "User does not exist" }] });
    }

    //check if password is correct
    // const isPasswordCorrect = bcrypt.compareSync(
    //   password,
    //   userExists.password!
    // );
    console.log("what is happening");
    if (password !== userExists.password) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Old password is incorrect" }] });
    }
    //check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Passwords do not match" }] });
    }
    const newUser = {
      _id: userExists._id,
      firstName: userExists.firstName,
      lastName: userExists.lastName,
      email: userExists.email,
      password: hashedPassword,
      dateOfBirth: userExists.dateOfBirth,
      gender: userExists.gender,
      isVerified: userExists.isVerified,
    };

    const updateUser = updateUserRecordWithEmail(userExists.email!, newUser);
    if (!updateUser) {
      //please retry
      return res.status(500).json({ message: "Please try again" });
    }
    return res.status(200).json({ message: "Password changed" });
  } catch (error) {
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
};
