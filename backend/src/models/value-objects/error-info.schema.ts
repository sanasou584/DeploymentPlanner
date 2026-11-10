import { Schema } from 'mongoose';

export interface ErrorInfoFields {
  code: string;
  message: string;
}

export const errorInfoSchema: Schema = new Schema<ErrorInfoFields>(
  {
    code: { type: String, required: true, trim: true, minlength: 1 },
    message: { type: String, required: true, trim: true, minlength: 1 },
  },
  { _id: false },
);
