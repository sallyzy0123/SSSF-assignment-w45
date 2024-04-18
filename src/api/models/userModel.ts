import mongoose from 'mongoose';
import {User} from '../../types/DBTypes';

const userModel = new mongoose.Schema<User>({
  user_name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'admin'],
  },
});

export default mongoose.model<User>('User', userModel);