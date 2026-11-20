import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { BadRequestError } from "../utils/errors";

const createUploadImage = (destination: string) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },

    filename: (req, file, cb) => {
      const originalName = path.parse(file.originalname).name;
      const safeName = originalName.replace(/[^a-zA-Z0-9]/g, "-");
      const uniqueNumber = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = path.extname(file.originalname).toLowerCase();
      const finalName = `${safeName}-${uniqueNumber}${extension}`;

      cb(null, finalName);
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;

    if (!allowedExtensions.test(path.extname(file.originalname))) {
      return cb(
        new BadRequestError(
          "Only image files (jpg, jpeg, png, gif, webp) are allowed",
        ),
      );
    }

    if (!file.mimetype.startsWith("image/")) {
      return cb(new BadRequestError("Invalid image MIME type"));
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 20 * 1024 * 1024, // 20 MB
    },
  });
};

export default createUploadImage;
