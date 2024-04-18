import {GraphQLError} from 'graphql';
import {Cat, LoginUser, TokenContent, User, UserInput, UserOutput} from '../../types/DBTypes';
import fetchData from '../../functions/fetchData';
import {LoginResponse, MessageResponse, UserResponse} from '../../types/MessageTypes';
import userModel from '../models/userModel';
import {MyContext} from '../../types/MyContext';

// TODO: create resolvers based on user.graphql
// note: when updating or deleting a user don't send id to the auth server, it will get it from the token. So token needs to be sent with the request to the auth server
// note2: when updating or deleting a user as admin, you need to send user id (dont delete admin btw) and also check if the user is an admin by checking the role from the user object form context

export default {
    Cat: {
        owner: async (parent: Cat): Promise<UserOutput> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            }
            const user = await fetchData<User>(
                process.env.AUTH_URL + '/users/' + parent.owner,
            );
            user.id = user._id;
            return user;
        },
    },
    Query: {
        users: async (): Promise<UserOutput[]> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            }
            const users = await fetchData<User[]>(process.env.AUTH_URL + '/users');
            users.forEach((user) => {
                user.id = user._id;
            });
            return users;
        },
        userById: async (
            _parent: undefined,
            args: {id: string},
        ): Promise<UserOutput> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            }
            const user = await fetchData<User>(
                process.env.AUTH_URL + '/users/' + args.id,
            );
            user.id = user._id;
            return user;
        },
        checkToken: async (
            _parent: undefined,
            _args: undefined,
            context: MyContext,
        ) => {
            const response = {
                message: 'Token is valid',
                user: context.userdata,
            };
            return response;
        },
    },
    Mutation: {
        login: async (
            _parent: undefined,
            args: {credentials: LoginUser},
        ): Promise<LoginResponse> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
              }
              const options = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(args.credentials),
              };
        
              const loginResponse = await fetchData<MessageResponse & {token: string; user: UserOutput}>(
                process.env.AUTH_URL + '/auth/login',
                options,
              );
              loginResponse.user.id = loginResponse.user._id;
        
              return loginResponse;
        },
        register: async (
            _parent: undefined,
            args: {user: UserInput},
        ): Promise<UserResponse> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            }

            try {
                const options = {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(args.user),
                };
            
                const registerResponse = await fetchData<MessageResponse & {data: UserOutput}>(
                    process.env.AUTH_URL + '/users',
                    options,
                );
                console.log(registerResponse.data);
                return {user: registerResponse.data, message: registerResponse.message};
            } catch (error) {
                throw new GraphQLError((error as Error).message, {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        http: {status: 400},
                    }
                });
            }
        },
        updateUser: async (
            _parent: undefined,
            args: {user: UserInput},
            context: MyContext,
        ): Promise<UserResponse | {message: string}> => {
            if (!context.userdata) {
                throw new GraphQLError('User not authenticated', {
                  extensions: {
                    code: 'UNAUTHENTICATED',
                  },
                });
            }
            const user = await userModel.findByIdAndUpdate(
                context.userdata.user._id, 
                args.user, 
                {
                    new: true,
                }
            );
            if (user) {
                return {message: 'User updated by user self', user};
            } else {
                return {message: 'User not updated by user self'};
            }
        },
        deleteUser: async (
            _parent: undefined,
            _args: undefined,
            context: MyContext,
        ): Promise<UserResponse | {message: string}> => {
            if (!context.userdata) {
                throw new GraphQLError('User not authenticated', {
                  extensions: {
                    code: 'UNAUTHENTICATED',
                  },
                });
            }
            const user = await userModel.findByIdAndDelete(context.userdata.user._id);
            if (!user) {
                return {message: 'User not deleted'};
            }
            return {message: 'User deleted', user};
        },
        updateUserAsAdmin: async (
            _parent: undefined,
            args: {user: UserInput, id: string},
            context: MyContext,
        ): Promise<UserResponse | {message: string}> => {
            if (!context.userdata || context.userdata.user.role !== 'admin') {
                throw new GraphQLError('User not authorized', {
                  extensions: {
                    code: 'UNAUTHORIZED',
                  },
                });
            }
            const user = await userModel.findByIdAndUpdate(
                args.id, 
                args.user, 
                {
                    new: true,
                }
            );
            if (user) {
                return {message: 'User updated by admin', user};
            } else {
                return {message: 'User not updated by admin'};
            }
        },
        deleteUserAsAdmin: async (
            _parent: undefined,
            args: {id: string},
            context: MyContext,
        ): Promise<UserResponse | {message: string}> => {
            console.log('context', context.userdata);
            if (!context.userdata || context.userdata.user.role !== 'admin') {
                throw new GraphQLError('User not authorized', {
                  extensions: {
                    code: 'UNAUTHORIZED',
                  },
                });
            }
            const user = await userModel.findByIdAndDelete(args.id);
            if (user) {
                return {message: 'User deleted by admin', user};
            } else {
                return {message: 'User not deleted by admin'};
            }
        },
    },
}