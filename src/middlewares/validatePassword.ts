import { Request, Response, NextFunction } from "express";

export const validatePassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = req.body;
  const { isUpdatingPassword } = req.query;
  if (isUpdatingPassword === "true" && body.password.length < 6) {
    res
      .status(400)
      .json({ password: "Minimum password length is 6 characters" });
  } else {
    next();
  }
};
